import type { PointerEvent } from 'react'
import type {
  CaseInsertImageSlotGroupKey,
  CaseInsertTemplatePaneId,
} from '../../caseInsert/templateSurfaces'
import type {
  CaseInsertPrimaryImageSlotKey,
} from '../../caseInsert/templateSurfaceTransitions'
import {
  isCaseInsertMarkSlotVisible,
} from '../../caseInsert/brandingVisibility'
import {
  getCaseInsertLogoSlotRenderInfo,
} from '../../caseInsert/brandingLogoSlots'
import {
  getFeatureVisibleRepeatedArtworkItems,
} from '../../editor/repeatedArtwork'
import type { CaseInsertPreviewLayout } from '../../layout/caseInsertPreviewLayout'
import {
  getJewelCaseBackBackgroundFit,
  getJewelCaseBackImageSlotPreviewRect,
} from '../../layout/jewelCaseBackLayout'
import {
  getJewelCaseFrontBackgroundFit,
  getJewelCaseFrontImageSlotPreviewRect,
} from '../../layout/jewelCaseFrontLayout'
import type {
  ProjectCaseInsertImageSlot,
} from '../../project/projectTypes'
import {
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
} from '../../editor/previewElementOverlay'
import type {
  CaseInsertTemplatePreviewPointerHandlers,
} from '../../interaction/useCaseInsertPreviewPointerDrag'
import {
  createRectPositionedImageRenderArtifact,
} from '../../render/imageRenderArtifact'
import { CaseInsertImageSlotFrame } from './CaseInsertImageSlotFrame'
import { ContentBoundedImage } from './ContentBoundedImage'
import type {
  CaseInsertTemplateLayerProps,
  CaseInsertTemplateMarkLayerKind,
} from './CaseInsertTemplatePreviewLayerTypes'
import {
  getImageStyle,
  getRectStyle,
} from './caseInsertTemplatePreviewGeometry'

export { CaseInsertTemplateTextLayer } from './CaseInsertTemplateTextLayer'
export type {
  CaseInsertTemplateLayerProps,
  CaseInsertTemplateMarkLayerKind,
  CaseInsertTemplateTextLayerProps,
} from './CaseInsertTemplatePreviewLayerTypes'

function CaseInsertTemplateImageSlot({
  paneId,
  slot,
  layout,
  group,
  dragTarget,
  pointerHandlers,
}: {
  paneId: CaseInsertTemplatePaneId
  slot: ProjectCaseInsertImageSlot
  layout: CaseInsertPreviewLayout
  group: 'titleArtwork' | 'artwork' | 'logo' | 'mark'
  dragTarget:
    | {
        kind: 'primary'
        slotKey: CaseInsertPrimaryImageSlotKey
      }
    | {
        kind: 'group'
        slotKey: CaseInsertImageSlotGroupKey
        slotId: string
      }
  pointerHandlers: CaseInsertTemplatePreviewPointerHandlers
}) {
  const rect = paneId === 'cover'
    ? getJewelCaseFrontImageSlotPreviewRect(
        slot,
        layout,
        group === 'titleArtwork' ? 'titleArtwork' :
          group === 'artwork' ? 'calloutArtwork' : group,
      )
    : getJewelCaseBackImageSlotPreviewRect(
        slot,
        layout,
        group === 'artwork' ? 'artwork' : group === 'mark' ? 'mark' : 'logo',
      )

  const logoRenderInfo = group === 'logo'
    ? getCaseInsertLogoSlotRenderInfo(slot)
    : null
  const imageDataUrl = logoRenderInfo?.imageDataUrl ?? slot.imageDataUrl
  const imageSize = logoRenderInfo?.imageSize ?? slot.imageSize

  const artifact = createRectPositionedImageRenderArtifact({
    imageDataUrl,
    imageSize,
    label: slot.label,
    alt: '',
    rect,
  })

  if (!artifact) {
    return null
  }

  const pointerProps = {
    onPointerDown: (event: PointerEvent<Element>) =>
      dragTarget.kind === 'primary'
        ? pointerHandlers.handleTemplatePrimaryImageSlotPointerDown(
            event,
            paneId,
            dragTarget.slotKey,
          )
        : pointerHandlers.handleTemplateGroupedImageSlotPointerDown(
            event,
            paneId,
            dragTarget.slotKey,
            dragTarget.slotId,
          ),
    onPointerMove: pointerHandlers.handleTemplatePointerMove,
    onPointerUp: pointerHandlers.handleTemplatePointerUp,
  }
  const editableAttributes = createPreviewEditableAttributes({
    id: dragTarget.kind === 'primary'
      ? createPreviewEditableElementId('case', paneId, dragTarget.slotKey)
      : createPreviewEditableElementId(
          'case',
          paneId,
          dragTarget.slotKey,
          dragTarget.slotId,
        ),
    label: slot.label,
    kind: group === 'logo' ? 'logo' : group === 'mark' ? 'mark' : 'artwork',
  })

  if (group === 'artwork') {
    const className = [
      'case-insert-template-framed-artwork',
      slot.frame.enabled && slot.frame.shape === 'circle' && !artifact.contentShape
        ? 'case-insert-image-slot-frame-host--circle'
        : '',
      artifact.contentBounds
        ? 'case-insert-template-framed-artwork--content-bounded'
        : '',
      artifact.contentShape
        ? 'case-insert-template-framed-artwork--content-shaped'
        : '',
    ].filter(Boolean).join(' ')

    return (
      <div
        className={className}
        {...editableAttributes}
        {...pointerProps}
        style={getRectStyle(artifact.rect, layout)}
      >
        <ContentBoundedImage
          alt=""
          className="case-insert-template-framed-artwork-image"
          draggable={false}
          imageSize={imageSize}
          src={artifact.imageDataUrl}
        />
        <CaseInsertImageSlotFrame slot={slot} />
      </div>
    )
  }

  return (
    <ContentBoundedImage
      alt=""
      className={`case-insert-template-overlay-image case-insert-template-${group}`}
      draggable={false}
      editableAttributes={editableAttributes}
      imageSize={artifact.imageSize}
      {...pointerProps}
      src={artifact.imageDataUrl}
      style={getRectStyle(artifact.rect, layout)}
    />
  )
}

