import {
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  addCaseInsertTemplateImageSlot,
  getCaseInsertImageSlotGroupConfig,
  removeCaseInsertTemplateImageSlot,
  renameCaseInsertTemplateImageSlot,
  setCaseInsertTemplateAdditionalArtworkEnabled,
  updateCaseInsertTemplateImageSlot,
  updateCaseInsertTemplateImageSlotInGroup,
  updateCaseInsertTemplateTextBlock,
  updateCaseInsertTemplateTextList,
  updateProjectCaseInsertTemplate,
  type CaseInsertPrimaryImageSlotKey,
} from '../caseInsert/templateSurfaceTransitions'
import {
  addCaseInsertAdditionalLogoSlot,
  clearCaseInsertAdditionalLogoSlotImage,
  clearCaseInsertPrimaryLogoSlotImage,
  getCaseInsertPrimaryLogoLabel,
  resetCaseInsertPrimaryLogoSlotLayout,
  setCaseInsertPrimaryLogoSlotEnabled,
  setCaseInsertPrimaryLogoSlotImage,
  updateCaseInsertPrimaryLogoSlotLayoutField,
  withCaseInsertAdditionalLogoImageSource,
} from '../caseInsert/brandingLogoSlots'
import {
  fitCaseInsertImageSlotToRegionHeight,
  resetCaseInsertImageSlotFrame,
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
  updateCaseInsertImageSlotFit,
  updateCaseInsertImageSlotFrameField,
  updateCaseInsertImageSlotLayoutField,
} from '../caseInsert/imageSlotTransitions'
import {
  restoreCaseInsertTitleArtworkDefaultSteamLogo,
  setCustomCaseInsertTitleArtworkImage,
} from '../caseInsert/titleArtwork'
import {
  resetCaseInsertSteamBannerColors,
  resetCaseInsertSteamBannerLockupImage,
  resetCaseInsertSteamBannerLockupLayout,
  setCaseInsertSteamBannerEnabled,
  setCaseInsertSteamBannerUseTextFallback,
  setCustomCaseInsertSteamBannerLockupImage,
  updateCaseInsertSteamBannerColor,
  updateCaseInsertSteamBannerFallbackText,
  updateCaseInsertSteamBannerLockupLayoutField,
  updateCaseInsertTemplateSteamBanner,
  type CaseInsertSteamBannerColorField,
  type CaseInsertSteamBannerLayoutField,
} from '../caseInsert/steamBanner'
import { getJewelCaseRegionExportBounds } from '../layout/jewelCaseLayout'
import {
  createLogoCandidateCaseInsertImageSlotImage,
  createLocalSteamScreenshotCaseInsertImageSlotImage,
  createSteamArtworkCaseInsertImageSlotImage,
  createUploadedCaseInsertImageSlotImage,
  createWebArtworkCaseInsertImageSlotImage,
} from '../caseInsert/imageSlotSourceImport'
import {
  addCaseInsertTextListItem,
  removeCaseInsertTextListItem,
  setCaseInsertTextBlockEnabled,
  setCaseInsertTextListEnabled,
  updateCaseInsertTextBlockLayoutField,
  updateCaseInsertTextBlockValue,
  updateCaseInsertTextListItem,
} from '../caseInsert/textTransitions'
import type {
  CaseInsertImageSlotGroupKey,
  CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces'
import type { LocalSteamScreenshotAsset } from '../local/localArtwork'
import type {
  AdditionalArtworkFrameField,
} from '../project/additionalArtworkFrame.ts'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
  ProjectJewelCaseState,
} from '../project/projectTypes'
import type { CaseInsertImageSlotImageInput } from '../caseInsert/types'
import type { LogoAssetKey } from '../project/projectLogoAssets'
import type { SteamArtworkAsset } from '../steam/steamApi'
import type { RemoteLogoCandidate } from '../steam/steamLogoCandidates'
import { isImageFile } from '../utils/importedImageAsset'

type UseCaseInsertTemplateEditorOptions = {
  setProjectJewelCase: Dispatch<SetStateAction<ProjectJewelCaseState>>
  announceStatus: (message: string) => void
}

