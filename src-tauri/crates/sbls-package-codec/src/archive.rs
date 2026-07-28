//! Strict, bounded classic-ZIP adapter for `.sbls` packages.
//!
//! This module deliberately does not use a general archive abstraction. The v1
//! package profile is much smaller than ZIP as a whole, and accepting a library's
//! implicit normalization, metadata defaults, or eager extraction would make the
//! security and reproducibility rules difficult to prove. Inventory is therefore
//! completed from immutable bytes before any entry is decompressed.

use std::borrow::Cow;

use miniz_oxide::inflate::{
    core::{
        decompress, inflate_flags::TINFL_FLAG_USING_NON_WRAPPING_OUTPUT_BUF, DecompressorOxide,
    },
    TINFLStatus,
};

use crate::error::{FailureCode, FailureStage, ProjectPackageFailure};
use crate::limits::{
    check_deflate_ratio, checked_add, checked_range_end, checked_u64, checked_usize, DecodeBudget,
    OperationAllocationLedger, PackageLimits,
};

const LOCAL_FILE_HEADER_SIGNATURE: u32 = 0x0403_4b50;
const CENTRAL_DIRECTORY_HEADER_SIGNATURE: u32 = 0x0201_4b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE: u32 = 0x0605_4b50;

const LOCAL_FILE_HEADER_BYTES: u64 = 30;
const CENTRAL_DIRECTORY_HEADER_BYTES: u64 = 46;
const END_OF_CENTRAL_DIRECTORY_BYTES: u64 = 22;

const VERSION_MADE_BY_DOS_20: u16 = 0x0014;
const VERSION_NEEDED_STORE: u16 = 10;
const VERSION_NEEDED_DEFLATE: u16 = 20;
const UTF8_NAME_FLAG: u16 = 0x0800;
const DOS_TIME: u16 = 0x0000;
const DOS_DATE: u16 = 0x0021;

pub(crate) const MANIFEST_ENTRY_NAME: &str = "manifest.json";
pub(crate) const PROJECT_ENTRY_NAME: &str = "project.json";
const ASSET_ENTRY_PREFIX: &str = "assets/sha256/";

/// The only compression methods accepted by package v1.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum ZipCompression {
    Store,
    Deflate,
}

impl ZipCompression {
    const fn code(self) -> u16 {
        match self {
            Self::Store => 0,
            Self::Deflate => 8,
        }
    }

    const fn version_needed(self) -> u16 {
        match self {
            Self::Store => VERSION_NEEDED_STORE,
            Self::Deflate => VERSION_NEEDED_DEFLATE,
        }
    }

    fn from_code(code: u16) -> Result<Self, ProjectPackageFailure> {
        match code {
            0 => Ok(Self::Store),
            8 => Ok(Self::Deflate),
            _ => Err(archive_invalid(FailureStage::EntryInventory)),
        }
    }
}

/// Semantic role used only to select the stable integrity-failure taxonomy.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum EntryRole {
    Manifest,
    Project,
    Asset,
}

impl EntryRole {
    const fn stage(self) -> FailureStage {
        match self {
            Self::Manifest => FailureStage::Manifest,
            Self::Project => FailureStage::Project,
            Self::Asset => FailureStage::AssetValidation,
        }
    }

    const fn integrity_code(self) -> FailureCode {
        match self {
            Self::Manifest => FailureCode::ArchiveInvalid,
            Self::Project => FailureCode::ProjectDigestMismatch,
            Self::Asset => FailureCode::AssetDigestMismatch,
        }
    }
}

/// One caller-owned byte payload to place in a deterministic Store archive.
#[derive(Clone, Copy, Debug)]
pub(crate) struct StoredEntry<'a> {
    pub name: &'a str,
    pub bytes: &'a [u8],
}

/// One fully checked entry in archive order.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct ArchiveEntry<'a> {
    pub name: &'a str,
    pub compression: ZipCompression,
    pub crc32: u32,
    pub compressed_size: u64,
    pub uncompressed_size: u64,
    compressed_bytes: &'a [u8],
}

/// A safe, immutable inventory. Constructing this proves the complete ZIP
/// envelope, metadata profile, name set, order, and byte spans.
#[derive(Debug)]
pub(crate) struct ZipInventory<'a> {
    entries: Vec<ArchiveEntry<'a>>,
    manifest_index: usize,
    limits: PackageLimits,
}

impl<'a> ZipInventory<'a> {
    pub fn entries(&self) -> &[ArchiveEntry<'a>] {
        &self.entries
    }

    #[cfg(test)]
    pub fn entry(&self, index: usize) -> Option<&ArchiveEntry<'a>> {
        self.entries.get(index)
    }

    pub fn find(&self, name: &str) -> Option<(usize, &ArchiveEntry<'a>)> {
        self.entries
            .iter()
            .enumerate()
            .find(|(_, entry)| entry.name == name)
    }

    /// Read the only entry whose meaning is established before manifest
    /// identity/version validation.
    #[cfg(test)]
    pub fn read_manifest(
        &self,
        budget: &mut DecodeBudget,
    ) -> Result<Cow<'a, [u8]>, ProjectPackageFailure> {
        let mut allocations = OperationAllocationLedger::new(self.limits.decoder_working_bytes);
        self.read_manifest_accounted(budget, &mut allocations)
            .map(|(bytes, _)| bytes)
    }

    pub fn read_manifest_accounted(
        &self,
        budget: &mut DecodeBudget,
        allocations: &mut OperationAllocationLedger,
    ) -> Result<(Cow<'a, [u8]>, u64), ProjectPackageFailure> {
        let manifest = self
            .entries
            .get(self.manifest_index)
            .ok_or_else(|| archive_invalid(FailureStage::EntryInventory))?;
        enforce_role_size(
            EntryRole::Manifest,
            manifest.uncompressed_size,
            &self.limits,
            FailureStage::Manifest,
        )?;
        self.read_entry_as_accounted(
            self.manifest_index,
            EntryRole::Manifest,
            budget,
            allocations,
        )
    }

    /// Apply the closed v1 layout only after the caller has accepted the
    /// manifest identity and package version.
    pub fn validate_v1_layout(self) -> Result<V1ZipInventory<'a>, ProjectPackageFailure> {
        let roles = classify_v1_names(&self.entries, &self.limits)?;
        for (entry, role) in self.entries.iter().zip(&roles) {
            enforce_role_size(*role, entry.uncompressed_size, &self.limits, role.stage())?;
        }
        Ok(V1ZipInventory {
            inventory: self,
            roles,
        })
    }

    fn read_entry_as(
        &self,
        index: usize,
        role: EntryRole,
        budget: &mut DecodeBudget,
    ) -> Result<Cow<'a, [u8]>, ProjectPackageFailure> {
        let mut allocations = OperationAllocationLedger::new(self.limits.decoder_working_bytes);
        self.read_entry_as_accounted(index, role, budget, &mut allocations)
            .map(|(bytes, _)| bytes)
    }

    fn read_entry_as_accounted(
        &self,
        index: usize,
        role: EntryRole,
        budget: &mut DecodeBudget,
        allocations: &mut OperationAllocationLedger,
    ) -> Result<(Cow<'a, [u8]>, u64), ProjectPackageFailure> {
        let entry = self
            .entries
            .get(index)
            .ok_or_else(|| archive_invalid(FailureStage::EntryInventory))?;
        if budget.limits() != &self.limits {
            return Err(archive_invalid(FailureStage::EntryInventory));
        }

        budget.precharge_declared_entry(entry.compressed_size, entry.uncompressed_size)?;

        let (output, allocation_charge) = match entry.compression {
            ZipCompression::Store => {
                budget.charge_observed_uncompressed(entry.uncompressed_size)?;
                (Cow::Borrowed(validate_stored(entry, role)?), 0)
            }
            ZipCompression::Deflate => {
                let (bytes, charge) = inflate_raw(entry, role, &self.limits, budget, allocations)?;
                (Cow::Owned(bytes), charge)
            }
        };

        let validated = (|| {
            let observed = checked_u64(output.len(), role.stage())?;
            if observed != entry.uncompressed_size
                || crc32fast::hash(output.as_ref()) != entry.crc32
            {
                return Err(integrity_failure(role));
            }
            Ok(())
        })();
        if let Err(error) = validated {
            drop(output);
            allocations
                .release(allocation_charge)
                .map_err(|_| ProjectPackageFailure::resource_limit(role.stage()))?;
            return Err(error);
        }
        Ok((output, allocation_charge))
    }
}

/// Inventory whose closed v1 semantic entry layout has been validated.
#[derive(Debug)]
pub(crate) struct V1ZipInventory<'a> {
    inventory: ZipInventory<'a>,
    roles: Vec<EntryRole>,
}

impl<'a> V1ZipInventory<'a> {
    pub fn entries(&self) -> &[ArchiveEntry<'a>] {
        self.inventory.entries()
    }

    #[cfg(test)]
    pub fn role(&self, index: usize) -> Option<EntryRole> {
        self.roles.get(index).copied()
    }

    pub fn find(&self, name: &str) -> Option<(usize, &ArchiveEntry<'a>)> {
        self.inventory.find(name)
    }

    pub fn read_entry(
        &self,
        index: usize,
        role: EntryRole,
        budget: &mut DecodeBudget,
    ) -> Result<Cow<'a, [u8]>, ProjectPackageFailure> {
        if self.roles.get(index).copied() != Some(role) {
            return Err(archive_invalid(FailureStage::EntryInventory));
        }
        self.inventory.read_entry_as(index, role, budget)
    }

    pub fn read_entry_accounted(
        &self,
        index: usize,
        role: EntryRole,
        budget: &mut DecodeBudget,
        allocations: &mut OperationAllocationLedger,
    ) -> Result<(Cow<'a, [u8]>, u64), ProjectPackageFailure> {
        if self.roles.get(index).copied() != Some(role) {
            return Err(archive_invalid(FailureStage::EntryInventory));
        }
        self.inventory
            .read_entry_as_accounted(index, role, budget, allocations)
    }
}

