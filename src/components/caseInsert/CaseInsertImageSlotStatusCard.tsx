import type { ProjectCaseInsertImageSlot } from '../../project/projectTypes'
import { EditorImageAssetStatusCard } from '../editor/EditorImageAssetStatusCard'
import { formatAdditionalArtworkSize } from '../sidebar/artwork/helpers'

export function CaseInsertImageSlotStatusCard({
  slot,
  emptyHint,
}: {
  slot: ProjectCaseInsertImageSlot
  emptyHint: string
}) {
  return (
    <EditorImageAssetStatusCard
      emptyHint={emptyHint}
      fallbackLabel={slot.label}
      formatSize={formatAdditionalArtworkSize}
      imageDataUrl={slot.imageDataUrl}
      imageSize={slot.imageSize}
      imageSource={slot.imageSource}
      previewClassName="additional-artwork-preview"
      statusText="source-label"
    />
  )
}
