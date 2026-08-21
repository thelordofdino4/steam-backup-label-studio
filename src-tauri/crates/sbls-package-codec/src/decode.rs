//! Strict, in-memory `.sbls` package-v1 decoder.
//!
//! The decoder owns no filesystem, lifecycle, dialog, Tauri, or network
//! behavior. It validates one immutable caller byte slice completely and only
//! then returns an owned, canonically serialized hydrated JSON candidate.

use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;
use std::borrow::Cow;
use std::panic::{catch_unwind, AssertUnwindSafe};

use crate::archive::{inspect_zip32, EntryRole, V1ZipInventory, PROJECT_ENTRY_NAME};
use crate::assets::sha256_digest;
use crate::error::{FailureCode, FailureStage, ProjectPackageFailure};
#[cfg(test)]
use crate::json::parse_json_with_limits;
use crate::json::{
    is_forbidden_filesystem_value, parse_json_accounted_with_limits, trim_ascii_whitespace,
    JsonErrorKind, JsonValue,
};
use crate::limits::{
    checked_add, checked_mul, checked_u64, checked_usize, decoded_pixel_count,
    decoded_sample_charge, hydrated_data_url_len, DecodeBudget, OperationAllocationLedger,
    PackageLimits,
};
use crate::manifest::{parse_manifest_accounted_with_limits, ManifestV1};
use crate::model::{DecodedPackageMetadata, DecodedProjectPackage};
use crate::raster::{validate_raster, RasterBudget, RasterError, RasterErrorKind, RasterMime};
use crate::registry::{
    classify_unbound_owner, expand_registered_owners, first_unavailable_semantic_builtin,
    has_qualified_builtin_mapping, resolve_registered_owner, CaseRegistryShape,
    CaseSurfaceRegistryShape, DiscRegistryShape, ProjectKind, RegistryError, RegistryShape,
    TechnicalKind, UnboundOwnerDisposition,
};

/// Decode one complete package candidate without retaining caller-owned bytes.
///
/// Known validation failures retain their exact stable code and stage. An
/// unexpected Rust panic is contained at this pure boundary and becomes the
/// narrowest existing decoder fallback: an invalid archive at raw input. This
/// containment is not an allocation strategy; every input-driven allocation
/// remains bounded and fallible before this boundary is reached.
pub fn decode_project_package(
    package_bytes: &[u8],
) -> Result<DecodedProjectPackage, ProjectPackageFailure> {
    contain_decode_operation(|| {
        decode_project_package_with_limits(package_bytes, &PackageLimits::V1)
    })
}

fn contain_decode_operation(
    operation: impl FnOnce() -> Result<DecodedProjectPackage, ProjectPackageFailure>,
) -> Result<DecodedProjectPackage, ProjectPackageFailure> {
    match catch_unwind(AssertUnwindSafe(operation)) {
        Ok(result) => result,
        Err(_) => Err(failure(FailureCode::ArchiveInvalid, FailureStage::RawInput)),
    }
}

fn decode_project_package_with_limits(
    package_bytes: &[u8],
    limits: &PackageLimits,
) -> Result<DecodedProjectPackage, ProjectPackageFailure> {
    let mut allocations = OperationAllocationLedger::new(limits.decoder_working_bytes);
    decode_project_package_with_allocation_ledger(package_bytes, limits, &mut allocations)
}

/// Runs one decode against a caller-owned operation ledger. The wrapper is a
/// cleanup boundary: all locals from the inner decode have dropped before any
/// outstanding receipt is rolled back, so an early return cannot contaminate
/// a later operation that reuses the ledger.
fn decode_project_package_with_allocation_ledger(
    package_bytes: &[u8],
    limits: &PackageLimits,
    allocations: &mut OperationAllocationLedger,
) -> Result<DecodedProjectPackage, ProjectPackageFailure> {
    let entry_retained = allocations.retained();
    let result = decode_project_package_accounted_inner(package_bytes, limits, allocations);
    let retained = allocations.retained();
    let outstanding = retained
        .checked_sub(entry_retained)
        .ok_or_else(|| ProjectPackageFailure::resource_limit(FailureStage::RawInput))?;
    allocations
        .release(outstanding)
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::RawInput))?;
    result
}

fn decode_project_package_accounted_inner(
    package_bytes: &[u8],
    limits: &PackageLimits,
    allocations: &mut OperationAllocationLedger,
) -> Result<DecodedProjectPackage, ProjectPackageFailure> {
    recognize_package_candidate(package_bytes, limits)?;

    let inventory = inspect_zip32(package_bytes, limits)?;
    let mut budget = DecodeBudget::new(*limits);

    // Identity and package-version recognition deliberately precede the
    // closed v1 layout check. A future package is not interpreted as v1 just
    // because its archive happens to contain v1-looking paths.
    let (manifest_bytes, manifest_bytes_charge) =
        inventory.read_manifest_accounted(&mut budget, allocations)?;
    let parsed_manifest =
        parse_manifest_accounted_with_limits(&manifest_bytes, limits, allocations);
    drop(manifest_bytes);
    allocations
        .release(manifest_bytes_charge)
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::Manifest))?;
    // The receipt remains in the operation ledger through the successful
    // outer handoff because schema/creator Strings move from this graph into
    // the returned metadata. The outer cleanup boundary transfers it only
    // after the complete return value exists.
    let (manifest, _manifest_charge) = parsed_manifest?;
    let inventory = inventory.validate_v1_layout()?;

    let (mut projection, projection_charge) =
        read_and_validate_projection(&inventory, &manifest, &mut budget, limits, allocations)?;
    let schema_version = manifest.supported_schema_version()?;
    let project_kind = resolve_project_kind(&projection)?;
    let registry_shape = derive_registry_shape(&projection, project_kind)?;

    preflight_asset_inventory(&inventory, &manifest)?;
    let validated_assets = read_and_validate_assets(&inventory, &manifest, &mut budget, limits)?;

    let hydrated_output_maximum = hydrate_bindings(
        &mut projection,
        &manifest,
        schema_version.as_str(),
        project_kind,
        registry_shape,
        &validated_assets,
        &mut budget,
        limits,
    )?;

    // Hydration has copied every required encoded payload into the projection,
    // so decoded archive asset buffers can be released before canonical output.
    // Keep the conservative manifest receipt live while creator/schema Strings
    // transfer into output metadata and while canonical output is allocated.
    // Hydration-created Strings are governed by separate checked fan-out and
    // aggregate-string budgets; they are not part of the parse receipt.
    drop(validated_assets);
    let (package_version, project_schema_version, creator, asset_count, binding_count) =
        manifest.into_decoded_metadata_parts();
    let hydrated_project_json = projection
        .to_canonical_bytes_precharged_with_limits(limits, hydrated_output_maximum)
        .map_err(map_hydrated_json_error)?;
    drop(projection);
    allocations
        .release(projection_charge)
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::BindingHydration))?;
    let metadata = DecodedPackageMetadata::new(
        package_version,
        project_schema_version,
        creator,
        asset_count,
        binding_count,
    );

    Ok(DecodedProjectPackage::new(hydrated_project_json, metadata))
}

fn recognize_package_candidate(
    bytes: &[u8],
    limits: &PackageLimits,
) -> Result<(), ProjectPackageFailure> {
    let byte_length = checked_u64(bytes.len(), FailureStage::RawInput)?;
    if byte_length > limits.raw_archive_bytes {
        return Err(failure(FailureCode::FileTooLarge, FailureStage::RawInput));
    }
    if bytes.get(0..4) != Some(b"PK\x03\x04") {
        return Err(failure(
            FailureCode::FormatUnsupported,
            FailureStage::RawInput,
        ));
    }
    Ok(())
}

fn read_and_validate_projection(
    inventory: &V1ZipInventory<'_>,
    manifest: &ManifestV1,
    budget: &mut DecodeBudget,
    limits: &PackageLimits,
    allocations: &mut OperationAllocationLedger,
) -> Result<(JsonValue, u64), ProjectPackageFailure> {
    let (project_index, _) = inventory
        .find(PROJECT_ENTRY_NAME)
        .ok_or_else(|| failure(FailureCode::ProjectMissing, FailureStage::Project))?;
    let (project_bytes, project_bytes_charge) =
        inventory.read_entry_accounted(project_index, EntryRole::Project, budget, allocations)?;
    let observed_length = checked_u64(project_bytes.len(), FailureStage::Project)?;
    if observed_length != manifest.project().byte_length()
        || sha256_digest(&project_bytes) != *manifest.project().sha256().as_bytes()
    {
        drop(project_bytes);
        allocations
            .release(project_bytes_charge)
            .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::Project))?;
        return Err(failure(
            FailureCode::ProjectDigestMismatch,
            FailureStage::Project,
        ));
    }

    let parsed_projection = parse_json_accounted_with_limits(&project_bytes, limits, allocations)
        .map_err(map_project_json_error);
    drop(project_bytes);
    allocations
        .release(project_bytes_charge)
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::Project))?;
    let (projection, projection_charge) = parsed_projection?;
    if projection.as_object_entries().is_none() {
        drop(projection);
        allocations
            .release(projection_charge)
            .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::Project))?;
        return Err(failure(
            FailureCode::HydratedJsonInvalid,
            FailureStage::Project,
        ));
    }
    if let Err(error) = manifest.require_projection_schema_agreement(&projection) {
        drop(projection);
        allocations
            .release(projection_charge)
            .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::Project))?;
        return Err(error);
    }
    Ok((projection, projection_charge))
}

