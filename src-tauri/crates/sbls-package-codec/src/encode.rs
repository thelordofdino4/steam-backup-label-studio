//! Deterministic, mutation-free `.sbls` package-v1 encoding.
//!
//! The encoder consumes one owned immutable normalized project snapshot and one
//! complete typed decision for every location in the closed asset registry. It
//! performs no filesystem, network, dialog, lifecycle, Tauri, or editor work.

use std::panic::{catch_unwind, AssertUnwindSafe};

use crate::archive::{encode_stored_zip32, StoredEntry, MANIFEST_ENTRY_NAME, PROJECT_ENTRY_NAME};
use crate::assets::{
    decode_canonical_data_url_with_limits, AssetDigestFunction, AssetError, AssetStagePreflight,
    AssetStager, OwnedAssetPayload, StagedAssetKey,
};
use crate::error::{FailureCode, FailureStage, ProjectPackageFailure};
use crate::json::{
    is_forbidden_filesystem_value, parse_project_source_json_with_limits,
    parse_project_source_probe_with_limits, trim_ascii_whitespace, JsonErrorKind, JsonValue,
    ProjectSourceKind,
};
use crate::limits::{
    checked_add, checked_u64, ensure_at_most, hydrated_data_url_len, PackageLimits,
    MIN_PROJECT_BYTES,
};
use crate::manifest::{AssetRecord, BindingRecord, ManifestV1, ProjectEntry, Sha256Digest};
use crate::model::{AssetCapture, AssetCaptureDecision, ProjectPackageEncodeInput};
use crate::raster::{validate_raster, RasterBudget, RasterError, RasterErrorKind};
use crate::registry::{
    classify_unbound_owner, expand_registered_owners, first_unavailable_semantic_builtin,
    qualified_builtin_matches, AssetOwner, CaseRegistryShape, CaseSurfaceRegistryShape,
    DiscRegistryShape, ProjectKind, RegistryShape, TechnicalKind, UnboundOwnerDisposition,
};

/// Encode one complete in-memory project-package candidate.
///
/// A panic from unexpected Rust implementation code is contained at this pure
/// boundary and becomes only the contract's final encoding fallback. Known
/// validation failures pass through unchanged.
pub fn encode_project_package(
    input: &ProjectPackageEncodeInput,
) -> Result<Vec<u8>, ProjectPackageFailure> {
    encode_project_package_from_borrowed(
        input.normalized_project_json(),
        input.creator(),
        input.captures(),
    )
}

