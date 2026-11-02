// Included in encode::tests::parts_tests, sharing the pure-codec fixtures.
fn parts_fixture() -> (Vec<u8>, Vec<AssetCapture>, String, [AssetOwner; 2]) {
    let json = case_json(
        r#", "background":{"imageDataUrl":null},"note":"\u00e9\ud83d\ude42""#,
        r#", "background":{"imageDataUrl":null}"#,
        "",
        "",
    );
    let json = String::from_utf8(json).unwrap()
        .replacen("\"lockupImageSource\":null", r#""lockupImageSource":{"source":"built-in","sourceId":"case-steam-banner:cover-lockup"}"#, 2)
        .replace("\"lockupImageSource\":null", r#""lockupImageSource":{"source":"built-in","sourceId":"case-steam-banner:spine-icon"}"#).into_bytes();
    let owners = [
        AssetOwner::CaseBackground {
            surface: CaseSurface::Cover,
        },
        AssetOwner::CaseBackground {
            surface: CaseSurface::Tray,
        },
    ];
    let captures = raw_captures_for(&json, |owner| {
        if owners.contains(&owner) {
            AssetCaptureDecision::ProjectOwnedDataUrl
        } else if let AssetOwner::CaseBanner { surface } = owner {
            AssetCaptureDecision::qualified_built_in(match surface {
                CaseSurface::Cover | CaseSurface::Tray => "steam-banner:banner-lockup",
                _ => "steam-banner:spine-icon",
            })
            .unwrap()
        } else {
            AssetCaptureDecision::NoAcceptedAsset
        }
    });
    (
        json,
        captures,
        canonical_data_url(RasterMime::Bmp, &one_by_one_bmp([1, 2, 3])),
        owners,
    )
}

#[test]
fn borrowed_parts_preserve_independent_limits_and_deduplicated_raster_charge() {
    let (json, captures, url, owners) = parts_fixture();
    let creator = PackageCreator::steam_backup_label_studio("0.1.0").unwrap();
    let urls = [(owners[0], url.as_str()), (owners[1], url.as_str())];
    let projected = parse_json_with_limits(&json, &PackageLimits::V1)
        .unwrap()
        .measure_strings_with_limits(&PackageLimits::V1)
        .unwrap();
    let length = url.len() as u64;
    let mut exact = PackageLimits::V1;
    exact.assets = 1;
    exact.bindings = 2;
    exact.asset_bytes = 58;
    exact.hydrated_data_url_bytes = length;
    exact.hydrated_data_url_fan_out_bytes = 2 * length;
    exact.hydrated_project_string_utf8_bytes = projected.utf8_bytes + 2 * length;
    exact.hydrated_project_string_utf16_code_units = projected.utf16_code_units + 2 * length;
    let encode = |limits, samples| {
        let mut budget =
            RasterBudget::with_aggregate_limits_for_test(1, samples, u64::MAX, u64::MAX);
        let result = encode_project_package_inner_with_raster_budget_borrowed(
            &json,
            &creator,
            &captures,
            limits,
            crate::assets::sha256_digest,
            &mut budget,
            Some(&urls),
        );
        (result, budget.totals_for_test())
    };
    let (package, totals) = encode(exact, 4);
    let package = package.unwrap();
    assert_eq!(
        (totals.0, totals.1),
        (1, 4),
        "two bindings validate one exact raster"
    );
    let decoded = decode_project_package(&package).unwrap();
    assert_eq!(
        (
            decoded.metadata().asset_count(),
            decoded.metadata().binding_count()
        ),
        (1, 2)
    );
    let mut cases = Vec::new();
    let mut limited = exact;
    limited.assets = 0;
    cases.push(limited);
    let mut limited = exact;
    limited.bindings = 1;
    cases.push(limited);
    let mut limited = exact;
    limited.asset_bytes = 57;
    cases.push(limited);
    let mut limited = exact;
    limited.hydrated_data_url_bytes -= 1;
    cases.push(limited);
    let mut limited = exact;
    limited.hydrated_data_url_fan_out_bytes -= 1;
    cases.push(limited);
    let mut limited = exact;
    limited.hydrated_project_string_utf8_bytes -= 1;
    cases.push(limited);
    let mut limited = exact;
    limited.hydrated_project_string_utf16_code_units -= 1;
    cases.push(limited);
    let mut limited = exact;
    limited.project_bytes = json.len() as u64 - 1;
    cases.push(limited);
    let mut limited = exact;
    limited.raw_archive_bytes = package.len() as u64 - 1;
    cases.push(limited);
    let mut limited = exact;
    limited.total_uncompressed_bytes = 58;
    cases.push(limited);
    for limits in cases {
        let error = encode(limits, 4).0.unwrap_err();
        assert!(matches!(
            error.code,
            FailureCode::ResourceLimitExceeded | FailureCode::ArchiveTooLarge
        ));
    }
    assert_eq!(
        encode(exact, 3).0.unwrap_err().code,
        FailureCode::ResourceLimitExceeded
    );
    assert!(
        encode(exact, 4).0.is_ok(),
        "a rejected request leaves budgets reusable"
    );
}

#[test]
fn borrowed_parts_require_exact_project_owned_bindings_and_null_leaves() {
    let (json, captures, url, owners) = parts_fixture();
    let creator = PackageCreator::steam_backup_label_studio("0.1.0").unwrap();
    let good = [(owners[0], url.as_str()), (owners[1], url.as_str())];
    for bad in [
        vec![],
        vec![good[0]],
        vec![good[0], good[0]],
        vec![good[0], good[1], good[0]],
        vec![good[0], (AssetOwner::DiscBackground, url.as_str())],
    ] {
        assert_eq!(
            encode_project_package_from_parts(&json, &creator, &captures, &bad)
                .unwrap_err()
                .code,
            FailureCode::AssetCaptureFailed
        );
    }
    let inline = String::from_utf8(json.clone()).unwrap().replacen(
        "\"imageDataUrl\":null",
        &format!("\"imageDataUrl\":\"{url}\""),
        1,
    );
    assert_eq!(
        encode_project_package_from_parts(inline.as_bytes(), &creator, &captures, &good)
            .unwrap_err()
            .code,
        FailureCode::AssetCaptureFailed
    );
    assert!(encode_project_package_from_borrowed(&json, &creator, &captures).is_err());
    assert!(encode_project_package_from_parts(
        &json,
        &creator,
        &captures,
        &[(owners[0], "data:image/bmp;base64,AAAA"), good[1]]
    )
    .is_err());
    assert!(encode_project_package_from_parts(&json, &creator, &captures, &good).is_ok());
}