fn preflight_asset_inventory(
    inventory: &V1ZipInventory<'_>,
    manifest: &ManifestV1,
) -> Result<(), ProjectPackageFailure> {
    let archive_assets = inventory
        .entries()
        .get(2..)
        .ok_or_else(|| failure(FailureCode::AssetMissing, FailureStage::AssetValidation))?;
    if archive_assets.len() != manifest.assets().len() {
        return Err(failure(
            FailureCode::AssetMissing,
            FailureStage::AssetValidation,
        ));
    }

    for (archive_entry, asset) in archive_assets.iter().zip(manifest.assets()) {
        let expected_path = asset.try_path()?;
        if archive_entry.name != expected_path.as_str() {
            return Err(failure(
                FailureCode::AssetMissing,
                FailureStage::AssetValidation,
            ));
        }
    }
    validate_manifest_asset_reachability(manifest, FailureStage::AssetValidation)
}

fn validate_manifest_asset_reachability(
    manifest: &ManifestV1,
    stage: FailureStage,
) -> Result<(), ProjectPackageFailure> {
    // A syntactically invalid assetId is deferred to BindingInvalid. Every
    // well-formed reference and every admitted asset still participates in the
    // earlier AssetMissing/unreferenced proof.
    for binding in manifest.bindings() {
        let Some(digest) = binding.parsed_asset_digest() else {
            continue;
        };
        if manifest
            .assets()
            .binary_search_by_key(&digest, |asset| asset.sha256())
            .is_err()
        {
            return Err(failure(FailureCode::AssetMissing, stage));
        }
    }
    for asset in manifest.assets() {
        if !manifest
            .bindings()
            .iter()
            .any(|binding| binding.parsed_asset_digest() == Some(asset.sha256()))
        {
            return Err(failure(FailureCode::AssetMissing, stage));
        }
    }
    Ok(())
}

fn read_and_validate_assets<'a>(
    inventory: &V1ZipInventory<'a>,
    manifest: &ManifestV1,
    budget: &mut DecodeBudget,
    limits: &PackageLimits,
) -> Result<Vec<Cow<'a, [u8]>>, ProjectPackageFailure> {
    let mut assets = Vec::new();
    assets
        .try_reserve_exact(manifest.assets().len())
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::AssetValidation))?;
    let mut raster_budget = RasterBudget::default();

    let validation = (|| -> Result<(), ProjectPackageFailure> {
        for (offset, record) in manifest.assets().iter().enumerate() {
            let entry_index = offset.checked_add(2).ok_or_else(|| {
                ProjectPackageFailure::resource_limit(FailureStage::AssetValidation)
            })?;
            let bytes = inventory.read_entry(entry_index, EntryRole::Asset, budget)?;

            let observed_length = checked_u64(bytes.len(), FailureStage::AssetValidation)?;
            if observed_length != record.byte_length()
                || sha256_digest(bytes.as_ref()) != *record.sha256().as_bytes()
            {
                return Err(failure(
                    FailureCode::AssetDigestMismatch,
                    FailureStage::AssetValidation,
                ));
            }

            budget.begin_decoder()?;
            let raster_result =
                validate_raster(bytes.as_ref(), record.mime_type(), &mut raster_budget);
            let info = match raster_result {
                Ok(info) => info,
                Err(error) => {
                    // No DecodeBudget working bytes have been charged yet. The
                    // raster/native validator owns and releases its operation
                    // allocations before returning, including all failure paths.
                    budget.finish_decoder()?;
                    if let Some((width, height)) = error.validated_dimensions {
                        if width != record.width() || height != record.height() {
                            return Err(failure(
                                FailureCode::AssetDimensionsInvalid,
                                FailureStage::AssetValidation,
                            ));
                        }
                    }
                    return Err(map_raster_error(error));
                }
            };

            if let Err(error) = budget.charge_decoder_working(info.decoder_peak_bytes) {
                // charge_decoder_working preflights before mutation.
                budget.finish_decoder()?;
                return Err(error);
            }
            budget.release_decoder_working(info.decoder_peak_bytes)?;
            budget.finish_decoder()?;

            let pixels = decoded_pixel_count(
                u64::from(info.width),
                u64::from(info.height),
                u64::from(info.frames),
                limits,
                FailureStage::AssetValidation,
            )?;
            let samples = decoded_sample_charge(
                pixels,
                u64::from(info.channels),
                u64::from(info.bit_depth),
                limits,
                FailureStage::AssetValidation,
            )?;
            budget.charge_asset_validation(
                pixels,
                samples,
                info.metadata_bytes,
                info.structural_records,
            )?;

            if info.width != record.width() || info.height != record.height() {
                return Err(failure(
                    FailureCode::AssetDimensionsInvalid,
                    FailureStage::AssetValidation,
                ));
            }
            assets.push(bytes);
        }
        Ok(())
    })();

    validation?;
    Ok(assets)
}

#[allow(clippy::too_many_arguments)]
fn hydrate_bindings(
    projection: &mut JsonValue,
    manifest: &ManifestV1,
    schema_version: &str,
    project_kind: ProjectKind,
    registry_shape: RegistryShape,
    assets: &[Cow<'_, [u8]>],
    budget: &mut DecodeBudget,
    limits: &PackageLimits,
) -> Result<u64, ProjectPackageFailure> {
    let mut owners = expand_registered_owners(schema_version, registry_shape)
        .map_err(map_registry_expansion_error)?;
    owners.sort_unstable();

    let mut asset_indices = Vec::new();
    asset_indices
        .try_reserve_exact(manifest.bindings().len())
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::BindingHydration))?;

    if assets.len() != manifest.assets().len() {
        return Err(failure(
            FailureCode::AssetMissing,
            FailureStage::BindingHydration,
        ));
    }

    // Asset reachability and duplicate raw pointers precede all pointer/assetId
    // syntax and registry/null validation. Manifest parsing intentionally owns
    // only bounded closed record capture so cross-stage precedence cannot be
    // short-circuited there.
    validate_manifest_asset_reachability(manifest, FailureStage::BindingHydration)?;
    if manifest
        .bindings()
        .windows(2)
        .any(|pair| pair[0].pointer() == pair[1].pointer())
    {
        return Err(failure(
            FailureCode::BindingConflict,
            FailureStage::BindingHydration,
        ));
    }

    for binding in manifest.bindings() {
        binding.validate().map_err(|_| binding_invalid())?;
        let digest = binding.parsed_asset_digest().ok_or_else(binding_invalid)?;
        let asset_index = manifest
            .assets()
            .binary_search_by_key(&digest, |asset| asset.sha256())
            .map_err(|_| failure(FailureCode::AssetMissing, FailureStage::BindingHydration))?;
        asset_indices.push(asset_index);
    }

    // All syntax/registry/reference/null checks happen before residual-token
    // and hydrated-allocation checks, preserving the contract's within-stage
    // failure precedence.
    for (binding, asset_index) in manifest.bindings().iter().zip(&asset_indices) {
        let owner = resolve_registered_owner(schema_version, project_kind, binding.pointer())
            .map_err(|_| binding_invalid())?;
        if owners.binary_search(&owner).is_err() {
            return Err(binding_invalid());
        }
        match resolve_pointer(projection, binding.pointer()) {
            Some(value) if value.is_null() => {}
            _ => return Err(binding_invalid()),
        }
        if assets.get(*asset_index).is_none() {
            return Err(failure(
                FailureCode::AssetMissing,
                FailureStage::BindingHydration,
            ));
        }
    }

    let mut has_unresolved_owner = false;
    for owner in &owners {
        let pointer = owner.try_pointer().map_err(map_registry_expansion_error)?;
        let is_bound = manifest
            .bindings()
            .binary_search_by(|binding| binding.pointer().cmp(pointer.as_str()))
            .is_ok();
        let leaf = resolve_pointer(projection, &pointer);
        if is_bound {
            match leaf {
                Some(value) if value.is_null() => continue,
                _ => return Err(binding_invalid()),
            }
        }

        match classify_unbound_owner(projection, *owner) {
            UnboundOwnerDisposition::NoAcceptedAsset => {}
            UnboundOwnerDisposition::BuiltInWithoutCompatibility => {
                if !has_qualified_builtin_mapping(projection, *owner) {
                    return Err(built_in_unavailable());
                }
            }
            UnboundOwnerDisposition::AcceptedAssetMissingBinding => {
                has_unresolved_owner = true;
            }
        }
    }
    if first_unavailable_semantic_builtin(projection, project_kind).is_some() {
        return Err(built_in_unavailable());
    }
    if has_unresolved_owner {
        return Err(binding_unresolved());
    }
    if contains_unresolved_projection_token(projection, true) {
        return Err(binding_unresolved());
    }

    let base_measure = projection
        .measure_strings_with_limits(limits)
        .map_err(map_hydrated_json_error)?;
    let mut fan_out_bytes = 0_u64;
    for (binding, asset_index) in manifest.bindings().iter().zip(&asset_indices) {
        let record = &manifest.assets()[*asset_index];
        let prefix_length = data_url_prefix_length(record.mime_type())?;
        let url_length = hydrated_data_url_len(
            record.byte_length(),
            prefix_length,
            limits,
            FailureStage::BindingHydration,
        )?;
        fan_out_bytes = checked_add(fan_out_bytes, url_length, FailureStage::BindingHydration)?;
        // Keep `binding` in the loop so any later plan representation cannot
        // accidentally become detached from deterministic manifest order.
        debug_assert!(!binding.pointer().is_empty());
    }
    let hydrated_utf8 = checked_add(
        base_measure.utf8_bytes,
        fan_out_bytes,
        FailureStage::BindingHydration,
    )?;
    let hydrated_utf16 = checked_add(
        base_measure.utf16_code_units,
        fan_out_bytes,
        FailureStage::BindingHydration,
    )?;
    budget.charge_hydrated_strings(fan_out_bytes, hydrated_utf8, hydrated_utf16)?;

    for (binding, asset_index) in manifest.bindings().iter().zip(asset_indices) {
        let record = &manifest.assets()[asset_index];
        let bytes = &assets[asset_index];
        let data_url = build_canonical_data_url(record.mime_type(), bytes, limits)?;
        let leaf =
            resolve_pointer_mut(projection, binding.pointer()).ok_or_else(binding_invalid)?;
        if !leaf.is_null() {
            return Err(binding_invalid());
        }
        *leaf = JsonValue::string(data_url);
    }

    if contains_unresolved_projection_token(projection, false) {
        return Err(binding_unresolved());
    }
    let final_measure = projection
        .measure_strings_with_limits(limits)
        .map_err(map_hydrated_json_error)?;
    if final_measure.utf8_bytes != hydrated_utf8 || final_measure.utf16_code_units != hydrated_utf16
    {
        return Err(failure(
            FailureCode::HydratedJsonInvalid,
            FailureStage::BindingHydration,
        ));
    }

    // Canonical strings and structural tokens cannot exceed their source JSON
    // spelling; hydration adds one quoted ASCII data URL per binding. RFC 8785
    // number rendering is at most 24 bytes, so each source number (at least one
    // byte in project.json) needs at most 23 bytes of additional allowance.
    // This is a derived per-operation envelope, not a new protocol limit.
    const MAX_CANONICAL_NUMBER_BYTES: u64 = 24;
    let binding_count = checked_u64(manifest.bindings().len(), FailureStage::BindingHydration)?;
    let quoted_binding_overhead = checked_mul(binding_count, 2, FailureStage::BindingHydration)?;
    let number_growth = checked_mul(
        final_measure.number_count,
        MAX_CANONICAL_NUMBER_BYTES - 1,
        FailureStage::BindingHydration,
    )?;
    let maximum = checked_add(
        manifest.project().byte_length(),
        fan_out_bytes,
        FailureStage::BindingHydration,
    )?;
    let maximum = checked_add(
        maximum,
        quoted_binding_overhead,
        FailureStage::BindingHydration,
    )?;
    checked_add(maximum, number_growth, FailureStage::BindingHydration)
}