#[derive(Clone, Copy, Debug)]
struct CentralRecord<'a> {
    name: &'a str,
    compression: ZipCompression,
    flags: u16,
    version_needed: u16,
    crc32: u32,
    compressed_size: u64,
    uncompressed_size: u64,
    local_offset: u64,
}

#[derive(Clone, Copy, Debug)]
struct WriteMetadata {
    crc32: u32,
    size: u32,
    local_offset: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum NameFault {
    Limit,
    Invalid,
}

fn archive_invalid(stage: FailureStage) -> ProjectPackageFailure {
    ProjectPackageFailure::new(FailureCode::ArchiveInvalid, stage)
}

fn path_invalid() -> ProjectPackageFailure {
    ProjectPackageFailure::new(FailureCode::EntryPathInvalid, FailureStage::EntryInventory)
}

fn encode_failed() -> ProjectPackageFailure {
    ProjectPackageFailure::new(FailureCode::EncodeFailed, FailureStage::Encoding)
}

fn integrity_failure(role: EntryRole) -> ProjectPackageFailure {
    ProjectPackageFailure::new(role.integrity_code(), role.stage())
}

fn archive_too_large() -> ProjectPackageFailure {
    ProjectPackageFailure::new(FailureCode::ArchiveTooLarge, FailureStage::ArchiveEnvelope)
}

/// Encode the exact deterministic v1 ZIP profile. Entries must already be in
/// canonical semantic order; this adapter validates that invariant again.
pub(crate) fn encode_stored_zip32(
    entries: &[StoredEntry<'_>],
    limits: &PackageLimits,
) -> Result<Vec<u8>, ProjectPackageFailure> {
    validate_writer_names(entries, limits)?;

    let entry_count = checked_u64(entries.len(), FailureStage::Encoding)?;
    if entry_count > limits.archive_entries {
        return Err(ProjectPackageFailure::resource_limit(
            FailureStage::Encoding,
        ));
    }

    let mut metadata = Vec::new();
    metadata
        .try_reserve_exact(entries.len())
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::Encoding))?;

    let mut local_length = 0_u64;
    let mut total_uncompressed = 0_u64;
    for (index, entry) in entries.iter().enumerate() {
        let role = role_for_index(index);
        let name_length = checked_u64(entry.name.len(), FailureStage::Encoding)?;
        let byte_length = checked_u64(entry.bytes.len(), FailureStage::Encoding)?;
        enforce_role_size(role, byte_length, limits, FailureStage::Encoding)?;
        total_uncompressed = checked_add(total_uncompressed, byte_length, FailureStage::Encoding)?;
        if total_uncompressed > limits.total_uncompressed_bytes {
            return Err(ProjectPackageFailure::resource_limit(
                FailureStage::Encoding,
            ));
        }

        let local_offset = u32::try_from(local_length)
            .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::Encoding))?;
        let size = u32::try_from(byte_length)
            .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::Encoding))?;
        metadata.push(WriteMetadata {
            crc32: crc32fast::hash(entry.bytes),
            size,
            local_offset,
        });
        local_length = checked_add(
            local_length,
            checked_add(LOCAL_FILE_HEADER_BYTES, name_length, FailureStage::Encoding)?,
            FailureStage::Encoding,
        )?;
        local_length = checked_add(local_length, byte_length, FailureStage::Encoding)?;
    }

    let central_offset = local_length;
    let mut central_length = 0_u64;
    for entry in entries {
        central_length = checked_add(
            central_length,
            checked_add(
                CENTRAL_DIRECTORY_HEADER_BYTES,
                checked_u64(entry.name.len(), FailureStage::Encoding)?,
                FailureStage::Encoding,
            )?,
            FailureStage::Encoding,
        )?;
    }
    let planned_length = checked_add(
        checked_add(central_offset, central_length, FailureStage::Encoding)?,
        END_OF_CENTRAL_DIRECTORY_BYTES,
        FailureStage::Encoding,
    )?;
    if planned_length > limits.raw_archive_bytes {
        return Err(ProjectPackageFailure::new(
            FailureCode::ArchiveTooLarge,
            FailureStage::Encoding,
        ));
    }
    if central_offset > u32::MAX as u64
        || central_length > u32::MAX as u64
        || entry_count > u16::MAX as u64
    {
        return Err(ProjectPackageFailure::resource_limit(
            FailureStage::Encoding,
        ));
    }

    let planned_usize = checked_usize(planned_length, FailureStage::Encoding)?;
    let mut output = Vec::new();
    output
        .try_reserve_exact(planned_usize)
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::Encoding))?;

    for (entry, meta) in entries.iter().zip(&metadata) {
        push_u32(&mut output, LOCAL_FILE_HEADER_SIGNATURE);
        push_u16(&mut output, VERSION_NEEDED_STORE);
        push_u16(&mut output, 0);
        push_u16(&mut output, ZipCompression::Store.code());
        push_u16(&mut output, DOS_TIME);
        push_u16(&mut output, DOS_DATE);
        push_u32(&mut output, meta.crc32);
        push_u32(&mut output, meta.size);
        push_u32(&mut output, meta.size);
        push_u16(
            &mut output,
            u16::try_from(entry.name.len()).map_err(|_| encode_failed())?,
        );
        push_u16(&mut output, 0);
        output.extend_from_slice(entry.name.as_bytes());
        output.extend_from_slice(entry.bytes);
    }

    for (entry, meta) in entries.iter().zip(&metadata) {
        push_u32(&mut output, CENTRAL_DIRECTORY_HEADER_SIGNATURE);
        push_u16(&mut output, VERSION_MADE_BY_DOS_20);
        push_u16(&mut output, VERSION_NEEDED_STORE);
        push_u16(&mut output, 0);
        push_u16(&mut output, ZipCompression::Store.code());
        push_u16(&mut output, DOS_TIME);
        push_u16(&mut output, DOS_DATE);
        push_u32(&mut output, meta.crc32);
        push_u32(&mut output, meta.size);
        push_u32(&mut output, meta.size);
        push_u16(
            &mut output,
            u16::try_from(entry.name.len()).map_err(|_| encode_failed())?,
        );
        push_u16(&mut output, 0);
        push_u16(&mut output, 0);
        push_u16(&mut output, 0);
        push_u16(&mut output, 0);
        push_u32(&mut output, 0);
        push_u32(&mut output, meta.local_offset);
        output.extend_from_slice(entry.name.as_bytes());
    }

    push_u32(&mut output, END_OF_CENTRAL_DIRECTORY_SIGNATURE);
    push_u16(&mut output, 0);
    push_u16(&mut output, 0);
    push_u16(
        &mut output,
        u16::try_from(entry_count).map_err(|_| encode_failed())?,
    );
    push_u16(
        &mut output,
        u16::try_from(entry_count).map_err(|_| encode_failed())?,
    );
    push_u32(
        &mut output,
        u32::try_from(central_length).map_err(|_| encode_failed())?,
    );
    push_u32(
        &mut output,
        u32::try_from(central_offset).map_err(|_| encode_failed())?,
    );
    push_u16(&mut output, 0);

    debug_assert_eq!(output.len(), planned_usize);
    Ok(output)
}

/// Inspect a complete immutable archive without decompressing any entry.
pub(crate) fn inspect_zip32<'a>(
    bytes: &'a [u8],
    limits: &PackageLimits,
) -> Result<ZipInventory<'a>, ProjectPackageFailure> {
    let archive_length = checked_u64(bytes.len(), FailureStage::ArchiveEnvelope)?;
    if archive_length > limits.raw_archive_bytes {
        return Err(archive_too_large());
    }
    if archive_length < END_OF_CENTRAL_DIRECTORY_BYTES {
        return Err(archive_invalid(FailureStage::ArchiveEnvelope));
    }

    let eocd_offset = archive_length - END_OF_CENTRAL_DIRECTORY_BYTES;
    let eocd = slice_range(
        bytes,
        eocd_offset,
        END_OF_CENTRAL_DIRECTORY_BYTES,
        archive_length,
        FailureStage::ArchiveEnvelope,
    )?;
    if le_u32(eocd, 0) != END_OF_CENTRAL_DIRECTORY_SIGNATURE {
        return Err(archive_invalid(FailureStage::ArchiveEnvelope));
    }

    let entries_on_disk = le_u16(eocd, 8) as u64;
    let entry_count = le_u16(eocd, 10) as u64;
    let central_length = le_u32(eocd, 12) as u64;
    let central_offset = le_u32(eocd, 16) as u64;
    let central_end = checked_add(
        central_offset,
        central_length,
        FailureStage::ArchiveEnvelope,
    )
    .map_err(|_| archive_too_large())?;
    if central_end > limits.raw_archive_bytes {
        return Err(archive_too_large());
    }
    if entry_count > limits.archive_entries {
        return Err(ProjectPackageFailure::resource_limit(
            FailureStage::ArchiveEnvelope,
        ));
    }
    if le_u16(eocd, 4) != 0
        || le_u16(eocd, 6) != 0
        || entries_on_disk != entry_count
        || le_u16(eocd, 20) != 0
    {
        return Err(archive_invalid(FailureStage::ArchiveEnvelope));
    }
    if central_end != eocd_offset {
        return Err(archive_invalid(FailureStage::ArchiveEnvelope));
    }

    preflight_central_numeric_limits(bytes, central_offset, central_end, entry_count, limits)?;
    let central_records =
        parse_central_records(bytes, central_offset, central_end, entry_count, limits)?;
    preflight_declared_archive_ranges(&central_records, limits)?;
    let (compressed_entries, _, _) =
        validate_local_records(bytes, central_offset, &central_records, limits)?;
    let manifest_index = locate_manifest(&central_records)?;

    let mut entries = Vec::new();
    entries
        .try_reserve_exact(central_records.len())
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::EntryInventory))?;
    for (record, compressed_bytes) in central_records.iter().zip(compressed_entries) {
        entries.push(ArchiveEntry {
            name: record.name,
            compression: record.compression,
            crc32: record.crc32,
            compressed_size: record.compressed_size,
            uncompressed_size: record.uncompressed_size,
            compressed_bytes,
        });
    }

    Ok(ZipInventory {
        entries,
        manifest_index,
        limits: *limits,
    })
}