/// Encode while borrowing the caller's one normalized JSON byte sequence.
/// The output remains newly owned; captures and creator metadata stay borrowed.
pub fn encode_project_package_from_borrowed(
    normalized_project_json: &[u8],
    creator: &crate::model::PackageCreator,
    captures: &[AssetCapture],
) -> Result<Vec<u8>, ProjectPackageFailure> {
    match catch_unwind(AssertUnwindSafe(|| {
        encode_project_package_inner_borrowed(
            normalized_project_json,
            creator,
            captures,
            PackageLimits::V1,
            crate::assets::sha256_digest,
        )
    })) {
        Ok(result) => result,
        Err(_) => Err(failure(FailureCode::EncodeFailed, FailureStage::Encoding)),
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct PendingBinding {
    owner: AssetOwner,
    asset: StagedAssetKey,
}

#[cfg(test)]
fn encode_project_package_inner(
    input: &ProjectPackageEncodeInput,
    limits: PackageLimits,
    digest_function: AssetDigestFunction,
) -> Result<Vec<u8>, ProjectPackageFailure> {
    encode_project_package_inner_borrowed(
        input.normalized_project_json(),
        input.creator(),
        input.captures(),
        limits,
        digest_function,
    )
}

fn encode_project_package_inner_borrowed(
    normalized_project_json: &[u8],
    creator: &crate::model::PackageCreator,
    captures: &[AssetCapture],
    limits: PackageLimits,
    digest_function: AssetDigestFunction,
) -> Result<Vec<u8>, ProjectPackageFailure> {
    let mut raster_budget = RasterBudget::default();
    encode_project_package_inner_with_raster_budget_borrowed(
        normalized_project_json,
        creator,
        captures,
        limits,
        digest_function,
        &mut raster_budget,
    )
}

#[cfg(test)]
fn encode_project_package_inner_with_raster_budget(
    input: &ProjectPackageEncodeInput,
    limits: PackageLimits,
    digest_function: AssetDigestFunction,
    raster_budget: &mut RasterBudget,
) -> Result<Vec<u8>, ProjectPackageFailure> {
    encode_project_package_inner_with_raster_budget_borrowed(
        input.normalized_project_json(),
        input.creator(),
        input.captures(),
        limits,
        digest_function,
        raster_budget,
    )
}

fn encode_project_package_inner_with_raster_budget_borrowed(
    normalized_project_json: &[u8],
    creator: &crate::model::PackageCreator,
    captures: &[AssetCapture],
    limits: PackageLimits,
    digest_function: AssetDigestFunction,
    raster_budget: &mut RasterBudget,
) -> Result<Vec<u8>, ProjectPackageFailure> {
    let input_length = checked_u64(normalized_project_json.len(), FailureStage::Project)?;
    if input_length < MIN_PROJECT_BYTES {
        return Err(failure(
            FailureCode::HydratedJsonInvalid,
            FailureStage::Project,
        ));
    }
    // Resolve project kind in a bounded first pass that never retains any
    // value string larger than the ordinary projection ceiling. A source can
    // therefore never borrow the other project kind's asset-leaf exception.
    let probe = parse_project_source_probe_with_limits(normalized_project_json, &limits)
        .map_err(|error| map_json_error(error, FailureStage::Project))?;
    let probed_schema_version = probe
        .get("schemaVersion")
        .and_then(JsonValue::as_str)
        .ok_or_else(invalid_project)?;
    if probed_schema_version != "0.3.0" {
        return Err(failure(
            FailureCode::ProjectSchemaUnsupported,
            FailureStage::Project,
        ));
    }
    let probed_registry_shape = derive_registry_shape(&probe)?;
    let source_kind = match probed_registry_shape.project_kind() {
        ProjectKind::Disc => ProjectSourceKind::Disc,
        ProjectKind::CaseInsert => ProjectSourceKind::CaseInsert,
    };
    drop(probe);

    // The second pass creates the operation-owned deep copy. It is not mutated
    // until every owner has been classified and every externalized byte
    // payload has passed validation and staging.
    let mut projection =
        parse_project_source_json_with_limits(normalized_project_json, &limits, source_kind)
            .map_err(|error| map_json_error(error, FailureStage::Project))?;
    if projection.as_object_entries().is_none() {
        return Err(failure(
            FailureCode::HydratedJsonInvalid,
            FailureStage::Project,
        ));
    }
    let schema_version = projection
        .get("schemaVersion")
        .and_then(JsonValue::as_str)
        .ok_or_else(|| failure(FailureCode::HydratedJsonInvalid, FailureStage::Project))?;
    if schema_version != "0.3.0" {
        return Err(failure(
            FailureCode::ProjectSchemaUnsupported,
            FailureStage::Project,
        ));
    }
    let schema_version = try_copy_string(schema_version, FailureStage::Project)?;

    let registry_shape = derive_registry_shape(&projection)?;
    if registry_shape != probed_registry_shape {
        return Err(invalid_project());
    }
    let project_kind = registry_shape.project_kind();
    if first_unavailable_semantic_builtin(&projection, project_kind).is_some() {
        return Err(failure(
            FailureCode::BuiltInCaptureRequired,
            FailureStage::AssetCapture,
        ));
    }
    let expected_owners = expand_registered_owners(&schema_version, registry_shape)
        .map_err(|_| resource_limit(FailureStage::AssetCapture))?;
    let capture_plan = index_complete_capture_plan(&expected_owners, captures)?;

    let mut stager = AssetStager::with_digest_function(limits, digest_function);
    let planned_binding_count = capture_plan
        .iter()
        .filter(|capture| {
            matches!(
                capture.decision(),
                AssetCaptureDecision::ProjectOwnedDataUrl
                    | AssetCaptureDecision::CapturedBytes { .. }
            )
        })
        .count();
    ensure_at_most(
        checked_u64(planned_binding_count, FailureStage::AssetCapture)?,
        limits.bindings,
        FailureStage::AssetCapture,
    )?;
    let mut pending_bindings = Vec::new();
    pending_bindings
        .try_reserve_exact(planned_binding_count)
        .map_err(|_| resource_limit(FailureStage::AssetCapture))?;
    let mut hydrated_data_url_fan_out = 0_u64;

    // Process in the registry's normative owner/map/array order. Capture plan
    // input order therefore cannot affect bytes or first-failure precedence.
    for (owner, capture) in expected_owners.iter().zip(capture_plan) {
        let pointer = owner
            .try_pointer()
            .map_err(|_| resource_limit(FailureStage::AssetCapture))?;
        let leaf = resolve_pointer(&projection, &pointer);

        let payload = match capture.decision() {
            AssetCaptureDecision::NoAcceptedAsset => {
                match classify_unbound_owner(&projection, *owner) {
                    UnboundOwnerDisposition::NoAcceptedAsset => {}
                    UnboundOwnerDisposition::BuiltInWithoutCompatibility => {
                        return Err(failure(
                            FailureCode::BuiltInCaptureRequired,
                            FailureStage::AssetCapture,
                        ));
                    }
                    UnboundOwnerDisposition::AcceptedAssetMissingBinding => {
                        return Err(capture_failed());
                    }
                }
                if leaf.is_some_and(|value| !value.is_null()) {
                    return Err(capture_failed());
                }
                None
            }
            AssetCaptureDecision::ProjectOwnedDataUrl => {
                let value = leaf
                    .and_then(JsonValue::as_str)
                    .ok_or_else(capture_failed)?;
                Some(
                    decode_canonical_data_url_with_limits(value, &limits)
                        .map_err(|error| map_data_url_error(error, value))?,
                )
            }
            AssetCaptureDecision::CapturedBytes { mime_type, bytes } => {
                if !matches!(
                    classify_unbound_owner(&projection, *owner),
                    UnboundOwnerDisposition::BuiltInWithoutCompatibility
                ) {
                    return Err(capture_failed());
                }
                let leaf = leaf.ok_or_else(capture_failed)?;
                if !leaf.is_null() {
                    // Caller bytes exist only to capture a semantic built-in
                    // whose normalized registered leaf is null. Any existing
                    // project value or missing project-owned bytes must take
                    // its own typed path and cannot be silently replaced.
                    return Err(capture_failed());
                }
                Some(
                    OwnedAssetPayload::copy_from_slice(*mime_type, bytes, &limits)
                        .map_err(map_asset_capture_error)?,
                )
            }
            AssetCaptureDecision::QualifiedBuiltIn { compatibility_id } => {
                if !qualified_builtin_matches(&projection, *owner, compatibility_id) {
                    return Err(failure(
                        FailureCode::BuiltInCaptureRequired,
                        FailureStage::AssetCapture,
                    ));
                }
                crate::registry::clear_qualified_builtin_leaf(&mut projection, *owner)
                    .map_err(|_| capture_failed())?;
                None
            }
            AssetCaptureDecision::UnsupportedNonportableAsset => {
                return Err(capture_failed());
            }
            AssetCaptureDecision::BuiltInCaptureRequired => {
                return if matches!(
                    classify_unbound_owner(&projection, *owner),
                    UnboundOwnerDisposition::BuiltInWithoutCompatibility
                ) {
                    Err(failure(
                        FailureCode::BuiltInCaptureRequired,
                        FailureStage::AssetCapture,
                    ))
                } else {
                    Err(capture_failed())
                };
            }
        };

        let Some(payload) = payload else {
            continue;
        };
        let prefix_length = checked_u64(
            "data:".len() + payload.mime_type().as_str().len() + ";base64,".len(),
            FailureStage::AssetCapture,
        )?;
        let data_url_length = hydrated_data_url_len(
            checked_u64(payload.bytes().len(), FailureStage::AssetCapture)?,
            prefix_length,
            &limits,
            FailureStage::AssetCapture,
        )?;
        hydrated_data_url_fan_out = ensure_at_most(
            checked_add(
                hydrated_data_url_fan_out,
                data_url_length,
                FailureStage::AssetCapture,
            )?,
            limits.hydrated_data_url_fan_out_bytes,
            FailureStage::AssetCapture,
        )?;
        match stager
            .preflight_stage(&payload)
            .map_err(map_asset_stage_error)?
        {
            AssetStagePreflight::ExistingExact(key) => {
                pending_bindings.push(PendingBinding {
                    owner: *owner,
                    asset: key,
                });
                continue;
            }
            AssetStagePreflight::NeedsValidation => {}
        }
        let raster = validate_raster(payload.bytes(), payload.mime_type(), raster_budget)
            .map_err(map_raster_error)?;
        let staged = stager
            .stage(payload, raster.width, raster.height)
            .map_err(map_asset_stage_error)?;
        pending_bindings.push(PendingBinding {
            owner: *owner,
            asset: staged.key,
        });
    }

    ensure_at_most(
        checked_u64(pending_bindings.len(), FailureStage::AssetCapture)?,
        limits.bindings,
        FailureStage::AssetCapture,
    )?;

    // Only now can projection leaves change. All changes are confined to the
    // parsed operation-owned copy and every externalized location was proven to
    // exist during capture.
    for pending in &pending_bindings {
        let pointer = pending
            .owner
            .try_pointer()
            .map_err(|_| resource_limit(FailureStage::BindingHydration))?;
        let leaf = resolve_pointer_mut(&mut projection, &pointer)
            .ok_or_else(|| failure(FailureCode::BindingInvalid, FailureStage::BindingHydration))?;
        *leaf = JsonValue::Null;
    }

    validate_no_residual_package_tokens(&projection, &limits)?;

    // Rehydrating this package must remain inside both aggregate string
    // ceilings. Asset strings are ASCII, so their UTF-8 byte and UTF-16 code
    // unit charges are identical and are counted once per binding.
    let projected_strings = projection
        .measure_strings_with_limits(&limits)
        .map_err(|error| map_json_error(error, FailureStage::Project))?;
    ensure_at_most(
        checked_add(
            projected_strings.utf8_bytes,
            hydrated_data_url_fan_out,
            FailureStage::AssetCapture,
        )?,
        limits.hydrated_project_string_utf8_bytes,
        FailureStage::AssetCapture,
    )?;
    ensure_at_most(
        checked_add(
            projected_strings.utf16_code_units,
            hydrated_data_url_fan_out,
            FailureStage::AssetCapture,
        )?,
        limits.hydrated_project_string_utf16_code_units,
        FailureStage::AssetCapture,
    )?;

    let project_bytes = projection
        .to_canonical_bytes_bounded_with_limits(&limits, limits.project_bytes)
        .map_err(|error| map_json_error(error, FailureStage::Project))?;
    let project_length = checked_u64(project_bytes.len(), FailureStage::Project)?;
    ensure_at_most(project_length, limits.project_bytes, FailureStage::Project)?;
    let project_digest = Sha256Digest::from_bytes(crate::assets::sha256_digest(&project_bytes));
    let project_entry = ProjectEntry::new(project_length, project_digest)?;

    let mut asset_records = Vec::new();
    asset_records
        .try_reserve_exact(stager.records().len())
        .map_err(|_| resource_limit(FailureStage::Manifest))?;
    for staged in stager.records() {
        asset_records.push(AssetRecord::new(
            Sha256Digest::from_bytes(*staged.identity().digest()),
            staged.mime_type(),
            staged.byte_length(),
            staged.width(),
            staged.height(),
        )?);
    }

    let mut bindings = Vec::new();
    bindings
        .try_reserve_exact(pending_bindings.len())
        .map_err(|_| resource_limit(FailureStage::Manifest))?;
    for pending in &pending_bindings {
        let staged = stager
            .get(pending.asset)
            .ok_or_else(|| failure(FailureCode::AssetMissing, FailureStage::AssetValidation))?;
        let pointer = pending
            .owner
            .try_pointer()
            .map_err(|_| resource_limit(FailureStage::Manifest))?;
        bindings.push(BindingRecord::from_digest(
            pointer,
            Sha256Digest::from_bytes(*staged.identity().digest()),
        )?);
    }

    // `project_kind` is deliberately consumed here: deriving it was not just a
    // traversal convenience, and every binding remains from the same registry.
    for binding in &bindings {
        crate::registry::resolve_registered_owner(&schema_version, project_kind, binding.pointer())
            .map_err(|_| failure(FailureCode::BindingInvalid, FailureStage::BindingHydration))?;
    }

    let manifest = ManifestV1::new(
        schema_version,
        creator.try_clone_for_writer()?,
        project_entry,
        asset_records,
        bindings,
    )?;
    manifest.supported_schema_version()?;
    manifest.require_projection_schema_agreement(&projection)?;
    let manifest_bytes = manifest.to_canonical_bytes()?;

    let entry_count = stager
        .records()
        .len()
        .checked_add(2)
        .ok_or_else(|| resource_limit(FailureStage::Encoding))?;
    let mut entries = Vec::new();
    entries
        .try_reserve_exact(entry_count)
        .map_err(|_| resource_limit(FailureStage::Encoding))?;
    entries.push(StoredEntry {
        name: MANIFEST_ENTRY_NAME,
        bytes: &manifest_bytes,
    });
    entries.push(StoredEntry {
        name: PROJECT_ENTRY_NAME,
        bytes: &project_bytes,
    });
    for staged in stager.records() {
        entries.push(StoredEntry {
            name: staged.identity().path(),
            bytes: staged.bytes(),
        });
    }

    encode_stored_zip32(&entries, &limits)
}

fn index_complete_capture_plan<'a>(
    expected: &[AssetOwner],
    captures: &'a [AssetCapture],
) -> Result<Vec<&'a AssetCapture>, ProjectPackageFailure> {
    index_complete_capture_plan_with_observer(expected, captures, || {})
}

fn index_complete_capture_plan_with_observer<'a>(
    expected: &[AssetOwner],
    captures: &'a [AssetCapture],
    mut observe_comparison: impl FnMut(),
) -> Result<Vec<&'a AssetCapture>, ProjectPackageFailure> {
    if expected.len() != captures.len() {
        return Err(capture_failed());
    }

    let mut sorted_captures = Vec::new();
    sorted_captures
        .try_reserve_exact(captures.len())
        .map_err(|_| resource_limit(FailureStage::AssetCapture))?;
    sorted_captures.extend(captures.iter());
    sorted_captures.sort_unstable_by(|left, right| {
        observe_comparison();
        left.owner().cmp(&right.owner())
    });

    if sorted_captures
        .windows(2)
        .any(|pair| pair[0].owner() == pair[1].owner())
    {
        return Err(capture_failed());
    }

    let mut registry_order = Vec::new();
    registry_order
        .try_reserve_exact(expected.len())
        .map_err(|_| resource_limit(FailureStage::AssetCapture))?;
    for owner in expected {
        let index = sorted_captures
            .binary_search_by(|capture| {
                observe_comparison();
                capture.owner().cmp(owner)
            })
            .map_err(|_| capture_failed())?;
        registry_order.push(sorted_captures[index]);
    }
    Ok(registry_order)
}

