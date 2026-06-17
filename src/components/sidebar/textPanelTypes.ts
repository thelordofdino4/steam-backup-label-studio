import type {
  DiscTextAlignment,
  DiscTextArcSide,
  DiscTextKey,
  DiscTextLayoutSettings,
  DiscTextMode,
  DiscTextSettings,
  DiscTextValues,
  SteamLogoPlacement,
} from '../../discText/index'
import type {
  DiscTextStyleField,
  DiscTextStyleSettings,
  DiscTextStyleValue,
} from '../../discText/styles'
import type {
  DiscNumberArtworkMode,
  DiscNumberBadgeSet,
} from '../../discText/discNumberArtwork'
import type {
  DiscTextValueSources,
  MetadataBoundDiscTextKey,
} from '../../project/metadataDiscText'
import type { ProjectDiscNumberArtwork } from '../../project/projectTypes'
import type { DiscTemplate } from '../../types/template'

export type TextPanelProps = {
  discTextSettings: DiscTextSettings
  discTextLayout: DiscTextLayoutSettings
  discTextStyles: DiscTextStyleSettings
  projectDiscNumberArtwork: ProjectDiscNumberArtwork
  discTextValues: DiscTextValues
  discTextValueSources: DiscTextValueSources
  metadataBoundDiscTextValues: DiscTextValues
  discTextTitleValue: string
  resolvedDiscTextTitle: string
  selectedDiscTemplate: DiscTemplate
  selectedDiscTextKey: DiscTextKey | null
  handleDiscTextToggle: (key: DiscTextKey, checked: boolean) => void
  handleDiscTextPreviewEditStart: (key: DiscTextKey) => void
  handleDiscTextContentChange: (key: DiscTextKey, value: string) => void
  handleUseMetadataDiscTextValue: (key: MetadataBoundDiscTextKey) => void
  handleDiscTextLayoutChange: (
    key: DiscTextKey,
    field: 'x' | 'y' | 'width' | 'scale' | 'arcDegrees',
    value: number,
  ) => void
  handleDiscTextAlignmentChange: (key: DiscTextKey, align: DiscTextAlignment) => void
  handleDiscTextModeChange: (key: DiscTextKey, mode: DiscTextMode) => void
  handleDiscTextArcSideChange: (key: DiscTextKey, arcSide: DiscTextArcSide) => void
  handleDiscTextVisualAvoidanceChange: (
    key: DiscTextKey,
    avoidVisualElements: boolean,
  ) => void
  handleResetDiscTextLayout: (key: DiscTextKey) => void
  handleDiscTextStyleChange: (
    key: DiscTextKey,
    field: DiscTextStyleField,
    value: DiscTextStyleValue,
  ) => void
  handleApplyDiscTextStylePreset: (key: DiscTextKey, presetId: string) => void
  handleDiscNumberArtworkModeChange: (mode: DiscNumberArtworkMode) => void
  handleDiscNumberArtworkBadgeSetChange: (badgeSet: DiscNumberBadgeSet) => void
  handleResetDiscTextStyle: (key: DiscTextKey) => void
  steamLogoPlacement: SteamLogoPlacement
}
