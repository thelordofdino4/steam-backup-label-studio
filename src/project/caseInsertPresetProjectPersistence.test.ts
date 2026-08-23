import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createBrandingSources } from '../caseInsert/brandingMarkTargetSourcesFixtures.ts'
import {
  createApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  captureApplicationLifecycleState,
  createLoadedProjectSession,
  createNewProjectSession,
  selectIsActiveProjectDirty,
  type CaseInsertProjectSession,
} from '../lifecycle/projectSession.ts'
import {
  representCaseInsertPresetApplicationSnapshot,
} from '../lifecycle/caseInsertPresetSessionApplication.ts'
import {
  buildCaseInsertPresetApplicationAdoptionFixture,
} from '../presets/caseInsertPresetApplicationAdoption.testFixture.test.ts'
import {
  CASE_INSERT_PRESET_CATALOG,
  createCaseInsertPresetCatalog,
  type CaseInsertPresetCatalog,
} from '../presets/caseInsertPresetCatalog.ts'
import {
  createCaseInsertPresetAttachedState,
} from '../presets/caseInsertPresetConfigurationAdoptionModel.ts'
import {
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
} from '../presets/builtins/jewelCaseEssentialsCasePreset.ts'
import {
  createCoordinatedCaseInsertPresetDefinition,
} from '../presets/caseInsertPresetTestFixtures.ts'
import {
  createAppCaseInsertPresetWorkflowOwner,
} from '../app/appCaseInsertPresetWorkflow.ts'
import { stageProjectOpenContents } from '../app/appProjectLoad.ts'
import { createBlankJewelCaseSavedProject } from './caseInsertProjectAdapters.ts'
import {
  createCaseInsertProjectSaveSnapshot,
  prepareCaseInsertPresetProjectRecovery,
} from './caseInsertPresetProjectPersistence.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from './projectSchema.ts'
import type { SavedCaseInsertProject } from './projectTypes.ts'

function attachedSession() {
  const fixture = buildCaseInsertPresetApplicationAdoptionFixture(
    'persisted-case-source-session',
  )
  const project = createBlankJewelCaseSavedProject('Persisted Case')
  project.caseInsert = structuredClone(fixture.firstApplication.snapshot.caseInsert)
  const loaded = createLoadedProjectSession({
    sessionId: 'persisted-case-source-session',
    project,
    currentPath: 'C:\\projects\\source.sbls',
    persistenceFormat: 'sbls-package-v1',
  })
  const represented = representCaseInsertPresetApplicationSnapshot({
    sessionId: 'persisted-case-source-session',
    project,
    snapshot: fixture.firstApplication,
  })
  assert.equal(represented.ok, true)
  if (!represented.ok) throw new Error(represented.detail)
  const session = loaded.activeSession
  assert.equal(session?.kind, 'caseInsert')
  if (!session || session.kind !== 'caseInsert') {
    throw new Error('Expected a Case project session.')
  }
  const state = captureApplicationLifecycleState({
    ...loaded,
    activeSession: {
      ...session,
      caseInsertPresetApplication: represented.application,
    },
  })
  const attached = state.activeSession
  assert.equal(attached?.kind, 'caseInsert')
  if (!attached || attached.kind !== 'caseInsert') {
    throw new Error('Expected an attached Case project session.')
  }
  return { fixture, session: attached }
}

function catalogWith(...revisions: number[]) {
  const definitions = revisions.map((revision) => ({
    ...createCoordinatedCaseInsertPresetDefinition(),
    revision,
  }))
  const result = createCaseInsertPresetCatalog({ builtins: definitions })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(result.error.code)
  return result.catalog
}

async function stageCaseProject(
  project: SavedCaseInsertProject,
  catalog: CaseInsertPresetCatalog = catalogWith(3),
) {
  return stageProjectOpenContents({
    selectedPath: 'C:\\projects\\recovered.sbls',
    contents: JSON.stringify(project),
    persistenceFormat: 'sbls-package-v1',
    caseInsertBrandingSources: createBrandingSources(),
    caseInsertPresetCatalog: catalog,
  })
}