export function CaseInsertTemplateBackgroundLayer({
  paneId,
  templateState,
  layout,
  pointerHandlers,
}: CaseInsertTemplateLayerProps) {
  const backgroundFit = paneId === 'cover'
    ? getJewelCaseFrontBackgroundFit(
        templateState.background,
        layout,
        templateState.steamBanner,
      )
    : getJewelCaseBackBackgroundFit(templateState.background, layout)

  if (!backgroundFit || !templateState.background.imageDataUrl) {
    return null
  }

  return (
    <div
      className="case-insert-template-background-clip"
      {...createPreviewEditableAttributes({
        id: createPreviewEditableElementId('case', paneId, 'background'),
        label: `${paneId === 'cover' ? 'Cover' : 'Tray'} background artwork`,
        kind: 'background',
      })}
      onPointerDown={(event) =>
        pointerHandlers.handleTemplatePrimaryImageSlotPointerDown(
          event,
          paneId,
          'background',
        )}
      onPointerMove={pointerHandlers.handleTemplatePointerMove}
      onPointerUp={pointerHandlers.handleTemplatePointerUp}
      style={getRectStyle(backgroundFit.region, layout)}
    >
      <ContentBoundedImage
        alt=""
        className="case-insert-template-background-image"
        draggable={false}
        imageSize={templateState.background.imageSize}
        src={templateState.background.imageDataUrl}
        style={getImageStyle(backgroundFit.imageRect, backgroundFit.region)}
      />
    </div>
  )
}

export function CaseInsertTemplateArtworkLayer({
  paneId,
  templateState,
  layout,
  pointerHandlers,
}: CaseInsertTemplateLayerProps) {
  const artworkSlots = getFeatureVisibleRepeatedArtworkItems(
    templateState,
    templateState.artworkSlots,
  )

  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      <CaseInsertTemplateImageSlot
        paneId={paneId}
        slot={templateState.titleArtwork}
        layout={layout}
        group="titleArtwork"
        dragTarget={{ kind: 'primary', slotKey: 'titleArtwork' }}
        pointerHandlers={pointerHandlers}
      />
      {artworkSlots.map((slot) => (
        <CaseInsertTemplateImageSlot
          key={slot.id}
          paneId={paneId}
          slot={slot}
          layout={layout}
          group="artwork"
          dragTarget={{
            kind: 'group',
            slotKey: 'artworkSlots',
            slotId: slot.id,
          }}
          pointerHandlers={pointerHandlers}
        />
      ))}
    </div>
  )
}

export function CaseInsertTemplateLogoLayer({
  paneId,
  templateState,
  layout,
  pointerHandlers,
}: CaseInsertTemplateLayerProps) {
  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      {templateState.logoSlots.map((slot) => (
        <CaseInsertTemplateImageSlot
          key={slot.id}
          paneId={paneId}
          slot={slot}
          layout={layout}
          group="logo"
          dragTarget={{ kind: 'group', slotKey: 'logoSlots', slotId: slot.id }}
          pointerHandlers={pointerHandlers}
        />
      ))}
    </div>
  )
}

export function CaseInsertTemplateMarkLayer({
  paneId,
  templateState,
  layout,
  kind,
  pointerHandlers,
  brandingSources,
}: CaseInsertTemplateLayerProps & {
  kind: CaseInsertTemplateMarkLayerKind
}) {
  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      {templateState.markSlots
        .filter((slot) =>
          isCaseInsertMarkSlotVisible(slot, kind, brandingSources))
        .map((slot) => (
          <CaseInsertTemplateImageSlot
            key={slot.id}
            paneId={paneId}
            slot={slot}
            layout={layout}
            group="mark"
            dragTarget={{
              kind: 'group',
              slotKey: 'markSlots',
              slotId: slot.id,
            }}
            pointerHandlers={pointerHandlers}
          />
        ))}
    </div>
  )
}
