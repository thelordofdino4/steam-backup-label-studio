import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { TemplatePanel } from '../sidebar/TemplatePanel'
import { useDiscTemplate } from '../../hooks/useDiscTemplate'
import { DEFAULT_DISC_TEXT_SETTINGS, createDefaultDiscTextLayout, createDefaultDiscTextValues } from '../../discText/index'
import { createDefaultProjectLogoAssets } from '../../project/projectLogoAssets'
import { createDefaultProjectMetadata } from '../../project/projectMetadata'
import { createDefaultProjectRatingBadge } from '../../project/projectRatingBadge'
import { createDefaultProjectMediaMark } from '../../project/projectMediaMark'
import { createDefaultProjectPlatformMarks } from '../../project/projectPlatformMarks'
import { createDefaultProjectTechnicalMarks } from '../../project/projectTechnicalMarks'
import { discTemplates } from '../../templates/discTemplates'
import { buildCustomDiscTemplate } from '../../disc/geometry'
import '../../styles/app-base.css'

export function Harness() {
  const [clamps, setClamps] = useState(0)
  const [status, setStatus] = useState('')
  const [badgeEnabled, setBadgeEnabled] = useState(false)
  const template = discTemplates.standardPrintableDisc
  const model = useDiscTemplate({
    announceStatus: setStatus,
    clampForegroundElementLayoutsToTemplate: () => setClamps(value => value + 1),
    getGeometryGuardrailState: () => ({
      discTextSettings: { ...DEFAULT_DISC_TEXT_SETTINGS, title: false },
      discTextValues: createDefaultDiscTextValues(), discTextTitle: '',
      discTextLayout: createDefaultDiscTextLayout('top', template),
      projectLogoAssets: createDefaultProjectLogoAssets(template),
      projectMetadata: { ...createDefaultProjectMetadata(), ratingSystem: 'ESRB', ratingValue: 'E' },
      projectRatingBadge: { ...createDefaultProjectRatingBadge(template),
        layout: { ...createDefaultProjectRatingBadge(template).layout, enabled: badgeEnabled } },
      projectMediaMark: createDefaultProjectMediaMark(template),
      projectPlatformMarks: createDefaultProjectPlatformMarks(),
      projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
    }),
  })
  return <main style={{ maxWidth: 460 }}>
    <TemplatePanel {...model} />
    <button onClick={() => model.resetDiscTemplateState()}>Reset project</button>
    <button onClick={() => model.restoreDiscTemplateState({ selectedDiscTemplateId: 'custom',
      customDiscTemplate: buildCustomDiscTemplate(template, { safeDiameterMm: 100 }) })}>Restore saved dimensions</button>
    <button onClick={() => setBadgeEnabled(value => !value)}>Toggle badge guardrail</button>
    <output data-testid="committed">{JSON.stringify({ selected: model.selectedDiscTemplate,
      custom: model.customDiscTemplate, guideOverlay: model.guideOverlay, exportSize: model.discExportPreviewFallbackSize, clamps, status })}</output>
  </main>
}
createRoot(document.getElementById('root')!).render(<Harness />)