async function productionAttachedSession(
  revision: 1 | 2,
): Promise<CaseInsertProjectSession> {
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: `persisted-jewel-case-essentials-v${revision}`,
      project: createBlankJewelCaseSavedProject(
        `Persisted Jewel Case Essentials v${revision}`,
      ),
    }),
  })
  const owner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: root,
    catalog: CASE_INSERT_PRESET_CATALOG,
  })
  const planned = owner.beginApply({
    selectedPreset: {
      id: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
      revision,
    },
    requestedScope: { kind: 'complete' },
  })
  assert.equal(planned.ok, true, JSON.stringify(planned))
  if (!planned.ok) throw new Error(planned.code)
  const completed = await owner.complete(planned.review, {
    decision: 'confirm',
    operation: planned.review.operation,
    reviewIdentity: planned.review.reviewIdentity,
    selectedPreset: planned.review.selectedPreset,
    reviewedWarningIds: [...planned.review.warningIds],
    acceptedMaterialConsentRequirementIds: [
      ...planned.review.materialConsentRequirementIds,
    ],
  })
  assert.equal(completed.ok, true, JSON.stringify(completed))
  if (!completed.ok) throw new Error(completed.code)
  const session = root.getLifecycleState().activeSession
  assert.equal(session?.kind, 'caseInsert')
  if (!session || session.kind !== 'caseInsert') {
    throw new Error('Expected an attached production Case session.')
  }
  assert.equal(session.caseInsertPresetApplication.attachment.status, 'attached')
  return session
}

test('attached configuration, identity, owner values, and revision round-trip explicitly', async () => {
  const { fixture, session } = attachedSession()
  const saved = createCaseInsertProjectSaveSnapshot(
    session.project,
    session.caseInsertPresetApplication,
  )
  assert.equal(saved.caseInsertLayoutPreset.attachment.status, 'attached')
  if (saved.caseInsertLayoutPreset.attachment.status !== 'attached') return
  const persistedConfiguration =
    saved.caseInsertLayoutPreset.attachment.configuration
  assert.equal(persistedConfiguration.preset.id, fixture.firstConfiguration.preset.id)
  assert.equal(
    persistedConfiguration.preset.revision,
    fixture.firstConfiguration.preset.revision,
  )
  assert.deepEqual(
    persistedConfiguration.ownedFields,
    fixture.firstConfiguration.ownedFields,
  )
  assert.equal('configurationIdentity' in persistedConfiguration, false)
  assert.equal('source' in persistedConfiguration, false)

  const staged = await stageCaseProject(saved)
  assert.equal(staged.status, 'success')
  if (staged.status !== 'success' || staged.value.projectType !== 'caseInsert') {
    return
  }
  assert.deepEqual(staged.value.caseInsertPresetRecovery.recoveryStatus, {
    status: 'current',
    customization: 'clean',
  })
  const recovered = createLoadedProjectSession({
    sessionId: 'recovered-case-session',
    project: staged.value.normalizedProject as unknown as SavedCaseInsertProject,
    currentPath: staged.value.selectedPath,
    persistenceFormat: staged.value.persistenceFormat,
    lastEditorRoute: staged.value.editorRoute,
    caseInsertPresetRecovery: staged.value.caseInsertPresetRecovery,
  })
  const recoveredSession = recovered.activeSession
  assert.equal(recoveredSession?.kind, 'caseInsert')
  if (!recoveredSession || recoveredSession.kind !== 'caseInsert') return
  assert.equal(recoveredSession.caseInsertPresetApplication.attachment.status,
    'attached')
  assert.equal(
    recoveredSession.caseInsertPresetApplication.applicationRevision,
    session.caseInsertPresetApplication.applicationRevision,
  )
  assert.equal(
    recoveredSession.caseInsertPresetApplication.snapshotIdentity.sessionId,
    'recovered-case-session',
  )
  if (recoveredSession.caseInsertPresetApplication.attachment.status !==
      'attached') return
  assert.deepEqual(
    recoveredSession.caseInsertPresetApplication.attachment.configuration
      .ownedFields,
    fixture.firstConfiguration.ownedFields,
  )
  assert.deepEqual(recoveredSession.project.caseInsert, session.project.caseInsert)
  assert.equal(selectIsActiveProjectDirty(recovered), false)
  assert.deepEqual(
    createCaseInsertProjectSaveSnapshot(
      recoveredSession.project,
      recoveredSession.caseInsertPresetApplication,
    ).caseInsertLayoutPreset,
    saved.caseInsertLayoutPreset,
  )
})