fn build_canonical_data_url(
    mime_type: RasterMime,
    bytes: &[u8],
    limits: &PackageLimits,
) -> Result<String, ProjectPackageFailure> {
    let prefix = match mime_type {
        RasterMime::Png => "data:image/png;base64,",
        RasterMime::Jpeg => "data:image/jpeg;base64,",
        RasterMime::Webp => "data:image/webp;base64,",
        RasterMime::Gif => "data:image/gif;base64,",
        RasterMime::Bmp => "data:image/bmp;base64,",
    };
    let byte_length = checked_u64(bytes.len(), FailureStage::BindingHydration)?;
    let total_length = hydrated_data_url_len(
        byte_length,
        checked_u64(prefix.len(), FailureStage::BindingHydration)?,
        limits,
        FailureStage::BindingHydration,
    )?;
    let total_length = checked_usize(total_length, FailureStage::BindingHydration)?;
    let encoded_length = total_length
        .checked_sub(prefix.len())
        .ok_or_else(|| ProjectPackageFailure::resource_limit(FailureStage::BindingHydration))?;

    let mut output = Vec::new();
    output
        .try_reserve_exact(total_length)
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::BindingHydration))?;
    output.extend_from_slice(prefix.as_bytes());
    output.resize(total_length, 0);
    let written = STANDARD
        .encode_slice(bytes, &mut output[prefix.len()..])
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::BindingHydration))?;
    if written != encoded_length {
        return Err(failure(
            FailureCode::HydratedJsonInvalid,
            FailureStage::BindingHydration,
        ));
    }
    String::from_utf8(output).map_err(|_| {
        failure(
            FailureCode::HydratedJsonInvalid,
            FailureStage::BindingHydration,
        )
    })
}

fn data_url_prefix_length(mime_type: RasterMime) -> Result<u64, ProjectPackageFailure> {
    // `data:` + canonical MIME + `;base64,`.
    checked_add(
        checked_add(
            5,
            checked_u64(mime_type.as_str().len(), FailureStage::BindingHydration)?,
            FailureStage::BindingHydration,
        )?,
        8,
        FailureStage::BindingHydration,
    )
}

fn resolve_project_kind(projection: &JsonValue) -> Result<ProjectKind, ProjectPackageFailure> {
    let direct = optional_project_kind(projection, "projectType")?;
    let editor = match projection.get("editor") {
        Some(JsonValue::Object(_)) => projection.get("editor"),
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
    let template = projection
        .get("template")
        .ok_or_else(hydrated_json_invalid_project)?;
    if template.as_object_entries().is_none() {
        return Err(hydrated_json_invalid_project());
    }
    let template_type = projection
        .get("template")
        .and_then(|value| value.get("type"))
        .and_then(JsonValue::as_str)
        .ok_or_else(hydrated_json_invalid_project)?;
    let template_project_kind = match template_type {
        "disc" => Some(ProjectKind::Disc),
        "caseInsert" | "jewelCase" | "dvdAmaray" | "bluRay" => Some(ProjectKind::CaseInsert),
        _ => None,
    };
    let resolved = direct
        .or(editor_project_type)
        .or(editor_workspace)
        .or(template_project_kind)
        .ok_or_else(hydrated_json_invalid_project)?;

    let template_is_compatible = match resolved {
        ProjectKind::Disc => template_type == "disc",
        ProjectKind::CaseInsert => matches!(
            template_type,
            "caseInsert" | "jewelCase" | "dvdAmaray" | "bluRay"
        ),
    };
    if !template_is_compatible {
        return Err(hydrated_json_invalid_project());
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
        Some(_) => Err(hydrated_json_invalid_project()),
    }
}

fn derive_registry_shape(
    projection: &JsonValue,
    project_kind: ProjectKind,
) -> Result<RegistryShape, ProjectPackageFailure> {
    match project_kind {
        ProjectKind::Disc => Ok(RegistryShape::Disc(DiscRegistryShape {
            additional_developer_logos: optional_array_length_at(
                projection,
                &["logoAssets", "additionalDeveloperLogos"],
            )?,
            additional_publisher_logos: optional_array_length_at(
                projection,
                &["logoAssets", "additionalPublisherLogos"],
            )?,
            additional_artwork: optional_array_length_at(
                projection,
                &["additionalArtwork", "elements"],
            )?,
            additional_technical_assets: {
                let mut lengths = [0_usize; 5];
                for (index, technical) in TechnicalKind::ALL.into_iter().enumerate() {
                    lengths[index] = optional_array_length_at(
                        projection,
                        &["technicalMarks", "additionalAssets", technical.as_str()],
                    )?;
                }
                lengths
            },
        })),
        ProjectKind::CaseInsert => Ok(RegistryShape::CaseInsert(CaseRegistryShape {
            cover: case_surface_shape(projection, &["caseInsert", "templates", "cover"])?,
            tray: case_surface_shape(projection, &["caseInsert", "templates", "tray"])?,
            spine_left: case_surface_shape(projection, &["caseInsert", "spine", "left"])?,
            spine_right: case_surface_shape(projection, &["caseInsert", "spine", "right"])?,
        })),
    }
}

fn case_surface_shape(
    projection: &JsonValue,
    path: &[&str],
) -> Result<CaseSurfaceRegistryShape, ProjectPackageFailure> {
    let Some(surface) = optional_object_at(projection, path)? else {
        return Ok(CaseSurfaceRegistryShape::default());
    };
    Ok(CaseSurfaceRegistryShape {
        artwork_slots: optional_array_member_length(surface, "artworkSlots")?,
        logo_slots: optional_array_member_length(surface, "logoSlots")?,
        mark_slots: optional_array_member_length(surface, "markSlots")?,
    })
}

fn optional_array_length_at(
    value: &JsonValue,
    path: &[&str],
) -> Result<usize, ProjectPackageFailure> {
    let (member, parents) = path
        .split_last()
        .ok_or_else(hydrated_json_invalid_project)?;
    let Some(parent) = optional_object_at(value, parents)? else {
        return Ok(0);
    };
    optional_array_member_length(parent, member)
}

fn optional_object_at<'a>(
    mut value: &'a JsonValue,
    path: &[&str],
) -> Result<Option<&'a JsonValue>, ProjectPackageFailure> {
    for key in path {
        let Some(child) = value.get(key) else {
            return Ok(None);
        };
        if child.as_object_entries().is_none() {
            return Err(hydrated_json_invalid_project());
        }
        value = child;
    }
    Ok(Some(value))
}

fn optional_array_member_length(
    parent: &JsonValue,
    member: &str,
) -> Result<usize, ProjectPackageFailure> {
    match parent.get(member) {
        None => Ok(0),
        Some(JsonValue::Array(values)) => Ok(values.len()),
        Some(_) => Err(hydrated_json_invalid_project()),
    }
}

fn resolve_pointer<'a>(mut value: &'a JsonValue, pointer: &str) -> Option<&'a JsonValue> {
    for segment in pointer.strip_prefix('/')?.split('/') {
        value = match value {
            JsonValue::Object(entries) => entries
                .iter()
                .find_map(|(key, child)| (key == segment).then_some(child))?,
            JsonValue::Array(values) => values.get(parse_canonical_index(segment)?)?,
            _ => return None,
        };
    }
    Some(value)
}