fn derive_registry_shape(project: &JsonValue) -> Result<RegistryShape, ProjectPackageFailure> {
    match resolve_project_kind(project)? {
        ProjectKind::Disc => derive_disc_shape(project).map(RegistryShape::Disc),
        ProjectKind::CaseInsert => derive_case_shape(project).map(RegistryShape::CaseInsert),
    }
}

/// Mirrors the current schema owner's `resolveSchemaProjectType` precedence,
/// then applies its project-kind/template compatibility validation.
fn resolve_project_kind(project: &JsonValue) -> Result<ProjectKind, ProjectPackageFailure> {
    let direct = optional_project_kind(project, "projectType")?;
    let editor = match project.get("editor") {
        Some(JsonValue::Object(_)) => project.get("editor"),
        Some(_) | None => None,
    };
    let editor_project_type = match editor {
        Some(value) => optional_project_kind(value, "projectType")?,
        None => None,
    };
    let editor_workspace = match editor {
        Some(value) => optional_project_kind(value, "workspace")?,
        None => None,
    };

    let template = project.get("template").ok_or_else(invalid_project)?;
    if template.as_object_entries().is_none() {
        return Err(invalid_project());
    }
    let template_type = template
        .get("type")
        .and_then(JsonValue::as_str)
        .ok_or_else(invalid_project)?;
    let template_project_kind = match template_type {
        "disc" => Some(ProjectKind::Disc),
        "caseInsert" | "jewelCase" | "dvdAmaray" | "bluRay" => Some(ProjectKind::CaseInsert),
        _ => None,
    };

    let resolved = direct
        .or(editor_project_type)
        .or(editor_workspace)
        .or(template_project_kind)
        .ok_or_else(invalid_project)?;

    let template_is_compatible = match resolved {
        ProjectKind::Disc => template_type == "disc",
        ProjectKind::CaseInsert => matches!(
            template_type,
            "caseInsert" | "jewelCase" | "dvdAmaray" | "bluRay"
        ),
    };
    if !template_is_compatible {
        return Err(invalid_project());
    }
    Ok(resolved)
}

fn optional_project_kind(
    object: &JsonValue,
    key: &str,
) -> Result<Option<ProjectKind>, ProjectPackageFailure> {
    match object.get(key) {
        None => Ok(None),
        Some(JsonValue::String(value)) if value == "disc" => Ok(Some(ProjectKind::Disc)),
        Some(JsonValue::String(value)) if value == "caseInsert" => {
            Ok(Some(ProjectKind::CaseInsert))
        }
        Some(_) => Err(invalid_project()),
    }
}

fn derive_disc_shape(project: &JsonValue) -> Result<DiscRegistryShape, ProjectPackageFailure> {
    let mut additional_technical_assets = [0_usize; 5];
    for technical in TechnicalKind::ALL {
        let index = technical_ordinal(technical);
        additional_technical_assets[index] = optional_array_length(
            project,
            &["technicalMarks", "additionalAssets", technical.as_str()],
        )?;
    }

    Ok(DiscRegistryShape {
        additional_developer_logos: optional_array_length(
            project,
            &["logoAssets", "additionalDeveloperLogos"],
        )?,
        additional_publisher_logos: optional_array_length(
            project,
            &["logoAssets", "additionalPublisherLogos"],
        )?,
        additional_artwork: optional_array_length(project, &["additionalArtwork", "elements"])?,
        additional_technical_assets,
    })
}

fn derive_case_shape(project: &JsonValue) -> Result<CaseRegistryShape, ProjectPackageFailure> {
    Ok(CaseRegistryShape {
        cover: derive_case_surface_shape(project, &["caseInsert", "templates", "cover"])?,
        tray: derive_case_surface_shape(project, &["caseInsert", "templates", "tray"])?,
        spine_left: derive_case_surface_shape(project, &["caseInsert", "spine", "left"])?,
        spine_right: derive_case_surface_shape(project, &["caseInsert", "spine", "right"])?,
    })
}

fn derive_case_surface_shape(
    project: &JsonValue,
    prefix: &[&str],
) -> Result<CaseSurfaceRegistryShape, ProjectPackageFailure> {
    Ok(CaseSurfaceRegistryShape {
        artwork_slots: optional_array_length_with_suffix(project, prefix, "artworkSlots")?,
        logo_slots: optional_array_length_with_suffix(project, prefix, "logoSlots")?,
        mark_slots: optional_array_length_with_suffix(project, prefix, "markSlots")?,
    })
}

fn optional_array_length_with_suffix(
    root: &JsonValue,
    prefix: &[&str],
    suffix: &str,
) -> Result<usize, ProjectPackageFailure> {
    let mut path = Vec::new();
    path.try_reserve_exact(prefix.len().saturating_add(1))
        .map_err(|_| resource_limit(FailureStage::Project))?;
    path.extend_from_slice(prefix);
    path.push(suffix);
    optional_array_length(root, &path)
}

fn optional_array_length(root: &JsonValue, path: &[&str]) -> Result<usize, ProjectPackageFailure> {
    let mut current = root;
    for (index, segment) in path.iter().enumerate() {
        let Some(next) = current.get(segment) else {
            return Ok(0);
        };
        if index + 1 == path.len() {
            return next
                .as_array()
                .map(<[JsonValue]>::len)
                .ok_or_else(|| failure(FailureCode::HydratedJsonInvalid, FailureStage::Project));
        }
        if next.as_object_entries().is_none() {
            return Err(failure(
                FailureCode::HydratedJsonInvalid,
                FailureStage::Project,
            ));
        }
        current = next;
    }
    Ok(0)
}

fn resolve_pointer<'a>(root: &'a JsonValue, pointer: &str) -> Option<&'a JsonValue> {
    let mut current = root;
    for segment in pointer.strip_prefix('/')?.split('/') {
        current = match current {
            JsonValue::Object(_) => current.get(segment)?,
            JsonValue::Array(_) => current.get_index(parse_array_index(segment)?)?,
            _ => return None,
        };
    }
    Some(current)
}

fn resolve_pointer_mut<'a>(root: &'a mut JsonValue, pointer: &str) -> Option<&'a mut JsonValue> {
    let mut current = root;
    for segment in pointer.strip_prefix('/')?.split('/') {
        current = match current {
            JsonValue::Object(_) => current.get_mut(segment)?,
            JsonValue::Array(_) => current.get_index_mut(parse_array_index(segment)?)?,
            _ => return None,
        };
    }
    Some(current)
}

/// Validation-only scan after all registered leaves have been nulled. This is
/// not asset discovery: it never accepts, captures, or binds a value. Its sole
/// purpose is to prevent an unclassified inline payload, package placeholder,
/// or local filesystem location from escaping the closed registry into
/// `project.json`.
fn validate_no_residual_package_tokens(
    value: &JsonValue,
    limits: &PackageLimits,
) -> Result<(), ProjectPackageFailure> {
    match value {
        JsonValue::String(value) => {
            if checked_u64(value.len(), FailureStage::Project)? > limits.parsed_json_string_bytes {
                Err(resource_limit(FailureStage::Project))
            } else if has_forbidden_residual_prefix(value) {
                Err(capture_failed())
            } else {
                Ok(())
            }
        }
        JsonValue::Array(values) => {
            for value in values {
                validate_no_residual_package_tokens(value, limits)?;
            }
            Ok(())
        }
        JsonValue::Object(entries) => {
            for (_, value) in entries {
                validate_no_residual_package_tokens(value, limits)?;
            }
            Ok(())
        }
        JsonValue::Null | JsonValue::Bool(_) | JsonValue::Number(_) => Ok(()),
    }
}

fn has_forbidden_residual_prefix(value: &str) -> bool {
    let value = trim_ascii_whitespace(value);
    starts_with_ascii_case_insensitive(value, "data:image/")
        || starts_with_ascii_case_insensitive(value, "blob:")
        || starts_with_ascii_case_insensitive(value, "sbls://")
        || starts_with_ascii_case_insensitive(value, "asset://")
        || starts_with_ascii_case_insensitive(value, "assets/sha256/")
        || is_forbidden_filesystem_value(value)
}

fn starts_with_ascii_case_insensitive(value: &str, prefix: &str) -> bool {
    value
        .as_bytes()
        .get(..prefix.len())
        .is_some_and(|candidate| candidate.eq_ignore_ascii_case(prefix.as_bytes()))
}

fn parse_array_index(value: &str) -> Option<usize> {
    if value.is_empty() || (value.len() > 1 && value.starts_with('0')) {
        return None;
    }
    value.parse().ok()
}

const fn technical_ordinal(technical: TechnicalKind) -> usize {
    match technical {
        TechnicalKind::Audio => 0,
        TechnicalKind::Surround => 1,
        TechnicalKind::Codec => 2,
        TechnicalKind::Middleware => 3,
        TechnicalKind::Technology => 4,
    }
}

fn try_copy_string(value: &str, stage: FailureStage) -> Result<String, ProjectPackageFailure> {
    let mut copied = String::new();
    copied
        .try_reserve_exact(value.len())
        .map_err(|_| resource_limit(stage))?;
    copied.push_str(value);
    Ok(copied)
}

fn map_json_error(error: JsonErrorKind, stage: FailureStage) -> ProjectPackageFailure {
    if error.is_resource_limit() {
        resource_limit(stage)
    } else {
        failure(FailureCode::HydratedJsonInvalid, stage)
    }
}