test('reapplied v2 configuration and provenance round-trip without recomputation', async () => {
  const fixture = buildCaseInsertPresetApplicationAdoptionFixture(
    'persisted-reapply-session',
  )
  const project = createBlankJewelCaseSavedProject('Persisted Reapply Case')
  project.caseInsert = structuredClone(fixture.reapply.aggregate)
  const attachment = createCaseInsertPresetAttachedState(
    fixture.nextConfiguration,
  )
  assert.equal(attachment.ok, true)
  if (!attachment.ok) throw new Error(attachment.code)

  const saved = createCaseInsertProjectSaveSnapshot(project, {
    applicationRevision: fixture.nextSnapshot.identity.projectRevision,
    snapshotIdentity: fixture.nextSnapshot.identity,
    attachment: attachment.state,
  })
  assert.equal(saved.caseInsertLayoutPreset.attachment.status, 'attached')
  if (saved.caseInsertLayoutPreset.attachment.status !== 'attached') return
  assert.equal(
    saved.caseInsertLayoutPreset.attachment.configuration.formatVersion,
    2,
  )
  assert.deepEqual(
    saved.caseInsertLayoutPreset.attachment.configuration,
    {
      formatVersion: 2,
      firstApply: fixture.nextConfiguration.firstApply,
      reapply: fixture.nextConfiguration.reapply,
      preset: fixture.nextConfiguration.preset,
      requestedScope: fixture.nextConfiguration.requestedScope,
      resolvedRegions: fixture.nextConfiguration.resolvedRegions,
      template: fixture.nextConfiguration.template,
      reviewedPlanIdentity: fixture.nextConfiguration.reviewedPlanIdentity,
      ownedFields: fixture.nextConfiguration.ownedFields,
      reviewedWarningIds: fixture.nextConfiguration.reviewedWarningIds,
      acceptedMaterialConsentRequirementIds:
        fixture.nextConfiguration.acceptedMaterialConsentRequirementIds,
    },
  )

  const staged = await stageCaseProject(
    saved,
    catalogWith(fixture.nextConfiguration.preset.revision),
  )
  assert.equal(staged.status, 'success')
  if (staged.status !== 'success' || staged.value.projectType !== 'caseInsert') {
    return
  }
  const recovered = createLoadedProjectSession({
    sessionId: 'recovered-reapply-session',
    project: staged.value.normalizedProject as unknown as SavedCaseInsertProject,
    currentPath: staged.value.selectedPath,
    persistenceFormat: staged.value.persistenceFormat,
    caseInsertPresetRecovery: staged.value.caseInsertPresetRecovery,
  })
  const recoveredSession = recovered.activeSession
  assert.equal(recoveredSession?.kind, 'caseInsert')
  if (!recoveredSession || recoveredSession.kind !== 'caseInsert' ||
      recoveredSession.caseInsertPresetApplication.attachment.status !==
        'attached') return
  assert.equal(
    recoveredSession.caseInsertPresetApplication.attachment.configuration
      .formatVersion,
    2,
  )
  assert.deepEqual(
    recoveredSession.caseInsertPresetApplication.attachment.configuration
      .reapply,
    fixture.nextConfiguration.reapply,
  )
})