fn resolve_pointer_mut<'a>(
    mut value: &'a mut JsonValue,
    pointer: &str,
) -> Option<&'a mut JsonValue> {
    for segment in pointer.strip_prefix('/')?.split('/') {
        value = match value {
            JsonValue::Object(entries) => entries
                .iter_mut()
                .find_map(|(key, child)| (key == segment).then_some(child))?,
            JsonValue::Array(values) => values.get_mut(parse_canonical_index(segment)?)?,
            _ => return None,
        };
    }
    Some(value)
}

fn parse_canonical_index(segment: &str) -> Option<usize> {
    if segment == "0" {
        return Some(0);
    }
    if segment.is_empty()
        || segment.starts_with('0')
        || !segment.as_bytes().iter().all(u8::is_ascii_digit)
    {
        return None;
    }
    segment.parse().ok()
}

fn contains_unresolved_projection_token(value: &JsonValue, reject_image_data: bool) -> bool {
    match value {
        JsonValue::String(value) => {
            let value = trim_ascii_whitespace(value);
            is_forbidden_filesystem_value(value)
                || starts_with_ascii_case_insensitive(value, "sbls://")
                || starts_with_ascii_case_insensitive(value, "asset://")
                || starts_with_ascii_case_insensitive(value, "blob:")
                || starts_with_ascii_case_insensitive(value, "assets/sha256/")
                || (reject_image_data && starts_with_ascii_case_insensitive(value, "data:image/"))
        }
        JsonValue::Array(values) => values
            .iter()
            .any(|child| contains_unresolved_projection_token(child, reject_image_data)),
        JsonValue::Object(entries) => entries
            .iter()
            .any(|(_, child)| contains_unresolved_projection_token(child, reject_image_data)),
        JsonValue::Null | JsonValue::Bool(_) | JsonValue::Number(_) => false,
    }
}

fn starts_with_ascii_case_insensitive(value: &str, prefix: &str) -> bool {
    value
        .get(..prefix.len())
        .is_some_and(|candidate| candidate.eq_ignore_ascii_case(prefix))
}

fn map_project_json_error(error: JsonErrorKind) -> ProjectPackageFailure {
    if error.is_resource_limit() {
        ProjectPackageFailure::resource_limit(FailureStage::Project)
    } else {
        failure(FailureCode::HydratedJsonInvalid, FailureStage::Project)
    }
}

fn map_hydrated_json_error(error: JsonErrorKind) -> ProjectPackageFailure {
    if error.is_resource_limit() {
        ProjectPackageFailure::resource_limit(FailureStage::BindingHydration)
    } else {
        failure(
            FailureCode::HydratedJsonInvalid,
            FailureStage::BindingHydration,
        )
    }
}

fn map_raster_error(error: RasterError) -> ProjectPackageFailure {
    let code = match error.kind {
        RasterErrorKind::Invalid => FailureCode::AssetTypeInvalid,
        RasterErrorKind::UnsupportedJpegProfile => FailureCode::AssetJpegProfileUnsupported,
        RasterErrorKind::UnsupportedBmpProfile => FailureCode::AssetBmpProfileUnsupported,
        RasterErrorKind::Dimensions => FailureCode::AssetDimensionsInvalid,
        RasterErrorKind::ResourceLimit => FailureCode::ResourceLimitExceeded,
    };
    failure(code, FailureStage::AssetValidation)
}

fn map_registry_expansion_error(error: RegistryError) -> ProjectPackageFailure {
    match error {
        RegistryError::UnsupportedSchemaVersion => {
            failure(FailureCode::ProjectSchemaUnsupported, FailureStage::Project)
        }
        RegistryError::CapacityOverflow => {
            ProjectPackageFailure::resource_limit(FailureStage::BindingHydration)
        }
        _ => binding_invalid(),
    }
}

const fn failure(code: FailureCode, stage: FailureStage) -> ProjectPackageFailure {
    ProjectPackageFailure::new(code, stage)
}

const fn binding_invalid() -> ProjectPackageFailure {
    failure(FailureCode::BindingInvalid, FailureStage::BindingHydration)
}

const fn binding_unresolved() -> ProjectPackageFailure {
    failure(
        FailureCode::BindingUnresolved,
        FailureStage::BindingHydration,
    )
}

const fn built_in_unavailable() -> ProjectPackageFailure {
    failure(
        FailureCode::BuiltInUnavailable,
        FailureStage::BindingHydration,
    )
}