const defaultPrimarySlotLayouts: Record<
  CaseInsertTemplatePaneId,
  Record<CaseInsertPrimaryImageSlotKey, ProjectCaseInsertLayout>
> = {
  cover: {
    background: { scale: 1, x: 0, y: 0, rotation: 0 },
    titleArtwork: { scale: 1, x: 50, y: 24, rotation: 0 },
  },
  tray: {
    background: { scale: 1, x: 0, y: 0, rotation: 0 },
    titleArtwork: { scale: 1, x: 50, y: 24, rotation: 0 },
  },
}

const defaultTextBlockLayouts: Record<string, ProjectCaseInsertLayout> = {
  'cover-callout-text': { scale: 1, x: 50, y: 82, rotation: 0 },
  'tray-description': { scale: 1, x: 50, y: 50, rotation: 0 },
  'tray-minimum-requirements': { scale: 1, x: 28, y: 81, rotation: 0 },
  'tray-recommended-requirements': { scale: 1, x: 72, y: 81, rotation: 0 },
  'tray-legal-text': { scale: 1, x: 50, y: 93, rotation: 0 },
}

const defaultTextListLayouts: Record<string, ProjectCaseInsertLayout> = {
  'tray-feature-bullets': { scale: 1, x: 28, y: 31, rotation: 0 },
}

function normalizeLabel(label: string) {
  return label.trim().toLocaleLowerCase()
}

function getGroupDefaultLayout(
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertImageSlotGroupKey,
): ProjectCaseInsertLayout {
  return {
    scale: 1,
    x: 0,
    y: 0,
    rotation: 0,
    ...getCaseInsertImageSlotGroupConfig(paneId, slotKey).defaultLayout,
  }
}

function getPrimaryImageSlotFitRegion(
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertPrimaryImageSlotKey,
) {
  if (slotKey !== 'background') {
    return null
  }

  return getJewelCaseRegionExportBounds(paneId === 'cover' ? 'front' : 'back')
}

function preserveCaseInsertMarkSource(
  slotKey: CaseInsertImageSlotGroupKey,
  slot: Pick<ProjectCaseInsertImageSlot, 'imageSource'>,
  image: CaseInsertImageSlotImageInput,
): CaseInsertImageSlotImageInput {
  if (slotKey !== 'markSlots' || !slot.imageSource?.sourceId?.startsWith('case-')) {
    return image
  }

  return {
    ...image,
    imageSource: {
      ...image.imageSource,
      sourceId: slot.imageSource.sourceId,
      sourceLabel: image.imageSource?.sourceLabel ?? slot.imageSource.sourceLabel,
    },
  }
}

function preserveCaseInsertGroupedSlotSource(
  slotKey: CaseInsertImageSlotGroupKey,
  slot: ProjectCaseInsertImageSlot,
  image: CaseInsertImageSlotImageInput,
): CaseInsertImageSlotImageInput {
  if (slotKey === 'logoSlots') {
    return withCaseInsertAdditionalLogoImageSource(slot, image)
  }

  return preserveCaseInsertMarkSource(slotKey, slot, image)
}