test('production Jewel Case Essentials revisions 1 and 2 round-trip as their exact attachments', async () => {
  for (const revision of [1, 2] as const) {
    const session = await productionAttachedSession(revision)
    const attachment = session.caseInsertPresetApplication.attachment
    assert.equal(attachment.status, 'attached')
    if (attachment.status !== 'attached') continue
    assert.equal(attachment.configuration.preset.id,
      JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID)
    assert.equal(attachment.configuration.preset.revision, revision)

    const saved = createCaseInsertProjectSaveSnapshot(
      session.project,
      session.caseInsertPresetApplication,
    )
    assert.equal(saved.schemaVersion, CURRENT_PROJECT_SCHEMA_VERSION)
    assert.equal(saved.caseInsertLayoutPreset.attachment.status, 'attached')
    if (saved.caseInsertLayoutPreset.attachment.status !== 'attached') continue
    assert.equal(
      saved.caseInsertLayoutPreset.attachment.configuration.preset.revision,
      revision,
    )
    assert.deepEqual(
      saved.caseInsertLayoutPreset.attachment.configuration.ownedFields,
      attachment.configuration.ownedFields,
    )

    const staged = await stageCaseProject(saved, CASE_INSERT_PRESET_CATALOG)
    assert.equal(staged.status, 'success', JSON.stringify(staged))
    if (staged.status !== 'success' ||
        staged.value.projectType !== 'caseInsert') continue
    assert.deepEqual(
      staged.value.caseInsertPresetRecovery.recoveryStatus,
      revision === 1
        ? {
            status: 'stale',
            savedRevision: 1,
            latestAvailableRevision: 2,
            customization: 'clean',
          }
        : { status: 'current', customization: 'clean' },
    )
    const recovered = createLoadedProjectSession({
      sessionId: `recovered-jewel-case-essentials-v${revision}`,
      project: staged.value.normalizedProject,
      currentPath: staged.value.selectedPath,
      persistenceFormat: staged.value.persistenceFormat,
      lastEditorRoute: staged.value.editorRoute,
      caseInsertPresetRecovery: staged.value.caseInsertPresetRecovery,
    })
    const recoveredSession = recovered.activeSession
    assert.equal(recoveredSession?.kind, 'caseInsert')
    if (!recoveredSession || recoveredSession.kind !== 'caseInsert') continue
    const recoveredAttachment =
      recoveredSession.caseInsertPresetApplication.attachment
    assert.equal(recoveredAttachment.status, 'attached')
    if (recoveredAttachment.status !== 'attached') continue
    assert.equal(recoveredAttachment.configuration.preset.id,
      JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID)
    assert.equal(recoveredAttachment.configuration.preset.revision, revision)
    assert.deepEqual(
      recoveredAttachment.configuration.ownedFields,
      attachment.configuration.ownedFields,
    )
    assert.deepEqual(recoveredSession.project, session.project)
    assert.deepEqual(
      createCaseInsertProjectSaveSnapshot(
        recoveredSession.project,
        recoveredSession.caseInsertPresetApplication,
      ).caseInsertLayoutPreset,
      saved.caseInsertLayoutPreset,
    )

    const screenshotSlots = recoveredSession.project.caseInsert.templates.tray
      .artworkSlots.filter(({ id }) => /^tray-artwork-[123]$/.test(id))
    assert.equal(screenshotSlots.length, revision === 1 ? 0 : 3)
  }
})