const fn hydrated_json_invalid_project() -> ProjectPackageFailure {
    failure(FailureCode::HydratedJsonInvalid, FailureStage::Project)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::archive::{encode_stored_zip32, StoredEntry, MANIFEST_ENTRY_NAME};
    use crate::manifest::{AssetRecord, BindingRecord, ProjectEntry, Sha256Digest};
    use crate::model::PackageCreator;
    use crate::registry::{AssetOwner, CaseSurface, LogoRole, PlatformKind};

    fn digest(bytes: &[u8]) -> Sha256Digest {
        Sha256Digest::from_bytes(sha256_digest(bytes))
    }

    fn minimal_disc_projection(schema: &str, background: &str) -> Vec<u8> {
        minimal_disc_projection_with_members(schema, background, "")
    }

    fn minimal_disc_projection_with_members(
        schema: &str,
        background: &str,
        members: &str,
    ) -> Vec<u8> {
        format!(
            r#"{{"schemaVersion":"{schema}","template":{{"type":"disc"}},"background":{{"imageDataUrl":{background}}},"steamBackupLogo":{{"lockupImageDataUrl":null}},"logoAssets":{{"developerLogoDataUrl":null,"publisherLogoDataUrl":null}},"ratingBadge":{{"source":"custom","customImageDataUrl":null,"customImageSize":{{"width":1,"height":1}}}},"mediaMark":{{"source":"custom","customImageDataUrl":null,"customImageSize":{{"width":1,"height":1}}}}{members}}}"#
        )
        .into_bytes()
    }

    fn minimal_case_projection(schema: &str, members: &str) -> Vec<u8> {
        format!(
            r#"{{"schemaVersion":"{schema}","projectType":"caseInsert","template":{{"type":"caseInsert"}},"caseInsert":{{"templates":{{"cover":{{"steamBanner":{{"lockupImageDataUrl":null}}}},"tray":{{"steamBanner":{{"lockupImageDataUrl":null}}}}}},"spine":{{"left":{{"steamBanner":{{"lockupImageDataUrl":null}}}},"right":{{"steamBanner":{{"lockupImageDataUrl":null}}}}}}}}{members}}}"#
        )
        .into_bytes()
    }

    fn package(
        project: &[u8],
        schema: &str,
        assets: Vec<(AssetRecord, Vec<u8>)>,
        bindings: Vec<BindingRecord>,
    ) -> Vec<u8> {
        package_with_project_digest(project, schema, assets, bindings, digest(project))
    }

    fn package_with_primary_disc_logos(
        project: &[u8],
        schema: &str,
        mut assets: Vec<(AssetRecord, Vec<u8>)>,
        mut bindings: Vec<BindingRecord>,
    ) -> Vec<u8> {
        let projection = parse_json_with_limits(project, &PackageLimits::V1).unwrap();
        let bytes = canonical_bmp_1x1();
        let logo_digest = digest(&bytes);
        if !assets
            .iter()
            .any(|(record, _)| record.sha256() == logo_digest)
        {
            assets.push((
                AssetRecord::new(logo_digest, RasterMime::Bmp, bytes.len() as u64, 1, 1).unwrap(),
                bytes,
            ));
        }
        for pointer in [
            "/steamBackupLogo/lockupImageDataUrl",
            "/logoAssets/developerLogoDataUrl",
            "/logoAssets/publisherLogoDataUrl",
            "/ratingBadge/customImageDataUrl",
            "/mediaMark/customImageDataUrl",
        ] {
            if resolve_pointer(&projection, pointer).is_some_and(JsonValue::is_null)
                && !bindings.iter().any(|binding| binding.pointer() == pointer)
            {
                bindings.push(BindingRecord::from_digest(pointer.to_owned(), logo_digest).unwrap());
            }
        }
        package(project, schema, assets, bindings)
    }

    fn package_with_case_banners(
        project: &[u8],
        schema: &str,
        mut assets: Vec<(AssetRecord, Vec<u8>)>,
        mut bindings: Vec<BindingRecord>,
    ) -> Vec<u8> {
        let bytes = canonical_bmp_1x1();
        let banner_digest = digest(&bytes);
        if !assets
            .iter()
            .any(|(record, _)| record.sha256() == banner_digest)
        {
            assets.push((
                AssetRecord::new(banner_digest, RasterMime::Bmp, bytes.len() as u64, 1, 1).unwrap(),
                bytes,
            ));
        }
        for pointer in [
            "/caseInsert/templates/cover/steamBanner/lockupImageDataUrl",
            "/caseInsert/templates/tray/steamBanner/lockupImageDataUrl",
            "/caseInsert/spine/left/steamBanner/lockupImageDataUrl",
            "/caseInsert/spine/right/steamBanner/lockupImageDataUrl",
        ] {
            if !bindings.iter().any(|binding| binding.pointer() == pointer) {
                bindings
                    .push(BindingRecord::from_digest(pointer.to_owned(), banner_digest).unwrap());
            }
        }
        package(project, schema, assets, bindings)
    }

    fn package_with_project_digest(
        project: &[u8],
        schema: &str,
        assets: Vec<(AssetRecord, Vec<u8>)>,
        bindings: Vec<BindingRecord>,
        project_digest: Sha256Digest,
    ) -> Vec<u8> {
        let project_record = ProjectEntry::new(project.len() as u64, project_digest).unwrap();
        let manifest = ManifestV1::new(
            schema,
            PackageCreator::steam_backup_label_studio("test").unwrap(),
            project_record,
            assets.iter().map(|(record, _)| record.clone()).collect(),
            bindings,
        )
        .unwrap();
        let manifest_bytes = manifest.to_canonical_bytes().unwrap();
        let asset_paths = assets
            .iter()
            .map(|(record, _)| record.path())
            .collect::<Vec<_>>();
        let mut entries = Vec::with_capacity(assets.len() + 2);
        entries.push(StoredEntry {
            name: MANIFEST_ENTRY_NAME,
            bytes: &manifest_bytes,
        });
        entries.push(StoredEntry {
            name: PROJECT_ENTRY_NAME,
            bytes: project,
        });
        for ((_, bytes), path) in assets.iter().zip(&asset_paths) {
            entries.push(StoredEntry { name: path, bytes });
        }
        encode_stored_zip32(&entries, &PackageLimits::V1).unwrap()
    }

    fn raw_manifest(project: &[u8], schema: &str, assets: &str, bindings: &str) -> Vec<u8> {
        format!(
            r#"{{"format":"sbls/project-package","packageVersion":1,"projectSchemaVersion":"{schema}","createdBy":{{"application":"test-reader","version":"1"}},"project":{{"path":"project.json","byteLength":{},"sha256":"{}"}},"assets":[{assets}],"bindings":[{bindings}]}}"#,
            project.len(),
            digest(project).to_lower_hex(),
        )
        .into_bytes()
    }

    fn package_with_raw_manifest(
        project: &[u8],
        manifest_bytes: &[u8],
        assets: &[(String, Vec<u8>)],
    ) -> Vec<u8> {
        let mut entries = Vec::new();
        entries.push(StoredEntry {
            name: MANIFEST_ENTRY_NAME,
            bytes: manifest_bytes,
        });
        entries.push(StoredEntry {
            name: PROJECT_ENTRY_NAME,
            bytes: project,
        });
        for (path, bytes) in assets {
            entries.push(StoredEntry { name: path, bytes });
        }
        encode_stored_zip32(&entries, &PackageLimits::V1).unwrap()
    }

    fn classify_fixture(json: &str, owner: AssetOwner) -> UnboundOwnerDisposition {
        let projection = parse_json_with_limits(json.as_bytes(), &PackageLimits::V1).unwrap();
        classify_unbound_owner(&projection, owner)
    }

    fn canonical_bmp_1x1() -> Vec<u8> {
        let mut bytes = vec![0_u8; 58];
        bytes[0..2].copy_from_slice(b"BM");
        bytes[2..6].copy_from_slice(&58_u32.to_le_bytes());
        bytes[10..14].copy_from_slice(&54_u32.to_le_bytes());
        bytes[14..18].copy_from_slice(&40_u32.to_le_bytes());
        bytes[18..22].copy_from_slice(&1_i32.to_le_bytes());
        bytes[22..26].copy_from_slice(&1_i32.to_le_bytes());
        bytes[26..28].copy_from_slice(&1_u16.to_le_bytes());
        bytes[28..30].copy_from_slice(&24_u16.to_le_bytes());
        bytes[34..38].copy_from_slice(&4_u32.to_le_bytes());
        bytes[54..58].copy_from_slice(&[3, 2, 1, 0]);
        bytes
    }

    fn one_bmp_package(project: &[u8], width: u32, height: u32) -> Vec<u8> {
        let bmp = canonical_bmp_1x1();
        bmp_package(project, bmp, width, height)
    }

    fn bmp_package(project: &[u8], bmp: Vec<u8>, width: u32, height: u32) -> Vec<u8> {
        let asset_digest = digest(&bmp);
        let asset = AssetRecord::new(
            asset_digest,
            RasterMime::Bmp,
            bmp.len() as u64,
            width,
            height,
        )
        .unwrap();
        let binding =
            BindingRecord::from_digest("/background/imageDataUrl".to_owned(), asset_digest)
                .unwrap();
        package_with_primary_disc_logos(project, "0.2.0", vec![(asset, bmp)], vec![binding])
    }

    fn replace_archive_entry_path_after_manifest(
        package: &mut [u8],
        old_path: &str,
        new_path: &str,
    ) {
        assert_eq!(old_path.len(), new_path.len());
        let positions = package
            .windows(old_path.len())
            .enumerate()
            .filter_map(|(index, bytes)| (bytes == old_path.as_bytes()).then_some(index))
            .collect::<Vec<_>>();
        assert_eq!(positions.len(), 3, "manifest, local, and central names");
        for position in positions.into_iter().skip(1) {
            package[position..position + old_path.len()].copy_from_slice(new_path.as_bytes());
        }
    }

    #[test]
    fn shared_decode_allocation_boundary_is_exact_and_failure_does_not_contaminate_retry() {
        // Make the projection parse, while the typed manifest remains live,
        // the deterministic peak rather than the smaller manifest parse.
        let members = format!(r#","notes":"{}""#, "x".repeat(65_536));
        let large_project = minimal_disc_projection_with_members("0.2.0", "null", &members);
        let large_package = one_bmp_package(&large_project, 1, 1);

        let mut probe = OperationAllocationLedger::new(PackageLimits::V1.decoder_working_bytes);
        let decoded = decode_project_package_with_allocation_ledger(
            &large_package,
            &PackageLimits::V1,
            &mut probe,
        )
        .unwrap();
        let exact_peak = probe.peak();
        assert!(exact_peak > 65_536);
        assert_eq!(probe.retained(), 0);
        assert_eq!(decoded.metadata().project_schema_version(), "0.2.0");
        assert_eq!(
            decoded.metadata().creator().application(),
            "steam-backup-label-studio"
        );

        let mut exact = OperationAllocationLedger::new(exact_peak);
        decode_project_package_with_allocation_ledger(
            &large_package,
            &PackageLimits::V1,
            &mut exact,
        )
        .unwrap();
        assert_eq!(exact.retained(), 0);

        let mut one_under = OperationAllocationLedger::new(exact_peak - 1);
        let error = decode_project_package_with_allocation_ledger(
            &large_package,
            &PackageLimits::V1,
            &mut one_under,
        )
        .unwrap_err();
        assert_eq!(error.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(error.stage, FailureStage::Project);
        assert_eq!(one_under.retained(), 0);

        let small_project = minimal_disc_projection("0.2.0", "null");
        let small_package = one_bmp_package(&small_project, 1, 1);
        decode_project_package_with_allocation_ledger(
            &small_package,
            &PackageLimits::V1,
            &mut one_under,
        )
        .unwrap();
        assert_eq!(one_under.retained(), 0);
    }

    #[test]
    fn projection_parse_boundary_includes_the_live_manifest_graph() {
        let members = format!(r#","notes":"{}""#, "x".repeat(65_536));
        let project = minimal_disc_projection_with_members("0.2.0", "null", &members);
        let package = one_bmp_package(&project, 1, 1);
        let inventory = inspect_zip32(&package, &PackageLimits::V1).unwrap();
        let mut archive_budget = DecodeBudget::new(PackageLimits::V1);
        let manifest_bytes = inventory.read_manifest(&mut archive_budget).unwrap();
        let mut manifest_allocations =
            OperationAllocationLedger::new(PackageLimits::V1.decoder_working_bytes);
        let (manifest, manifest_charge) = parse_manifest_accounted_with_limits(
            &manifest_bytes,
            &PackageLimits::V1,
            &mut manifest_allocations,
        )
        .unwrap();
        drop(manifest_bytes);
        let inventory = inventory.validate_v1_layout().unwrap();

        let mut probe = OperationAllocationLedger::new(PackageLimits::V1.decoder_working_bytes);
        probe.try_charge(manifest_charge).unwrap();
        manifest_allocations.release(manifest_charge).unwrap();
        let (projection, projection_charge) = read_and_validate_projection(
            &inventory,
            &manifest,
            &mut DecodeBudget::new(PackageLimits::V1),
            &PackageLimits::V1,
            &mut probe,
        )
        .unwrap();
        let exact_peak = probe.peak();
        assert!(exact_peak > manifest_charge);
        drop(projection);
        probe.release(projection_charge).unwrap();
        probe.release(manifest_charge).unwrap();

        let mut exact = OperationAllocationLedger::new(exact_peak);
        exact.try_charge(manifest_charge).unwrap();
        let (projection, projection_charge) = read_and_validate_projection(
            &inventory,
            &manifest,
            &mut DecodeBudget::new(PackageLimits::V1),
            &PackageLimits::V1,
            &mut exact,
        )
        .unwrap();
        drop(projection);
        exact.release(projection_charge).unwrap();
        exact.release(manifest_charge).unwrap();
        assert_eq!(exact.retained(), 0);

        let mut one_under = OperationAllocationLedger::new(exact_peak - 1);
        one_under.try_charge(manifest_charge).unwrap();
        let error = read_and_validate_projection(
            &inventory,
            &manifest,
            &mut DecodeBudget::new(PackageLimits::V1),
            &PackageLimits::V1,
            &mut one_under,
        )
        .unwrap_err();
        assert_eq!(error.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(error.stage, FailureStage::Project);
        assert_eq!(one_under.retained(), manifest_charge);

        one_under.release(manifest_charge).unwrap();
        let (recovered, recovered_charge) =
            parse_json_accounted_with_limits(b"null", &PackageLimits::V1, &mut one_under).unwrap();
        drop(recovered);
        one_under.release(recovered_charge).unwrap();
        assert_eq!(one_under.retained(), 0);
        drop(manifest);
    }

    #[test]
    fn absent_case_surfaces_require_built_in_bytes_in_old_and_current_schema() {
        for schema in ["0.1.0", "0.2.0", "0.3.0", "0.4.0"] {
            let project = format!(
                r#"{{"schemaVersion":"{schema}","projectType":"caseInsert","template":{{"type":"caseInsert"}},"caseInsert":{{}}}}"#
            );
            let bytes = package(project.as_bytes(), schema, Vec::new(), Vec::new());
            let error = decode_project_package(&bytes).unwrap_err();
            assert_eq!(error.code, FailureCode::BuiltInUnavailable);
            assert_eq!(error.stage, FailureStage::BindingHydration);
        }
    }

    #[test]
    fn exact_asset_bytes_hydrate_as_canonical_padded_data_url() {
        let project = minimal_disc_projection("0.2.0", "null");
        let bytes = one_bmp_package(&project, 1, 1);
        let decoded = decode_project_package(&bytes).unwrap();
        let hydrated = String::from_utf8(decoded.hydrated_project_json().to_vec()).unwrap();
        let expected = STANDARD.encode(canonical_bmp_1x1());

        assert!(hydrated.contains(&format!("data:image/bmp;base64,{expected}")));
        assert!(!hydrated.contains("packageVersion"));
    }

    #[test]
    fn case_surface_binding_uses_the_same_closed_registry_and_hydration_path() {
        let project = br#"{"schemaVersion":"0.2.0","projectType":"caseInsert","template":{"type":"caseInsert"},"caseInsert":{"templates":{"cover":{"steamBanner":{"lockupImageDataUrl":null}},"tray":{"steamBanner":{"lockupImageDataUrl":null}}},"spine":{"left":{"steamBanner":{"lockupImageDataUrl":null}},"right":{"steamBanner":{"lockupImageDataUrl":null},"markSlots":[{"imageDataUrl":null}]}}}}"#;
        let bmp = canonical_bmp_1x1();
        let asset_digest = digest(&bmp);
        let asset =
            AssetRecord::new(asset_digest, RasterMime::Bmp, bmp.len() as u64, 1, 1).unwrap();
        let binding = BindingRecord::from_digest(
            "/caseInsert/spine/right/markSlots/0/imageDataUrl".to_owned(),
            asset_digest,
        )
        .unwrap();
        let bytes = package_with_case_banners(project, "0.2.0", vec![(asset, bmp)], vec![binding]);

        let decoded = decode_project_package(&bytes).unwrap();
        let hydrated = String::from_utf8_lossy(decoded.hydrated_project_json());
        assert!(hydrated.contains("data:image/bmp;base64,"));
        assert_eq!(decoded.metadata().binding_count(), 5);
    }

    #[test]
    fn supported_older_schema_is_hydrated_without_migration() {
        let project = minimal_case_projection("0.1.0", "");
        let bytes = package_with_case_banners(&project, "0.1.0", Vec::new(), Vec::new());
        let decoded = decode_project_package(&bytes).unwrap();

        assert_eq!(decoded.metadata().project_schema_version(), "0.1.0");
        assert!(String::from_utf8_lossy(decoded.hydrated_project_json())
            .contains(r#""schemaVersion":"0.1.0""#));
    }

    #[test]
    fn raw_bound_and_signature_precede_zip_parsing() {
        let mut limits = PackageLimits::V1;
        limits.raw_archive_bytes = 3;
        let error = decode_project_package_with_limits(b"PK\x03\x04", &limits).unwrap_err();
        assert_eq!(error.code, FailureCode::FileTooLarge);
        assert_eq!(error.stage, FailureStage::RawInput);

        let error = decode_project_package(b"not a zip").unwrap_err();
        assert_eq!(error.code, FailureCode::FormatUnsupported);
        assert_eq!(error.stage, FailureStage::RawInput);
    }

    #[test]
    fn project_digest_is_checked_before_projection_json() {
        let invalid_json = b"{{";
        let bytes = package_with_project_digest(
            invalid_json,
            "0.2.0",
            Vec::new(),
            Vec::new(),
            Sha256Digest::from_bytes([0; 32]),
        );
        let error = decode_project_package(&bytes).unwrap_err();
        assert_eq!(error.code, FailureCode::ProjectDigestMismatch);
        assert_eq!(error.stage, FailureStage::Project);
    }

    #[test]
    fn schema_disagreement_precedes_agreed_but_unsupported_schema() {
        let current = minimal_disc_projection("0.2.0", "null");
        let disagreement = package(&current, "9.9.9", Vec::new(), Vec::new());
        assert_eq!(
            decode_project_package(&disagreement).unwrap_err().code,
            FailureCode::ManifestInvalid
        );

        let future = minimal_disc_projection("9.9.9", "null");
        let unsupported = package(&future, "9.9.9", Vec::new(), Vec::new());
        assert_eq!(
            decode_project_package(&unsupported).unwrap_err().code,
            FailureCode::ProjectSchemaUnsupported
        );
    }

    #[test]
    fn asset_digest_precedes_raster_structure_validation() {
        let project = minimal_disc_projection("0.2.0", "null");
        let bmp = canonical_bmp_1x1();
        let actual_digest = digest(&bmp);
        let wrong_digest = Sha256Digest::from_bytes([7; 32]);
        let asset =
            AssetRecord::new(wrong_digest, RasterMime::Bmp, bmp.len() as u64, 1, 1).unwrap();
        let binding =
            BindingRecord::from_digest("/background/imageDataUrl".to_owned(), wrong_digest)
                .unwrap();
        let bytes = package(&project, "0.2.0", vec![(asset, bmp)], vec![binding]);
        assert_ne!(actual_digest, wrong_digest);

        assert_eq!(
            decode_project_package(&bytes).unwrap_err().code,
            FailureCode::AssetDigestMismatch
        );
    }

    #[test]
    fn archive_asset_path_set_must_exactly_match_manifest_records() {
        let project = minimal_disc_projection("0.2.0", "null");
        let bmp = canonical_bmp_1x1();
        let asset_digest = digest(&bmp);
        let asset =
            AssetRecord::new(asset_digest, RasterMime::Bmp, bmp.len() as u64, 1, 1).unwrap();
        let old_path = asset.path();
        let binding =
            BindingRecord::from_digest("/background/imageDataUrl".to_owned(), asset_digest)
                .unwrap();
        let mut bytes = package(&project, "0.2.0", vec![(asset, bmp)], vec![binding]);
        let new_path = format!("assets/sha256/{}.bmp", "1".repeat(64));
        replace_archive_entry_path_after_manifest(&mut bytes, &old_path, &new_path);

        let error = decode_project_package(&bytes).unwrap_err();
        assert_eq!(error.code, FailureCode::AssetMissing);
        assert_eq!(error.stage, FailureStage::AssetValidation);
    }

    #[test]
    fn manifest_dimensions_must_match_validated_raster() {
        let project = minimal_disc_projection("0.2.0", "null");
        let bytes = one_bmp_package(&project, 2, 1);
        let error = decode_project_package(&bytes).unwrap_err();
        assert_eq!(error.code, FailureCode::AssetDimensionsInvalid);
        assert_eq!(error.stage, FailureStage::AssetValidation);
    }

    #[test]
    fn well_formed_bmp_outside_v1_maps_to_the_stable_profile_code() {
        let project = minimal_disc_projection("0.2.0", "null");
        let mut top_down = canonical_bmp_1x1();
        top_down[22..26].copy_from_slice(&(-1_i32).to_le_bytes());
        let bytes = bmp_package(&project, top_down, 1, 1);

        let error = decode_project_package(&bytes).unwrap_err();
        assert_eq!(error.code, FailureCode::AssetBmpProfileUnsupported);
        assert_eq!(error.stage, FailureStage::AssetValidation);
    }

    #[test]
    fn bound_leaf_must_exist_and_be_exact_null() {
        let non_null = minimal_disc_projection("0.2.0", r#""already-present""#);
        let bytes = one_bmp_package(&non_null, 1, 1);
        assert_eq!(
            decode_project_package(&bytes).unwrap_err().code,
            FailureCode::BindingInvalid
        );
    }

    #[test]
    fn out_of_registry_pointer_is_binding_invalid() {
        let project = minimal_disc_projection("0.2.0", "null");
        let bmp = canonical_bmp_1x1();
        let asset_digest = digest(&bmp);
        let asset =
            AssetRecord::new(asset_digest, RasterMime::Bmp, bmp.len() as u64, 1, 1).unwrap();
        let binding =
            BindingRecord::from_digest("/unknown/imageDataUrl".to_owned(), asset_digest).unwrap();
        let bytes = package(&project, "0.2.0", vec![(asset, bmp)], vec![binding]);

        assert_eq!(
            decode_project_package(&bytes).unwrap_err().code,
            FailureCode::BindingInvalid
        );
    }

    #[test]
    fn residual_unbound_asset_payload_never_reaches_handoff() {
        let project = minimal_case_projection(
            "0.2.0",
            r#","residualImage":" \tdata:image/png;base64,AA==\r\n""#,
        );
        let bytes = package_with_case_banners(&project, "0.2.0", Vec::new(), Vec::new());
        let error = decode_project_package(&bytes).unwrap_err();
        assert_eq!(error.code, FailureCode::BindingUnresolved);
        assert_eq!(error.stage, FailureStage::BindingHydration);
    }

    #[test]
    fn residual_package_tokens_are_rejected_after_ascii_whitespace_trimming() {
        for token in [
            " \tsbls://asset\r\n",
            " \tasset://asset\r\n",
            " \tblob:asset\r\n",
            " \tassets/sha256/digest.bmp\r\n",
            " \tdata:image/png;base64,AA==\r\n",
        ] {
            assert!(contains_unresolved_projection_token(
                &JsonValue::String(token.to_owned()),
                true
            ));
        }
    }

    #[test]
    fn present_wrong_typed_registry_container_is_invalid_project_json() {
        let project = br#"{"schemaVersion":"0.2.0","template":{"type":"disc"},"background":{"imageDataUrl":null},"additionalArtwork":{"elements":{}}}"#;
        let bytes = package(project, "0.2.0", Vec::new(), Vec::new());
        let error = decode_project_package(&bytes).unwrap_err();
        assert_eq!(error.code, FailureCode::HydratedJsonInvalid);
        assert_eq!(error.stage, FailureStage::Project);
    }

    #[test]
    fn hydrated_fan_out_is_preflighted_before_data_url_allocation() {
        let project = minimal_disc_projection("0.2.0", "null");
        let bytes = one_bmp_package(&project, 1, 1);
        let mut limits = PackageLimits::V1;
        limits.hydrated_data_url_fan_out_bytes = 1;

        let error = decode_project_package_with_limits(&bytes, &limits).unwrap_err();
        assert_eq!(error.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(error.stage, FailureStage::BindingHydration);
    }

    #[test]
    fn decoded_output_does_not_retain_caller_mutable_storage() {
        let project = minimal_case_projection("0.2.0", "");
        let mut bytes = package_with_case_banners(&project, "0.2.0", Vec::new(), Vec::new());
        let decoded = decode_project_package(&bytes).unwrap();
        bytes.fill(0);

        assert!(String::from_utf8_lossy(decoded.hydrated_project_json())
            .contains(r#""schemaVersion":"0.2.0""#));
    }

    #[test]
    fn unbound_owner_classification_covers_every_semantic_asset_family() {
        use UnboundOwnerDisposition::{
            AcceptedAssetMissingBinding as Missing, BuiltInWithoutCompatibility as BuiltIn,
            NoAcceptedAsset as Absent,
        };

        let cases = [
            (
                AssetOwner::DiscBackground,
                r#"{"background":{"imageDataUrl":null,"imageSource":{"source":"built-in"},"imageSize":null}}"#,
                BuiltIn,
            ),
            (
                AssetOwner::DiscBackground,
                r#"{"background":{"imageDataUrl":null,"imageSource":null,"imageSize":null}}"#,
                Absent,
            ),
            (
                AssetOwner::DiscSteamBanner,
                r#"{"steamBackupLogo":{"lockupImageDataUrl":null}}"#,
                BuiltIn,
            ),
            (
                AssetOwner::DiscPrimaryLogo {
                    role: LogoRole::Developer,
                },
                r#"{"logoAssets":{"developerLogoDataUrl":null,"developerLogoSource":null,"developerLogoSize":null}}"#,
                BuiltIn,
            ),
            (
                AssetOwner::DiscPrimaryLogo {
                    role: LogoRole::Developer,
                },
                r#"{"logoAssets":{"developerLogoDataUrl":null,"developerLogoSource":{"source":"uploaded"},"developerLogoSize":{"width":1,"height":1}}}"#,
                Missing,
            ),
            (
                AssetOwner::DiscAdditionalLogo {
                    role: LogoRole::Publisher,
                    index: 0,
                },
                r#"{"logoAssets":{"additionalPublisherLogos":[{"imageDataUrl":null,"imageSource":{"source":"uploaded"},"imageSize":null}]}}"#,
                Missing,
            ),
            (
                AssetOwner::DiscAdditionalLogo {
                    role: LogoRole::Publisher,
                    index: 0,
                },
                r#"{"logoAssets":{"additionalPublisherLogos":[{"imageDataUrl":null,"imageSource":null,"imageSize":null}]}}"#,
                BuiltIn,
            ),
            (
                AssetOwner::DiscTitleCurrent,
                r#"{"titleArtwork":{"imageDataUrl":null,"imageSize":{"width":1,"height":1},"steamArtworkAssetId":"logo"}}"#,
                Missing,
            ),
            (
                AssetOwner::DiscTitleDefault,
                r#"{"titleArtwork":{"defaultSteamLogo":{"imageDataUrl":null,"imageSize":{"width":1,"height":1},"steamArtworkAssetId":"logo"}}}"#,
                Missing,
            ),
            (
                AssetOwner::DiscAdditionalArtwork { index: 0 },
                r#"{"additionalArtwork":{"elements":[{"imageDataUrl":null,"imageSize":{"width":1,"height":1},"sourceId":null}]}}"#,
                Missing,
            ),
            (
                AssetOwner::DiscRatingCustom,
                r#"{"ratingBadge":{"source":"placeholder","customImageDataUrl":null,"customImageSize":null}}"#,
                Absent,
            ),
            (
                AssetOwner::DiscRatingCustom,
                r#"{"ratingBadge":{"source":"custom","customImageDataUrl":null,"customImageSize":null}}"#,
                Absent,
            ),
            (AssetOwner::DiscRatingCustom, r#"{}"#, Absent),
            (
                AssetOwner::DiscMediaCustom,
                r#"{"mediaMark":{"source":"custom","customImageDataUrl":null,"customImageSize":{"width":1,"height":1}}}"#,
                Missing,
            ),
            (AssetOwner::DiscMediaCustom, r#"{}"#, Absent),
            (
                AssetOwner::DiscPlatformCustom {
                    platform: PlatformKind::Windows,
                },
                r#"{"platformMarks":{"assets":{"windows":{"source":"placeholder","customImageDataUrl":null,"customImageSize":null}}}}"#,
                BuiltIn,
            ),
            (
                AssetOwner::DiscTechnicalPrimary {
                    technical: TechnicalKind::Audio,
                },
                r#"{"technicalMarks":{"assets":{"audio":{"source":"placeholder","customImageDataUrl":null,"customImageSize":null}}}}"#,
                BuiltIn,
            ),
            (
                AssetOwner::DiscTechnicalAdditional {
                    technical: TechnicalKind::Audio,
                    index: 0,
                },
                r#"{"technicalMarks":{"additionalAssets":{"audio":[{"source":"custom","customImageDataUrl":null,"customImageSize":{"width":1,"height":1}}]}}}"#,
                Missing,
            ),
            (
                AssetOwner::CaseBanner {
                    surface: CaseSurface::Cover,
                },
                r#"{"caseInsert":{"templates":{"cover":{"steamBanner":{"lockupImageDataUrl":null,"lockupImageSource":{"source":"built-in"}}}}}}"#,
                BuiltIn,
            ),
            (
                AssetOwner::CaseBackground {
                    surface: CaseSurface::Tray,
                },
                r#"{"caseInsert":{"templates":{"tray":{"background":{"imageDataUrl":null,"imageSource":{"source":"uploaded"},"imageSize":null}}}}}"#,
                Missing,
            ),
            (
                AssetOwner::CaseTitleCurrent {
                    surface: CaseSurface::Cover,
                },
                r#"{"caseInsert":{"templates":{"cover":{"titleArtwork":{"imageDataUrl":null,"imageSource":{"source":"steam-artwork"},"imageSize":null}}}}}"#,
                Missing,
            ),
            (
                AssetOwner::CaseTitleDefault {
                    surface: CaseSurface::Cover,
                },
                r#"{"caseInsert":{"templates":{"cover":{"titleArtwork":{"defaultSteamLogo":{"imageDataUrl":null,"steamArtworkAssetId":"logo","imageSize":{"width":1,"height":1}}}}}}}"#,
                Missing,
            ),
            (
                AssetOwner::CaseArtwork {
                    surface: CaseSurface::Cover,
                    index: 0,
                },
                r#"{"caseInsert":{"templates":{"cover":{"artworkSlots":[{"imageDataUrl":null,"imageSource":null,"imageSize":null}]}}}}"#,
                Absent,
            ),
            (
                AssetOwner::CaseLogo {
                    surface: CaseSurface::Cover,
                    index: 0,
                },
                r#"{"caseInsert":{"templates":{"cover":{"logoSlots":[{"label":"ignored","imageDataUrl":null,"imageSource":{"source":"embedded","sourceId":"case-logo:developer"},"imageSize":null}]}}}}"#,
                BuiltIn,
            ),
            (
                AssetOwner::CaseLogo {
                    surface: CaseSurface::Cover,
                    index: 0,
                },
                r#"{"caseInsert":{"templates":{"cover":{"logoSlots":[{"label":"Developer Logo","imageDataUrl":null,"imageSource":{"source":"uploaded","sourceId":"case-logo:developer"},"imageSize":{"width":1,"height":1}}]}}}}"#,
                Missing,
            ),
            (
                AssetOwner::CaseMark {
                    surface: CaseSurface::SpineRight,
                    index: 0,
                },
                r#"{"caseInsert":{"spine":{"right":{"markSlots":[{"imageDataUrl":null,"imageSource":{"source":"placeholder"},"imageSize":null}]}}}}"#,
                BuiltIn,
            ),
        ];

        for (owner, json, expected) in cases {
            assert_eq!(classify_fixture(json, owner), expected, "{owner:?}");
        }
    }

    #[test]
    fn published_registry_accepts_exact_disc_built_ins_and_rejects_unqualified_owners() {
        let disc_fragments = [
            r#""steamBackupLogo":{"lockupImageDataUrl":null,"lockupImageSource":{"source":"built-in"}}"#,
            r#""logoAssets":{"developerLogoDataUrl":null,"developerLogoSource":null,"developerLogoSize":null}"#,
            r#""ratingBadge":{"source":"placeholder","customImageDataUrl":null,"customImageSize":null}"#,
            r#""mediaMark":{"source":"placeholder","customImageDataUrl":null,"customImageSize":null}"#,
            r#""platformMarks":{"assets":{"windows":{"source":"placeholder","customImageDataUrl":null,"customImageSize":null}}}"#,
            r#""technicalMarks":{"assets":{"audio":{"source":"placeholder","customImageDataUrl":null,"customImageSize":null}}}"#,
        ];

        for schema in ["0.1.0", "0.2.0", "0.3.0", "0.4.0"] {
            for fragment in disc_fragments {
                let project = format!(
                    r#"{{"schemaVersion":"{schema}","template":{{"type":"disc"}},"background":{{"imageDataUrl":null}},{fragment}}}"#,
                );
                let bytes = package(project.as_bytes(), schema, Vec::new(), Vec::new());
                decode_project_package(&bytes).unwrap();
            }

            let additional_disc_logo = format!(
                r#"{{"schemaVersion":"{schema}","template":{{"type":"disc"}},"background":{{"imageDataUrl":null}},"logoAssets":{{"developerLogoDataUrl":null,"publisherLogoDataUrl":null,"additionalDeveloperLogos":[{{"imageDataUrl":null,"imageSource":{{"source":"embedded"}}}}]}}}}"#,
            );
            let bytes = package_with_primary_disc_logos(
                additional_disc_logo.as_bytes(),
                schema,
                Vec::new(),
                Vec::new(),
            );
            let error = decode_project_package(&bytes).unwrap_err();
            assert_eq!(error.code, FailureCode::BindingUnresolved);
            assert_eq!(error.stage, FailureStage::BindingHydration);

            for case_member in [
                r#""markSlots":[{"imageDataUrl":null,"imageSource":{"source":"placeholder"},"imageSize":null}]"#,
                r#""logoSlots":[{"label":"ignored","imageDataUrl":null,"imageSource":{"source":"embedded","sourceId":"case-logo:publisher:additional:slot-1"},"imageSize":null}]"#,
            ] {
                let case_project = format!(
                    r#"{{"schemaVersion":"{schema}","projectType":"caseInsert","template":{{"type":"caseInsert"}},"caseInsert":{{"templates":{{"cover":{{"steamBanner":{{"lockupImageDataUrl":null}},{case_member}}},"tray":{{"steamBanner":{{"lockupImageDataUrl":null}}}}}},"spine":{{"left":{{"steamBanner":{{"lockupImageDataUrl":null}}}},"right":{{"steamBanner":{{"lockupImageDataUrl":null}}}}}}}}}}"#,
                );
                let bytes = package_with_case_banners(
                    case_project.as_bytes(),
                    schema,
                    Vec::new(),
                    Vec::new(),
                );
                let error = decode_project_package(&bytes).unwrap_err();
                assert_eq!(error.code, FailureCode::BuiltInUnavailable);
                assert_eq!(error.stage, FailureStage::BindingHydration);
            }
        }
    }

    #[test]
    fn unknown_semantic_built_ins_without_asset_leaves_are_rejected() {
        let base = String::from_utf8(minimal_disc_projection("0.2.0", "null")).unwrap();
        let supplemental_usk = base.replacen(
            r#""customImageSize":{"width":1,"height":1}},"mediaMark""#,
            r#""customImageSize":{"width":1,"height":1},"uskBadge":{"ratingValue":"21","layout":{"enabled":false}}},"mediaMark""#,
            1,
        );
        let disc_number = minimal_disc_projection_with_members(
            "0.2.0",
            "null",
            r#","discNumberArtwork":{"mode":"text","badgeSet":"unknown"}"#,
        );
        let rocky_disc = minimal_disc_projection_with_members(
            "0.2.0",
            "null",
            r#","additionalArtwork":{"elements":[{"imageDataUrl":null,"imageSize":null,"sourceId":null,"frame":{"enabled":false,"style":"unknown"}}]}"#,
        );

        for project in [supplemental_usk.into_bytes(), disc_number, rocky_disc] {
            let bytes = package_with_primary_disc_logos(&project, "0.2.0", Vec::new(), Vec::new());
            let error = decode_project_package(&bytes).unwrap_err();
            assert_eq!(error.code, FailureCode::BuiltInUnavailable);
            assert_eq!(error.stage, FailureStage::BindingHydration);
        }

        let rocky_case = br#"{"schemaVersion":"0.2.0","projectType":"caseInsert","template":{"type":"caseInsert"},"caseInsert":{"templates":{"cover":{"steamBanner":{"lockupImageDataUrl":null},"artworkSlots":[{"imageDataUrl":null,"imageSource":null,"imageSize":null,"frame":{"enabled":false,"style":"unknown"}}]},"tray":{"steamBanner":{"lockupImageDataUrl":null}}},"spine":{"left":{"steamBanner":{"lockupImageDataUrl":null}},"right":{"steamBanner":{"lockupImageDataUrl":null}}}}}"#;
        let bytes = package_with_case_banners(rocky_case, "0.2.0", Vec::new(), Vec::new());
        let error = decode_project_package(&bytes).unwrap_err();
        assert_eq!(error.code, FailureCode::BuiltInUnavailable);
        assert_eq!(error.stage, FailureStage::BindingHydration);
    }

    #[test]
    fn remembered_project_owned_title_bytes_require_bindings_not_a_built_in_registry() {
        for schema in ["0.1.0", "0.2.0", "0.3.0", "0.4.0"] {
            let disc = minimal_disc_projection_with_members(
                schema,
                "null",
                r#","titleArtwork":{"source":"custom","steamArtworkAssetId":null,"imageDataUrl":null,"imageSize":{"width":10,"height":10},"defaultSteamLogo":null}"#,
            );
            let bytes = package_with_primary_disc_logos(&disc, schema, Vec::new(), Vec::new());
            assert_eq!(
                decode_project_package(&bytes).unwrap_err().code,
                FailureCode::BindingUnresolved
            );

            let case = format!(
                r#"{{"schemaVersion":"{schema}","projectType":"caseInsert","template":{{"type":"caseInsert"}},"caseInsert":{{"templates":{{"cover":{{"steamBanner":{{"lockupImageDataUrl":null}},"titleArtwork":{{"imageDataUrl":null,"imageSource":null,"imageSize":null,"defaultSteamLogo":{{"steamArtworkAssetId":"logo","imageDataUrl":null,"imageSize":{{"width":10,"height":10}}}}}}}},"tray":{{"steamBanner":{{"lockupImageDataUrl":null}}}}}},"spine":{{"left":{{"steamBanner":{{"lockupImageDataUrl":null}}}},"right":{{"steamBanner":{{"lockupImageDataUrl":null}}}}}}}}}}"#,
            );
            let bytes = package_with_case_banners(case.as_bytes(), schema, Vec::new(), Vec::new());
            assert_eq!(
                decode_project_package(&bytes).unwrap_err().code,
                FailureCode::BindingUnresolved
            );
        }
    }

    #[test]
    fn exact_filesystem_values_are_rejected_but_prose_and_http_urls_survive() {
        for title in [
            r#""C:\\Users\\Alice\\cover.png""#,
            r#""\\\\server\\share\\cover.png""#,
            r#""/home/alice/cover.png""#,
            r#""file://C:/Users/Alice/cover.png""#,
        ] {
            let project = minimal_case_projection("0.2.0", &format!(r#","title":{title}"#));
            let bytes = package_with_case_banners(&project, "0.2.0", Vec::new(), Vec::new());
            let error = decode_project_package(&bytes).unwrap_err();
            assert_eq!(error.code, FailureCode::BindingUnresolved, "{title}");
            assert_eq!(error.stage, FailureStage::BindingHydration);
        }

        let allowed = minimal_case_projection(
            "0.2.0",
            r#","title":"Save / Load","sourceUrl":"https://example.test/assets/cover.png""#,
        );
        let bytes = package_with_case_banners(&allowed, "0.2.0", Vec::new(), Vec::new());
        assert!(decode_project_package(&bytes).is_ok());
    }

    #[test]
    fn asset_missing_and_binding_conflict_precede_binding_syntax() {
        const A: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        let project = minimal_disc_projection("0.2.0", "null");
        let missing_binding = format!(r#"{{"assetId":"sha256:{A}","pointer":"not/a/pointer"}}"#,);
        let manifest = raw_manifest(&project, "0.2.0", "", &missing_binding);
        let bytes = package_with_raw_manifest(&project, &manifest, &[]);
        let error = decode_project_package(&bytes).unwrap_err();
        assert_eq!(error.code, FailureCode::AssetMissing);
        assert_eq!(error.stage, FailureStage::AssetValidation);

        let bmp = canonical_bmp_1x1();
        let asset_digest = digest(&bmp);
        let digest_hex = asset_digest.to_lower_hex();
        let asset_path = asset_digest.asset_path(RasterMime::Bmp);
        let asset_json = format!(
            r#"{{"byteLength":{},"height":1,"id":"sha256:{digest_hex}","mimeType":"image/bmp","path":"{asset_path}","sha256":"{digest_hex}","width":1}}"#,
            bmp.len(),
        );
        let malformed =
            format!(r#"{{"assetId":"sha256:{digest_hex}","pointer":"not/a/pointer"}}"#,);
        let manifest = raw_manifest(
            &project,
            "0.2.0",
            &asset_json,
            &format!("{malformed},{malformed}"),
        );
        let bytes = package_with_raw_manifest(&project, &manifest, &[(asset_path, bmp)]);
        let error = decode_project_package(&bytes).unwrap_err();
        assert_eq!(error.code, FailureCode::BindingConflict);
        assert_eq!(error.stage, FailureStage::BindingHydration);
    }

    #[test]
    fn unexpected_decoder_panics_are_contained_at_the_public_boundary() {
        let error = contain_decode_operation(|| panic!("injected decoder panic")).unwrap_err();
        assert_eq!(error.code, FailureCode::ArchiveInvalid);
        assert_eq!(error.stage, FailureStage::RawInput);
    }
}