fn map_asset_capture_error(error: AssetError) -> ProjectPackageFailure {
    match error {
        AssetError::InvalidDataUrl => {
            failure(FailureCode::AssetTypeInvalid, FailureStage::AssetCapture)
        }
        AssetError::UnsupportedMime => failure(
            FailureCode::AssetTypeUnsupported,
            FailureStage::AssetCapture,
        ),
        AssetError::ResourceLimitExceeded | AssetError::AllocationFailed => {
            resource_limit(FailureStage::AssetCapture)
        }
        AssetError::HashCollision => {
            failure(FailureCode::AssetHashCollision, FailureStage::AssetCapture)
        }
        AssetError::MetadataMismatch => {
            failure(FailureCode::AssetTypeInvalid, FailureStage::AssetValidation)
        }
    }
}

fn map_data_url_error(error: AssetError, value: &str) -> ProjectPackageFailure {
    if error == AssetError::UnsupportedMime {
        let declared_mime = value
            .split_once(',')
            .and_then(|(header, _)| header.strip_prefix("data:"))
            .map(|header| header.strip_suffix(";base64").unwrap_or(header))
            .and_then(|header| header.split(';').next());
        if declared_mime.is_some_and(is_accepted_raster_family_spelling) {
            // Aliases, casing differences, and parameterized spellings of an
            // accepted family are malformed normalized envelopes, not
            // additional package MIME types.
            return failure(FailureCode::AssetTypeInvalid, FailureStage::AssetCapture);
        }
    }
    map_asset_capture_error(error)
}

fn is_accepted_raster_family_spelling(value: &str) -> bool {
    [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/gif",
        "image/bmp",
    ]
    .iter()
    .any(|accepted| value.eq_ignore_ascii_case(accepted))
}

fn map_asset_stage_error(error: AssetError) -> ProjectPackageFailure {
    match error {
        AssetError::HashCollision => {
            failure(FailureCode::AssetHashCollision, FailureStage::AssetCapture)
        }
        AssetError::MetadataMismatch => {
            failure(FailureCode::AssetTypeInvalid, FailureStage::AssetValidation)
        }
        AssetError::ResourceLimitExceeded | AssetError::AllocationFailed => {
            resource_limit(FailureStage::AssetCapture)
        }
        AssetError::InvalidDataUrl | AssetError::UnsupportedMime => map_asset_capture_error(error),
    }
}

fn map_raster_error(error: RasterError) -> ProjectPackageFailure {
    let code = match error.kind {
        RasterErrorKind::Invalid => FailureCode::AssetTypeInvalid,
        RasterErrorKind::UnsupportedJpegProfile => FailureCode::AssetJpegProfileUnsupported,
        RasterErrorKind::UnsupportedBmpProfile => FailureCode::AssetBmpProfileUnsupported,
        RasterErrorKind::Dimensions => FailureCode::AssetDimensionsInvalid,
        RasterErrorKind::ResourceLimit => return resource_limit(FailureStage::AssetValidation),
    };
    failure(code, FailureStage::AssetValidation)
}

const fn failure(code: FailureCode, stage: FailureStage) -> ProjectPackageFailure {
    ProjectPackageFailure::new(code, stage)
}

const fn resource_limit(stage: FailureStage) -> ProjectPackageFailure {
    ProjectPackageFailure::resource_limit(stage)
}

const fn capture_failed() -> ProjectPackageFailure {
    failure(FailureCode::AssetCaptureFailed, FailureStage::AssetCapture)
}