test('revision 2 format-3 owner values and exact slots recover without a catalog', async () => {
  const session = await productionAttachedSession(2)
  const attachment = session.caseInsertPresetApplication.attachment
  assert.equal(attachment.status, 'attached')
  if (attachment.status !== 'attached') return
  assert.equal(attachment.configuration.formatVersion, 3)
  if (attachment.configuration.formatVersion !== 3) return
  assert.equal(attachment.configuration.reapply, null)

  const expectedXs = [17, 50, 83]
  for (const [index, number] of [1, 2, 3].entries()) {
    const slotId = `tray-artwork-${number}`
    const slot = session.project.caseInsert.templates.tray.artworkSlots.find(
      ({ id }) => id === slotId,
    )
    assert.ok(slot)
    const ownedValues = Object.fromEntries(
      attachment.configuration.ownedFields
        .filter(({ address }) => address.bindingId === slotId)
        .map(({ address, lastAppliedValue }) => [
          address.fieldId,
          lastAppliedValue,
        ]),
    )
    assert.deepEqual(ownedValues, {
      'object-presence': { kind: 'object-presence', value: 'present' },
      'layout-x': { kind: 'layout-number', value: expectedXs[index] },
      'layout-y': { kind: 'layout-number', value: 78 },
      'layout-scale': { kind: 'layout-number', value: 1 },
      'image-fit': { kind: 'image-fit', value: 'cover' },
      'reserved-artwork-viewport': {
        kind: 'reserved-artwork-viewport',
        value: slot?.reservedArtworkViewport,
      },
    })
    assert.equal(slot?.label, `Artwork ${number}`)
    assert.equal(slot?.enabled, false)
    assert.equal(slot?.imageDataUrl, null)
    assert.equal(slot?.imageSource, null)
    assert.equal(slot?.imageSize, null)
    assert.equal(slot?.defaultSteamLogo, null)
    assert.equal(slot?.layout.rotation, 0)
  }

  const saved = createCaseInsertProjectSaveSnapshot(
    session.project,
    session.caseInsertPresetApplication,
  )
  assert.equal(saved.caseInsertLayoutPreset.attachment.status, 'attached')
  if (saved.caseInsertLayoutPreset.attachment.status !== 'attached') return
  assert.deepEqual(
    saved.caseInsertLayoutPreset.attachment.configuration.ownedFields,
    attachment.configuration.ownedFields,
  )

  const unavailableCatalog = {
    getExact() { throw new Error('Catalog unavailable.') },
    getLatest() { throw new Error('Catalog unavailable.') },
    resolve() { throw new Error('Catalog unavailable.') },
    list() { throw new Error('Catalog unavailable.') },
  } satisfies CaseInsertPresetCatalog
  const staged = await stageCaseProject(saved, unavailableCatalog)
  assert.equal(staged.status, 'success', JSON.stringify(staged))
  if (staged.status !== 'success' || staged.value.projectType !== 'caseInsert') {
    return
  }
  assert.deepEqual(staged.value.caseInsertPresetRecovery.recoveryStatus, {
    status: 'unavailable',
    code: 'catalog-unavailable',
  })
  const recovered = createLoadedProjectSession({
    sessionId: 'recovered-jewel-case-essentials-v2-without-catalog',
    project: staged.value.normalizedProject,
    currentPath: staged.value.selectedPath,
    persistenceFormat: staged.value.persistenceFormat,
    lastEditorRoute: staged.value.editorRoute,
    caseInsertPresetRecovery: staged.value.caseInsertPresetRecovery,
  })
  const recoveredSession = recovered.activeSession
  assert.equal(recoveredSession?.kind, 'caseInsert')
  if (!recoveredSession || recoveredSession.kind !== 'caseInsert') return
  const recoveredAttachment =
    recoveredSession.caseInsertPresetApplication.attachment
  assert.equal(recoveredAttachment.status, 'attached')
  if (recoveredAttachment.status !== 'attached') return
  assert.equal(recoveredAttachment.configuration.preset.revision, 2)
  assert.equal(recoveredAttachment.configuration.formatVersion, 3)
  assert.deepEqual(
    recoveredAttachment.configuration.ownedFields,
    attachment.configuration.ownedFields,
  )
  assert.deepEqual(
    recoveredSession.project.caseInsert.templates.tray.artworkSlots,
    session.project.caseInsert.templates.tray.artworkSlots,
  )
  assert.deepEqual(
    createCaseInsertProjectSaveSnapshot(
      recoveredSession.project,
      recoveredSession.caseInsertPresetApplication,
    ).caseInsertLayoutPreset,
    saved.caseInsertLayoutPreset,
  )
})