fn locate_manifest(records: &[CentralRecord<'_>]) -> Result<usize, ProjectPackageFailure> {
    let exact = records
        .iter()
        .position(|record| record.name == MANIFEST_ENTRY_NAME);
    if records.iter().any(|record| {
        record.name != MANIFEST_ENTRY_NAME
            && record
                .name
                .rsplit('/')
                .next()
                .is_some_and(|name| name.eq_ignore_ascii_case(MANIFEST_ENTRY_NAME))
    }) {
        return Err(path_invalid());
    }
    if let Some(index) = exact {
        return Ok(index);
    }
    if records
        .iter()
        .any(|record| record.name.eq_ignore_ascii_case(MANIFEST_ENTRY_NAME))
    {
        return Err(path_invalid());
    }
    Err(ProjectPackageFailure::new(
        FailureCode::FormatUnsupported,
        FailureStage::EntryInventory,
    ))
}

fn preflight_declared_archive_ranges(
    records: &[CentralRecord<'_>],
    limits: &PackageLimits,
) -> Result<(), ProjectPackageFailure> {
    for record in records {
        preflight_declared_entry_range(
            record.local_offset,
            checked_u64(record.name.len(), FailureStage::ArchiveEnvelope)?,
            record.compressed_size,
            limits,
        )?;
    }
    Ok(())
}

fn preflight_declared_entry_range(
    local_offset: u64,
    name_length: u64,
    compressed_size: u64,
    limits: &PackageLimits,
) -> Result<(), ProjectPackageFailure> {
    let header_and_name = checked_add(
        LOCAL_FILE_HEADER_BYTES,
        name_length,
        FailureStage::ArchiveEnvelope,
    )
    .map_err(|_| archive_too_large())?;
    let data_offset = checked_add(local_offset, header_and_name, FailureStage::ArchiveEnvelope)
        .map_err(|_| archive_too_large())?;
    let declared_end = checked_add(data_offset, compressed_size, FailureStage::ArchiveEnvelope)
        .map_err(|_| archive_too_large())?;
    if declared_end > limits.raw_archive_bytes {
        return Err(archive_too_large());
    }
    Ok(())
}

fn validate_local_records<'a>(
    bytes: &'a [u8],
    central_offset: u64,
    records: &[CentralRecord<'a>],
    limits: &PackageLimits,
) -> Result<(Vec<&'a [u8]>, u64, u64), ProjectPackageFailure> {
    let mut compressed_entries = Vec::new();
    compressed_entries
        .try_reserve_exact(records.len())
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::EntryInventory))?;
    let mut cursor = 0_u64;
    let mut total_compressed = 0_u64;
    let mut total_uncompressed = 0_u64;

    for record in records {
        total_compressed = checked_add(
            total_compressed,
            record.compressed_size,
            FailureStage::EntryInventory,
        )?;
        total_uncompressed = checked_add(
            total_uncompressed,
            record.uncompressed_size,
            FailureStage::EntryInventory,
        )?;
        if total_uncompressed > limits.total_uncompressed_bytes {
            return Err(ProjectPackageFailure::resource_limit(
                FailureStage::EntryInventory,
            ));
        }
        if record.local_offset != cursor {
            return Err(archive_invalid(FailureStage::EntryInventory));
        }

        let local = slice_range(
            bytes,
            cursor,
            LOCAL_FILE_HEADER_BYTES,
            central_offset,
            FailureStage::EntryInventory,
        )?;
        if le_u32(local, 0) != LOCAL_FILE_HEADER_SIGNATURE
            || le_u16(local, 4) != record.version_needed
            || le_u16(local, 6) != record.flags
            || le_u16(local, 8) != record.compression.code()
            || le_u16(local, 10) != DOS_TIME
            || le_u16(local, 12) != DOS_DATE
            || le_u32(local, 14) != record.crc32
            || le_u32(local, 18) as u64 != record.compressed_size
            || le_u32(local, 22) as u64 != record.uncompressed_size
            || le_u16(local, 28) != 0
        {
            return Err(archive_invalid(FailureStage::EntryInventory));
        }

        let local_name_length = le_u16(local, 26) as u64;
        if local_name_length != record.name.len() as u64 {
            return Err(archive_invalid(FailureStage::EntryInventory));
        }
        let name_offset = checked_add(
            cursor,
            LOCAL_FILE_HEADER_BYTES,
            FailureStage::EntryInventory,
        )?;
        let local_name = slice_range(
            bytes,
            name_offset,
            local_name_length,
            central_offset,
            FailureStage::EntryInventory,
        )?;
        if local_name != record.name.as_bytes() {
            return Err(archive_invalid(FailureStage::EntryInventory));
        }
        let data_offset =
            checked_add(name_offset, local_name_length, FailureStage::EntryInventory)?;
        let compressed_bytes = slice_range(
            bytes,
            data_offset,
            record.compressed_size,
            central_offset,
            FailureStage::EntryInventory,
        )?;
        cursor = checked_add(
            data_offset,
            record.compressed_size,
            FailureStage::EntryInventory,
        )?;
        compressed_entries.push(compressed_bytes);
    }

    if cursor != central_offset {
        return Err(archive_invalid(FailureStage::EntryInventory));
    }
    Ok((compressed_entries, total_compressed, total_uncompressed))
}

/// First pass over central headers. It deliberately retains nothing and settles
/// declared archive-span and numeric-budget precedence before profile faults.
fn preflight_central_numeric_limits(
    bytes: &[u8],
    central_offset: u64,
    central_end: u64,
    entry_count: u64,
    limits: &PackageLimits,
) -> Result<(), ProjectPackageFailure> {
    let mut cursor = central_offset;
    let mut total_uncompressed = 0_u64;
    let mut deflate_compressed = 0_u64;
    let mut deflate_uncompressed = 0_u64;

    for _ in 0..entry_count {
        let header = slice_range(
            bytes,
            cursor,
            CENTRAL_DIRECTORY_HEADER_BYTES,
            central_end,
            FailureStage::EntryInventory,
        )?;
        if le_u32(header, 0) != CENTRAL_DIRECTORY_HEADER_SIGNATURE {
            return Err(archive_invalid(FailureStage::EntryInventory));
        }

        let method = le_u16(header, 10);
        let compressed_size = le_u32(header, 20) as u64;
        let uncompressed_size = le_u32(header, 24) as u64;
        let name_length = le_u16(header, 28) as u64;
        let extra_length = le_u16(header, 30) as u64;
        let comment_length = le_u16(header, 32) as u64;
        let local_offset = le_u32(header, 42) as u64;

        preflight_declared_entry_range(local_offset, name_length, compressed_size, limits)?;
        if name_length > limits.entry_path_bytes {
            return Err(ProjectPackageFailure::resource_limit(
                FailureStage::EntryInventory,
            ));
        }
        total_uncompressed = checked_add(
            total_uncompressed,
            uncompressed_size,
            FailureStage::EntryInventory,
        )?;
        if total_uncompressed > limits.total_uncompressed_bytes {
            return Err(ProjectPackageFailure::resource_limit(
                FailureStage::EntryInventory,
            ));
        }
        if method == ZipCompression::Deflate.code() {
            check_deflate_ratio(
                uncompressed_size,
                compressed_size,
                limits,
                FailureStage::EntryInventory,
            )?;
            deflate_compressed = checked_add(
                deflate_compressed,
                compressed_size,
                FailureStage::EntryInventory,
            )?;
            deflate_uncompressed = checked_add(
                deflate_uncompressed,
                uncompressed_size,
                FailureStage::EntryInventory,
            )?;
        }

        let name_offset = checked_add(
            cursor,
            CENTRAL_DIRECTORY_HEADER_BYTES,
            FailureStage::EntryInventory,
        )?;
        let name_bytes = slice_range(
            bytes,
            name_offset,
            name_length,
            central_end,
            FailureStage::EntryInventory,
        )?;
        if name_bytes
            .split(|byte| *byte == b'/')
            .any(|segment| segment.len() as u64 > limits.path_segment_bytes)
        {
            return Err(ProjectPackageFailure::resource_limit(
                FailureStage::EntryInventory,
            ));
        }

        let variable_length = checked_add(
            checked_add(name_length, extra_length, FailureStage::EntryInventory)?,
            comment_length,
            FailureStage::EntryInventory,
        )?;
        cursor = checked_add(
            cursor,
            checked_add(
                CENTRAL_DIRECTORY_HEADER_BYTES,
                variable_length,
                FailureStage::EntryInventory,
            )?,
            FailureStage::EntryInventory,
        )?;
        if cursor > central_end {
            return Err(archive_invalid(FailureStage::EntryInventory));
        }
    }

    if cursor != central_end {
        return Err(archive_invalid(FailureStage::EntryInventory));
    }
    check_deflate_ratio(
        deflate_uncompressed,
        deflate_compressed,
        limits,
        FailureStage::EntryInventory,
    )
}

