//! Cross-module package-v1 conformance tests.
//!
//! These tests intentionally exercise the public byte facades. The raw ZIP and
//! manifest builders below are test-owned and do not call the production ZIP
//! writer, manifest model, or canonical JSON writer.

use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;
use sha2::{Digest, Sha256};

use crate::archive::{
    encode_stored_zip32, inspect_zip32, EntryRole, StoredEntry, MANIFEST_ENTRY_NAME,
    PROJECT_ENTRY_NAME,
};
use crate::decode_project_package;
use crate::encode_project_package;
use crate::error::{FailureCode, FailureStage};
use crate::json::parse_json_with_limits;
use crate::limits::{DecodeBudget, PackageLimits};
use crate::manifest::parse_manifest;
use crate::model::{AssetCapture, AssetCaptureDecision, PackageCreator, ProjectPackageEncodeInput};
use crate::native;
use crate::raster::RasterMime;
use crate::registry::{AssetOwner, CaseSurface, LogoRole, PlatformKind, TechnicalKind};

const TEST_APPLICATION: &str = "steam-backup-label-studio";
const TEST_VERSION: &str = "1.0.0";

#[derive(Clone, Debug)]
struct RasterFixture {
    mime: RasterMime,
    bytes: Vec<u8>,
    data_url: String,
}

impl RasterFixture {
    fn new(mime: RasterMime, bytes: Vec<u8>) -> Self {
        let data_url = format!("data:{};base64,{}", mime.as_str(), STANDARD.encode(&bytes));
        Self {
            mime,
            bytes,
            data_url,
        }
    }
}

fn creator() -> PackageCreator {
    PackageCreator::new(TEST_APPLICATION, TEST_VERSION).unwrap()
}

fn append_jpeg_segment(target: &mut Vec<u8>, marker: u8, payload: &[u8]) {
    target.extend_from_slice(&[0xff, marker]);
    let length = u16::try_from(payload.len() + 2).unwrap();
    target.extend_from_slice(&length.to_be_bytes());
    target.extend_from_slice(payload);
}