test('revision 2 leaves project, package, and application release versions unchanged', async () => {
  assert.equal(CURRENT_PROJECT_SCHEMA_VERSION, '0.4.0')

  const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
    version?: unknown
  }
  const packageLock = JSON.parse(
    await readFile('package-lock.json', 'utf8'),
  ) as {
    version?: unknown
    packages?: Record<string, { version?: unknown }>
  }
  const tauriConfig = JSON.parse(
    await readFile('src-tauri/tauri.conf.json', 'utf8'),
  ) as { version?: unknown }
  const cargoManifest = await readFile('src-tauri/Cargo.toml', 'utf8')
  const packageManifest = await readFile(
    'src-tauri/crates/sbls-package-codec/src/manifest.rs',
    'utf8',
  )

  assert.equal(packageJson.version, '0.1.0')
  assert.equal(packageLock.version, '0.1.0')
  assert.equal(packageLock.packages?.['']?.version, '0.1.0')
  assert.equal(tauriConfig.version, '0.1.0')
  assert.match(cargoManifest, /^version = "0\.1\.0"$/m)
  assert.match(packageManifest, /const PACKAGE_VERSION: u32 = 1;/)
})

test('detached persistence never infers attachment from matching geometry or owner values', async () => {
  const { session } = attachedSession()
  const detached = createLoadedProjectSession({
    sessionId: 'detached-source-session',
    project: session.project as unknown as SavedCaseInsertProject,
    currentPath: 'C:\\projects\\detached.sbls',
    persistenceFormat: 'sbls-package-v1',
  })
  const detachedSession = detached.activeSession
  assert.equal(detachedSession?.kind, 'caseInsert')
  if (!detachedSession || detachedSession.kind !== 'caseInsert') return
  const saved = createCaseInsertProjectSaveSnapshot(
    detachedSession.project,
    detachedSession.caseInsertPresetApplication,
  )
  let lookupCount = 0
  const noLookupCatalog = {
    getExact() { lookupCount += 1; throw new Error('must not look up') },
    getLatest() { lookupCount += 1; throw new Error('must not look up') },
    resolve() { lookupCount += 1; throw new Error('must not look up') },
    list() { lookupCount += 1; throw new Error('must not look up') },
  }
  const staged = await stageCaseProject(saved, noLookupCatalog)
  assert.equal(staged.status, 'success')
  assert.equal(lookupCount, 0)
  if (staged.status !== 'success' || staged.value.projectType !== 'caseInsert') {
    return
  }
  assert.deepEqual(staged.value.caseInsertPresetRecovery.recoveryStatus, {
    status: 'not-applicable',
  })
  const recovered = createLoadedProjectSession({
    sessionId: 'detached-recovered-session',
    project: staged.value.normalizedProject as unknown as SavedCaseInsertProject,
    currentPath: staged.value.selectedPath,
    persistenceFormat: staged.value.persistenceFormat,
    caseInsertPresetRecovery: staged.value.caseInsertPresetRecovery,
  })
  assert.equal(
    recovered.activeSession?.kind === 'caseInsert'
      ? recovered.activeSession.caseInsertPresetApplication.attachment.status
      : null,
    'unattached',
  )
})

test('save projection rejects mismatched aggregate and preset application snapshots', () => {
  const { session } = attachedSession()
  const mismatchedProject = structuredClone(session.project)
  mismatchedProject.caseInsert.templates.cover.background.layout.x += 1

  assert.throws(
    () => createCaseInsertProjectSaveSnapshot(
      mismatchedProject,
      session.caseInsertPresetApplication,
    ),
    /one coherent snapshot/,
  )
})