fn parse_central_records<'a>(
    bytes: &'a [u8],
    central_offset: u64,
    central_end: u64,
    entry_count: u64,
    limits: &PackageLimits,
) -> Result<Vec<CentralRecord<'a>>, ProjectPackageFailure> {
    let capacity = checked_usize(entry_count, FailureStage::EntryInventory)?;
    let mut records: Vec<CentralRecord<'a>> = Vec::new();
    records
        .try_reserve_exact(capacity)
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::EntryInventory))?;
    let mut cursor = central_offset;

    for _ in 0..entry_count {
        let header = slice_range(
            bytes,
            cursor,
            CENTRAL_DIRECTORY_HEADER_BYTES,
            central_end,
            FailureStage::EntryInventory,
        )?;
        if le_u32(header, 0) != CENTRAL_DIRECTORY_HEADER_SIGNATURE {
            return Err(archive_invalid(FailureStage::EntryInventory));
        }

        let version_made_by = le_u16(header, 4);
        let version_needed = le_u16(header, 6);
        let flags = le_u16(header, 8);
        let compression = ZipCompression::from_code(le_u16(header, 10))?;
        let compressed_size = le_u32(header, 20) as u64;
        let uncompressed_size = le_u32(header, 24) as u64;
        let name_length = le_u16(header, 28) as u64;
        let extra_length = le_u16(header, 30);
        let comment_length = le_u16(header, 32);
        let local_offset = le_u32(header, 42) as u64;

        preflight_declared_entry_range(local_offset, name_length, compressed_size, limits)?;

        if version_made_by != VERSION_MADE_BY_DOS_20
            || version_needed != compression.version_needed()
            || (flags != 0 && flags != UTF8_NAME_FLAG)
            || le_u16(header, 12) != DOS_TIME
            || le_u16(header, 14) != DOS_DATE
            || extra_length != 0
            || comment_length != 0
            || le_u16(header, 34) != 0
            || le_u16(header, 36) != 0
            || le_u32(header, 38) != 0
        {
            return Err(archive_invalid(FailureStage::EntryInventory));
        }
        if compression == ZipCompression::Store && compressed_size != uncompressed_size {
            return Err(archive_invalid(FailureStage::EntryInventory));
        }
        if name_length > limits.entry_path_bytes {
            return Err(ProjectPackageFailure::resource_limit(
                FailureStage::EntryInventory,
            ));
        }
        let name_offset = checked_add(
            cursor,
            CENTRAL_DIRECTORY_HEADER_BYTES,
            FailureStage::EntryInventory,
        )?;
        let name_bytes = slice_range(
            bytes,
            name_offset,
            name_length,
            central_end,
            FailureStage::EntryInventory,
        )?;
        match validate_safe_path(name_bytes, limits) {
            Ok(()) => {}
            Err(NameFault::Limit) => {
                return Err(ProjectPackageFailure::resource_limit(
                    FailureStage::EntryInventory,
                ))
            }
            Err(NameFault::Invalid) => return Err(path_invalid()),
        }
        let name = std::str::from_utf8(name_bytes).map_err(|_| path_invalid())?;
        // Entry count is capped at 514 in v1. Comparing against the already
        // validated borrowed names avoids both BTreeSet node allocation and a
        // hostile-input-derived lowercase String allocation.
        if records
            .iter()
            .any(|record| record.name.eq_ignore_ascii_case(name))
        {
            return Err(path_invalid());
        }

        records.push(CentralRecord {
            name,
            compression,
            flags,
            version_needed,
            crc32: le_u32(header, 16),
            compressed_size,
            uncompressed_size,
            local_offset,
        });
        cursor = checked_add(name_offset, name_length, FailureStage::EntryInventory)?;
    }

    if cursor != central_end {
        return Err(archive_invalid(FailureStage::EntryInventory));
    }
    Ok(records)
}

fn classify_v1_names(
    entries: &[ArchiveEntry<'_>],
    limits: &PackageLimits,
) -> Result<Vec<EntryRole>, ProjectPackageFailure> {
    for entry in entries {
        if entry.name != MANIFEST_ENTRY_NAME
            && entry.name != PROJECT_ENTRY_NAME
            && !is_canonical_asset_path(entry.name)
        {
            return Err(path_invalid());
        }
    }
    if !entries.iter().any(|entry| entry.name == PROJECT_ENTRY_NAME) {
        return Err(ProjectPackageFailure::new(
            FailureCode::ProjectMissing,
            FailureStage::Project,
        ));
    }
    if entries.len() < 2
        || entries[0].name != MANIFEST_ENTRY_NAME
        || entries[1].name != PROJECT_ENTRY_NAME
    {
        return Err(archive_invalid(FailureStage::EntryInventory));
    }

    let asset_count = checked_u64(
        entries.len().saturating_sub(2),
        FailureStage::EntryInventory,
    )?;
    if asset_count > limits.assets {
        return Err(ProjectPackageFailure::resource_limit(
            FailureStage::EntryInventory,
        ));
    }
    for pair in entries[2..].windows(2) {
        if pair[0].name >= pair[1].name {
            return Err(archive_invalid(FailureStage::EntryInventory));
        }
    }

    let mut roles = Vec::new();
    roles
        .try_reserve_exact(entries.len())
        .map_err(|_| ProjectPackageFailure::resource_limit(FailureStage::EntryInventory))?;
    roles.push(EntryRole::Manifest);
    roles.push(EntryRole::Project);
    roles.resize(entries.len(), EntryRole::Asset);
    Ok(roles)
}

fn validate_writer_names(
    entries: &[StoredEntry<'_>],
    limits: &PackageLimits,
) -> Result<(), ProjectPackageFailure> {
    if entries.len() < 2
        || entries[0].name != MANIFEST_ENTRY_NAME
        || entries[1].name != PROJECT_ENTRY_NAME
    {
        return Err(encode_failed());
    }
    if entries.len().saturating_sub(2) as u64 > limits.assets {
        return Err(ProjectPackageFailure::resource_limit(
            FailureStage::Encoding,
        ));
    }

    for (index, entry) in entries.iter().enumerate() {
        match validate_safe_path(entry.name.as_bytes(), limits) {
            Ok(()) => {}
            Err(NameFault::Limit) => {
                return Err(ProjectPackageFailure::resource_limit(
                    FailureStage::Encoding,
                ))
            }
            Err(NameFault::Invalid) => return Err(encode_failed()),
        }
        if index >= 2 && !is_canonical_asset_path(entry.name) {
            return Err(encode_failed());
        }
    }
    for pair in entries[2..].windows(2) {
        if pair[0].name >= pair[1].name {
            return Err(encode_failed());
        }
    }
    Ok(())
}

fn role_for_index(index: usize) -> EntryRole {
    match index {
        0 => EntryRole::Manifest,
        1 => EntryRole::Project,
        _ => EntryRole::Asset,
    }
}

fn enforce_role_size(
    role: EntryRole,
    size: u64,
    limits: &PackageLimits,
    stage: FailureStage,
) -> Result<(), ProjectPackageFailure> {
    let maximum = match role {
        EntryRole::Manifest => limits.manifest_bytes,
        EntryRole::Project => limits.project_bytes,
        EntryRole::Asset => limits.asset_bytes,
    };
    if size <= maximum {
        Ok(())
    } else {
        Err(ProjectPackageFailure::resource_limit(stage))
    }
}

fn validate_safe_path(bytes: &[u8], limits: &PackageLimits) -> Result<(), NameFault> {
    if bytes.len() as u64 > limits.entry_path_bytes {
        return Err(NameFault::Limit);
    }
    if bytes.is_empty()
        || bytes[0] == b'/'
        || bytes[bytes.len() - 1] == b'/'
        || bytes
            .iter()
            .any(|byte| !byte.is_ascii() || *byte < 0x20 || *byte == 0x7f || *byte == b'\\')
        || (bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':')
    {
        return Err(NameFault::Invalid);
    }
    for segment in bytes.split(|byte| *byte == b'/') {
        if segment.is_empty() || segment == b"." || segment == b".." {
            return Err(NameFault::Invalid);
        }
        if segment.len() as u64 > limits.path_segment_bytes {
            return Err(NameFault::Limit);
        }
    }
    Ok(())
}

fn is_canonical_asset_path(name: &str) -> bool {
    let Some(tail) = name.strip_prefix(ASSET_ENTRY_PREFIX) else {
        return false;
    };
    let Some((digest, extension)) = tail.split_once('.') else {
        return false;
    };
    digest.len() == 64
        && digest
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
        && matches!(extension, "png" | "jpg" | "webp" | "gif" | "bmp")
}

fn validate_stored<'a>(
    entry: &ArchiveEntry<'a>,
    role: EntryRole,
) -> Result<&'a [u8], ProjectPackageFailure> {
    if entry.compressed_size != entry.uncompressed_size {
        return Err(integrity_failure(role));
    }
    Ok(entry.compressed_bytes)
}