fn jpeg_fixture(progressive: bool, components: u8) -> Vec<u8> {
    let mut bytes = vec![0xff, 0xd8];
    let mut quantization = vec![0_u8];
    quantization.extend_from_slice(&[1_u8; 64]);
    append_jpeg_segment(&mut bytes, 0xdb, &quantization);

    let mut frame = vec![8, 0, 1, 0, 1, components];
    for component in 1..=components {
        frame.extend_from_slice(&[component, 0x11, 0]);
    }
    append_jpeg_segment(&mut bytes, if progressive { 0xc2 } else { 0xc0 }, &frame);

    let mut huffman = vec![0x00];
    huffman.extend_from_slice(&[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    huffman.push(0);
    huffman.push(0x10);
    huffman.extend_from_slice(&[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    huffman.push(0);
    append_jpeg_segment(&mut bytes, 0xc4, &huffman);

    if progressive {
        let mut dc_scan = vec![components];
        for component in 1..=components {
            dc_scan.extend_from_slice(&[component, 0]);
        }
        dc_scan.extend_from_slice(&[0, 0, 0]);
        append_jpeg_segment(&mut bytes, 0xda, &dc_scan);
        bytes.push(if components == 1 { 0x7f } else { 0x1f });
        for component in 1..=components {
            append_jpeg_segment(&mut bytes, 0xda, &[1, component, 0, 1, 63, 0]);
            bytes.push(0x7f);
        }
    } else {
        let mut scan = vec![components];
        for component in 1..=components {
            scan.extend_from_slice(&[component, 0]);
        }
        scan.extend_from_slice(&[0, 63, 0]);
        append_jpeg_segment(&mut bytes, 0xda, &scan);
        bytes.push(match components {
            1 => 0x3f,
            3 => 0x03,
            4 => 0x00,
            _ => 0x3f,
        });
    }
    bytes.extend_from_slice(&[0xff, 0xd9]);
    bytes
}

fn marker_position(bytes: &[u8], marker: u8) -> usize {
    bytes
        .windows(2)
        .position(|pair| pair == [0xff, marker])
        .unwrap()
}

fn lossless_jpeg_fixture() -> Vec<u8> {
    let mut jpeg = jpeg_fixture(false, 1);
    let sof = marker_position(&jpeg, 0xc0);
    jpeg[sof + 1] = 0xc3;
    let sos = marker_position(&jpeg, 0xda);
    jpeg[sos + 7..sos + 10].copy_from_slice(&[1, 0, 0]);
    jpeg
}

fn adler32(bytes: &[u8]) -> u32 {
    let mut first = 1_u32;
    let mut second = 0_u32;
    for byte in bytes {
        first = (first + u32::from(*byte)) % 65_521;
        second = (second + first) % 65_521;
    }
    (second << 16) | first
}

fn zlib_stored(bytes: &[u8]) -> Vec<u8> {
    assert!(bytes.len() <= u16::MAX as usize);
    let length = bytes.len() as u16;
    let mut output = vec![0x78, 0x01, 0x01];
    output.extend_from_slice(&length.to_le_bytes());
    output.extend_from_slice(&(!length).to_le_bytes());
    output.extend_from_slice(bytes);
    output.extend_from_slice(&adler32(bytes).to_be_bytes());
    output
}

fn append_png_chunk(target: &mut Vec<u8>, kind: &[u8; 4], data: &[u8]) {
    target.extend_from_slice(&(data.len() as u32).to_be_bytes());
    target.extend_from_slice(kind);
    target.extend_from_slice(data);
    let mut crc = crc32fast::Hasher::new();
    crc.update(kind);
    crc.update(data);
    target.extend_from_slice(&crc.finalize().to_be_bytes());
}

fn png_fixture() -> Vec<u8> {
    let mut png = b"\x89PNG\r\n\x1a\n".to_vec();
    let mut ihdr = Vec::new();
    ihdr.extend_from_slice(&1_u32.to_be_bytes());
    ihdr.extend_from_slice(&1_u32.to_be_bytes());
    ihdr.extend_from_slice(&[8, 6, 0, 0, 0]);
    append_png_chunk(&mut png, b"IHDR", &ihdr);
    append_png_chunk(&mut png, b"IDAT", &zlib_stored(&[0, 10, 20, 30, 255]));
    append_png_chunk(&mut png, b"IEND", &[]);
    png
}

fn gif_fixture() -> Vec<u8> {
    let mut gif = b"GIF89a".to_vec();
    gif.extend_from_slice(&[1, 0, 1, 0, 0x80, 0, 0]);
    gif.extend_from_slice(&[0, 0, 0, 255, 255, 255]);
    gif.push(0x2c);
    gif.extend_from_slice(&[0, 0, 0, 0, 1, 0, 1, 0, 0]);
    gif.extend_from_slice(&[2, 2, 0x44, 0x01, 0]);
    gif.push(0x3b);
    gif
}

fn bmp_fixture(pixel: [u8; 3]) -> Vec<u8> {
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

fn bmp_32_bit_fixture(pixel: [u8; 4]) -> Vec<u8> {
    let mut bytes = bmp_fixture([pixel[0], pixel[1], pixel[2]]);
    bytes[28..30].copy_from_slice(&32_u16.to_le_bytes());
    bytes[54..58].copy_from_slice(&pixel);
    bytes
}

fn raster_catalog() -> Vec<RasterFixture> {
    vec![
        RasterFixture::new(RasterMime::Png, png_fixture()),
        RasterFixture::new(RasterMime::Jpeg, jpeg_fixture(false, 3)),
        RasterFixture::new(
            RasterMime::Webp,
            STANDARD
                .decode("UklGRh4AAABXRUJQVlA4TBEAAAAvAUAAAAdQkTYUp/+BiOh/AAA=")
                .unwrap(),
        ),
        RasterFixture::new(RasterMime::Gif, gif_fixture()),
        RasterFixture::new(RasterMime::Bmp, bmp_fixture([0x21, 0x43, 0x65])),
    ]
}

fn canonical_json(bytes: &[u8]) -> Vec<u8> {
    parse_json_with_limits(bytes, &PackageLimits::V1)
        .unwrap()
        .to_canonical_bytes()
        .unwrap()
}

fn disc_owner_specs() -> Vec<(AssetOwner, usize)> {
    let mut specs = vec![
        (AssetOwner::DiscBackground, 0),
        (AssetOwner::DiscSteamBanner, 1),
        (
            AssetOwner::DiscPrimaryLogo {
                role: LogoRole::Developer,
            },
            2,
        ),
        (
            AssetOwner::DiscPrimaryLogo {
                role: LogoRole::Publisher,
            },
            3,
        ),
        (
            AssetOwner::DiscAdditionalLogo {
                role: LogoRole::Developer,
                index: 0,
            },
            4,
        ),
        (
            AssetOwner::DiscAdditionalLogo {
                role: LogoRole::Publisher,
                index: 0,
            },
            5,
        ),
        (AssetOwner::DiscTitleCurrent, 6),
        (AssetOwner::DiscTitleDefault, 7),
        (AssetOwner::DiscAdditionalArtwork { index: 0 }, 8),
        (AssetOwner::DiscRatingCustom, 9),
        (AssetOwner::DiscMediaCustom, 10),
    ];
    for (offset, platform) in [
        PlatformKind::Pc,
        PlatformKind::Windows,
        PlatformKind::Linux,
        PlatformKind::SteamDeck,
        PlatformKind::Macos,
    ]
    .into_iter()
    .enumerate()
    {
        specs.push((AssetOwner::DiscPlatformCustom { platform }, 11 + offset));
    }
    for (offset, technical) in [
        TechnicalKind::Audio,
        TechnicalKind::Surround,
        TechnicalKind::Codec,
        TechnicalKind::Middleware,
        TechnicalKind::Technology,
    ]
    .into_iter()
    .enumerate()
    {
        specs.push((AssetOwner::DiscTechnicalPrimary { technical }, 16 + offset));
    }
    for (offset, technical) in [
        TechnicalKind::Audio,
        TechnicalKind::Surround,
        TechnicalKind::Codec,
        TechnicalKind::Middleware,
        TechnicalKind::Technology,
    ]
    .into_iter()
    .enumerate()
    {
        specs.push((
            AssetOwner::DiscTechnicalAdditional {
                technical,
                index: 0,
            },
            21 + offset,
        ));
    }
    specs
}

fn full_disc_project(schema: &str, catalog: &[RasterFixture]) -> Vec<u8> {
    let url = |index: usize| catalog[index % catalog.len()].data_url.as_str();
    let platforms = ["pc", "windows", "linux", "steamDeck", "macos"]
        .into_iter()
        .enumerate()
        .map(|(offset, name)| {
            format!(
                r#""{name}":{{"enabled":false,"remembered":true,"source":"custom","customImageDataUrl":"{}"}}"#,
                url(11 + offset)
            )
        })
        .collect::<Vec<_>>()
        .join(",");
    let technical_primary = ["audio", "surround", "codec", "middleware", "technology"]
        .into_iter()
        .enumerate()
        .map(|(offset, name)| {
            format!(
                r#""{name}":{{"enabled":false,"source":"custom","customImageDataUrl":"{}"}}"#,
                url(16 + offset)
            )
        })
        .collect::<Vec<_>>()
        .join(",");
    let technical_additional = ["audio", "surround", "codec", "middleware", "technology"]
        .into_iter()
        .enumerate()
        .map(|(offset, name)| {
            format!(
                r#""{name}":[{{"enabled":false,"source":"custom","customImageDataUrl":"{}"}}]"#,
                url(21 + offset)
            )
        })
        .collect::<Vec<_>>()
        .join(",");

    format!(
        r#"{{"schemaVersion":"{schema}","projectType":"disc","template":{{"type":"disc"}},"transportSentinel":"project-only","background":{{"enabled":false,"remembered":true,"imageDataUrl":"{}","imageSource":{{"source":"uploaded"}}}},"steamBackupLogo":{{"placement":"hidden","lockupImageDataUrl":"{}","lockupImageSource":{{"source":"custom"}}}},"logoAssets":{{"developerLogoDataUrl":"{}","developerLogoSource":{{"source":"custom"}},"publisherLogoDataUrl":"{}","publisherLogoSource":{{"source":"custom"}},"additionalDeveloperLogos":[{{"enabled":false,"imageDataUrl":"{}","imageSource":{{"source":"custom"}}}}],"additionalPublisherLogos":[{{"enabled":false,"imageDataUrl":"{}","imageSource":{{"source":"custom"}}}}]}},"titleArtwork":{{"enabled":false,"imageDataUrl":"{}","imageSource":{{"source":"custom"}},"defaultSteamLogo":{{"imageDataUrl":"{}","imageSource":{{"source":"steam-artwork"}}}}}},"additionalArtwork":{{"elements":[{{"enabled":false,"imageDataUrl":"{}","imageSource":{{"source":"uploaded"}}}}]}},"ratingBadge":{{"enabled":false,"source":"custom","customImageDataUrl":"{}"}},"mediaMark":{{"enabled":false,"source":"custom","customImageDataUrl":"{}"}},"platformMarks":{{"assets":{{{platforms}}}}},"technicalMarks":{{"assets":{{{technical_primary}}},"additionalAssets":{{{technical_additional}}}}}}}"#,
        url(0),
        url(1),
        url(2),
        url(3),
        url(4),
        url(5),
        url(6),
        url(7),
        url(8),
        url(9),
        url(10),
    )
    .into_bytes()
}

fn case_owner_specs() -> Vec<(AssetOwner, usize)> {
    let mut specs = Vec::new();
    for (surface_index, surface) in [
        CaseSurface::Cover,
        CaseSurface::Tray,
        CaseSurface::SpineLeft,
        CaseSurface::SpineRight,
    ]
    .into_iter()
    .enumerate()
    {
        let base = surface_index * 7;
        specs.extend([
            (AssetOwner::CaseBanner { surface }, base),
            (AssetOwner::CaseBackground { surface }, base + 1),
            (AssetOwner::CaseTitleCurrent { surface }, base + 2),
            (AssetOwner::CaseTitleDefault { surface }, base + 3),
            (AssetOwner::CaseArtwork { surface, index: 0 }, base + 4),
            (AssetOwner::CaseLogo { surface, index: 0 }, base + 5),
            (AssetOwner::CaseMark { surface, index: 0 }, base + 6),
        ]);
    }
    specs
}

fn fixed_case_owners() -> Vec<AssetOwner> {
    let mut owners = Vec::new();
    for surface in [
        CaseSurface::Cover,
        CaseSurface::Tray,
        CaseSurface::SpineLeft,
        CaseSurface::SpineRight,
    ] {
        owners.extend([
            AssetOwner::CaseBanner { surface },
            AssetOwner::CaseBackground { surface },
            AssetOwner::CaseTitleCurrent { surface },
            AssetOwner::CaseTitleDefault { surface },
        ]);
    }
    owners
}

fn case_surface_project_json(surface_index: usize, catalog: &[RasterFixture]) -> String {
    let url = |index: usize| catalog[index % catalog.len()].data_url.as_str();
    let base = surface_index * 7;
    format!(
        r#"{{"steamBanner":{{"placement":"hidden","lockupImageDataUrl":"{}","lockupImageSource":{{"source":"custom"}}}},"background":{{"enabled":false,"remembered":true,"imageDataUrl":"{}","imageSource":{{"source":"uploaded"}}}},"titleArtwork":{{"enabled":false,"imageDataUrl":"{}","imageSource":{{"source":"custom"}},"defaultSteamLogo":{{"imageDataUrl":"{}","imageSource":{{"source":"steam-artwork"}}}}}},"artworkSlots":[{{"enabled":false,"imageDataUrl":"{}","imageSource":{{"source":"uploaded"}}}}],"logoSlots":[{{"enabled":false,"imageDataUrl":"{}","imageSource":{{"source":"custom"}}}}],"markSlots":[{{"enabled":false,"imageDataUrl":"{}","imageSource":{{"source":"custom"}}}}]}}"#,
        url(base),
        url(base + 1),
        url(base + 2),
        url(base + 3),
        url(base + 4),
        url(base + 5),
        url(base + 6),
    )
}

fn full_case_project(schema: &str, catalog: &[RasterFixture]) -> Vec<u8> {
    format!(
        r#"{{"schemaVersion":"{schema}","projectType":"caseInsert","template":{{"type":"caseInsert"}},"transportSentinel":"project-only","caseInsert":{{"templates":{{"cover":{},"tray":{}}},"spine":{{"left":{},"right":{}}}}}}}"#,
        case_surface_project_json(0, catalog),
        case_surface_project_json(1, catalog),
        case_surface_project_json(2, catalog),
        case_surface_project_json(3, catalog),
    )
    .into_bytes()
}

fn captures_for_specs(specs: &[(AssetOwner, usize)]) -> Vec<AssetCapture> {
    specs
        .iter()
        .map(|(owner, _)| AssetCapture::new(*owner, AssetCaptureDecision::ProjectOwnedDataUrl))
        .collect()
}

fn fixed_case_capture_plan(
    target: Option<(AssetOwner, AssetCaptureDecision)>,
) -> Vec<AssetCapture> {
    fixed_case_owners()
        .into_iter()
        .map(|owner| {
            let decision = target
                .as_ref()
                .filter(|(candidate, _)| *candidate == owner)
                .map(|(_, decision)| decision.clone())
                .unwrap_or(AssetCaptureDecision::NoAcceptedAsset);
            AssetCapture::new(owner, decision)
        })
        .collect()
}

fn package_asset_bytes(package: &[u8]) -> Vec<Vec<u8>> {
    let inventory = inspect_zip32(package, &PackageLimits::V1).unwrap();
    let mut budget = DecodeBudget::new(PackageLimits::V1);
    let manifest_bytes = inventory.read_manifest(&mut budget).unwrap();
    let manifest = parse_manifest(&manifest_bytes).unwrap();
    let inventory = inventory.validate_v1_layout().unwrap();
    manifest
        .assets()
        .iter()
        .map(|asset| {
            let (index, _) = inventory.find(&asset.path()).unwrap();
            inventory
                .read_entry(index, EntryRole::Asset, &mut budget)
                .unwrap()
                .into_owned()
        })
        .collect()
}

fn assert_full_public_round_trip(
    source: Vec<u8>,
    specs: Vec<(AssetOwner, usize)>,
    catalog: &[RasterFixture],
    schema: &str,
) {
    assert_eq!(
        catalog
            .iter()
            .map(|fixture| fixture.mime)
            .collect::<Vec<_>>(),
        vec![
            RasterMime::Png,
            RasterMime::Jpeg,
            RasterMime::Webp,
            RasterMime::Gif,
            RasterMime::Bmp,
        ],
        "the full public round trip must exercise every package-v1 raster family",
    );
    let captures = captures_for_specs(&specs);
    let mut caller_source = source.clone();
    let input = ProjectPackageEncodeInput::new(caller_source.clone(), creator(), captures.clone());
    caller_source.fill(b'?');
    assert_eq!(input.normalized_project_json(), source);

    let first = encode_project_package(&input).unwrap();
    let second = encode_project_package(&input).unwrap();
    assert_eq!(
        first, second,
        "identical immutable input must be deterministic"
    );

    let mut reversed = captures;
    reversed.reverse();
    let reversed = encode_project_package(&ProjectPackageEncodeInput::new(
        source.clone(),
        creator(),
        reversed,
    ))
    .unwrap();
    assert_eq!(first, reversed, "capture-plan order must not affect bytes");

    let decoded = decode_project_package(&first).unwrap();
    assert_eq!(decoded.hydrated_project_json(), canonical_json(&source));
    assert_eq!(decoded.metadata().package_version(), 1);
    assert_eq!(decoded.metadata().project_schema_version(), schema);
    assert_eq!(decoded.metadata().creator().application(), TEST_APPLICATION);
    assert_eq!(decoded.metadata().creator().version(), TEST_VERSION);
    assert_eq!(decoded.metadata().binding_count(), specs.len());
    assert_eq!(decoded.metadata().asset_count(), catalog.len());
    assert!(!decoded
        .hydrated_project_json()
        .windows("packageVersion".len())
        .any(|window| window == b"packageVersion"));

    let mut actual_assets = package_asset_bytes(&first);
    let mut expected_assets = catalog
        .iter()
        .map(|fixture| fixture.bytes.clone())
        .collect::<Vec<_>>();
    actual_assets.sort();
    expected_assets.sort();
    assert_eq!(actual_assets, expected_assets);
}

#[test]
fn full_disc_current_schema_public_round_trip_is_exact_and_deterministic() {
    let _schedule = native::native_test_schedule_lock();
    let catalog = raster_catalog();
    assert_full_public_round_trip(
        full_disc_project("0.3.0", &catalog),
        disc_owner_specs(),
        &catalog,
        "0.3.0",
    );
}

#[test]
fn full_case_all_surfaces_public_round_trip_is_exact_and_deterministic() {
    let _schedule = native::native_test_schedule_lock();
    let catalog = raster_catalog();
    assert_full_public_round_trip(
        full_case_project("0.3.0", &catalog),
        case_owner_specs(),
        &catalog,
        "0.3.0",
    );
}

#[test]
fn supported_older_schema_public_handoff_hydrates_without_migration() {
    let _schedule = native::native_test_schedule_lock();
    let bmp = bmp_fixture([0x31, 0x41, 0x59]);
    let source = replace_once(
        golden_case_project("null", None),
        r#""schemaVersion":"0.3.0""#,
        r#""schemaVersion":"0.1.0""#,
    );
    let asset = IndependentAsset::new(RasterMime::Bmp, bmp.clone(), 1, 1, banner_pointers());
    let (package, _) = independent_package(&source, "0.1.0", &[asset], None);
    let decoded = decode_project_package(&package).unwrap();
    let hydrated = replace_once(
        golden_case_project(&quoted_data_url(RasterMime::Bmp, &bmp), None),
        r#""schemaVersion":"0.3.0""#,
        r#""schemaVersion":"0.1.0""#,
    );

    assert_eq!(decoded.metadata().project_schema_version(), "0.1.0");
    assert_eq!(decoded.hydrated_project_json(), canonical_json(&hydrated));
    assert_eq!(decoded.metadata().asset_count(), 1);
    assert_eq!(decoded.metadata().binding_count(), 4);
    assert!(!String::from_utf8_lossy(decoded.hydrated_project_json()).contains("0.3.0"));
}

#[test]
fn input_asset_and_decoded_output_storage_are_mutation_isolated() {
    let mut caller_asset = bmp_fixture([0xaa, 0xbb, 0xcc]);
    let expected_asset = caller_asset.clone();
    let quoted_url = quoted_data_url(RasterMime::Bmp, &expected_asset);
    let mut caller_source = golden_case_project(&quoted_url, Some("null"));
    let expected_source = golden_case_project(&quoted_url, Some(&quoted_url));
    let captures = banner_and_background_captures(
        AssetCaptureDecision::captured_bytes(RasterMime::Bmp, &caller_asset).unwrap(),
    );
    let input = ProjectPackageEncodeInput::new(caller_source.clone(), creator(), captures);
    caller_source.fill(b'?');
    caller_asset.fill(0);

    let mut package = encode_project_package(&input).unwrap();
    let decoded = decode_project_package(&package).unwrap();
    package.fill(0);

    assert_eq!(
        decoded.hydrated_project_json(),
        canonical_json(&expected_source)
    );
    assert_eq!(decoded.metadata().asset_count(), 1);
    assert_eq!(decoded.metadata().binding_count(), 5);
    assert!(!String::from_utf8_lossy(decoded.hydrated_project_json()).contains("manifest"));
}

#[derive(Clone, Debug)]
struct IndependentAsset {
    mime: RasterMime,
    bytes: Vec<u8>,
    width: u32,
    height: u32,
    pointers: Vec<String>,
    declared_byte_length: Option<u64>,
}

impl IndependentAsset {
    fn new(
        mime: RasterMime,
        bytes: Vec<u8>,
        width: u32,
        height: u32,
        pointers: Vec<String>,
    ) -> Self {
        Self {
            mime,
            bytes,
            width,
            height,
            pointers,
            declared_byte_length: None,
        }
    }
}

#[derive(Clone, Debug)]
struct RawZipEntry {
    name: String,
    bytes: Vec<u8>,
}

fn push_u16(output: &mut Vec<u8>, value: u16) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn push_u32(output: &mut Vec<u8>, value: u32) {
    output.extend_from_slice(&value.to_le_bytes());
}

/// Independent Store-only ZIP32 builder used as a cross-check against the
/// package writer. It deliberately duplicates only the published byte profile,
/// not any production implementation helper.
fn independent_store_zip(entries: &[RawZipEntry]) -> Vec<u8> {
    let mut output = Vec::new();
    let mut central = Vec::new();

    for entry in entries {
        let offset = u32::try_from(output.len()).unwrap();
        let size = u32::try_from(entry.bytes.len()).unwrap();
        let name_length = u16::try_from(entry.name.len()).unwrap();
        let crc = crc32fast::hash(&entry.bytes);

        push_u32(&mut output, 0x0403_4b50);
        push_u16(&mut output, 10);
        push_u16(&mut output, 0);
        push_u16(&mut output, 0);
        push_u16(&mut output, 0);
        push_u16(&mut output, 0x0021);
        push_u32(&mut output, crc);
        push_u32(&mut output, size);
        push_u32(&mut output, size);
        push_u16(&mut output, name_length);
        push_u16(&mut output, 0);
        output.extend_from_slice(entry.name.as_bytes());
        output.extend_from_slice(&entry.bytes);

        central.push((entry, offset, size, name_length, crc));
    }

    let central_offset = u32::try_from(output.len()).unwrap();
    for (entry, offset, size, name_length, crc) in central {
        push_u32(&mut output, 0x0201_4b50);
        push_u16(&mut output, 0x0014);
        push_u16(&mut output, 10);
        push_u16(&mut output, 0);
        push_u16(&mut output, 0);
        push_u16(&mut output, 0);
        push_u16(&mut output, 0x0021);
        push_u32(&mut output, crc);
        push_u32(&mut output, size);
        push_u32(&mut output, size);
        push_u16(&mut output, name_length);
        push_u16(&mut output, 0);
        push_u16(&mut output, 0);
        push_u16(&mut output, 0);
        push_u16(&mut output, 0);
        push_u32(&mut output, 0);
        push_u32(&mut output, offset);
        output.extend_from_slice(entry.name.as_bytes());
    }
    let central_length = u32::try_from(output.len()).unwrap() - central_offset;
    let entry_count = u16::try_from(entries.len()).unwrap();

    push_u32(&mut output, 0x0605_4b50);
    push_u16(&mut output, 0);
    push_u16(&mut output, 0);
    push_u16(&mut output, entry_count);
    push_u16(&mut output, entry_count);
    push_u32(&mut output, central_length);
    push_u32(&mut output, central_offset);
    push_u16(&mut output, 0);
    output
}

fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn independent_manifest(
    project: &[u8],
    schema: &str,
    assets: &[IndependentAsset],
    project_length_override: Option<u64>,
) -> (String, Vec<(String, Vec<u8>)>) {
    let mut asset_rows = assets
        .iter()
        .map(|asset| {
            let digest = sha256_hex(&asset.bytes);
            let path = format!("assets/sha256/{digest}{}", asset.mime.extension());
            let length = asset
                .declared_byte_length
                .unwrap_or(asset.bytes.len() as u64);
            let row = format!(
                r#"{{"byteLength":{length},"height":{},"id":"sha256:{digest}","mimeType":"{}","path":"{path}","sha256":"{digest}","width":{}}}"#,
                asset.height,
                asset.mime.as_str(),
                asset.width,
            );
            (path, row, asset.bytes.clone(), digest, asset.pointers.clone())
        })
        .collect::<Vec<_>>();
    asset_rows.sort_by(|left, right| left.0.cmp(&right.0));

    let mut bindings = asset_rows
        .iter()
        .flat_map(|(_, _, _, digest, pointers)| {
            pointers.iter().map(move |pointer| {
                format!(r#"{{"assetId":"sha256:{digest}","pointer":"{pointer}"}}"#)
            })
        })
        .collect::<Vec<_>>();
    bindings.sort();

    let project_digest = sha256_hex(project);
    let project_length = project_length_override.unwrap_or(project.len() as u64);
    let manifest = format!(
        r#"{{"assets":[{}],"bindings":[{}],"createdBy":{{"application":"{TEST_APPLICATION}","version":"{TEST_VERSION}"}},"format":"sbls/project-package","packageVersion":1,"project":{{"byteLength":{project_length},"path":"project.json","sha256":"{project_digest}"}},"projectSchemaVersion":"{schema}"}}"#,
        asset_rows
            .iter()
            .map(|(_, row, _, _, _)| row.as_str())
            .collect::<Vec<_>>()
            .join(","),
        bindings.join(","),
    );
    let archive_assets = asset_rows
        .into_iter()
        .map(|(path, _, bytes, _, _)| (path, bytes))
        .collect();
    (manifest, archive_assets)
}

fn independent_package(
    project: &[u8],
    schema: &str,
    assets: &[IndependentAsset],
    project_length_override: Option<u64>,
) -> (Vec<u8>, String) {
    let (manifest, archive_assets) =
        independent_manifest(project, schema, assets, project_length_override);
    let mut entries = vec![
        RawZipEntry {
            name: MANIFEST_ENTRY_NAME.to_owned(),
            bytes: manifest.as_bytes().to_vec(),
        },
        RawZipEntry {
            name: PROJECT_ENTRY_NAME.to_owned(),
            bytes: project.to_vec(),
        },
    ];
    entries.extend(
        archive_assets
            .into_iter()
            .map(|(name, bytes)| RawZipEntry { name, bytes }),
    );
    (independent_store_zip(&entries), manifest)
}

fn owned_v1_entries(package: &[u8]) -> Vec<RawZipEntry> {
    let inventory = inspect_zip32(package, &PackageLimits::V1)
        .unwrap()
        .validate_v1_layout()
        .unwrap();
    let mut budget = DecodeBudget::new(PackageLimits::V1);
    inventory
        .entries()
        .iter()
        .enumerate()
        .map(|(index, entry)| RawZipEntry {
            name: entry.name.to_owned(),
            bytes: inventory
                .read_entry(index, inventory.role(index).unwrap(), &mut budget)
                .unwrap()
                .into_owned(),
        })
        .collect()
}

fn rewrite_package<F, G>(package: &[u8], project_edit: F, manifest_edit: G) -> Vec<u8>
where
    F: FnOnce(String) -> String,
    G: FnOnce(String) -> String,
{
    let mut entries = owned_v1_entries(package);
    let project_index = entries
        .iter()
        .position(|entry| entry.name == PROJECT_ENTRY_NAME)
        .unwrap();
    let manifest_index = entries
        .iter()
        .position(|entry| entry.name == MANIFEST_ENTRY_NAME)
        .unwrap();
    let old_project = entries[project_index].bytes.clone();
    let new_project = project_edit(String::from_utf8(old_project.clone()).unwrap()).into_bytes();
    let old_descriptor = format!(
        r#""project":{{"byteLength":{},"path":"project.json","sha256":"{}"}}"#,
        old_project.len(),
        sha256_hex(&old_project),
    );
    let new_descriptor = format!(
        r#""project":{{"byteLength":{},"path":"project.json","sha256":"{}"}}"#,
        new_project.len(),
        sha256_hex(&new_project),
    );
    let old_manifest = String::from_utf8(entries[manifest_index].bytes.clone()).unwrap();
    let mut new_manifest = if new_project == old_project {
        old_manifest
    } else {
        let updated = old_manifest.replacen(&old_descriptor, &new_descriptor, 1);
        assert_ne!(
            updated, old_manifest,
            "the test rewriter must update the exact project descriptor"
        );
        updated
    };
    new_manifest = manifest_edit(new_manifest);
    entries[project_index].bytes = new_project;
    entries[manifest_index].bytes = new_manifest.into_bytes();
    independent_store_zip(&entries)
}

fn remove_manifest_binding(mut manifest: String, pointer: &str) -> String {
    let needle = format!(r#""pointer":"{pointer}""#);
    let needle_start = manifest.find(&needle).unwrap();
    let mut row_start = manifest[..needle_start].rfind('{').unwrap();
    let mut row_end = manifest[needle_start..].find('}').unwrap() + needle_start + 1;
    if manifest.as_bytes().get(row_end) == Some(&b',') {
        row_end += 1;
    } else if row_start > 0 && manifest.as_bytes()[row_start - 1] == b',' {
        row_start -= 1;
    }
    manifest.replace_range(row_start..row_end, "");
    assert!(!manifest.contains(&needle));
    manifest
}

fn remove_root_member(mut project: String, member: &str) -> String {
    let needle = format!(r#""{member}":"#);
    let member_start = project.find(&needle).unwrap();
    let value_start = member_start + needle.len();
    let bytes = project.as_bytes();
    let mut cursor = value_start;
    let mut depth = 0_usize;
    let mut in_string = false;
    let mut escaped = false;
    while cursor < bytes.len() {
        let byte = bytes[cursor];
        if in_string {
            if escaped {
                escaped = false;
            } else if byte == b'\\' {
                escaped = true;
            } else if byte == b'"' {
                in_string = false;
            }
        } else {
            match byte {
                b'"' => in_string = true,
                b'{' | b'[' => depth += 1,
                b'}' | b']' if depth > 0 => depth -= 1,
                b',' | b'}' if depth == 0 => break,
                _ => {}
            }
        }
        cursor += 1;
    }
    let mut remove_start = member_start;
    let mut remove_end = cursor;
    if bytes.get(remove_end) == Some(&b',') {
        remove_end += 1;
    } else if remove_start > 0 && bytes[remove_start - 1] == b',' {
        remove_start -= 1;
    }
    project.replace_range(remove_start..remove_end, "");
    assert!(!project.contains(&needle));
    project
}

fn replace_once(source: Vec<u8>, from: &str, to: &str) -> Vec<u8> {
    let source = String::from_utf8(source).unwrap();
    let replaced = source.replacen(from, to, 1);
    assert_ne!(source, replaced, "test fixture replacement must match");
    replaced.into_bytes()
}

fn banner_pointers() -> Vec<String> {
    vec![
        "/caseInsert/spine/left/steamBanner/lockupImageDataUrl".to_owned(),
        "/caseInsert/spine/right/steamBanner/lockupImageDataUrl".to_owned(),
        "/caseInsert/templates/cover/steamBanner/lockupImageDataUrl".to_owned(),
        "/caseInsert/templates/tray/steamBanner/lockupImageDataUrl".to_owned(),
    ]
}

fn golden_case_project(banner_value: &str, cover_background: Option<&str>) -> Vec<u8> {
    let mut project =
        String::from(r#"{"caseInsert":{"spine":{"left":{"steamBanner":{"lockupImageDataUrl":"#);
    project.push_str(banner_value);
    project.push_str(r#"}},"right":{"steamBanner":{"lockupImageDataUrl":"#);
    project.push_str(banner_value);
    project.push_str(r#"}}},"templates":{"cover":{"steamBanner":{"lockupImageDataUrl":"#);
    project.push_str(banner_value);
    project.push('}');
    if let Some(value) = cover_background {
        project.push_str(r#","background":{"imageDataUrl":"#);
        project.push_str(value);
        project.push_str(r#","imageSource":{"source":"built-in"}}"#);
    }
    project.push_str(r#"},"tray":{"steamBanner":{"lockupImageDataUrl":"#);
    project.push_str(banner_value);
    project.push_str(
        r#"}}}},"projectType":"caseInsert","schemaVersion":"0.3.0","template":{"type":"caseInsert"}}"#,
    );
    project.into_bytes()
}

fn banner_and_background_captures(background_decision: AssetCaptureDecision) -> Vec<AssetCapture> {
    let background = AssetOwner::CaseBackground {
        surface: CaseSurface::Cover,
    };
    fixed_case_owners()
        .into_iter()
        .map(|owner| {
            let decision = match owner {
                AssetOwner::CaseBanner { .. } => AssetCaptureDecision::ProjectOwnedDataUrl,
                candidate if candidate == background => background_decision.clone(),
                _ => AssetCaptureDecision::NoAcceptedAsset,
            };
            AssetCapture::new(owner, decision)
        })
        .collect()
}

fn quoted_data_url(mime: RasterMime, bytes: &[u8]) -> String {
    format!(
        r#""data:{};base64,{}""#,
        mime.as_str(),
        STANDARD.encode(bytes)
    )
}

#[test]
fn independent_raw_valid_golden_matches_public_writer_and_decoder() {
    let bmp = bmp_fixture([0x11, 0x22, 0x33]);
    let quoted_url = quoted_data_url(RasterMime::Bmp, &bmp);
    let hydrated = golden_case_project(&quoted_url, None);
    let projection = golden_case_project("null", None);
    assert_eq!(projection, canonical_json(&projection));
    assert_eq!(hydrated, canonical_json(&hydrated));

    let asset = IndependentAsset::new(RasterMime::Bmp, bmp, 1, 1, banner_pointers());
    let (golden, manifest) = independent_package(&projection, "0.3.0", &[asset], None);
    parse_manifest(manifest.as_bytes()).unwrap();

    let captures = fixed_case_capture_plan(None)
        .into_iter()
        .map(|capture| {
            let decision = if matches!(capture.owner(), AssetOwner::CaseBanner { .. }) {
                AssetCaptureDecision::ProjectOwnedDataUrl
            } else {
                AssetCaptureDecision::NoAcceptedAsset
            };
            AssetCapture::new(capture.owner(), decision)
        })
        .collect::<Vec<_>>();
    let encoded = encode_project_package(&ProjectPackageEncodeInput::new(
        hydrated.clone(),
        creator(),
        captures,
    ))
    .unwrap();
    assert_eq!(encoded, golden);

    let decoded = decode_project_package(&golden).unwrap();
    assert_eq!(decoded.hydrated_project_json(), hydrated);
    assert_eq!(decoded.metadata().asset_count(), 1);
    assert_eq!(decoded.metadata().binding_count(), 4);
}

#[test]
fn zero_asset_manifest_and_store_envelope_have_exactly_two_entries() {
    let project = br#"{"caseInsert":{},"projectType":"caseInsert","schemaVersion":"0.3.0","template":{"type":"caseInsert"}}"#;
    let (package, manifest) = independent_package(project, "0.3.0", &[], None);
    let parsed = parse_manifest(manifest.as_bytes()).unwrap();
    assert!(parsed.assets().is_empty());
    assert!(parsed.bindings().is_empty());
    let inventory = inspect_zip32(&package, &PackageLimits::V1).unwrap();
    assert_eq!(inventory.entries().len(), 2);
    assert_eq!(inventory.entries()[0].name, MANIFEST_ENTRY_NAME);
    assert_eq!(inventory.entries()[1].name, PROJECT_ENTRY_NAME);
}

#[test]
fn public_jpeg_profile_failure_uses_the_stable_package_code() {
    let _schedule = native::native_test_schedule_lock();
    let banner = bmp_fixture([1, 2, 3]);
    let unsupported = lossless_jpeg_fixture();
    let banner_url = quoted_data_url(RasterMime::Bmp, &banner);
    let background_url = quoted_data_url(RasterMime::Jpeg, &unsupported);
    let source = golden_case_project(&banner_url, Some(&background_url));
    let error = encode_project_package(&ProjectPackageEncodeInput::new(
        source,
        creator(),
        banner_and_background_captures(AssetCaptureDecision::ProjectOwnedDataUrl),
    ))
    .unwrap_err();
    assert_eq!(error.code, FailureCode::AssetJpegProfileUnsupported);
    assert_eq!(error.stage, FailureStage::AssetValidation);
}

#[test]
fn public_bmp_profile_failure_uses_the_stable_package_code() {
    let _schedule = native::native_test_schedule_lock();
    let banner = bmp_fixture([1, 2, 3]);
    let unsupported = bmp_32_bit_fixture([4, 5, 6, 255]);
    let source = golden_case_project(
        &quoted_data_url(RasterMime::Bmp, &banner),
        Some(&quoted_data_url(RasterMime::Bmp, &unsupported)),
    );
    let error = encode_project_package(&ProjectPackageEncodeInput::new(
        source,
        creator(),
        banner_and_background_captures(AssetCaptureDecision::ProjectOwnedDataUrl),
    ))
    .unwrap_err();
    assert_eq!(error.code, FailureCode::AssetBmpProfileUnsupported);
    assert_eq!(error.stage, FailureStage::AssetValidation);
}

#[test]
fn public_decode_jpeg_profile_code_yields_to_manifest_dimension_mismatch() {
    let _schedule = native::native_test_schedule_lock();
    let project = golden_case_project("null", None);

    for (declared_width, expected) in [
        (1, FailureCode::AssetJpegProfileUnsupported),
        (2, FailureCode::AssetDimensionsInvalid),
    ] {
        let asset = IndependentAsset::new(
            RasterMime::Jpeg,
            lossless_jpeg_fixture(),
            declared_width,
            1,
            banner_pointers(),
        );
        let (package, _) = independent_package(&project, "0.3.0", &[asset], None);
        let error = decode_project_package(&package).unwrap_err();
        assert_eq!(error.code, expected, "declared width {declared_width}");
        assert_eq!(error.stage, FailureStage::AssetValidation);
    }
}

#[test]
fn public_decode_bmp_profile_code_yields_to_manifest_dimension_mismatch() {
    let project = golden_case_project("null", None);

    for (declared_width, expected) in [
        (1, FailureCode::AssetBmpProfileUnsupported),
        (2, FailureCode::AssetDimensionsInvalid),
    ] {
        let asset = IndependentAsset::new(
            RasterMime::Bmp,
            bmp_32_bit_fixture([4, 5, 6, 255]),
            declared_width,
            1,
            banner_pointers(),
        );
        let (package, _) = independent_package(&project, "0.3.0", &[asset], None);
        let error = decode_project_package(&package).unwrap_err();
        assert_eq!(error.code, expected, "declared width {declared_width}");
        assert_eq!(error.stage, FailureStage::AssetValidation);
    }
}

#[test]
fn malformed_jpeg_and_bmp_map_to_the_general_invalid_asset_code_publicly() {
    let _schedule = native::native_test_schedule_lock();
    let banner = bmp_fixture([7, 8, 9]);
    let banner_url = quoted_data_url(RasterMime::Bmp, &banner);
    let mut malformed_jpeg = jpeg_fixture(false, 3);
    malformed_jpeg.truncate(malformed_jpeg.len() - 2);
    let mut malformed_bmp = bmp_fixture([10, 11, 12]);
    malformed_bmp.pop();

    for (mime, malformed) in [
        (RasterMime::Jpeg, malformed_jpeg),
        (RasterMime::Bmp, malformed_bmp),
    ] {
        let source = golden_case_project(&banner_url, Some(&quoted_data_url(mime, &malformed)));
        let error = encode_project_package(&ProjectPackageEncodeInput::new(
            source,
            creator(),
            banner_and_background_captures(AssetCaptureDecision::ProjectOwnedDataUrl),
        ))
        .unwrap_err();
        assert_eq!(error.code, FailureCode::AssetTypeInvalid, "{mime:?}");
        assert_eq!(error.stage, FailureStage::AssetValidation, "{mime:?}");
    }
}

#[test]
fn native_allocation_denial_maps_through_public_encode_and_decode_then_recovers() {
    let _schedule = native::native_test_schedule_lock();
    let banner = bmp_fixture([4, 5, 6]);
    let jpeg = jpeg_fixture(false, 3);
    let source = golden_case_project(
        &quoted_data_url(RasterMime::Bmp, &banner),
        Some(&quoted_data_url(RasterMime::Jpeg, &jpeg)),
    );
    let input = ProjectPackageEncodeInput::new(
        source.clone(),
        creator(),
        banner_and_background_captures(AssetCaptureDecision::ProjectOwnedDataUrl),
    );

    let encode_error =
        native::with_native_allocation_failure_for_test(1, || encode_project_package(&input))
            .unwrap_err();
    assert_eq!(encode_error.code, FailureCode::ResourceLimitExceeded);
    assert_eq!(encode_error.stage, FailureStage::AssetValidation);

    let package = encode_project_package(&input).unwrap();
    let decode_error =
        native::with_native_allocation_failure_for_test(1, || decode_project_package(&package))
            .unwrap_err();
    assert_eq!(decode_error.code, FailureCode::ResourceLimitExceeded);
    assert_eq!(decode_error.stage, FailureStage::AssetValidation);

    let decoded = decode_project_package(&package).unwrap();
    assert_eq!(decoded.hydrated_project_json(), canonical_json(&source));
}

#[test]
fn missing_bound_leaf_and_residual_package_tokens_are_rejected() {
    let bmp = bmp_fixture([9, 10, 11]);
    let mut pointers = banner_pointers();
    pointers.push("/caseInsert/templates/cover/background/imageDataUrl".to_owned());
    let asset = IndependentAsset::new(RasterMime::Bmp, bmp.clone(), 1, 1, pointers);
    let projection_without_background = golden_case_project("null", None);
    let (missing_leaf, _) =
        independent_package(&projection_without_background, "0.3.0", &[asset], None);
    let error = decode_project_package(&missing_leaf).unwrap_err();
    assert_eq!(error.code, FailureCode::BindingInvalid);
    assert_eq!(error.stage, FailureStage::BindingHydration);

    let banner_asset = IndependentAsset::new(RasterMime::Bmp, bmp, 1, 1, banner_pointers());
    for token in [
        "data:image/png;base64,AA==",
        "blob:https://example.invalid/asset",
        "sbls://sha256/example",
        "asset://example",
        "assets/sha256/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.bmp",
    ] {
        let mut project = String::from_utf8(golden_case_project("null", None)).unwrap();
        project.pop();
        project.push_str(&format!(r#","futureToken":"{token}"}}"#));
        let (package, _) = independent_package(
            project.as_bytes(),
            "0.3.0",
            std::slice::from_ref(&banner_asset),
            None,
        );
        let error = decode_project_package(&package).unwrap_err();
        assert_eq!(error.code, FailureCode::BindingUnresolved, "{token}");
        assert_eq!(error.stage, FailureStage::BindingHydration, "{token}");
    }
}

#[test]
fn project_and_asset_declared_byte_lengths_are_verified_at_the_public_boundary() {
    let bmp = bmp_fixture([12, 13, 14]);
    let project = golden_case_project("null", None);
    let asset = IndependentAsset::new(RasterMime::Bmp, bmp.clone(), 1, 1, banner_pointers());

    let (project_mismatch, _) = independent_package(
        &project,
        "0.3.0",
        std::slice::from_ref(&asset),
        Some(project.len() as u64 + 1),
    );
    let error = decode_project_package(&project_mismatch).unwrap_err();
    assert_eq!(error.code, FailureCode::ProjectDigestMismatch);
    assert_eq!(error.stage, FailureStage::Project);

    let mut length_mismatch = asset;
    length_mismatch.declared_byte_length = Some(bmp.len() as u64 + 1);
    let (asset_mismatch, _) = independent_package(&project, "0.3.0", &[length_mismatch], None);
    let error = decode_project_package(&asset_mismatch).unwrap_err();
    assert_eq!(error.code, FailureCode::AssetDigestMismatch);
    assert_eq!(error.stage, FailureStage::AssetValidation);
}

#[test]
fn nested_manifest_duplicate_and_closed_shape_matrix_is_rejected() {
    let project = golden_case_project("null", None);
    let asset = IndependentAsset::new(
        RasterMime::Bmp,
        bmp_fixture([15, 16, 17]),
        1,
        1,
        banner_pointers(),
    );
    let (_, canonical) = independent_package(&project, "0.3.0", &[asset], None);
    parse_manifest(canonical.as_bytes()).unwrap();

    let binding_pointer = "/caseInsert/spine/left/steamBanner/lockupImageDataUrl";
    let invalid = [
        (
            "duplicate createdBy key",
            canonical.replace(r#""version":"1.0.0""#, r#""version":"1.0.0","version":"2""#),
        ),
        (
            "duplicate project key",
            canonical.replace(
                r#""path":"project.json""#,
                r#""path":"project.json","path":"project.json""#,
            ),
        ),
        (
            "duplicate asset key",
            canonical.replace(r#""width":1}"#, r#""width":1,"width":1}"#),
        ),
        (
            "duplicate binding key",
            canonical.replacen(
                &format!(r#""pointer":"{binding_pointer}""#),
                &format!(r#""pointer":"{binding_pointer}","pointer":"{binding_pointer}""#),
                1,
            ),
        ),
        (
            "unknown createdBy field",
            canonical.replace(
                r#""version":"1.0.0""#,
                r#""version":"1.0.0","channel":"test""#,
            ),
        ),
        (
            "missing createdBy field",
            canonical.replace(r#","version":"1.0.0""#, ""),
        ),
        (
            "wrong createdBy type",
            canonical.replace(
                r#""application":"steam-backup-label-studio""#,
                r#""application":1"#,
            ),
        ),
        (
            "unknown project field",
            canonical.replace(
                r#""path":"project.json""#,
                r#""path":"project.json","name":"project""#,
            ),
        ),
        (
            "missing project field",
            canonical.replace(r#","path":"project.json""#, ""),
        ),
        (
            "wrong project type",
            canonical.replace(r#""path":"project.json""#, r#""path":1"#),
        ),
        (
            "unknown asset field",
            canonical.replace(r#""width":1}"#, r#""width":1,"source":"local"}"#),
        ),
        (
            "missing asset field",
            canonical.replace(r#","height":1"#, ""),
        ),
        (
            "unknown binding field",
            canonical.replacen(
                &format!(r#""pointer":"{binding_pointer}""#),
                &format!(r#""pointer":"{binding_pointer}","future":true"#),
                1,
            ),
        ),
        (
            "wrong binding type",
            canonical.replacen(
                &format!(r#""pointer":"{binding_pointer}""#),
                r#""pointer":1"#,
                1,
            ),
        ),
    ];

    for (name, manifest) in invalid {
        let error = parse_manifest(manifest.as_bytes()).unwrap_err();
        assert_eq!(error.stage, FailureStage::Manifest, "{name}");
        assert_eq!(error.code, FailureCode::ManifestInvalid, "{name}");
    }
}

#[test]
fn archive_writer_and_reader_accept_exact_caps_and_reject_one_under() {
    let manifest = b"{}";
    let project = b"{}";
    let entries = [
        StoredEntry {
            name: MANIFEST_ENTRY_NAME,
            bytes: manifest,
        },
        StoredEntry {
            name: PROJECT_ENTRY_NAME,
            bytes: project,
        },
    ];
    let baseline = encode_stored_zip32(&entries, &PackageLimits::V1).unwrap();
    let total_uncompressed = (manifest.len() + project.len()) as u64;

    let mut exact = PackageLimits::V1;
    exact.raw_archive_bytes = baseline.len() as u64;
    exact.total_uncompressed_bytes = total_uncompressed;
    exact.archive_entries = 2;
    assert_eq!(encode_stored_zip32(&entries, &exact).unwrap(), baseline);
    inspect_zip32(&baseline, &exact).unwrap();

    let mut raw_one_under = exact;
    raw_one_under.raw_archive_bytes -= 1;
    assert_eq!(
        encode_stored_zip32(&entries, &raw_one_under)
            .unwrap_err()
            .code,
        FailureCode::ArchiveTooLarge
    );
    assert_eq!(
        inspect_zip32(&baseline, &raw_one_under).unwrap_err().code,
        FailureCode::ArchiveTooLarge
    );

    let mut total_one_under = exact;
    total_one_under.total_uncompressed_bytes -= 1;
    assert_eq!(
        encode_stored_zip32(&entries, &total_one_under)
            .unwrap_err()
            .code,
        FailureCode::ResourceLimitExceeded
    );
    assert_eq!(
        inspect_zip32(&baseline, &total_one_under).unwrap_err().code,
        FailureCode::ResourceLimitExceeded
    );

    let mut count_one_under = exact;
    count_one_under.archive_entries = 1;
    assert_eq!(
        encode_stored_zip32(&entries, &count_one_under)
            .unwrap_err()
            .code,
        FailureCode::ResourceLimitExceeded
    );
    assert_eq!(
        inspect_zip32(&baseline, &count_one_under).unwrap_err().code,
        FailureCode::ResourceLimitExceeded
    );
}

#[test]
fn unknown_semantic_built_ins_are_rejected_at_both_public_facades() {
    let _schedule = native::native_test_schedule_lock();
    let catalog = raster_catalog();
    let disc = full_disc_project("0.3.0", &catalog);
    let case = full_case_project("0.3.0", &catalog);
    let disc_variants = [
        (
            "supplemental USK beside a bound primary rating",
            replace_once(
                disc.clone(),
                r#""ratingBadge":{"enabled":false,"source":"custom""#,
                r#""ratingBadge":{"enabled":false,"uskBadge":{"layout":{"enabled":true},"ratingValue":"21"},"source":"custom""#,
            ),
        ),
        (
            "disc-number badgeSet",
            replace_once(
                disc.clone(),
                r#""transportSentinel":"project-only","#,
                r#""transportSentinel":"project-only","discNumberArtwork":{"mode":"badge","badgeSet":"standard"},"#,
            ),
        ),
        (
            "rocky frame beside bound Disc artwork",
            replace_once(
                disc.clone(),
                r#""additionalArtwork":{"elements":[{"enabled":false,"#,
                r#""additionalArtwork":{"elements":[{"enabled":false,"frame":{"style":"unknown"},"#,
            ),
        ),
    ];
    for (label, source) in &disc_variants {
        let error = encode_project_package(&ProjectPackageEncodeInput::new(
            source.clone(),
            creator(),
            captures_for_specs(&disc_owner_specs()),
        ))
        .unwrap_err();
        assert_eq!(error.code, FailureCode::BuiltInCaptureRequired, "{label}");
        assert_eq!(error.stage, FailureStage::AssetCapture, "{label}");
    }
    let case_rocky = replace_once(
        case.clone(),
        r#""artworkSlots":[{"enabled":false,"#,
        r#""artworkSlots":[{"enabled":false,"frame":{"style":"unknown"},"#,
    );
    let error = encode_project_package(&ProjectPackageEncodeInput::new(
        case_rocky,
        creator(),
        captures_for_specs(&case_owner_specs()),
    ))
    .unwrap_err();
    assert_eq!(error.code, FailureCode::BuiltInCaptureRequired);
    assert_eq!(error.stage, FailureStage::AssetCapture);

    let valid_disc = encode_project_package(&ProjectPackageEncodeInput::new(
        disc,
        creator(),
        captures_for_specs(&disc_owner_specs()),
    ))
    .unwrap();
    let valid_case = encode_project_package(&ProjectPackageEncodeInput::new(
        case,
        creator(),
        captures_for_specs(&case_owner_specs()),
    ))
    .unwrap();
    let decode_variants = [
        (
            "supplemental USK beside a bound primary rating",
            rewrite_package(
                &valid_disc,
                |project| {
                    project.replacen(
                        r#""ratingBadge":{"#,
                        r#""ratingBadge":{"uskBadge":{"layout":{"enabled":true},"ratingValue":"21"},"#,
                        1,
                    )
                },
                |manifest| manifest,
            ),
        ),
        (
            "disc-number badgeSet",
            rewrite_package(
                &valid_disc,
                |mut project| {
                    project.insert_str(
                        project.len() - 1,
                        r#","discNumberArtwork":{"mode":"badge","badgeSet":"standard"}"#,
                    );
                    project
                },
                |manifest| manifest,
            ),
        ),
        (
            "rocky frame beside bound Disc artwork",
            rewrite_package(
                &valid_disc,
                |project| {
                    project.replacen(
                        r#""additionalArtwork":{"elements":[{"#,
                        r#""additionalArtwork":{"elements":[{"frame":{"style":"unknown"},"#,
                        1,
                    )
                },
                |manifest| manifest,
            ),
        ),
        (
            "rocky frame beside bound Case artwork",
            rewrite_package(
                &valid_case,
                |project| {
                    project.replacen(
                        r#""artworkSlots":[{"#,
                        r#""artworkSlots":[{"frame":{"style":"unknown"},"#,
                        1,
                    )
                },
                |manifest| manifest,
            ),
        ),
    ];
    for (label, package) in decode_variants {
        let error = decode_project_package(&package).unwrap_err();
        assert_eq!(error.code, FailureCode::BuiltInUnavailable, "{label}");
        assert_eq!(error.stage, FailureStage::BindingHydration, "{label}");
    }
}

#[test]
fn unbound_logo_evidence_and_direct_mark_absence_have_stable_public_precedence() {
    let _schedule = native::native_test_schedule_lock();
    let catalog = raster_catalog();
    let disc_source = replace_once(
        full_disc_project("0.3.0", &catalog),
        r#""developerLogoSource":{"source":"custom"},"#,
        r#""developerLogoSource":{"source":"custom"},"developerLogoSize":{"width":8,"height":4},"#,
    );
    let case_source = replace_once(
        full_case_project("0.3.0", &catalog),
        r#""logoSlots":[{"enabled":false,"#,
        r#""logoSlots":[{"enabled":false,"imageSize":{"width":8,"height":4},"#,
    );
    let disc_package = encode_project_package(&ProjectPackageEncodeInput::new(
        disc_source,
        creator(),
        captures_for_specs(&disc_owner_specs()),
    ))
    .unwrap();
    let case_package = encode_project_package(&ProjectPackageEncodeInput::new(
        case_source,
        creator(),
        captures_for_specs(&case_owner_specs()),
    ))
    .unwrap();

    for (label, package, owner) in [
        (
            "Disc primary-logo source and retained size",
            &disc_package,
            AssetOwner::DiscPrimaryLogo {
                role: LogoRole::Developer,
            },
        ),
        (
            "Case logo source and retained size",
            &case_package,
            AssetOwner::CaseLogo {
                surface: CaseSurface::Cover,
                index: 0,
            },
        ),
    ] {
        let pointer = owner.try_pointer().unwrap();
        let rewritten = rewrite_package(
            package,
            |project| project,
            |manifest| remove_manifest_binding(manifest, &pointer),
        );
        let error = decode_project_package(&rewritten).unwrap_err();
        assert_eq!(error.code, FailureCode::BindingUnresolved, "{label}");
        assert_eq!(error.stage, FailureStage::BindingHydration, "{label}");
    }

    let clean_disc = encode_project_package(&ProjectPackageEncodeInput::new(
        full_disc_project("0.3.0", &catalog),
        creator(),
        captures_for_specs(&disc_owner_specs()),
    ))
    .unwrap();
    for (label, owner) in [
        (
            "rating custom-null/no-size fallback",
            AssetOwner::DiscRatingCustom,
        ),
        (
            "media custom-null/no-size fallback",
            AssetOwner::DiscMediaCustom,
        ),
    ] {
        let pointer = owner.try_pointer().unwrap();
        let rewritten = rewrite_package(
            &clean_disc,
            |project| project,
            |manifest| remove_manifest_binding(manifest, &pointer),
        );
        decode_project_package(&rewritten)
            .unwrap_or_else(|error| panic!("{label}: unexpected {error:?}"));
    }

    for (label, member, owner) in [
        (
            "absent rating fallback",
            "ratingBadge",
            AssetOwner::DiscRatingCustom,
        ),
        (
            "absent media fallback",
            "mediaMark",
            AssetOwner::DiscMediaCustom,
        ),
    ] {
        let pointer = owner.try_pointer().unwrap();
        let rewritten = rewrite_package(
            &clean_disc,
            |project| remove_root_member(project, member),
            |manifest| remove_manifest_binding(manifest, &pointer),
        );
        decode_project_package(&rewritten)
            .unwrap_or_else(|error| panic!("{label}: unexpected {error:?}"));
    }
}