test('catalog drift is status-only and never substitutes the saved exact reference', async () => {
  const { session } = attachedSession()
  const saved = createCaseInsertProjectSaveSnapshot(
    session.project,
    session.caseInsertPresetApplication,
  )
  const stale = await stageCaseProject(saved, catalogWith(3, 4))
  assert.equal(stale.status, 'success')
  if (stale.status === 'success' && stale.value.projectType === 'caseInsert') {
    assert.deepEqual(stale.value.caseInsertPresetRecovery.recoveryStatus, {
      status: 'stale',
      savedRevision: 3,
      latestAvailableRevision: 4,
      customization: 'clean',
    })
    assert.equal(
      stale.value.caseInsertPresetRecovery.persistedState.attachment.status ===
        'attached'
        ? stale.value.caseInsertPresetRecovery.persistedState.attachment
            .configuration.preset.revision
        : null,
      3,
    )
  }
  const unavailable = await stageCaseProject(
    saved,
    catalogWith(),
  )
  assert.equal(unavailable.status, 'success')
  if (unavailable.status === 'success' &&
      unavailable.value.projectType === 'caseInsert') {
    assert.deepEqual(unavailable.value.caseInsertPresetRecovery.recoveryStatus, {
      status: 'unavailable',
      code: 'exact-definition-unavailable',
    })
    const recovered = createLoadedProjectSession({
      sessionId: 'missing-catalog-recovery-session',
      project: unavailable.value.normalizedProject as unknown as
        SavedCaseInsertProject,
      currentPath: unavailable.value.selectedPath,
      persistenceFormat: unavailable.value.persistenceFormat,
      caseInsertPresetRecovery: unavailable.value.caseInsertPresetRecovery,
    })
    assert.equal(
      recovered.activeSession?.kind === 'caseInsert'
        ? recovered.activeSession.caseInsertPresetApplication.attachment.status
        : null,
      'attached',
    )
  }
})

test('owner drift becomes typed incompatible recovery while malformed configuration rejects', async () => {
  const { session } = attachedSession()
  const saved = createCaseInsertProjectSaveSnapshot(
    session.project,
    session.caseInsertPresetApplication,
  )
  const ownerDriftProject = structuredClone(session.project)
  ;(ownerDriftProject.caseInsert.templates.cover.background as
    { id: string }).id = 'cover-background-replaced'
  const incompatible = prepareCaseInsertPresetProjectRecovery({
    persistedState: saved.caseInsertLayoutPreset,
    project: ownerDriftProject,
    catalog: catalogWith(3),
  })
  assert.equal(incompatible.ok, true)
  if (incompatible.ok) {
    assert.equal(incompatible.recovery.recoveryStatus.status, 'incompatible')
  }

  const malformed = structuredClone(saved)
  assert.equal(malformed.caseInsertLayoutPreset.attachment.status, 'attached')
  if (malformed.caseInsertLayoutPreset.attachment.status !== 'attached') return
  const mutableConfiguration = malformed.caseInsertLayoutPreset.attachment
    .configuration as unknown as {
      ownedFields: Array<{ lastAppliedValue: unknown }>
    }
  mutableConfiguration.ownedFields[0]!.lastAppliedValue = 'invalid'
  const staged = await stageCaseProject(malformed)
  assert.equal(staged.status, 'failure')
  if (staged.status === 'failure') {
    assert.equal(staged.error.code, 'project.case-restore-failed')
  }
})

test('recovery source has no planner, operation transition, adoption, or UI dependency', async () => {
  const source = await readFile(
    'src/project/caseInsertPresetProjectPersistence.ts',
    'utf8',
  )
  for (const forbidden of [
    'caseInsertPresetApplyPlanning',
    'caseInsertPresetReapplyPlanning',
    'caseInsertPresetDetachPlanning',
    'caseInsertPresetApplyTransition',
    'caseInsertPresetReapplyTransition',
    'caseInsertPresetDetachTransition',
    'caseInsertPresetApplicationAdoption',
    'applicationLifecycleCompositionRoot',
    'components/',
  ]) assert.equal(source.includes(forbidden), false, forbidden)
})