fn inflate_raw(
    entry: &ArchiveEntry<'_>,
    role: EntryRole,
    limits: &PackageLimits,
    budget: &mut DecodeBudget,
    allocations: &mut OperationAllocationLedger,
) -> Result<(Vec<u8>, u64), ProjectPackageFailure> {
    let declared = checked_usize(entry.uncompressed_size, role.stage())?;
    let role_maximum = match role {
        EntryRole::Manifest => limits.manifest_bytes,
        EntryRole::Project => limits.project_bytes,
        EntryRole::Asset => limits.asset_bytes,
    };
    let role_maximum = checked_usize(role_maximum, role.stage())?;
    // A one-byte heap probe is useful for authoritative observed-size and
    // ratio precedence, but it must never cross the accepted role ceiling.
    // At the exact ceiling, `HasMoreOutput` itself proves the stream requires
    // an over-limit byte without allocating that byte.
    let has_heap_probe = declared < role_maximum;
    let output_len = if has_heap_probe {
        declared
            .checked_add(1)
            .ok_or_else(|| ProjectPackageFailure::resource_limit(role.stage()))?
    } else {
        declared
    };
    let mut allocation_charge = checked_u64(output_len, role.stage())?;
    allocations
        .try_charge(allocation_charge)
        .map_err(|_| ProjectPackageFailure::resource_limit(role.stage()))?;

    let result = (|| {
        let mut output = Vec::new();
        output
            .try_reserve_exact(output_len)
            .map_err(|_| ProjectPackageFailure::resource_limit(role.stage()))?;
        let actual_charge = checked_u64(output.capacity(), role.stage())?;
        if actual_charge > allocation_charge {
            allocations
                .try_charge(actual_charge - allocation_charge)
                .map_err(|_| ProjectPackageFailure::resource_limit(role.stage()))?;
        } else if actual_charge < allocation_charge {
            allocations
                .release(allocation_charge - actual_charge)
                .map_err(|_| ProjectPackageFailure::resource_limit(role.stage()))?;
        }
        allocation_charge = actual_charge;
        // Capacity is established through the fallible path above; resize only
        // initializes the already-reserved caller-owned buffer.
        output.resize(output_len, 0);

        let mut decoder = DecompressorOxide::new();
        let (status, consumed, produced) = decompress(
            &mut decoder,
            entry.compressed_bytes,
            &mut output,
            0,
            TINFL_FLAG_USING_NON_WRAPPING_OUTPUT_BUF,
        );
        let observed = checked_u64(produced, role.stage())?;

        if status == TINFLStatus::HasMoreOutput && !has_heap_probe {
            return Err(ProjectPackageFailure::resource_limit(role.stage()));
        }

        // Resource ceilings are authoritative even when a stream also disagrees
        // with its metadata. The one-byte probe ensures an oversized stream is
        // observed before exact-size and stream-termination integrity checks run.
        enforce_role_size(role, observed, limits, role.stage())?;
        check_deflate_ratio(observed, entry.compressed_size, limits, role.stage())?;
        if observed != 0 {
            budget.charge_observed_uncompressed(observed)?;
        }

        if status != TINFLStatus::Done
            || consumed != entry.compressed_bytes.len()
            || observed != entry.uncompressed_size
        {
            return Err(integrity_failure(role));
        }

        output.truncate(produced);
        Ok(output)
    })();

    if result.is_err() {
        allocations
            .release(allocation_charge)
            .map_err(|_| ProjectPackageFailure::resource_limit(role.stage()))?;
    }
    result.map(|output| (output, allocation_charge))
}

fn slice_range(
    bytes: &[u8],
    offset: u64,
    length: u64,
    maximum: u64,
    stage: FailureStage,
) -> Result<&[u8], ProjectPackageFailure> {
    let end =
        checked_range_end(offset, length, maximum, stage).map_err(|_| archive_invalid(stage))?;
    let start = checked_usize(offset, stage).map_err(|_| archive_invalid(stage))?;
    let end = checked_usize(end, stage).map_err(|_| archive_invalid(stage))?;
    bytes.get(start..end).ok_or_else(|| archive_invalid(stage))
}

fn le_u16(bytes: &[u8], offset: usize) -> u16 {
    u16::from_le_bytes([bytes[offset], bytes[offset + 1]])
}

fn le_u32(bytes: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes([
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
    ])
}

fn push_u16(bytes: &mut Vec<u8>, value: u16) {
    bytes.extend_from_slice(&value.to_le_bytes());
}

fn push_u32(bytes: &mut Vec<u8>, value: u32) {
    bytes.extend_from_slice(&value.to_le_bytes());
}

#[cfg(test)]
mod tests {
    use super::*;

    const ASSET_A: &str = concat!(
        "assets/sha256/",
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ".png"
    );
    const ASSET_B: &str = concat!(
        "assets/sha256/",
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        ".jpg"
    );
    const ASSET_MAX_PATH: &str = concat!(
        "assets/sha256/",
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        ".webp"
    );
    const MANIFEST: &[u8] = br#"{"format":"sbls/project-package","version":1}"#;
    const PROJECT: &[u8] = b"{}";
    const EMPTY_RAW_DEFLATE: &[u8] = &[0x03, 0x00];
    const EMPTY_OBJECT_RAW_DEFLATE: &[u8] = &[0x01, 0x02, 0x00, 0xfd, 0xff, b'{', b'}'];
    const EMPTY_OBJECT_ZLIB_WRAPPED: &[u8] =
        &[0x78, 0x9c, 0xab, 0xae, 0x05, 0x00, 0x01, 0x75, 0x00, 0xf9];
    const TEN_THOUSAND_A_RAW_DEFLATE: &[u8] = &[
        0xed, 0xc1, 0x01, 0x0d, 0x00, 0x00, 0x00, 0xc2, 0xa0, 0xac, 0xef, 0x5f, 0xc2, 0x1c, 0x6e,
        0x40, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xc0, 0xbf, 0x01,
    ];

