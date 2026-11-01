// Included inside project_packages::tests::capacity_tests to reuse its real
// command, filesystem fixture, and V1 framing helpers.
const MARKER: &str = "data:image/bmp;base64,SBLS_CAPACITY_BITMAP";
const FIXTURES: [&str; 2] = [
    include_str!("../../tests/fixtures/package-capacity-disc.json"),
    include_str!("../../tests/fixtures/package-capacity-case.json"),
];

fn frame_parts(version: u8, plan: &serde_json::Value, project: &[u8], pool: &[&str]) -> Vec<u8> {
    let plan = serde_json::to_vec(plan).unwrap();
    let mut body = Vec::new();
    body.extend_from_slice(if version == 1 {
        WRITE_REQUEST_MAGIC
    } else {
        WRITE_REQUEST_V2_MAGIC
    });
    body.extend_from_slice(&(plan.len() as u32).to_be_bytes());
    body.extend_from_slice(&(project.len() as u32).to_be_bytes());
    if version == 2 {
        body.extend_from_slice(&(pool.len() as u32).to_be_bytes());
    }
    body.extend_from_slice(&plan);
    body.extend_from_slice(project);
    for value in pool {
        body.extend_from_slice(&(value.len() as u32).to_be_bytes());
        body.extend_from_slice(value.as_bytes());
    }
    body
}

fn v2_fixture(fixture: &str, url: &str) -> (serde_json::Value, Vec<u8>, Vec<u8>) {
    let fixture: serde_json::Value = serde_json::from_str(fixture).unwrap();
    let mut plan = fixture["plan"].clone();
    plan["version"] = json!(2);
    for capture in plan["captures"].as_array_mut().unwrap() {
        if capture["decision"]["kind"] == "project-owned-data-url" {
            capture["decision"]["kind"] = json!("project-owned-data-url-part");
            capture["decision"]["dataUrlIndex"] = json!(0);
        }
    }
    let project = serde_json::to_string(&fixture["project"])
        .unwrap()
        .replace(&format!("\"{MARKER}\""), "null")
        .into_bytes();
    let body = frame_parts(2, &plan, &project, &[url]);
    (plan, project, body)
}

#[test]
fn normalized_disc_and_case_capacity_admission_v1_failure_and_v2_atomic_round_trip() {
    let directory = TestDirectory::new();
    let url = sized_bmp_data_url(1024);
    assert_eq!(url.len(), 4_194_398);
    let creator = PackageCreator::steam_backup_label_studio(env!("CARGO_PKG_VERSION")).unwrap();
    for (index, fixture) in FIXTURES.iter().enumerate() {
        let fixture_value: serde_json::Value = serde_json::from_str(fixture).unwrap();
        let small_project = serde_json::to_vec(&fixture_value["project"]).unwrap();
        let small_request = frame_parts(1, &fixture_value["plan"], &small_project, &[]);
        let captures = parse_write_request(&small_request).unwrap().captures;
        let hydrated = String::from_utf8(small_project)
            .unwrap()
            .replace(MARKER, &url)
            .into_bytes();
        assert!(hydrated.len() > MAX_PROJECT_JSON_BYTES);
        let old_request = write_request(&hydrated, &captures);
        assert_eq!(
            parse_write_request(&old_request).unwrap_err(),
            "size-limit-exceeded"
        );

        // Actual codec admission and reopen, not size arithmetic or a schema-only assertion.
        let admitted =
            encode_project_package_from_borrowed(&hydrated, &creator, &captures).unwrap();
        let reopened = decode_project_package(&admitted).unwrap();
        assert_eq!(reopened.metadata().asset_count(), 1);
        assert_eq!(reopened.metadata().binding_count(), 4);

        let (_, _, body) = v2_fixture(fixture, &url);
        assert!(body.len() < 4_300_000);
        let parsed = parse_write_request(&body).unwrap();
        let parts = parsed.data_urls.as_ref().unwrap();
        assert_eq!(parts.len(), 4);
        assert!(parts
            .iter()
            .all(|(_, value)| value.as_ptr() == parts[0].1.as_ptr()));
        let destination = directory.join(&format!("capacity-{index}.sbls"));
        fs::write(&destination, b"prior destination").unwrap();
        let result =
            encode_and_write_request(&write_headers(&destination, None), &InvokeBody::Raw(body))
                .unwrap();
        assert_eq!(result.status, "success");
        let saved = fs::read(&destination).unwrap();
        assert_eq!(
            saved, admitted,
            "V2 preserves the existing deterministic package format"
        );
        assert_eq!(
            decode_project_package(&saved)
                .unwrap()
                .hydrated_project_json(),
            reopened.hydrated_project_json()
        );
    }
}