const fn invalid_project() -> ProjectPackageFailure {
    failure(FailureCode::HydratedJsonInvalid, FailureStage::Project)
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine as _;

    use crate::archive::{inspect_zip32, EntryRole};
    use crate::decode::decode_project_package;
    use crate::json::parse_json_with_limits;
    use crate::limits::DecodeBudget;
    use crate::manifest::parse_manifest;
    use crate::model::{AssetCaptureDecision, PackageCreator};
    use crate::raster::RasterMime;
    use crate::registry::{CaseSurface, LogoRole};

    fn input(json: Vec<u8>, captures: Vec<AssetCapture>) -> ProjectPackageEncodeInput {
        ProjectPackageEncodeInput::new(
            json,
            PackageCreator::steam_backup_label_studio("0.1.0").unwrap(),
            captures,
        )
    }

    fn captures_for(
        json: &[u8],
        mut decision: impl FnMut(AssetOwner) -> AssetCaptureDecision,
    ) -> Vec<AssetCapture> {
        let project = parse_json_with_limits(json, &PackageLimits::V1).unwrap();
        raw_captures_for(json, |owner| {
            let requested = decision(owner);
            if matches!(&requested, AssetCaptureDecision::NoAcceptedAsset)
                && matches!(
                    classify_unbound_owner(&project, owner),
                    UnboundOwnerDisposition::BuiltInWithoutCompatibility
                )
                && resolve_pointer(&project, &owner.pointer()).is_some()
            {
                AssetCaptureDecision::captured_bytes(
                    RasterMime::Bmp,
                    &one_by_one_bmp([0x51, 0x42, 0x4c]),
                )
                .unwrap()
            } else {
                requested
            }
        })
    }

    fn raw_captures_for(
        json: &[u8],
        mut decision: impl FnMut(AssetOwner) -> AssetCaptureDecision,
    ) -> Vec<AssetCapture> {
        let project = parse_json_with_limits(json, &PackageLimits::V1).unwrap();
        let shape = derive_registry_shape(&project).unwrap();
        expand_registered_owners("0.3.0", shape)
            .unwrap()
            .into_iter()
            .map(|owner| AssetCapture::new(owner, decision(owner)))
            .collect()
    }

    fn captures_with_forced_no_asset(json: &[u8], target: AssetOwner) -> Vec<AssetCapture> {
        let mut captures = captures_for(json, |_| AssetCaptureDecision::NoAcceptedAsset);
        let capture = captures
            .iter_mut()
            .find(|capture| capture.owner() == target)
            .unwrap();
        *capture = AssetCapture::new(target, AssetCaptureDecision::NoAcceptedAsset);
        captures
    }

    fn disc_json(extra: &str) -> Vec<u8> {
        let steam_banner = if extra.contains(r#""steamBackupLogo""#) {
            ""
        } else {
            r#", "steamBackupLogo":{"lockupImageDataUrl":null,"lockupImageSource":null}"#
        };
        let logo_assets = if extra.contains(r#""logoAssets""#) {
            ""
        } else {
            r#","logoAssets":{"developerLogoDataUrl":null,"developerLogoSource":null,"developerLogoSize":null,"developerLogoLayout":{"enabled":true},"additionalDeveloperLogos":[],"publisherLogoDataUrl":null,"publisherLogoSource":null,"publisherLogoSize":null,"publisherLogoLayout":{"enabled":true},"additionalPublisherLogos":[]}"#
        };
        let rating_badge = if extra.contains(r#""ratingBadge""#) {
            ""
        } else {
            r#","ratingBadge":{"source":"placeholder","customImageDataUrl":null}"#
        };
        let media_mark = if extra.contains(r#""mediaMark""#) {
            ""
        } else {
            r#","mediaMark":{"source":"placeholder","customImageDataUrl":null}"#
        };
        format!(
            r#"{{"schemaVersion":"0.3.0","projectType":"disc","template":{{"type":"disc"}}{steam_banner}{logo_assets}{rating_badge}{media_mark}{extra}}}"#
        )
        .into_bytes()
    }

    fn case_json(
        cover_extra: &str,
        tray_extra: &str,
        spine_left_extra: &str,
        spine_right_extra: &str,
    ) -> Vec<u8> {
        let surface = |extra: &str| {
            format!(
                r#"{{"steamBanner":{{"lockupImageDataUrl":null,"lockupImageSource":null}}{extra}}}"#
            )
        };
        format!(
            r#"{{"schemaVersion":"0.3.0","projectType":"caseInsert","template":{{"type":"caseInsert"}},"caseInsert":{{"templates":{{"cover":{},"tray":{}}},"spine":{{"left":{},"right":{}}}}}}}"#,
            surface(cover_extra),
            surface(tray_extra),
            surface(spine_left_extra),
            surface(spine_right_extra),
        )
        .into_bytes()
    }

    fn canonical_data_url(mime: RasterMime, bytes: &[u8]) -> String {
        format!("data:{};base64,{}", mime.as_str(), STANDARD.encode(bytes))
    }

    fn one_by_one_bmp(pixel: [u8; 3]) -> Vec<u8> {
        let mut bytes = vec![0_u8; 58];
        bytes[0..2].copy_from_slice(b"BM");
        bytes[2..6].copy_from_slice(&58_u32.to_le_bytes());
        bytes[10..14].copy_from_slice(&54_u32.to_le_bytes());
        bytes[14..18].copy_from_slice(&40_u32.to_le_bytes());
        bytes[18..22].copy_from_slice(&1_u32.to_le_bytes());
        bytes[22..26].copy_from_slice(&1_u32.to_le_bytes());
        bytes[26..28].copy_from_slice(&1_u16.to_le_bytes());
        bytes[28..30].copy_from_slice(&24_u16.to_le_bytes());
        bytes[34..38].copy_from_slice(&4_u32.to_le_bytes());
        bytes[54..57].copy_from_slice(&pixel);
        bytes
    }

    fn inspect_package(bytes: &[u8]) -> (ManifestV1, Vec<u8>, Vec<Vec<u8>>) {
        let inventory = inspect_zip32(bytes, &PackageLimits::V1).unwrap();
        let mut budget = DecodeBudget::new(PackageLimits::V1);
        let manifest_bytes = inventory.read_manifest(&mut budget).unwrap();
        let manifest = parse_manifest(&manifest_bytes).unwrap();
        let inventory = inventory.validate_v1_layout().unwrap();
        let project_index = inventory.find(PROJECT_ENTRY_NAME).unwrap().0;
        let project = inventory
            .read_entry(project_index, EntryRole::Project, &mut budget)
            .unwrap()
            .into_owned();
        let assets = manifest
            .assets()
            .iter()
            .map(|asset| {
                let index = inventory.find(&asset.path()).unwrap().0;
                inventory
                    .read_entry(index, EntryRole::Asset, &mut budget)
                    .unwrap()
                    .into_owned()
            })
            .collect();
        (manifest, project, assets)
    }

    #[test]
    fn absent_case_surfaces_require_capture_of_normalized_default_banners() {
        let json = br#"{"schemaVersion":"0.3.0","projectType":"caseInsert","template":{"type":"caseInsert"},"caseInsert":{}}"#.to_vec();
        let captures = raw_captures_for(&json, |_| AssetCaptureDecision::NoAcceptedAsset);
        assert_eq!(captures.len(), 16);
        let error = encode_project_package(&input(json, captures)).unwrap_err();
        assert_eq!(error.code, FailureCode::BuiltInCaptureRequired);
        assert_eq!(error.stage, FailureStage::AssetCapture);
    }

    #[test]
    fn project_owned_data_url_is_validated_externalized_and_preserved_exactly() {
        let bmp = one_by_one_bmp([1, 2, 3]);
        let url = canonical_data_url(RasterMime::Bmp, &bmp);
        let json = disc_json(&format!(r#","background":{{"imageDataUrl":"{url}"}}"#));
        let captures = captures_for(&json, |owner| {
            if owner == AssetOwner::DiscBackground {
                AssetCaptureDecision::ProjectOwnedDataUrl
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            }
        });
        let package = encode_project_package(&input(json, captures)).unwrap();
        let (manifest, project, assets) = inspect_package(&package);

        assert_eq!(manifest.assets().len(), 2);
        assert_eq!(manifest.bindings().len(), 4);
        assert!(manifest
            .bindings()
            .iter()
            .any(|binding| binding.pointer() == "/background/imageDataUrl"));
        assert!(assets.contains(&bmp));
        let projection = parse_json_with_limits(&project, &PackageLimits::V1).unwrap();
        assert!(projection
            .get("background")
            .and_then(|value| value.get("imageDataUrl"))
            .unwrap()
            .is_null());
    }

    #[test]
    fn exact_bytes_deduplicate_across_owners_and_plan_order_is_irrelevant() {
        let bmp = one_by_one_bmp([7, 8, 9]);
        let url = canonical_data_url(RasterMime::Bmp, &bmp);
        let json = disc_json(&format!(
            r#","background":{{"imageDataUrl":"{url}"}},"steamBackupLogo":{{"lockupImageDataUrl":"{url}"}}"#
        ));
        let mut captures = captures_for(&json, |owner| {
            if matches!(
                owner,
                AssetOwner::DiscBackground | AssetOwner::DiscSteamBanner
            ) {
                AssetCaptureDecision::ProjectOwnedDataUrl
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            }
        });
        let canonical = encode_project_package(&input(json.clone(), captures.clone())).unwrap();
        captures.reverse();
        let reversed = encode_project_package(&input(json, captures)).unwrap();
        assert_eq!(canonical, reversed);

        let (manifest, _, assets) = inspect_package(&canonical);
        assert_eq!(manifest.assets().len(), 2);
        assert_eq!(manifest.bindings().len(), 4);
        assert!(assets.contains(&bmp));
    }

    #[test]
    fn duplicate_bindings_charge_raster_aggregate_budget_once_per_exact_asset() {
        let bmp = one_by_one_bmp([0x51, 0x42, 0x4c]);
        let url = canonical_data_url(RasterMime::Bmp, &bmp);
        let json = disc_json(&format!(r#", "background":{{"imageDataUrl":"{url}"}}"#));
        let captures = captures_for(&json, |owner| {
            if owner == AssetOwner::DiscBackground {
                AssetCaptureDecision::ProjectOwnedDataUrl
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            }
        });
        let mut raster_budget =
            RasterBudget::with_aggregate_limits_for_test(1, 4, u64::MAX, u64::MAX);

        let package = encode_project_package_inner_with_raster_budget(
            &input(json, captures),
            PackageLimits::V1,
            crate::assets::sha256_digest,
            &mut raster_budget,
        )
        .unwrap();
        let decoded = decode_project_package(&package).unwrap();
        assert_eq!(decoded.metadata().asset_count(), 1);
        assert_eq!(decoded.metadata().binding_count(), 4);
        let (pixels, samples, _, _) = raster_budget.totals_for_test();
        assert_eq!(pixels, 1);
        assert_eq!(samples, 4);
    }

    #[test]
    fn unique_asset_count_limit_is_rejected_before_raster_decode() {
        let json = disc_json(r#", "background":{"imageDataUrl":"data:image/bmp;base64,eA=="}"#);
        let captures = captures_for(&json, |owner| {
            if owner == AssetOwner::DiscBackground {
                AssetCaptureDecision::ProjectOwnedDataUrl
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            }
        });
        let mut limits = PackageLimits::V1;
        limits.assets = 0;

        let error = encode_project_package_inner(
            &input(json, captures),
            limits,
            crate::assets::sha256_digest,
        )
        .unwrap_err();
        assert_eq!(error.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(error.stage, FailureStage::AssetCapture);
    }

    #[test]
    fn typed_captured_bytes_can_externalize_an_existing_null_built_in_leaf() {
        let bmp = one_by_one_bmp([10, 11, 12]);
        let json = disc_json(
            r#","steamBackupLogo":{"lockupImageDataUrl":null,"lockupImageSource":{"source":"built-in","sourceId":"steam-banner","sourceLabel":"Steam banner"}}"#,
        );
        let captures = captures_for(&json, |owner| {
            if owner == AssetOwner::DiscSteamBanner {
                AssetCaptureDecision::captured_bytes(RasterMime::Bmp, &bmp).unwrap()
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            }
        });
        let package = encode_project_package(&input(json, captures)).unwrap();
        let (manifest, _, assets) = inspect_package(&package);
        assert!(manifest
            .bindings()
            .iter()
            .any(|binding| binding.pointer() == "/steamBackupLogo/lockupImageDataUrl"));
        assert!(assets.contains(&bmp));
    }

    #[test]
    fn typed_captured_bytes_must_agree_with_owner_semantics() {
        let bmp = one_by_one_bmp([0x31, 0x32, 0x33]);
        let absent = disc_json(r#", "background":{"imageDataUrl":null}"#);
        let captures = captures_for(&absent, |owner| {
            if owner == AssetOwner::DiscBackground {
                AssetCaptureDecision::captured_bytes(RasterMime::Bmp, &bmp).unwrap()
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            }
        });
        let error = encode_project_package(&input(absent, captures)).unwrap_err();
        assert_eq!(error.code, FailureCode::AssetCaptureFailed);
        assert_eq!(error.stage, FailureStage::AssetCapture);

        let accepted = disc_json(
            r#", "background":{"imageDataUrl":null,"imageSource":{"source":"uploaded"},"imageSize":{"width":1,"height":1}}"#,
        );
        let captures = captures_for(&accepted, |owner| {
            if owner == AssetOwner::DiscBackground {
                AssetCaptureDecision::captured_bytes(RasterMime::Bmp, &bmp).unwrap()
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            }
        });
        let error = encode_project_package(&input(accepted, captures)).unwrap_err();
        assert_eq!(error.code, FailureCode::AssetCaptureFailed);
        assert_eq!(error.stage, FailureStage::AssetCapture);

        for existing in [
            "DATA:image/bmp;base64,AAAA",
            " data:image/bmp;base64,AAAA",
            "blob:https://example.invalid/asset",
            "file:C:/Users/Example/asset.bmp",
            "sbls://sha256/example",
        ] {
            let json = disc_json(&format!(
                r#", "background":{{"imageDataUrl":"{existing}","imageSource":{{"source":"built-in"}}}}"#
            ));
            let captures = captures_for(&json, |owner| {
                if owner == AssetOwner::DiscBackground {
                    AssetCaptureDecision::captured_bytes(RasterMime::Bmp, &bmp).unwrap()
                } else {
                    AssetCaptureDecision::NoAcceptedAsset
                }
            });
            let error = encode_project_package(&input(json, captures)).unwrap_err();
            assert_eq!(error.code, FailureCode::AssetCaptureFailed, "{existing}");
            assert_eq!(error.stage, FailureStage::AssetCapture, "{existing}");
        }
    }

    #[test]
    fn implicit_and_variable_semantic_built_ins_require_exact_capture_bytes() {
        let implicit_disc =
            br#"{"schemaVersion":"0.3.0","projectType":"disc","template":{"type":"disc"}}"#
                .to_vec();
        let captures = raw_captures_for(&implicit_disc, |_| AssetCaptureDecision::NoAcceptedAsset);
        let error = encode_project_package(&input(implicit_disc, captures)).unwrap_err();
        assert_eq!(error.code, FailureCode::BuiltInCaptureRequired);
        assert_eq!(error.stage, FailureStage::AssetCapture);

        let additional_owner = AssetOwner::DiscAdditionalLogo {
            role: LogoRole::Developer,
            index: 0,
        };
        let disc_with_additional = disc_json(
            r#", "logoAssets":{"developerLogoDataUrl":null,"developerLogoSource":null,"developerLogoSize":null,"additionalDeveloperLogos":[{"imageDataUrl":null}],"publisherLogoDataUrl":null,"publisherLogoSource":null,"publisherLogoSize":null,"additionalPublisherLogos":[]}"#,
        );
        let captures = captures_with_forced_no_asset(&disc_with_additional, additional_owner);
        let error = encode_project_package(&input(disc_with_additional, captures)).unwrap_err();
        assert_eq!(error.code, FailureCode::BuiltInCaptureRequired);
        assert_eq!(error.stage, FailureStage::AssetCapture);

        let case_owner = AssetOwner::CaseLogo {
            surface: CaseSurface::Cover,
            index: 0,
        };
        let case_with_recognized_logo = case_json(
            r#", "artworkSlots":[],"logoSlots":[{"label":"Developer logo","imageDataUrl":null,"imageSource":null}],"markSlots":[]"#,
            "",
            "",
            "",
        );
        let captures = captures_with_forced_no_asset(&case_with_recognized_logo, case_owner);
        let error =
            encode_project_package(&input(case_with_recognized_logo, captures)).unwrap_err();
        assert_eq!(error.code, FailureCode::BuiltInCaptureRequired);
        assert_eq!(error.stage, FailureStage::AssetCapture);

        let normalized_case = case_json("", "", "", "");
        let captures = captures_with_forced_no_asset(
            &normalized_case,
            AssetOwner::CaseBanner {
                surface: CaseSurface::Cover,
            },
        );
        let error = encode_project_package(&input(normalized_case, captures)).unwrap_err();
        assert_eq!(error.code, FailureCode::BuiltInCaptureRequired);
        assert_eq!(error.stage, FailureStage::AssetCapture);
    }

    #[test]
    fn unknown_semantic_built_ins_are_rejected_before_capture_plan_dispatch() {
        for json in [
            disc_json(
                r#","ratingBadge":{"source":"placeholder","customImageDataUrl":null,"uskBadge":{"ratingValue":"21","layout":{"enabled":false}}}"#,
            ),
            disc_json(r#","discNumberArtwork":{"mode":"text","badgeSet":"unknown"}"#),
            disc_json(
                r#","additionalArtwork":{"elements":[{"imageDataUrl":null,"frame":{"style":"unknown","enabled":false}}]}"#,
            ),
            case_json(
                r#","artworkSlots":[{"imageDataUrl":null,"frame":{"style":"unknown","enabled":false}}]"#,
                "",
                "",
                "",
            ),
        ] {
            let error = encode_project_package(&input(json, Vec::new())).unwrap_err();
            assert_eq!(error.code, FailureCode::BuiltInCaptureRequired);
            assert_eq!(error.stage, FailureStage::AssetCapture);
        }
    }

    #[test]
    fn retained_logo_evidence_takes_precedence_over_fallback_capture() {
        let primary = disc_json(
            r#","logoAssets":{"developerLogoDataUrl":null,"developerLogoSource":{"source":"uploaded"},"developerLogoSize":{"width":1,"height":1},"additionalDeveloperLogos":[],"publisherLogoDataUrl":null,"publisherLogoSource":null,"publisherLogoSize":null,"additionalPublisherLogos":[]}"#,
        );
        let captures = captures_for(&primary, |_| AssetCaptureDecision::NoAcceptedAsset);
        let error = encode_project_package(&input(primary, captures)).unwrap_err();
        assert_eq!(error.code, FailureCode::AssetCaptureFailed);
        assert_eq!(error.stage, FailureStage::AssetCapture);

        let additional = disc_json(
            r#","logoAssets":{"developerLogoDataUrl":null,"developerLogoSource":null,"developerLogoSize":null,"additionalDeveloperLogos":[{"imageDataUrl":null,"imageSource":{"source":"uploaded"},"imageSize":{"width":1,"height":1}}],"publisherLogoDataUrl":null,"publisherLogoSource":null,"publisherLogoSize":null,"additionalPublisherLogos":[]}"#,
        );
        let captures = captures_for(&additional, |_| AssetCaptureDecision::NoAcceptedAsset);
        let error = encode_project_package(&input(additional, captures)).unwrap_err();
        assert_eq!(error.code, FailureCode::AssetCaptureFailed);
        assert_eq!(error.stage, FailureStage::AssetCapture);

        let recognized_case = case_json(
            r#","artworkSlots":[],"logoSlots":[{"label":"Developer logo","imageDataUrl":null,"imageSource":{"source":"embedded","sourceId":"case-logo:developer"},"imageSize":{"width":1,"height":1}}],"markSlots":[]"#,
            "",
            "",
            "",
        );
        let captures = captures_for(&recognized_case, |_| AssetCaptureDecision::NoAcceptedAsset);
        let error = encode_project_package(&input(recognized_case, captures)).unwrap_err();
        assert_eq!(error.code, FailureCode::AssetCaptureFailed);
        assert_eq!(error.stage, FailureStage::AssetCapture);
    }

    #[test]
    fn custom_mark_without_retained_custom_bytes_is_owner_confirmed_absence() {
        let json = disc_json(
            r#","ratingBadge":{"source":"custom","customImageDataUrl":null,"customImageSize":null}"#,
        );
        let captures = captures_with_forced_no_asset(&json, AssetOwner::DiscRatingCustom);
        encode_project_package(&input(json, captures)).unwrap();
    }

    #[test]
    fn semantic_logo_captured_bytes_round_trip_through_the_public_facades() {
        let owner = AssetOwner::CaseLogo {
            surface: CaseSurface::Cover,
            index: 0,
        };
        let bmp = one_by_one_bmp([0x21, 0x43, 0x65]);
        let expected_data_url = canonical_data_url(RasterMime::Bmp, &bmp);
        let json = case_json(
            r#", "artworkSlots":[],"logoSlots":[{"label":"Developer logo","imageDataUrl":null,"imageSource":null}],"markSlots":[]"#,
            "",
            "",
            "",
        );
        let captures = captures_for(&json, |candidate| {
            if candidate == owner {
                AssetCaptureDecision::captured_bytes(RasterMime::Bmp, &bmp).unwrap()
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            }
        });

        let package = encode_project_package(&input(json, captures)).unwrap();
        let decoded = decode_project_package(&package).unwrap();
        let hydrated =
            parse_json_with_limits(decoded.hydrated_project_json(), &PackageLimits::V1).unwrap();
        assert_eq!(
            resolve_pointer(&hydrated, &owner.pointer()).and_then(JsonValue::as_str),
            Some(expected_data_url.as_str())
        );
        assert_eq!(decoded.metadata().binding_count(), 5);
        assert_eq!(decoded.metadata().asset_count(), 2);
    }

    #[test]
    fn implicit_disc_primary_logos_round_trip_through_the_public_facades() {
        let json = disc_json("");
        let captures = captures_for(&json, |_| AssetCaptureDecision::NoAcceptedAsset);
        let expected_data_url =
            canonical_data_url(RasterMime::Bmp, &one_by_one_bmp([0x51, 0x42, 0x4c]));

        let package = encode_project_package(&input(json, captures)).unwrap();
        let decoded = decode_project_package(&package).unwrap();
        let hydrated =
            parse_json_with_limits(decoded.hydrated_project_json(), &PackageLimits::V1).unwrap();
        for owner in [
            AssetOwner::DiscPrimaryLogo {
                role: LogoRole::Developer,
            },
            AssetOwner::DiscPrimaryLogo {
                role: LogoRole::Publisher,
            },
        ] {
            assert_eq!(
                resolve_pointer(&hydrated, &owner.pointer()).and_then(JsonValue::as_str),
                Some(expected_data_url.as_str())
            );
        }
        assert_eq!(decoded.metadata().binding_count(), 3);
        assert_eq!(decoded.metadata().asset_count(), 1);
    }

    #[test]
    fn semantic_built_ins_cannot_be_mislabeled_as_no_accepted_asset() {
        for (extra, target) in [
            (
                r#","steamBackupLogo":{"lockupImageDataUrl":null,"lockupImageSource":{"source":"built-in"}}"#,
                AssetOwner::DiscSteamBanner,
            ),
            (
                r#","logoAssets":{"developerLogoDataUrl":null,"developerLogoSource":{"source":"built-in"},"developerLogoSize":null,"additionalDeveloperLogos":[],"publisherLogoDataUrl":null,"publisherLogoSource":null,"publisherLogoSize":null,"additionalPublisherLogos":[]}"#,
                AssetOwner::DiscPrimaryLogo {
                    role: LogoRole::Developer,
                },
            ),
            (
                r#","metadata":{"ratingSystem":"ESRB","ratingValue":"RP"},"ratingBadge":{"source":"placeholder","customImageDataUrl":null}"#,
                AssetOwner::DiscRatingCustom,
            ),
            (
                r#","platformMarks":{"assets":{"windows":{"source":"placeholder","customImageDataUrl":null}}}"#,
                AssetOwner::DiscPlatformCustom {
                    platform: crate::registry::PlatformKind::Windows,
                },
            ),
            (
                r#","technicalMarks":{"assets":{"audio":{"source":"placeholder","customImageDataUrl":null}},"additionalAssets":{}}"#,
                AssetOwner::DiscTechnicalPrimary {
                    technical: TechnicalKind::Audio,
                },
            ),
            (
                r#","platformMarks":{"values":["windows"],"assets":{}}"#,
                AssetOwner::DiscPlatformCustom {
                    platform: crate::registry::PlatformKind::Windows,
                },
            ),
            (
                r#","technicalMarks":{"values":["audio"],"assets":{},"additionalAssets":{}}"#,
                AssetOwner::DiscTechnicalPrimary {
                    technical: TechnicalKind::Audio,
                },
            ),
        ] {
            let json = disc_json(extra);
            let captures = captures_with_forced_no_asset(&json, target);
            let error = encode_project_package(&input(json, captures)).unwrap_err();
            assert_eq!(error.code, FailureCode::BuiltInCaptureRequired, "{extra}");
            assert_eq!(error.stage, FailureStage::AssetCapture, "{extra}");
        }

        let case_json = case_json(
            r#", "background":{"imageDataUrl":null,"imageSource":{"source":"placeholder"}},"artworkSlots":[],"logoSlots":[],"markSlots":[]"#,
            "",
            "",
            "",
        );
        let captures = captures_with_forced_no_asset(
            &case_json,
            AssetOwner::CaseBackground {
                surface: CaseSurface::Cover,
            },
        );
        let error = encode_project_package(&input(case_json, captures)).unwrap_err();
        assert_eq!(error.code, FailureCode::BuiltInCaptureRequired);
        assert_eq!(error.stage, FailureStage::AssetCapture);
    }

    #[test]
    fn capture_plan_must_classify_every_owner_exactly_once() {
        let json = disc_json("");
        let captures = captures_for(&json, |_| AssetCaptureDecision::NoAcceptedAsset);

        let mut missing = captures.clone();
        missing.pop();
        assert_eq!(
            encode_project_package(&input(json.clone(), missing))
                .unwrap_err()
                .code,
            FailureCode::AssetCaptureFailed
        );

        let mut duplicate = captures;
        duplicate[1] = duplicate[0].clone();
        assert_eq!(
            encode_project_package(&input(json, duplicate))
                .unwrap_err()
                .code,
            FailureCode::AssetCaptureFailed
        );
    }

    #[test]
    fn maximum_case_shape_capture_plan_indexing_is_linearithmic() {
        let slot_count = usize::try_from(PackageLimits::V1.json_array_members).unwrap();
        let surface = CaseSurfaceRegistryShape {
            artwork_slots: slot_count,
            logo_slots: slot_count,
            mark_slots: slot_count,
        };
        let owners = expand_registered_owners(
            "0.3.0",
            RegistryShape::CaseInsert(CaseRegistryShape {
                cover: surface,
                tray: surface,
                spine_left: surface,
                spine_right: surface,
            }),
        )
        .unwrap();
        assert!(owners.len() >= 49_000);

        let mut captures = Vec::new();
        captures.try_reserve_exact(owners.len()).unwrap();
        for owner in owners.iter().rev() {
            captures.push(AssetCapture::new(
                *owner,
                AssetCaptureDecision::NoAcceptedAsset,
            ));
        }

        let mut comparisons = 0_usize;
        let indexed = index_complete_capture_plan_with_observer(&owners, &captures, || {
            comparisons += 1;
        })
        .unwrap();
        assert!(indexed
            .iter()
            .zip(&owners)
            .all(|(capture, owner)| capture.owner() == *owner));

        let ceiling_log2 = usize::BITS as usize - (owners.len() - 1).leading_zeros() as usize;
        let linearithmic_bound = owners.len() * (4 * ceiling_log2 + 8);
        assert!(
            comparisons <= linearithmic_bound,
            "{comparisons} comparisons exceeded {linearithmic_bound} for {} owners",
            owners.len()
        );
    }

    #[test]
    fn no_asset_and_built_in_decisions_cannot_silently_drop_content() {
        let bmp = one_by_one_bmp([1, 1, 1]);
        let url = canonical_data_url(RasterMime::Bmp, &bmp);
        let json = disc_json(&format!(r#","background":{{"imageDataUrl":"{url}"}}"#));
        let no_asset = captures_for(&json, |_| AssetCaptureDecision::NoAcceptedAsset);
        assert_eq!(
            encode_project_package(&input(json.clone(), no_asset))
                .unwrap_err()
                .code,
            FailureCode::AssetCaptureFailed
        );

        let built_in = captures_for(&json, |owner| {
            if owner == AssetOwner::DiscBackground {
                AssetCaptureDecision::BuiltInCaptureRequired
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            }
        });
        assert_eq!(
            encode_project_package(&input(json, built_in))
                .unwrap_err()
                .code,
            FailureCode::AssetCaptureFailed
        );

        let semantic_built_in = disc_json("");
        let captures = captures_for(&semantic_built_in, |owner| {
            if owner == AssetOwner::DiscSteamBanner {
                AssetCaptureDecision::BuiltInCaptureRequired
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            }
        });
        assert_eq!(
            encode_project_package(&input(semantic_built_in, captures))
                .unwrap_err()
                .code,
            FailureCode::BuiltInCaptureRequired
        );
    }

    #[test]
    fn invalid_and_unsupported_data_urls_keep_distinct_stable_codes() {
        for (url, expected) in [
            (
                "data:image/bmp;base64,not base64",
                FailureCode::AssetTypeInvalid,
            ),
            ("data:image/jpg;base64,AA==", FailureCode::AssetTypeInvalid),
            ("data:IMAGE/PNG;base64,AA==", FailureCode::AssetTypeInvalid),
            (
                "data:image/png;charset=utf-8;base64,AA==",
                FailureCode::AssetTypeInvalid,
            ),
            ("data:image/png;BASE64,AA==", FailureCode::AssetTypeInvalid),
            (
                "data:image/svg+xml;base64,PHN2Zy8+",
                FailureCode::AssetTypeUnsupported,
            ),
        ] {
            let json = disc_json(&format!(r#","background":{{"imageDataUrl":"{url}"}}"#));
            let captures = captures_for(&json, |owner| {
                if owner == AssetOwner::DiscBackground {
                    AssetCaptureDecision::ProjectOwnedDataUrl
                } else {
                    AssetCaptureDecision::NoAcceptedAsset
                }
            });
            assert_eq!(
                encode_project_package(&input(json, captures))
                    .unwrap_err()
                    .code,
                expected
            );
        }
    }

    fn forced_digest(_: &[u8]) -> [u8; 32] {
        [0x5a; 32]
    }

    #[test]
    fn forced_same_digest_with_unequal_bytes_is_never_deduplicated() {
        let first = one_by_one_bmp([1, 2, 3]);
        let second = one_by_one_bmp([4, 5, 6]);
        let first_url = canonical_data_url(RasterMime::Bmp, &first);
        let second_url = canonical_data_url(RasterMime::Bmp, &second);
        let json = disc_json(&format!(
            r#","background":{{"imageDataUrl":"{first_url}"}},"steamBackupLogo":{{"lockupImageDataUrl":"{second_url}"}}"#
        ));
        let captures = captures_for(&json, |owner| {
            if matches!(
                owner,
                AssetOwner::DiscBackground | AssetOwner::DiscSteamBanner
            ) {
                AssetCaptureDecision::ProjectOwnedDataUrl
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            }
        });
        let failure =
            encode_project_package_inner(&input(json, captures), PackageLimits::V1, forced_digest)
                .unwrap_err();
        assert_eq!(failure.code, FailureCode::AssetHashCollision);
        assert_eq!(failure.stage, FailureStage::AssetCapture);
    }

    #[test]
    fn case_cover_tray_and_both_spines_are_all_classified_and_bound() {
        let bmp = one_by_one_bmp([20, 21, 22]);
        let url = canonical_data_url(RasterMime::Bmp, &bmp);
        let surface = |slots: usize| {
            format!(
                r#"{{"steamBanner":{{"lockupImageDataUrl":null,"lockupImageSource":null}},"background":{{"imageDataUrl":"{url}"}},"artworkSlots":[{}],"logoSlots":[],"markSlots":[]}}"#,
                (0..slots)
                    .map(|_| r#"{"imageDataUrl":null}"#)
                    .collect::<Vec<_>>()
                    .join(",")
            )
        };
        let json = format!(
            r#"{{"schemaVersion":"0.3.0","projectType":"caseInsert","template":{{"type":"caseInsert"}},"caseInsert":{{"templates":{{"cover":{},"tray":{}}},"spine":{{"left":{},"right":{}}}}}}}"#,
            surface(1),
            surface(0),
            surface(0),
            surface(0)
        )
        .into_bytes();
        let captures = captures_for(&json, |owner| {
            if matches!(owner, AssetOwner::CaseBackground { .. }) {
                AssetCaptureDecision::ProjectOwnedDataUrl
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            }
        });
        assert_eq!(
            captures
                .iter()
                .filter(|capture| matches!(capture.owner(), AssetOwner::CaseBackground { .. }))
                .count(),
            CaseSurface::ALL.len()
        );
        let package = encode_project_package(&input(json, captures)).unwrap();
        let (manifest, _, assets) = inspect_package(&package);
        assert_eq!(manifest.assets().len(), 2);
        assert_eq!(manifest.bindings().len(), 8);
        assert!(assets.contains(&bmp));
    }

    #[test]
    fn malformed_normalized_project_and_wrong_schema_fail_before_capture() {
        let malformed = input(b"{".to_vec(), Vec::new());
        assert_eq!(
            encode_project_package(&malformed).unwrap_err().code,
            FailureCode::HydratedJsonInvalid
        );

        let future = input(
            br#"{"schemaVersion":"9.0.0","template":{"type":"disc"}}"#.to_vec(),
            Vec::new(),
        );
        assert_eq!(
            encode_project_package(&future).unwrap_err().code,
            FailureCode::ProjectSchemaUnsupported
        );

        let future_without_current_shape = input(
            br#"{"schemaVersion":"9.0.0","futureProjectKind":"future"}"#.to_vec(),
            Vec::new(),
        );
        assert_eq!(
            encode_project_package(&future_without_current_shape)
                .unwrap_err()
                .code,
            FailureCode::ProjectSchemaUnsupported
        );
    }

    #[test]
    fn project_kind_resolution_matches_current_schema_precedence_and_template_rules() {
        let editor_only = br#"{"schemaVersion":"0.3.0","editor":{"projectType":"disc"},"template":{"type":"disc"}}"#;
        let editor_project = parse_json_with_limits(editor_only, &PackageLimits::V1).unwrap();
        assert_eq!(
            resolve_project_kind(&editor_project).unwrap(),
            ProjectKind::Disc
        );

        let direct_wins = br#"{"schemaVersion":"0.3.0","projectType":"disc","editor":{"projectType":"caseInsert","workspace":"caseInsert"},"template":{"type":"disc"}}"#;
        let direct_project = parse_json_with_limits(direct_wins, &PackageLimits::V1).unwrap();
        assert_eq!(
            resolve_project_kind(&direct_project).unwrap(),
            ProjectKind::Disc
        );

        for invalid in [
            br#"{"schemaVersion":"0.3.0","projectType":"other","template":{"type":"disc"}}"#.as_slice(),
            br#"{"schemaVersion":"0.3.0","projectType":"caseInsert","template":{"type":"disc"}}"#.as_slice(),
            br#"{"schemaVersion":"0.3.0","editor":{"workspace":"home"},"template":{"type":"disc"}}"#.as_slice(),
        ] {
            let project = parse_json_with_limits(invalid, &PackageLimits::V1).unwrap();
            assert_eq!(
                resolve_project_kind(&project).unwrap_err().code,
                FailureCode::HydratedJsonInvalid
            );
        }

        for template_type in ["caseInsert", "jewelCase", "dvdAmaray", "bluRay"] {
            let json = format!(
                r#"{{"schemaVersion":"0.3.0","projectType":"caseInsert","template":{{"type":"{template_type}"}},"caseInsert":{{}}}}"#
            );
            let project = parse_json_with_limits(json.as_bytes(), &PackageLimits::V1).unwrap();
            assert_eq!(
                resolve_project_kind(&project).unwrap(),
                ProjectKind::CaseInsert
            );
        }
    }

    #[test]
    fn residual_asset_payloads_and_package_tokens_cannot_bypass_the_registry() {
        let bmp = one_by_one_bmp([30, 31, 32]);
        let data_url = canonical_data_url(RasterMime::Bmp, &bmp);
        for token in [
            data_url.as_str(),
            "blob:https://example.invalid/asset",
            "sbls://sha256/example",
            "asset://example",
            "assets/sha256/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.bmp",
        ] {
            let json = disc_json(&format!(r#","futureOwner":{{"imageDataUrl":"{token}"}}"#));
            let captures = captures_for(&json, |_| AssetCaptureDecision::NoAcceptedAsset);
            let error = encode_project_package(&input(json, captures)).unwrap_err();
            assert_eq!(error.code, FailureCode::AssetCaptureFailed, "{token}");
            assert_eq!(error.stage, FailureStage::AssetCapture, "{token}");
        }
    }

    #[test]
    fn inert_http_provenance_and_prose_are_not_mistaken_for_package_tokens() {
        let json = disc_json(
            r#","title":"C: The Game","provenance":{"sourceUrl":"https://example.invalid/assets/sha256/artwork.png","label":"assets and blob URLs are user-provided concepts"}"#,
        );
        let captures = captures_for(&json, |_| AssetCaptureDecision::NoAcceptedAsset);
        encode_project_package(&input(json, captures)).unwrap();
    }

    #[test]
    fn local_filesystem_locations_never_survive_into_the_projection() {
        for path in [
            r"C:\Users\Example\artwork.png",
            r"\\server\share\artwork.png",
            "/home/example/artwork.png",
            "file:///home/example/artwork.png",
        ] {
            let escaped = path.replace('\\', "\\\\");
            let json = disc_json(&format!(r#","provenance":{{"sourcePath":"{escaped}"}}"#));
            let captures = captures_for(&json, |_| AssetCaptureDecision::NoAcceptedAsset);
            let error = encode_project_package(&input(json, captures)).unwrap_err();
            assert_eq!(error.code, FailureCode::AssetCaptureFailed, "{path}");
            assert_eq!(error.stage, FailureStage::AssetCapture, "{path}");
        }
    }

    #[test]
    fn binding_budget_is_rejected_before_asset_validation_or_output() {
        let bmp = one_by_one_bmp([40, 41, 42]);
        let url = canonical_data_url(RasterMime::Bmp, &bmp);
        let json = disc_json(&format!(
            r#","background":{{"imageDataUrl":"{url}"}},"steamBackupLogo":{{"lockupImageDataUrl":"{url}"}}"#
        ));
        let captures = captures_for(&json, |owner| {
            if matches!(
                owner,
                AssetOwner::DiscBackground | AssetOwner::DiscSteamBanner
            ) {
                AssetCaptureDecision::ProjectOwnedDataUrl
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            }
        });
        let mut limits = PackageLimits::V1;
        limits.bindings = 1;
        let error = encode_project_package_inner(
            &input(json, captures),
            limits,
            crate::assets::sha256_digest,
        )
        .unwrap_err();
        assert_eq!(error.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(error.stage, FailureStage::AssetCapture);
    }

    #[test]
    fn compact_limit_uses_the_same_preallocation_control_flow() {
        let json = disc_json("");
        let captures = captures_for(&json, |_| AssetCaptureDecision::NoAcceptedAsset);
        let mut limits = PackageLimits::V1;
        limits.project_bytes = 8;
        let failure = encode_project_package_inner(
            &input(json, captures),
            limits,
            crate::assets::sha256_digest,
        )
        .unwrap_err();
        assert_eq!(failure.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(failure.stage, FailureStage::Project);
    }

    #[test]
    fn project_writer_accepts_exact_output_boundary_and_rejects_one_under() {
        let json = disc_json("");
        let captures = captures_for(&json, |_| AssetCaptureDecision::NoAcceptedAsset);
        let exact = checked_u64(
            parse_json_with_limits(&json, &PackageLimits::V1)
                .unwrap()
                .to_canonical_bytes()
                .unwrap()
                .len(),
            FailureStage::Project,
        )
        .unwrap();

        let mut exact_limits = PackageLimits::V1;
        exact_limits.project_bytes = exact;
        encode_project_package_inner(
            &input(json.clone(), captures.clone()),
            exact_limits,
            crate::assets::sha256_digest,
        )
        .unwrap();

        let mut one_under = exact_limits;
        one_under.project_bytes = exact - 1;
        let failure = encode_project_package_inner(
            &input(json, captures),
            one_under,
            crate::assets::sha256_digest,
        )
        .unwrap_err();
        assert_eq!(failure.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(failure.stage, FailureStage::Project);
    }

    #[test]
    fn cross_kind_oversized_asset_paths_are_rejected_before_materialization() {
        let oversized = "data:image/bmp;base64,QUFBQUFBQUFB";
        for json in [
            format!(
                r#"{{"schemaVersion":"0.3.0","projectType":"caseInsert","template":{{"type":"caseInsert"}},"caseInsert":{{}},"background":{{"imageDataUrl":"{oversized}"}}}}"#
            ),
            format!(
                r#"{{"schemaVersion":"0.3.0","projectType":"disc","template":{{"type":"disc"}},"caseInsert":{{"templates":{{"cover":{{"background":{{"imageDataUrl":"{oversized}"}}}}}}}}}}"#
            ),
        ] {
            let json = json.into_bytes();
            let captures = captures_for(&json, |_| AssetCaptureDecision::NoAcceptedAsset);
            let mut limits = PackageLimits::V1;
            limits.parsed_json_string_bytes = 32;
            limits.hydrated_data_url_bytes = 64;
            let failure = encode_project_package_inner(
                &input(json, captures),
                limits,
                crate::assets::sha256_digest,
            )
            .unwrap_err();
            assert_eq!(failure.code, FailureCode::ResourceLimitExceeded);
            assert_eq!(failure.stage, FailureStage::Project);
        }
    }

    #[test]
    fn variable_disc_owner_arrays_are_not_discovered_recursively() {
        let json = disc_json(
            r#","logoAssets":{"developerLogoDataUrl":null,"developerLogoSource":null,"developerLogoSize":null,"additionalDeveloperLogos":[{"imageDataUrl":null}],"publisherLogoDataUrl":null,"publisherLogoSource":null,"publisherLogoSize":null,"additionalPublisherLogos":[{"imageDataUrl":null}]},"additionalArtwork":{"elements":[{"imageDataUrl":null}]},"technicalMarks":{"additionalAssets":{"audio":[{"customImageDataUrl":null}],"surround":[],"codec":[],"middleware":[],"technology":[]}}"#,
        );
        let captures = captures_for(&json, |_| AssetCaptureDecision::NoAcceptedAsset);
        assert!(captures.iter().any(|capture| {
            capture.owner()
                == AssetOwner::DiscAdditionalLogo {
                    role: LogoRole::Developer,
                    index: 0,
                }
        }));
        assert!(captures.iter().any(|capture| {
            capture.owner()
                == AssetOwner::DiscAdditionalLogo {
                    role: LogoRole::Publisher,
                    index: 0,
                }
        }));
        assert!(captures
            .iter()
            .any(|capture| { capture.owner() == AssetOwner::DiscAdditionalArtwork { index: 0 } }));
        assert!(captures.iter().any(|capture| {
            capture.owner()
                == AssetOwner::DiscTechnicalAdditional {
                    technical: TechnicalKind::Audio,
                    index: 0,
                }
        }));
        encode_project_package(&input(json, captures)).unwrap();
    }
}