    #[derive(Clone, Copy)]
    struct RawEntry<'a> {
        name: &'a str,
        flags: u16,
        method: u16,
        compressed: &'a [u8],
        uncompressed_size: u32,
        crc32: u32,
    }

    impl<'a> RawEntry<'a> {
        fn stored(name: &'a str, bytes: &'a [u8]) -> Self {
            Self {
                name,
                flags: 0,
                method: 0,
                compressed: bytes,
                uncompressed_size: bytes.len() as u32,
                crc32: crc32fast::hash(bytes),
            }
        }

        fn deflated(name: &'a str, plain: &[u8], compressed: &'a [u8]) -> Self {
            Self {
                name,
                flags: 0,
                method: 8,
                compressed,
                uncompressed_size: plain.len() as u32,
                crc32: crc32fast::hash(plain),
            }
        }
    }

    /// Test-only raw ZIP constructor. It does not call the production encoder,
    /// allowing malformed metadata and fixed Deflate streams to be exercised.
    fn raw_fixture(entries: &[RawEntry<'_>]) -> Vec<u8> {
        fn put16(target: &mut Vec<u8>, value: u16) {
            target.extend_from_slice(&value.to_le_bytes());
        }
        fn put32(target: &mut Vec<u8>, value: u32) {
            target.extend_from_slice(&value.to_le_bytes());
        }

        let mut bytes = Vec::new();
        let mut local_offsets = Vec::new();
        for entry in entries {
            local_offsets.push(bytes.len() as u32);
            put32(&mut bytes, 0x0403_4b50);
            put16(&mut bytes, if entry.method == 0 { 10 } else { 20 });
            put16(&mut bytes, entry.flags);
            put16(&mut bytes, entry.method);
            put16(&mut bytes, 0);
            put16(&mut bytes, 0x21);
            put32(&mut bytes, entry.crc32);
            put32(&mut bytes, entry.compressed.len() as u32);
            put32(&mut bytes, entry.uncompressed_size);
            put16(&mut bytes, entry.name.len() as u16);
            put16(&mut bytes, 0);
            bytes.extend_from_slice(entry.name.as_bytes());
            bytes.extend_from_slice(entry.compressed);
        }

        let central_offset = bytes.len() as u32;
        for (entry, local_offset) in entries.iter().zip(local_offsets) {
            put32(&mut bytes, 0x0201_4b50);
            put16(&mut bytes, 0x0014);
            put16(&mut bytes, if entry.method == 0 { 10 } else { 20 });
            put16(&mut bytes, entry.flags);
            put16(&mut bytes, entry.method);
            put16(&mut bytes, 0);
            put16(&mut bytes, 0x21);
            put32(&mut bytes, entry.crc32);
            put32(&mut bytes, entry.compressed.len() as u32);
            put32(&mut bytes, entry.uncompressed_size);
            put16(&mut bytes, entry.name.len() as u16);
            put16(&mut bytes, 0);
            put16(&mut bytes, 0);
            put16(&mut bytes, 0);
            put16(&mut bytes, 0);
            put32(&mut bytes, 0);
            put32(&mut bytes, local_offset);
            bytes.extend_from_slice(entry.name.as_bytes());
        }
        let central_length = bytes.len() as u32 - central_offset;
        put32(&mut bytes, 0x0605_4b50);
        put16(&mut bytes, 0);
        put16(&mut bytes, 0);
        put16(&mut bytes, entries.len() as u16);
        put16(&mut bytes, entries.len() as u16);
        put32(&mut bytes, central_length);
        put32(&mut bytes, central_offset);
        put16(&mut bytes, 0);
        bytes
    }

    fn base_entries() -> [RawEntry<'static>; 3] {
        [
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
            RawEntry::stored(ASSET_A, b"asset"),
        ]
    }

    fn eocd_offset(bytes: &[u8]) -> usize {
        bytes.len() - END_OF_CENTRAL_DIRECTORY_BYTES as usize
    }

    fn central_offset(bytes: &[u8]) -> usize {
        let eocd = eocd_offset(bytes);
        u32::from_le_bytes(bytes[eocd + 16..eocd + 20].try_into().unwrap()) as usize
    }

    fn central_record_offset(bytes: &[u8], index: usize) -> usize {
        let mut offset = central_offset(bytes);
        for _ in 0..index {
            let name_length =
                u16::from_le_bytes(bytes[offset + 28..offset + 30].try_into().unwrap()) as usize;
            let extra_length =
                u16::from_le_bytes(bytes[offset + 30..offset + 32].try_into().unwrap()) as usize;
            let comment_length =
                u16::from_le_bytes(bytes[offset + 32..offset + 34].try_into().unwrap()) as usize;
            offset += 46 + name_length + extra_length + comment_length;
        }
        offset
    }

    fn local_offset(bytes: &[u8], index: usize) -> usize {
        let central = central_record_offset(bytes, index);
        u32::from_le_bytes(bytes[central + 42..central + 46].try_into().unwrap()) as usize
    }

    fn entry_data_offset(bytes: &[u8], index: usize) -> usize {
        let local = local_offset(bytes, index);
        let name_length =
            u16::from_le_bytes(bytes[local + 26..local + 28].try_into().unwrap()) as usize;
        let extra_length =
            u16::from_le_bytes(bytes[local + 28..local + 30].try_into().unwrap()) as usize;
        local + 30 + name_length + extra_length
    }

    fn overwrite_u16(bytes: &mut [u8], offset: usize, value: u16) {
        bytes[offset..offset + 2].copy_from_slice(&value.to_le_bytes());
    }

    fn overwrite_u32(bytes: &mut [u8], offset: usize, value: u32) {
        bytes[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
    }

    fn insert_in_central_directory(mut bytes: Vec<u8>, record: &[u8]) -> Vec<u8> {
        let old_eocd = eocd_offset(&bytes);
        let old_length =
            u32::from_le_bytes(bytes[old_eocd + 12..old_eocd + 16].try_into().unwrap());
        bytes.splice(old_eocd..old_eocd, record.iter().copied());
        let new_eocd = eocd_offset(&bytes);
        overwrite_u32(&mut bytes, new_eocd + 12, old_length + record.len() as u32);
        bytes
    }

    fn assert_code(bytes: &[u8], code: FailureCode) {
        let failure = inspect_zip32(bytes, &PackageLimits::V1).unwrap_err();
        assert_eq!(failure.code, code, "unexpected failure: {failure:?}");
    }

    fn v1_inventory(bytes: &[u8]) -> V1ZipInventory<'_> {
        inspect_zip32(bytes, &PackageLimits::V1)
            .unwrap()
            .validate_v1_layout()
            .unwrap()
    }

    fn assert_v1_code(bytes: &[u8], code: FailureCode) {
        let failure = inspect_zip32(bytes, &PackageLimits::V1)
            .unwrap()
            .validate_v1_layout()
            .unwrap_err();
        assert_eq!(failure.code, code, "unexpected failure: {failure:?}");
    }

    #[test]
    fn deterministic_writer_matches_independent_raw_fixture() {
        assert_eq!(crc32fast::hash(b"123456789"), 0xcbf4_3926);
        let raw = [
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
        ];
        let expected = raw_fixture(&raw);
        let actual = encode_stored_zip32(
            &[
                StoredEntry {
                    name: MANIFEST_ENTRY_NAME,
                    bytes: MANIFEST,
                },
                StoredEntry {
                    name: PROJECT_ENTRY_NAME,
                    bytes: PROJECT,
                },
            ],
            &PackageLimits::V1,
        )
        .unwrap();

        assert_eq!(actual, expected);
        assert_eq!(&actual[0..4], &LOCAL_FILE_HEADER_SIGNATURE.to_le_bytes());
        assert_eq!(&actual[actual.len() - 22..actual.len() - 18], b"PK\x05\x06");
    }

    #[test]
    fn store_inventory_and_reads_are_exact_and_budgeted() {
        let bytes = raw_fixture(&base_entries());
        let safe_inventory = inspect_zip32(&bytes, &PackageLimits::V1).unwrap();
        assert_eq!(safe_inventory.entries().len(), 3);
        assert_eq!(safe_inventory.entries()[2].name, ASSET_A);
        assert_eq!(safe_inventory.find(PROJECT_ENTRY_NAME).unwrap().0, 1);
        assert_eq!(safe_inventory.entry(99), None);
        let mut budget = DecodeBudget::new(PackageLimits::V1);
        assert_eq!(
            safe_inventory.read_manifest(&mut budget).unwrap().as_ref(),
            MANIFEST
        );
        let inventory = safe_inventory.validate_v1_layout().unwrap();
        assert_eq!(inventory.role(0), Some(EntryRole::Manifest));
        assert_eq!(inventory.role(1), Some(EntryRole::Project));
        assert_eq!(
            inventory
                .read_entry(1, EntryRole::Project, &mut budget)
                .unwrap()
                .as_ref(),
            PROJECT
        );
        assert_eq!(
            budget.declared_uncompressed(),
            (MANIFEST.len() + PROJECT.len()) as u64
        );
        assert_eq!(
            budget.observed_uncompressed(),
            (MANIFEST.len() + PROJECT.len()) as u64
        );
    }

    #[test]
    fn raw_deflate_is_decoded_without_accepting_trailing_or_wrong_lengths() {
        let valid = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::deflated(PROJECT_ENTRY_NAME, PROJECT, EMPTY_OBJECT_RAW_DEFLATE),
        ]);
        let inventory = v1_inventory(&valid);
        let mut budget = DecodeBudget::new(PackageLimits::V1);
        assert_eq!(
            inventory
                .read_entry(1, EntryRole::Project, &mut budget)
                .unwrap()
                .as_ref(),
            PROJECT
        );

        let mut trailing_stream = EMPTY_OBJECT_RAW_DEFLATE.to_vec();
        trailing_stream.push(0);
        let trailing = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::deflated(PROJECT_ENTRY_NAME, PROJECT, &trailing_stream),
        ]);
        let inventory = v1_inventory(&trailing);
        let failure = inventory
            .read_entry(
                1,
                EntryRole::Project,
                &mut DecodeBudget::new(PackageLimits::V1),
            )
            .unwrap_err();
        assert_eq!(failure.code, FailureCode::ProjectDigestMismatch);

        let truncated = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::deflated(PROJECT_ENTRY_NAME, PROJECT, &EMPTY_OBJECT_RAW_DEFLATE[..6]),
        ]);
        let inventory = v1_inventory(&truncated);
        assert_eq!(
            inventory
                .read_entry(
                    1,
                    EntryRole::Project,
                    &mut DecodeBudget::new(PackageLimits::V1)
                )
                .unwrap_err()
                .code,
            FailureCode::ProjectDigestMismatch
        );

        for declared in [1, 3] {
            let wrong_length = raw_fixture(&[
                RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
                RawEntry {
                    name: PROJECT_ENTRY_NAME,
                    flags: 0,
                    method: 8,
                    compressed: EMPTY_OBJECT_RAW_DEFLATE,
                    uncompressed_size: declared,
                    crc32: crc32fast::hash(PROJECT),
                },
            ]);
            let inventory = v1_inventory(&wrong_length);
            assert_eq!(
                inventory
                    .read_entry(
                        1,
                        EntryRole::Project,
                        &mut DecodeBudget::new(PackageLimits::V1)
                    )
                    .unwrap_err()
                    .code,
                FailureCode::ProjectDigestMismatch
            );
        }
    }

    #[test]
    fn deflate_allocation_receipt_is_precharged_released_and_rolled_back() {
        let valid = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::deflated(PROJECT_ENTRY_NAME, PROJECT, EMPTY_OBJECT_RAW_DEFLATE),
        ]);
        let inventory = v1_inventory(&valid);
        let mut budget = DecodeBudget::new(PackageLimits::V1);
        let mut probe = OperationAllocationLedger::new(64);
        let (bytes, receipt) = inventory
            .read_entry_accounted(1, EntryRole::Project, &mut budget, &mut probe)
            .unwrap();
        assert_eq!(bytes.as_ref(), PROJECT);
        assert!(receipt >= 3);
        assert_eq!(probe.retained(), receipt);
        drop(bytes);
        probe.release(receipt).unwrap();
        assert_eq!(probe.retained(), 0);

        let mut exact = OperationAllocationLedger::new(receipt);
        let (bytes, exact_receipt) = inventory
            .read_entry_accounted(
                1,
                EntryRole::Project,
                &mut DecodeBudget::new(PackageLimits::V1),
                &mut exact,
            )
            .unwrap();
        drop(bytes);
        exact.release(exact_receipt).unwrap();
        assert_eq!(exact.retained(), 0);

        let mut one_under = OperationAllocationLedger::new(receipt - 1);
        let error = inventory
            .read_entry_accounted(
                1,
                EntryRole::Project,
                &mut DecodeBudget::new(PackageLimits::V1),
                &mut one_under,
            )
            .unwrap_err();
        assert_eq!(error.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(error.stage, FailureStage::Project);
        assert_eq!(one_under.retained(), 0);

        let mut trailing_stream = EMPTY_OBJECT_RAW_DEFLATE.to_vec();
        trailing_stream.push(0);
        let malformed = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::deflated(PROJECT_ENTRY_NAME, PROJECT, &trailing_stream),
        ]);
        let inventory = v1_inventory(&malformed);
        let mut rollback = OperationAllocationLedger::new(receipt);
        let error = inventory
            .read_entry_accounted(
                1,
                EntryRole::Project,
                &mut DecodeBudget::new(PackageLimits::V1),
                &mut rollback,
            )
            .unwrap_err();
        assert_eq!(error.code, FailureCode::ProjectDigestMismatch);
        assert_eq!(rollback.retained(), 0);
    }

    #[test]
    fn raw_deflate_accepts_empty_output_and_rejects_zlib_wrapping() {
        let empty = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::deflated(PROJECT_ENTRY_NAME, b"", EMPTY_RAW_DEFLATE),
        ]);
        let inventory = v1_inventory(&empty);
        assert_eq!(
            inventory
                .read_entry(
                    1,
                    EntryRole::Project,
                    &mut DecodeBudget::new(PackageLimits::V1)
                )
                .unwrap()
                .as_ref(),
            b"".as_slice()
        );

        let wrapped = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::deflated(PROJECT_ENTRY_NAME, PROJECT, EMPTY_OBJECT_ZLIB_WRAPPED),
        ]);
        let inventory = v1_inventory(&wrapped);
        assert_eq!(
            inventory
                .read_entry(
                    1,
                    EntryRole::Project,
                    &mut DecodeBudget::new(PackageLimits::V1)
                )
                .unwrap_err()
                .code,
            FailureCode::ProjectDigestMismatch
        );
    }

    #[test]
    fn deflate_probe_capacity_failure_uses_resource_taxonomy() {
        let entry = ArchiveEntry {
            name: PROJECT_ENTRY_NAME,
            compression: ZipCompression::Deflate,
            crc32: 0,
            compressed_size: 0,
            // The one-byte probe crosses Vec's maximum allocation boundary on
            // both 32-bit and 64-bit targets without attempting an allocation.
            uncompressed_size: isize::MAX as u64,
            compressed_bytes: b"",
        };
        let mut allocations =
            OperationAllocationLedger::new(PackageLimits::V1.decoder_working_bytes);
        let failure = inflate_raw(
            &entry,
            EntryRole::Project,
            &PackageLimits::V1,
            &mut DecodeBudget::new(PackageLimits::V1),
            &mut allocations,
        )
        .unwrap_err();

        assert_eq!(failure.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(failure.stage, FailureStage::Project);
    }

    #[test]
    fn observed_deflate_ratio_precedes_declared_size_integrity_failure() {
        assert_eq!(TEN_THOUSAND_A_RAW_DEFLATE.len(), 28);
        let bytes = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry {
                name: PROJECT_ENTRY_NAME,
                flags: 0,
                method: 8,
                compressed: TEN_THOUSAND_A_RAW_DEFLATE,
                // Exactly 200:1 is valid as declared, but the stream attempts
                // to produce 10,000 bytes and must fail at observed byte 5,601.
                uncompressed_size: 5_600,
                crc32: 0,
            },
        ]);
        let inventory = v1_inventory(&bytes);
        let failure = inventory
            .read_entry(
                1,
                EntryRole::Project,
                &mut DecodeBudget::new(PackageLimits::V1),
            )
            .unwrap_err();
        assert_eq!(failure.code, FailureCode::ResourceLimitExceeded);
    }

    #[test]
    fn exact_role_ceiling_detects_more_output_without_overallocating_probe_byte() {
        let bytes = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry {
                name: PROJECT_ENTRY_NAME,
                flags: 0,
                method: 8,
                compressed: TEN_THOUSAND_A_RAW_DEFLATE,
                uncompressed_size: 5_600,
                crc32: 0,
            },
        ]);
        let mut limits = PackageLimits::V1;
        limits.project_bytes = 5_600;
        let inventory = inspect_zip32(&bytes, &limits)
            .unwrap()
            .validate_v1_layout()
            .unwrap();
        let failure = inventory
            .read_entry(1, EntryRole::Project, &mut DecodeBudget::new(limits))
            .unwrap_err();
        assert_eq!(failure.code, FailureCode::ResourceLimitExceeded);
        assert_eq!(failure.stage, FailureStage::Project);
    }

    #[test]
    fn safe_inventory_defers_v1_project_requirements_until_after_manifest_read() {
        let missing_project = raw_fixture(&[RawEntry::stored(MANIFEST_ENTRY_NAME, b"v2")]);
        let safe = inspect_zip32(&missing_project, &PackageLimits::V1).unwrap();
        assert_eq!(
            safe.read_manifest(&mut DecodeBudget::new(PackageLimits::V1))
                .unwrap()
                .as_ref(),
            b"v2".as_slice()
        );
        assert_eq!(
            safe.validate_v1_layout().unwrap_err().code,
            FailureCode::ProjectMissing
        );

        let bytes = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, b"wrong identity"),
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
        ]);
        let mut limits = PackageLimits::V1;
        limits.project_bytes = 1;
        let safe = inspect_zip32(&bytes, &limits).unwrap();
        assert_eq!(
            safe.read_manifest(&mut DecodeBudget::new(limits))
                .unwrap()
                .as_ref(),
            b"wrong identity".as_slice()
        );
        assert_eq!(
            safe.validate_v1_layout().unwrap_err().code,
            FailureCode::ResourceLimitExceeded
        );
    }

    #[test]
    fn crc_failures_use_the_entry_role_taxonomy() {
        for (index, role, expected) in [
            (0, EntryRole::Manifest, FailureCode::ArchiveInvalid),
            (1, EntryRole::Project, FailureCode::ProjectDigestMismatch),
            (2, EntryRole::Asset, FailureCode::AssetDigestMismatch),
        ] {
            let mut bytes = raw_fixture(&base_entries());
            let data = entry_data_offset(&bytes, index);
            bytes[data] ^= 1;
            let mut budget = DecodeBudget::new(PackageLimits::V1);
            let failure = if role == EntryRole::Manifest {
                inspect_zip32(&bytes, &PackageLimits::V1)
                    .unwrap()
                    .read_manifest(&mut budget)
                    .unwrap_err()
            } else {
                v1_inventory(&bytes)
                    .read_entry(index, role, &mut budget)
                    .unwrap_err()
            };
            assert_eq!(failure.code, expected);
            assert_eq!(failure.stage, role.stage());
        }
    }

    #[test]
    fn central_and_local_profile_fields_are_closed() {
        let pristine = raw_fixture(&base_entries());
        let central = central_record_offset(&pristine, 0);
        let local = local_offset(&pristine, 0);

        let mut made_by = pristine.clone();
        overwrite_u16(&mut made_by, central + 4, 0x0314);
        assert_code(&made_by, FailureCode::ArchiveInvalid);

        let mut encrypted = pristine.clone();
        overwrite_u16(&mut encrypted, central + 8, 1);
        assert_code(&encrypted, FailureCode::ArchiveInvalid);

        let mut descriptor = pristine.clone();
        overwrite_u16(&mut descriptor, central + 8, 0x0008);
        assert_code(&descriptor, FailureCode::ArchiveInvalid);

        let mut unsupported_method = pristine.clone();
        overwrite_u16(&mut unsupported_method, central + 10, 12);
        assert_code(&unsupported_method, FailureCode::ArchiveInvalid);

        let mut zip64_version = pristine.clone();
        overwrite_u16(&mut zip64_version, central + 6, 45);
        assert_code(&zip64_version, FailureCode::ArchiveInvalid);

        let mut timestamp = pristine.clone();
        overwrite_u16(&mut timestamp, central + 12, 1);
        assert_code(&timestamp, FailureCode::ArchiveInvalid);

        let mut external_attributes = pristine.clone();
        overwrite_u32(&mut external_attributes, central + 38, 0xa000_0000);
        assert_code(&external_attributes, FailureCode::ArchiveInvalid);

        let mut disk_start = pristine.clone();
        overwrite_u16(&mut disk_start, central + 34, 1);
        assert_code(&disk_start, FailureCode::ArchiveInvalid);

        let mut internal_attributes = pristine.clone();
        overwrite_u16(&mut internal_attributes, central + 36, 1);
        assert_code(&internal_attributes, FailureCode::ArchiveInvalid);

        let mut central_extra = pristine.clone();
        overwrite_u16(&mut central_extra, central + 30, 1);
        assert_code(&central_extra, FailureCode::ArchiveInvalid);

        let mut central_comment = pristine.clone();
        overwrite_u16(&mut central_comment, central + 32, 1);
        assert_code(&central_comment, FailureCode::ArchiveInvalid);

        let mut local_disagrees = pristine.clone();
        overwrite_u16(&mut local_disagrees, local + 6, UTF8_NAME_FLAG);
        assert_code(&local_disagrees, FailureCode::ArchiveInvalid);

        let mut local_extra = pristine.clone();
        overwrite_u16(&mut local_extra, local + 28, 1);
        assert_code(&local_extra, FailureCode::ArchiveInvalid);

        let mut local_date = pristine.clone();
        overwrite_u16(&mut local_date, local + 12, 0x22);
        assert_code(&local_date, FailureCode::ArchiveInvalid);
    }

    #[test]
    fn utf8_name_flag_is_the_only_nonzero_flag_accepted() {
        let entries = [
            RawEntry {
                flags: UTF8_NAME_FLAG,
                ..RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST)
            },
            RawEntry {
                flags: UTF8_NAME_FLAG,
                ..RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT)
            },
        ];
        inspect_zip32(&raw_fixture(&entries), &PackageLimits::V1).unwrap();
    }

    #[test]
    fn eocd_must_be_single_disk_commentless_and_end_at_eof() {
        let pristine = raw_fixture(&base_entries());
        let eocd = eocd_offset(&pristine);

        let mut disk = pristine.clone();
        overwrite_u16(&mut disk, eocd + 4, 1);
        assert_code(&disk, FailureCode::ArchiveInvalid);

        let mut comment = pristine.clone();
        overwrite_u16(&mut comment, eocd + 20, 1);
        assert_code(&comment, FailureCode::ArchiveInvalid);

        let mut trailing = pristine.clone();
        trailing.push(0);
        assert_code(&trailing, FailureCode::ArchiveInvalid);

        let mut prefix = vec![0];
        prefix.extend_from_slice(&pristine);
        assert_code(&prefix, FailureCode::ArchiveInvalid);

        let prior_eocd = pristine[eocd..].to_vec();
        let multiple_eocd = insert_in_central_directory(pristine.clone(), &prior_eocd);
        assert_code(&multiple_eocd, FailureCode::ArchiveInvalid);

        let digital_signature =
            insert_in_central_directory(pristine.clone(), b"PK\x05\x05\x00\x00");
        assert_code(&digital_signature, FailureCode::ArchiveInvalid);

        let archive_extra = insert_in_central_directory(pristine, b"PK\x06\x08\x00\x00\x00\x00");
        assert_code(&archive_extra, FailureCode::ArchiveInvalid);
    }

    #[test]
    fn spans_cannot_overlap_or_hide_gaps() {
        let pristine = raw_fixture(&base_entries());
        let second_central = central_record_offset(&pristine, 1);
        let second_local = local_offset(&pristine, 1) as u32;

        let mut overlap = pristine.clone();
        overwrite_u32(&mut overlap, second_central + 42, second_local - 1);
        assert_code(&overlap, FailureCode::ArchiveInvalid);

        let mut beyond_cap = pristine.clone();
        overwrite_u32(
            &mut beyond_cap,
            second_central + 42,
            PackageLimits::V1.raw_archive_bytes as u32,
        );
        assert_code(&beyond_cap, FailureCode::ArchiveTooLarge);

        let mut data_crosses_central = pristine.clone();
        let first_central = central_record_offset(&data_crosses_central, 0);
        let first_local = local_offset(&data_crosses_central, 0);
        let enlarged = MANIFEST.len() as u32 + 1;
        overwrite_u32(&mut data_crosses_central, first_central + 20, enlarged);
        overwrite_u32(&mut data_crosses_central, first_central + 24, enlarged);
        overwrite_u32(&mut data_crosses_central, first_local + 18, enlarged);
        overwrite_u32(&mut data_crosses_central, first_local + 22, enlarged);
        assert_code(&data_crosses_central, FailureCode::ArchiveInvalid);

        let old_central = central_offset(&pristine);
        let mut gap = pristine.clone();
        gap.insert(old_central, 0);
        let moved_eocd = eocd_offset(&gap);
        overwrite_u32(&mut gap, moved_eocd + 16, old_central as u32 + 1);
        assert_code(&gap, FailureCode::ArchiveInvalid);
    }

    #[test]
    fn missing_or_forbidden_manifest_names_follow_recognition_precedence() {
        let no_manifest = raw_fixture(&[RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT)]);
        assert_code(&no_manifest, FailureCode::FormatUnsupported);

        let wrong_case = raw_fixture(&[
            RawEntry::stored("Manifest.json", MANIFEST),
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
        ]);
        assert_code(&wrong_case, FailureCode::EntryPathInvalid);

        let nested_manifest = raw_fixture(&[
            RawEntry::stored("nested/manifest.json", MANIFEST),
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
        ]);
        assert_code(&nested_manifest, FailureCode::EntryPathInvalid);
    }

    #[test]
    fn entry_names_are_closed_unique_and_case_collision_free() {
        let duplicate = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
            RawEntry::stored(ASSET_A, b"a"),
            RawEntry::stored(ASSET_A, b"b"),
        ]);
        assert_code(&duplicate, FailureCode::EntryPathInvalid);

        let case_collision = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
            RawEntry::stored(ASSET_A, b"a"),
            RawEntry::stored(
                concat!(
                    "Assets/sha256/",
                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                    ".png"
                ),
                b"b",
            ),
        ]);
        assert_code(&case_collision, FailureCode::EntryPathInvalid);

        for forbidden in [
            "../manifest.json",
            "/manifest.json",
            "//server/share",
            "assets\\sha256\\file.png",
            "C:/manifest.json",
            "assets//file.png",
            "assets/",
            "assets/sha256/control\u{1f}.png",
            "assets/sha256/nul\0.png",
            "assets/sha256/nonascii-é.png",
        ] {
            let bytes = raw_fixture(&[
                RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
                RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
                RawEntry::stored(forbidden, b"x"),
            ]);
            assert_code(&bytes, FailureCode::EntryPathInvalid);
        }

        let closed_name = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
            RawEntry::stored("extra.txt", b"x"),
        ]);
        assert_v1_code(&closed_name, FailureCode::EntryPathInvalid);

        let duplicate_root = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
        ]);
        assert_code(&duplicate_root, FailureCode::EntryPathInvalid);
    }

    #[test]
    fn semantic_entry_order_is_exact() {
        let wrong_root_order = raw_fixture(&[
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
        ]);
        assert_v1_code(&wrong_root_order, FailureCode::ArchiveInvalid);

        let wrong_asset_order = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
            RawEntry::stored(ASSET_B, b"b"),
            RawEntry::stored(ASSET_A, b"a"),
        ]);
        assert_v1_code(&wrong_asset_order, FailureCode::ArchiveInvalid);
    }

    #[test]
    fn entry_count_path_and_uncompressed_limits_are_enforced_before_read() {
        let bytes = raw_fixture(&base_entries());

        assert_eq!(
            ASSET_MAX_PATH.len() as u64,
            PackageLimits::V1.entry_path_bytes
        );
        let max_path = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
            RawEntry::stored(ASSET_MAX_PATH, b"x"),
        ]);
        v1_inventory(&max_path);

        let overlong = "x".repeat(PackageLimits::V1.entry_path_bytes as usize + 1);
        let overlong_path = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
            RawEntry::stored(&overlong, b"x"),
        ]);
        assert_code(&overlong_path, FailureCode::ResourceLimitExceeded);

        let overlong_segment = format!("assets/{}", "x".repeat(70));
        let segment_fixture = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry::stored(PROJECT_ENTRY_NAME, PROJECT),
            RawEntry::stored(&overlong_segment, b"x"),
        ]);
        let mut segment_limits = PackageLimits::V1;
        segment_limits.entry_path_bytes = 100;
        assert_eq!(
            inspect_zip32(&segment_fixture, &segment_limits)
                .unwrap_err()
                .code,
            FailureCode::ResourceLimitExceeded
        );
        let mut segment_with_profile_fault = segment_fixture.clone();
        let segment_central = central_record_offset(&segment_with_profile_fault, 2);
        overwrite_u16(&mut segment_with_profile_fault, segment_central + 8, 1);
        assert_eq!(
            inspect_zip32(&segment_with_profile_fault, &segment_limits)
                .unwrap_err()
                .code,
            FailureCode::ResourceLimitExceeded
        );

        let mut raw_limits = PackageLimits::V1;
        raw_limits.raw_archive_bytes = bytes.len() as u64;
        inspect_zip32(&bytes, &raw_limits).unwrap();
        raw_limits.raw_archive_bytes -= 1;
        assert_eq!(
            inspect_zip32(&bytes, &raw_limits).unwrap_err().code,
            FailureCode::ArchiveTooLarge
        );

        let mut count_limits = PackageLimits::V1;
        count_limits.archive_entries = 2;
        assert_eq!(
            inspect_zip32(&bytes, &count_limits).unwrap_err().code,
            FailureCode::ResourceLimitExceeded
        );

        let mut path_limits = PackageLimits::V1;
        path_limits.entry_path_bytes = 12;
        assert_eq!(
            inspect_zip32(&bytes, &path_limits).unwrap_err().code,
            FailureCode::ResourceLimitExceeded
        );

        let mut total_limits = PackageLimits::V1;
        total_limits.total_uncompressed_bytes = 1;
        assert_eq!(
            inspect_zip32(&bytes, &total_limits).unwrap_err().code,
            FailureCode::ResourceLimitExceeded
        );

        let mut total_with_local_fault = bytes.clone();
        let first_local = local_offset(&total_with_local_fault, 0);
        overwrite_u16(&mut total_with_local_fault, first_local + 6, UTF8_NAME_FLAG);
        assert_eq!(
            inspect_zip32(&total_with_local_fault, &total_limits)
                .unwrap_err()
                .code,
            FailureCode::ResourceLimitExceeded
        );

        let mut asset_limits = PackageLimits::V1;
        asset_limits.asset_bytes = 4;
        assert_eq!(
            inspect_zip32(&bytes, &asset_limits)
                .unwrap()
                .validate_v1_layout()
                .unwrap_err()
                .code,
            FailureCode::ResourceLimitExceeded
        );
    }

    #[test]
    fn deflate_ratio_accepts_200_to_1_and_rejects_201_to_1() {
        let at_boundary = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, b"x"),
            RawEntry {
                name: PROJECT_ENTRY_NAME,
                flags: 0,
                method: 8,
                compressed: &[0],
                uncompressed_size: 200,
                crc32: 0,
            },
        ]);
        inspect_zip32(&at_boundary, &PackageLimits::V1).unwrap();

        let over = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, b"x"),
            RawEntry {
                name: PROJECT_ENTRY_NAME,
                flags: 0,
                method: 8,
                compressed: &[0],
                uncompressed_size: 201,
                crc32: 0,
            },
        ]);
        assert_code(&over, FailureCode::ResourceLimitExceeded);

        let over_with_profile_fault = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, b"x"),
            RawEntry {
                name: PROJECT_ENTRY_NAME,
                flags: 1,
                method: 8,
                compressed: &[0],
                uncompressed_size: 201,
                crc32: 0,
            },
        ]);
        assert_code(&over_with_profile_fault, FailureCode::ResourceLimitExceeded);
    }

    #[test]
    fn store_size_disagreement_and_role_mismatch_are_rejected() {
        let malformed_store = raw_fixture(&[
            RawEntry::stored(MANIFEST_ENTRY_NAME, MANIFEST),
            RawEntry {
                name: PROJECT_ENTRY_NAME,
                flags: 0,
                method: 0,
                compressed: &[0],
                uncompressed_size: 201,
                crc32: 0,
            },
        ]);
        assert_code(&malformed_store, FailureCode::ArchiveInvalid);

        let bytes = raw_fixture(&base_entries());
        let inventory = v1_inventory(&bytes);
        assert_eq!(
            inventory
                .read_entry(
                    0,
                    EntryRole::Project,
                    &mut DecodeBudget::new(PackageLimits::V1)
                )
                .unwrap_err()
                .code,
            FailureCode::ArchiveInvalid
        );
    }

    #[test]
    fn writer_rejects_noncanonical_order_and_bounds_planned_archive() {
        let failure = encode_stored_zip32(
            &[
                StoredEntry {
                    name: PROJECT_ENTRY_NAME,
                    bytes: PROJECT,
                },
                StoredEntry {
                    name: MANIFEST_ENTRY_NAME,
                    bytes: MANIFEST,
                },
            ],
            &PackageLimits::V1,
        )
        .unwrap_err();
        assert_eq!(failure.code, FailureCode::EncodeFailed);

        let mut limits = PackageLimits::V1;
        limits.raw_archive_bytes = 100;
        assert_eq!(
            encode_stored_zip32(
                &[
                    StoredEntry {
                        name: MANIFEST_ENTRY_NAME,
                        bytes: MANIFEST,
                    },
                    StoredEntry {
                        name: PROJECT_ENTRY_NAME,
                        bytes: PROJECT,
                    },
                ],
                &limits,
            )
            .unwrap_err()
            .code,
            FailureCode::ArchiveTooLarge
        );
    }
}