#[test]
fn v2_rejects_malformed_pool_lengths_indices_versions_and_utf8() {
    let url = one_pixel_bmp_data_url();
    let (plan, project, body) = v2_fixture(FIXTURES[0], &url);
    let pool_start = 20 + read_be_u32(&body[8..12]).unwrap() + read_be_u32(&body[12..16]).unwrap();
    let mut cases = Vec::new();
    for end in [0, 7, 15, 19, pool_start + 2, body.len() - 1] {
        cases.push(body[..end].to_vec());
    }
    let mut trailing = body.clone();
    trailing.push(0);
    cases.push(trailing);
    let mut utf8 = body.clone();
    utf8[pool_start + 4] = 0xff;
    cases.push(utf8);
    let mut count = body.clone();
    count[16..20].copy_from_slice(&513_u32.to_be_bytes());
    cases.push(count);
    let mut length = body.clone();
    length[pool_start..pool_start + 4].copy_from_slice(&u32::MAX.to_be_bytes());
    cases.push(length);
    let mut missing = plan.clone();
    missing["captures"][0]["decision"]
        .as_object_mut()
        .unwrap()
        .remove("dataUrlIndex");
    cases.push(frame_parts(2, &missing, &project, &[&url]));
    let mut wrong = plan.clone();
    wrong["captures"][0]["decision"]["dataUrlIndex"] = json!(1);
    cases.push(frame_parts(2, &wrong, &project, &[&url]));
    let mut wrong_version = plan.clone();
    wrong_version["version"] = json!(1);
    cases.push(frame_parts(2, &wrong_version, &project, &[&url]));
    cases.push(frame_parts(2, &plan, &project, &[&url, &url])); // unreferenced pool entry
    for candidate in cases {
        assert!(parse_write_request(&candidate).is_err());
    }
    assert!(
        parse_write_request(&body).is_ok(),
        "failure leaves no cross-request state"
    );
}

#[test]
fn v2_codec_rejection_preserves_existing_destination_and_legacy_source() {
    let directory = TestDirectory::new();
    let source = directory.join("legacy.json");
    let destination = directory.join("existing.sbls");
    fs::write(&source, b"legacy source").unwrap();
    fs::write(&destination, b"previous save").unwrap();
    let (_, _, body) = v2_fixture(FIXTURES[1], "data:image/bmp;base64,AAAA");
    assert!(encode_and_write_request(
        &write_headers(&destination, Some(&source)),
        &InvokeBody::Raw(body)
    )
    .is_err());
    assert_eq!(fs::read(source).unwrap(), b"legacy source");
    assert_eq!(fs::read(destination).unwrap(), b"previous save");
    assert_eq!(
        fs::read_dir(&directory.0).unwrap().count(),
        2,
        "no temporary output on validation failure"
    );
}

#[test]
fn v2_zero_asset_built_ins_and_legacy_conversion_match_v1() {
    let directory = TestDirectory::new();
    let creator = PackageCreator::steam_backup_label_studio(env!("CARGO_PKG_VERSION")).unwrap();
    for (index, project, captures) in [
        (0, default_disc_project(), default_disc_captures()),
        (1, default_case_project(), default_case_captures()),
    ] {
        let v1 = write_request(&project, &captures);
        let plan_end = 16 + read_be_u32(&v1[8..12]).unwrap();
        let mut plan: serde_json::Value = serde_json::from_slice(&v1[16..plan_end]).unwrap();
        plan["version"] = json!(2);
        let body = frame_parts(2, &plan, &project, &[]);
        assert!(parse_write_request(&body)
            .unwrap()
            .data_urls
            .unwrap()
            .is_empty());
        let source = directory.join(&format!("source-{index}.json"));
        let destination = directory.join(&format!("converted-{index}.sbls"));
        fs::write(&source, &project).unwrap();
        encode_and_write_request(
            &write_headers(&destination, Some(&source)),
            &InvokeBody::Raw(body),
        )
        .unwrap();
        assert_eq!(fs::read(&source).unwrap(), project);
        let saved = fs::read(&destination).unwrap();
        assert_eq!(
            saved,
            encode_project_package_from_borrowed(&project, &creator, &captures).unwrap()
        );
        assert_eq!(
            decode_project_package(&saved)
                .unwrap()
                .metadata()
                .asset_count(),
            0
        );
    }
}

#[test]
fn capture_decisions_cannot_cross_request_versions_or_add_unknown_fields() {
    let fixture: serde_json::Value = serde_json::from_str(FIXTURES[0]).unwrap();
    let project = serde_json::to_vec(&fixture["project"]).unwrap();
    let mut v1_extra = fixture["plan"].clone();
    v1_extra["captures"][0]["decision"]["dataUrlIndex"] = serde_json::Value::Null;
    assert!(parse_write_request(&frame_parts(1, &v1_extra, &project, &[])).is_err());
    let mut wrong_kind = fixture["plan"].clone();
    wrong_kind["version"] = json!(2);
    assert!(parse_write_request(&frame_parts(2, &wrong_kind, &project, &[])).is_err());
    let (mut plan, metadata, _) = v2_fixture(FIXTURES[0], &one_pixel_bmp_data_url());
    plan["version"] = json!(1);
    assert!(parse_write_request(&frame_parts(1, &plan, &metadata, &[])).is_err());
}