export function useCaseInsertTemplateEditor({
  setProjectJewelCase,
  announceStatus,
}: UseCaseInsertTemplateEditorOptions) {
  const updatePrimaryImageSlot = useCallback((
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    updater: Parameters<typeof updateCaseInsertTemplateImageSlot>[3],
  ) => {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateImageSlot(
        currentCaseInsert,
        paneId,
        slotKey,
        updater,
      ),
    )
  }, [setProjectJewelCase])

  const updateGroupedImageSlot = useCallback((
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    updater: Parameters<typeof updateCaseInsertTemplateImageSlotInGroup>[4],
    options: {
      enableAdditionalArtwork?: boolean
    } = {},
  ) => {
    setProjectJewelCase((currentCaseInsert) => {
      const nextCaseInsert = updateCaseInsertTemplateImageSlotInGroup(
        currentCaseInsert,
        paneId,
        slotKey,
        slotId,
        updater,
      )

      return slotKey === 'artworkSlots' && options.enableAdditionalArtwork
        ? setCaseInsertTemplateAdditionalArtworkEnabled(
            nextCaseInsert,
            paneId,
            true,
          )
        : nextCaseInsert
    })
  }, [setProjectJewelCase])

  const updateSteamBanner = useCallback((
    paneId: CaseInsertTemplatePaneId,
    updater: Parameters<typeof updateCaseInsertTemplateSteamBanner>[2],
  ) => {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateSteamBanner(currentCaseInsert, paneId, updater),
    )
  }, [setProjectJewelCase])

  async function handleImageSlotUpload(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    label: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const statusLabel = normalizeLabel(label)

    if (!isImageFile(file)) {
      announceStatus(`Choose an image file for the ${statusLabel}.`)
      return
    }

    try {
      const image = await createUploadedCaseInsertImageSlotImage(
        file,
        statusLabel,
      )

      updatePrimaryImageSlot(paneId, slotKey, (slot) =>
        slotKey === 'titleArtwork'
          ? setCustomCaseInsertTitleArtworkImage(slot, image)
          : setCaseInsertImageSlotImage(slot, image),
      )
      announceStatus(`Selected ${statusLabel} image.`)
    } catch {
      announceStatus(`The ${statusLabel} image could not be read.`)
    }
  }

  async function handleUseImageSlotSteamArtwork(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    label: string,
    asset: SteamArtworkAsset,
  ) {
    const statusLabel = normalizeLabel(label)
    announceStatus(`Downloading ${asset.label} for ${statusLabel}...`)

    try {
      const image = await createSteamArtworkCaseInsertImageSlotImage(asset)

      updatePrimaryImageSlot(paneId, slotKey, (slot) =>
        setCaseInsertImageSlotImage(slot, image),
      )
      announceStatus(`Using ${asset.label} as the ${statusLabel}.`)
    } catch (error) {
      announceStatus(`Steam artwork import failed for ${statusLabel}: ${String(error)}`)
    }
  }

  async function handleUseImageSlotLocalSteamScreenshot(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    label: string,
    asset: LocalSteamScreenshotAsset,
  ) {
    const statusLabel = normalizeLabel(label)
    announceStatus(`Loading ${asset.label} for ${statusLabel}...`)

    try {
      const image = await createLocalSteamScreenshotCaseInsertImageSlotImage(asset)

      updatePrimaryImageSlot(paneId, slotKey, (slot) =>
        setCaseInsertImageSlotImage(slot, image),
      )
      announceStatus(`Using ${asset.label} as the ${statusLabel}.`)
    } catch (error) {
      announceStatus(`Local screenshot import failed for ${statusLabel}: ${String(error)}`)
    }
  }

  async function handleUseImageSlotWebArtwork(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    label: string,
    candidate: RemoteLogoCandidate,
  ) {
    const statusLabel = normalizeLabel(label)
    announceStatus(`Downloading ${candidate.label} for ${statusLabel}...`)

    try {
      const image = await createWebArtworkCaseInsertImageSlotImage(candidate)

      updatePrimaryImageSlot(paneId, slotKey, (slot) =>
        setCaseInsertImageSlotImage(slot, image),
      )
      announceStatus(`Using ${candidate.label} as the ${statusLabel}.`)
    } catch (error) {
      announceStatus(`Web artwork import failed for ${statusLabel}: ${String(error)}`)
    }
  }

  function handleImageSlotEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    enabled: boolean,
  ) {
    updatePrimaryImageSlot(paneId, slotKey, (slot) =>
      setCaseInsertImageSlotEnabled(slot, enabled),
    )
  }

  function handleImageSlotFitChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    fit: ProjectCaseInsertImageFit,
  ) {
    updatePrimaryImageSlot(paneId, slotKey, (slot) =>
      updateCaseInsertImageSlotFit(slot, fit),
    )
  }

  function handleImageSlotLayoutChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    updatePrimaryImageSlot(paneId, slotKey, (slot) =>
      updateCaseInsertImageSlotLayoutField(slot, field, value),
    )
  }

  function handleResetImageSlotLayout(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
  ) {
    updatePrimaryImageSlot(paneId, slotKey, (slot) => ({
      ...slot,
      layout: defaultPrimarySlotLayouts[paneId][slotKey],
    }))
  }

  function handleRestoreTitleArtworkDefault(paneId: CaseInsertTemplatePaneId) {
    updatePrimaryImageSlot(paneId, 'titleArtwork', (slot) =>
      restoreCaseInsertTitleArtworkDefaultSteamLogo(slot),
    )
    announceStatus('Restored game logo to the Steam default logo.')
  }

  function handleFitImageSlotToRegion(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    label: string,
  ) {
    const region = getPrimaryImageSlotFitRegion(paneId, slotKey)

    if (!region) {
      return
    }

    updatePrimaryImageSlot(paneId, slotKey, (slot) =>
      fitCaseInsertImageSlotToRegionHeight(slot, region),
    )
    announceStatus(`Fit ${normalizeLabel(label)} top to bottom.`)
  }

  function handleClearImageSlot(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    label: string,
  ) {
    updatePrimaryImageSlot(paneId, slotKey, (slot) => ({
      ...slot,
      imageDataUrl: null,
      imageSize: null,
      imageSource: null,
    }))
    announceStatus(`Cleared ${normalizeLabel(label)} image.`)
  }

  function handleSteamBannerEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    enabled: boolean,
  ) {
    updateSteamBanner(paneId, (banner) =>
      setCaseInsertSteamBannerEnabled(banner, enabled),
    )
  }

  async function handleSteamBannerLockupUpload(
    paneId: CaseInsertTemplatePaneId,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the Steam banner lockup.')
      return
    }

    try {
      const image = await createUploadedCaseInsertImageSlotImage(
        file,
        'Steam banner lockup',
      )

      updateSteamBanner(paneId, (banner) =>
        setCustomCaseInsertSteamBannerLockupImage(banner, image),
      )
      announceStatus(`Using ${file.name} as the Steam banner lockup.`)
    } catch {
      announceStatus('The Steam banner lockup image could not be read.')
    }
  }

  function handleClearSteamBannerLockup(paneId: CaseInsertTemplatePaneId) {
    updateSteamBanner(paneId, (banner) =>
      resetCaseInsertSteamBannerLockupImage(banner, 'cover'),
    )
    announceStatus('Reset Steam banner lockup image to the default asset.')
  }

  function handleSteamBannerLockupLayoutChange(
    paneId: CaseInsertTemplatePaneId,
    field: CaseInsertSteamBannerLayoutField,
    value: number,
  ) {
    updateSteamBanner(paneId, (banner) =>
      updateCaseInsertSteamBannerLockupLayoutField(banner, field, value),
    )
  }

  function handleResetSteamBannerLockupLayout(
    paneId: CaseInsertTemplatePaneId,
  ) {
    updateSteamBanner(paneId, (banner) =>
      resetCaseInsertSteamBannerLockupLayout(banner, 'cover'),
    )
    announceStatus('Reset Steam banner lockup layout to the default position.')
  }

  function handleSteamBannerUseTextFallbackChange(
    paneId: CaseInsertTemplatePaneId,
    useTextFallback: boolean,
  ) {
    updateSteamBanner(paneId, (banner) =>
      setCaseInsertSteamBannerUseTextFallback(banner, useTextFallback),
    )
    announceStatus(
      useTextFallback
        ? 'Using saved text for the Steam banner lockup.'
        : 'Using the Steam banner lockup image.',
    )
  }

  function handleSteamBannerFallbackTextChange(
    paneId: CaseInsertTemplatePaneId,
    fallbackText: string,
  ) {
    updateSteamBanner(paneId, (banner) =>
      updateCaseInsertSteamBannerFallbackText(banner, fallbackText),
    )
  }

  function handleSteamBannerColorChange(
    paneId: CaseInsertTemplatePaneId,
    field: CaseInsertSteamBannerColorField,
    value: string,
  ) {
    updateSteamBanner(paneId, (banner) =>
      updateCaseInsertSteamBannerColor(banner, field, value),
    )
  }

  function handleResetSteamBannerColors(paneId: CaseInsertTemplatePaneId) {
    updateSteamBanner(paneId, resetCaseInsertSteamBannerColors)
    announceStatus('Reset Steam banner colors to the default palette.')
  }

  function handlePrimaryLogoSlotEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    logoKey: LogoAssetKey,
    enabled: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectCaseInsertTemplate(currentCaseInsert, paneId, (templateState) =>
        setCaseInsertPrimaryLogoSlotEnabled(
          templateState,
          paneId,
          logoKey,
          enabled,
        ),
      ),
    )
  }

  async function handlePrimaryLogoSlotUpload(
    paneId: CaseInsertTemplatePaneId,
    logoKey: LogoAssetKey,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const label = getCaseInsertPrimaryLogoLabel(logoKey)
    const statusLabel = normalizeLabel(label)

    if (!isImageFile(file)) {
      announceStatus(`Choose an image file for the ${statusLabel}.`)
      return
    }

    try {
      const image = await createUploadedCaseInsertImageSlotImage(
        file,
        statusLabel,
      )

      setProjectJewelCase((currentCaseInsert) =>
        updateProjectCaseInsertTemplate(
          currentCaseInsert,
          paneId,
          (templateState) =>
            setCaseInsertPrimaryLogoSlotImage(
              templateState,
              paneId,
              logoKey,
              image,
            ),
        ),
      )
      announceStatus(`Selected ${statusLabel} image.`)
    } catch {
      announceStatus(`The ${statusLabel} image could not be read.`)
    }
  }

  function handlePrimaryLogoSlotLayoutChange(
    paneId: CaseInsertTemplatePaneId,
    logoKey: LogoAssetKey,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectCaseInsertTemplate(currentCaseInsert, paneId, (templateState) =>
        updateCaseInsertPrimaryLogoSlotLayoutField(
          templateState,
          paneId,
          logoKey,
          field,
          value,
        ),
      ),
    )
  }

  function handleResetPrimaryLogoSlotLayout(
    paneId: CaseInsertTemplatePaneId,
    logoKey: LogoAssetKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectCaseInsertTemplate(currentCaseInsert, paneId, (templateState) =>
        resetCaseInsertPrimaryLogoSlotLayout(
          templateState,
          paneId,
          logoKey,
        ),
      ),
    )
    announceStatus(`Reset ${normalizeLabel(getCaseInsertPrimaryLogoLabel(logoKey))} layout.`)
  }

  function handleClearPrimaryLogoSlot(
    paneId: CaseInsertTemplatePaneId,
    logoKey: LogoAssetKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectCaseInsertTemplate(currentCaseInsert, paneId, (templateState) =>
        clearCaseInsertPrimaryLogoSlotImage(
          templateState,
          paneId,
          logoKey,
        ),
      ),
    )
    announceStatus(`Cleared ${normalizeLabel(getCaseInsertPrimaryLogoLabel(logoKey))} image.`)
  }

  function handleAddGroupedImageSlot(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
  ) {
    const label = normalizeLabel(
      getCaseInsertImageSlotGroupConfig(paneId, slotKey).labelPrefix,
    )

    setProjectJewelCase((currentCaseInsert) =>
      addCaseInsertTemplateImageSlot(currentCaseInsert, paneId, slotKey),
    )
    announceStatus(`Added ${label} slot.`)
  }

  function handleAddAdditionalLogoSlot(
    paneId: CaseInsertTemplatePaneId,
    logoKey: LogoAssetKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectCaseInsertTemplate(currentCaseInsert, paneId, (templateState) =>
        addCaseInsertAdditionalLogoSlot(templateState, paneId, logoKey),
      ),
    )
    announceStatus(`Added additional ${logoKey} logo.`)
  }

  function handleAdditionalArtworkEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    enabled: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      setCaseInsertTemplateAdditionalArtworkEnabled(
        currentCaseInsert,
        paneId,
        enabled,
      ),
    )
  }

  function handleRemoveGroupedImageSlot(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
  ) {
    const label = normalizeLabel(
      getCaseInsertImageSlotGroupConfig(paneId, slotKey).labelPrefix,
    )

    setProjectJewelCase((currentCaseInsert) =>
      removeCaseInsertTemplateImageSlot(
        currentCaseInsert,
        paneId,
        slotKey,
        slotId,
      ),
    )
    announceStatus(`Removed ${label} slot.`)
  }

  function handleGroupedImageSlotEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    enabled: boolean,
  ) {
    updateGroupedImageSlot(
      paneId,
      slotKey,
      slotId,
      (slot) => setCaseInsertImageSlotEnabled(slot, enabled),
      {
        enableAdditionalArtwork: enabled,
      },
    )
  }

  function handleGroupedImageSlotLabelChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    label: string,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectCaseInsertTemplate(currentCaseInsert, paneId, (templateState) =>
        renameCaseInsertTemplateImageSlot(templateState, slotKey, slotId, label),
      ),
    )
  }

  async function handleGroupedImageSlotUpload(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    label: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const statusLabel = normalizeLabel(label)

    if (!isImageFile(file)) {
      announceStatus(`Choose an image file for the ${statusLabel}.`)
      return
    }

    try {
      const image = await createUploadedCaseInsertImageSlotImage(file, statusLabel)

      updateGroupedImageSlot(
        paneId,
        slotKey,
        slotId,
        (slot) => setCaseInsertImageSlotImage(
          slot,
          preserveCaseInsertGroupedSlotSource(slotKey, slot, image),
        ),
        {
          enableAdditionalArtwork: slotKey === 'artworkSlots',
        },
      )
      announceStatus(`Selected ${statusLabel} image.`)
    } catch {
      announceStatus(`The ${statusLabel} image could not be read.`)
    }
  }

  async function handleUseGroupedImageSlotSteamArtwork(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    label: string,
    asset: SteamArtworkAsset,
  ) {
    const statusLabel = normalizeLabel(label)
    announceStatus(`Downloading ${asset.label} for ${statusLabel}...`)

    try {
      const image = await createSteamArtworkCaseInsertImageSlotImage(asset)

      updateGroupedImageSlot(
        paneId,
        slotKey,
        slotId,
        (slot) => setCaseInsertImageSlotImage(slot, image),
        {
          enableAdditionalArtwork: slotKey === 'artworkSlots',
        },
      )
      announceStatus(`Using ${asset.label} as the ${statusLabel}.`)
    } catch (error) {
      announceStatus(`Steam artwork import failed for ${statusLabel}: ${String(error)}`)
    }
  }

  async function handleUseGroupedImageSlotLocalSteamScreenshot(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    label: string,
    asset: LocalSteamScreenshotAsset,
  ) {
    const statusLabel = normalizeLabel(label)
    announceStatus(`Loading ${asset.label} for ${statusLabel}...`)

    try {
      const image = await createLocalSteamScreenshotCaseInsertImageSlotImage(asset)

      updateGroupedImageSlot(
        paneId,
        slotKey,
        slotId,
        (slot) => setCaseInsertImageSlotImage(slot, image),
        {
          enableAdditionalArtwork: slotKey === 'artworkSlots',
        },
      )
      announceStatus(`Using ${asset.label} as the ${statusLabel}.`)
    } catch (error) {
      announceStatus(`Local screenshot import failed for ${statusLabel}: ${String(error)}`)
    }
  }

  async function handleUseGroupedImageSlotWebArtwork(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    label: string,
    candidate: RemoteLogoCandidate,
  ) {
    const statusLabel = normalizeLabel(label)
    announceStatus(`Downloading ${candidate.label} for ${statusLabel}...`)

    try {
      const image = await createWebArtworkCaseInsertImageSlotImage(candidate)

      updateGroupedImageSlot(
        paneId,
        slotKey,
        slotId,
        (slot) => setCaseInsertImageSlotImage(slot, image),
        {
          enableAdditionalArtwork: slotKey === 'artworkSlots',
        },
      )
      announceStatus(`Using ${candidate.label} as the ${statusLabel}.`)
    } catch (error) {
      announceStatus(`Web artwork import failed for ${statusLabel}: ${String(error)}`)
    }
  }

  function handleGroupedImageSlotFitChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    fit: ProjectCaseInsertImageFit,
  ) {
    updateGroupedImageSlot(paneId, slotKey, slotId, (slot) =>
      updateCaseInsertImageSlotFit(slot, fit),
    )
  }

  function handleGroupedImageSlotLayoutChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    updateGroupedImageSlot(paneId, slotKey, slotId, (slot) =>
      updateCaseInsertImageSlotLayoutField(slot, field, value),
    )
  }

  function handleGroupedImageSlotFrameChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    field: AdditionalArtworkFrameField,
    value: boolean | number | string,
  ) {
    updateGroupedImageSlot(paneId, slotKey, slotId, (slot) =>
      updateCaseInsertImageSlotFrameField(slot, field, value),
    )
  }

  function handleResetGroupedImageSlotLayout(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
  ) {
    updateGroupedImageSlot(paneId, slotKey, slotId, (slot) => ({
      ...slot,
      layout: getGroupDefaultLayout(paneId, slotKey),
    }))
  }

  function handleResetGroupedImageSlotFrame(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
  ) {
    updateGroupedImageSlot(paneId, slotKey, slotId, resetCaseInsertImageSlotFrame)
  }

  function handleClearGroupedImageSlot(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    label: string,
  ) {
    updateGroupedImageSlot(
      paneId,
      slotKey,
      slotId,
      (slot) => slotKey === 'logoSlots'
        ? clearCaseInsertAdditionalLogoSlotImage(slot)
        : {
            ...slot,
            imageDataUrl: null,
            imageSize: null,
            imageSource: null,
          },
    )
    announceStatus(`Cleared ${normalizeLabel(label)} image.`)
  }

  async function handleUseLogoCandidate(
    paneId: CaseInsertTemplatePaneId,
    logoKey: LogoAssetKey,
    candidate: RemoteLogoCandidate,
  ) {
    const label = getCaseInsertPrimaryLogoLabel(logoKey)
    announceStatus(`Adding ${candidate.label} to ${normalizeLabel(label)}...`)

    try {
      const image = await createLogoCandidateCaseInsertImageSlotImage(candidate)

      setProjectJewelCase((currentCaseInsert) =>
        updateProjectCaseInsertTemplate(
          currentCaseInsert,
          paneId,
          (templateState) =>
            setCaseInsertPrimaryLogoSlotImage(
              templateState,
              paneId,
              logoKey,
              image,
            ),
        ),
      )
      announceStatus(`Added ${candidate.label} as the ${normalizeLabel(label)}.`)
    } catch (error) {
      announceStatus(`Logo candidate import failed for ${normalizeLabel(label)}: ${String(error)}`)
    }
  }

  function handleTextBlockEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
    enabled: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateTextBlock(
        currentCaseInsert,
        paneId,
        textBlockId,
        (textBlock) => setCaseInsertTextBlockEnabled(textBlock, enabled),
      ),
    )
  }

  function handleTextBlockValueChange(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
    value: string,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateTextBlock(
        currentCaseInsert,
        paneId,
        textBlockId,
        (textBlock) => updateCaseInsertTextBlockValue(textBlock, value),
      ),
    )
  }

  function handleTextBlockAlignChange(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
    align: ProjectCaseInsertTextAlign,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateTextBlock(
        currentCaseInsert,
        paneId,
        textBlockId,
        (textBlock) => ({
          ...textBlock,
          align,
        }),
      ),
    )
  }

  function handleTextBlockLayoutChange(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateTextBlock(
        currentCaseInsert,
        paneId,
        textBlockId,
        (textBlock) =>
          updateCaseInsertTextBlockLayoutField(textBlock, field, value),
      ),
    )
  }

  function handleResetTextBlockLayout(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
  ) {
    const layout = defaultTextBlockLayouts[textBlockId]

    if (!layout) {
      return
    }

    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateTextBlock(
        currentCaseInsert,
        paneId,
        textBlockId,
        (textBlock) => ({
          ...textBlock,
          layout,
        }),
      ),
    )
  }

  function handleTextListEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
    enabled: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateTextList(
        currentCaseInsert,
        paneId,
        textListId,
        (textList) => setCaseInsertTextListEnabled(textList, enabled),
      ),
    )
  }

  function handleAddTextListItem(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateTextList(
        currentCaseInsert,
        paneId,
        textListId,
        addCaseInsertTextListItem,
      ),
    )
  }

  function handleTextListItemValueChange(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
    index: number,
    value: string,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateTextList(
        currentCaseInsert,
        paneId,
        textListId,
        (textList) => updateCaseInsertTextListItem(textList, index, value),
      ),
    )
  }

  function handleRemoveTextListItem(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
    index: number,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateTextList(
        currentCaseInsert,
        paneId,
        textListId,
        (textList) => removeCaseInsertTextListItem(textList, index),
      ),
    )
  }

  function handleTextListLayoutChange(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateTextList(
        currentCaseInsert,
        paneId,
        textListId,
        (textList) => ({
          ...textList,
          layout: {
            ...textList.layout,
            [field]: value,
          },
        }),
      ),
    )
  }

  function handleResetTextListLayout(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
  ) {
    const layout = defaultTextListLayouts[textListId]

    if (!layout) {
      return
    }

    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateTextList(
        currentCaseInsert,
        paneId,
        textListId,
        (textList) => ({
          ...textList,
          layout,
        }),
      ),
    )
  }

  return {
    handleImageSlotUpload,
    handleUseImageSlotSteamArtwork,
    handleUseImageSlotLocalSteamScreenshot,
    handleUseImageSlotWebArtwork,
    handleImageSlotEnabledChange,
    handleImageSlotFitChange,
    handleImageSlotLayoutChange,
    handleResetImageSlotLayout,
    handleRestoreTitleArtworkDefault,
    handleFitImageSlotToRegion,
    handleClearImageSlot,
    handleSteamBannerEnabledChange,
    handleSteamBannerLockupUpload,
    handleClearSteamBannerLockup,
    handleSteamBannerLockupLayoutChange,
    handleResetSteamBannerLockupLayout,
    handleSteamBannerUseTextFallbackChange,
    handleSteamBannerFallbackTextChange,
    handleSteamBannerColorChange,
    handleResetSteamBannerColors,
    handlePrimaryLogoSlotEnabledChange,
    handlePrimaryLogoSlotUpload,
    handlePrimaryLogoSlotLayoutChange,
    handleResetPrimaryLogoSlotLayout,
    handleClearPrimaryLogoSlot,
    handleAdditionalArtworkEnabledChange,
    handleAddGroupedImageSlot,
    handleAddAdditionalLogoSlot,
    handleRemoveGroupedImageSlot,
    handleGroupedImageSlotEnabledChange,
    handleGroupedImageSlotLabelChange,
    handleGroupedImageSlotUpload,
    handleUseGroupedImageSlotSteamArtwork,
    handleUseGroupedImageSlotLocalSteamScreenshot,
    handleUseGroupedImageSlotWebArtwork,
    handleGroupedImageSlotFitChange,
    handleGroupedImageSlotLayoutChange,
    handleGroupedImageSlotFrameChange,
    handleResetGroupedImageSlotLayout,
    handleResetGroupedImageSlotFrame,
    handleClearGroupedImageSlot,
    handleUseLogoCandidate,
    handleTextBlockEnabledChange,
    handleTextBlockValueChange,
    handleTextBlockAlignChange,
    handleTextBlockLayoutChange,
    handleResetTextBlockLayout,
    handleTextListEnabledChange,
    handleAddTextListItem,
    handleTextListItemValueChange,
    handleRemoveTextListItem,
    handleTextListLayoutChange,
    handleResetTextListLayout,
  }
}

export type CaseInsertTemplateEditorActions = ReturnType<
  typeof useCaseInsertTemplateEditor
>
