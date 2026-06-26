import type { DiscTemplate } from '../../types/template'
import type { SelectedDiscTemplateId } from '../../project/projectTypes'
import type { CustomDiscDimensionKey } from '../../templates/discTemplateStateModel'
import { EditorPanel } from '../editor/EditorPanel'

type TemplatePanelProps = {
  selectedDiscTemplateId: SelectedDiscTemplateId
  selectedDiscTemplate: DiscTemplate
  isCustomDiscTemplate: boolean
  customDiscTemplate: DiscTemplate
  discTemplateOptions: DiscTemplate[]
  customOuterDiameterMaxMm: number
  handleTemplateChange: (templateId: SelectedDiscTemplateId) => void
  handleCustomDimensionChange: (dimensionKey: CustomDiscDimensionKey, rawValue: string) => void
}

export function TemplatePanel({
  selectedDiscTemplateId,
  selectedDiscTemplate,
  isCustomDiscTemplate,
  customDiscTemplate,
  discTemplateOptions,
  customOuterDiameterMaxMm,
  handleTemplateChange,
  handleCustomDimensionChange,
}: TemplatePanelProps) {
  return (
    <EditorPanel title="Template">
        <label className="field-label" htmlFor="disc-template">
          Disc type
        </label>
        <select
          id="disc-template"
          value={selectedDiscTemplateId}
          onChange={(event) =>
            handleTemplateChange(event.target.value as SelectedDiscTemplateId)
          }
        >
          {discTemplateOptions.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
          <option value="custom">Custom dimensions</option>
        </select>

        {isCustomDiscTemplate ? (
          <div className="custom-dimension-grid">
            <label className="custom-dimension-row">
              <span>Outer diameter</span>
              <input
                type="number"
                min="1"
                max={customOuterDiameterMaxMm}
                step="0.1"
                value={customDiscTemplate.outerDiameterMm}
                onChange={(event) =>
                  handleCustomDimensionChange('outerDiameterMm', event.target.value)
                }
              />
              <span>mm</span>
            </label>
            <label className="custom-dimension-row">
              <span>Physical center hole</span>
              <input
                type="number"
                min="1"
                max={customDiscTemplate.outerDiameterMm}
                step="0.1"
                value={customDiscTemplate.physicalCenterHoleDiameterMm}
                onChange={(event) =>
                  handleCustomDimensionChange('physicalCenterHoleDiameterMm', event.target.value)
                }
              />
              <span>mm</span>
            </label>
            <label className="custom-dimension-row">
              <span>Inner print boundary</span>
              <input
                type="number"
                min="1"
                max={customDiscTemplate.outerDiameterMm}
                step="0.1"
                value={customDiscTemplate.innerHoleDiameterMm}
                onChange={(event) =>
                  handleCustomDimensionChange('innerHoleDiameterMm', event.target.value)
                }
              />
              <span>mm</span>
            </label>
            <label className="custom-dimension-row">
              <span>Outer print boundary</span>
              <input
                type="number"
                min="1"
                max={customDiscTemplate.outerDiameterMm}
                step="0.1"
                value={customDiscTemplate.printableDiameterMm}
                onChange={(event) =>
                  handleCustomDimensionChange('printableDiameterMm', event.target.value)
                }
              />
              <span>mm</span>
            </label>
            <label className="custom-dimension-row">
              <span>Safe zone</span>
              <input
                type="number"
                min="1"
                max={customDiscTemplate.outerDiameterMm}
                step="0.1"
                value={customDiscTemplate.safeDiameterMm}
                onChange={(event) =>
                  handleCustomDimensionChange('safeDiameterMm', event.target.value)
                }
              />
              <span>mm</span>
            </label>
          </div>
        ) : (
          <dl className="template-metrics">
            <div>
              <dt>Outer diameter</dt>
              <dd>{selectedDiscTemplate.outerDiameterMm} mm</dd>
            </div>
            <div>
              <dt>Physical center hole</dt>
              <dd>{selectedDiscTemplate.physicalCenterHoleDiameterMm} mm</dd>
            </div>
            <div>
              <dt>Inner print boundary</dt>
              <dd>{selectedDiscTemplate.innerHoleDiameterMm} mm</dd>
            </div>
            <div>
              <dt>Outer print boundary</dt>
              <dd>{selectedDiscTemplate.printableDiameterMm} mm</dd>
            </div>
            <div>
              <dt>Safe zone</dt>
              <dd>{selectedDiscTemplate.safeDiameterMm} mm</dd>
            </div>
          </dl>
        )}

        {selectedDiscTemplate.geometryNote && (
          <p className="hint">{selectedDiscTemplate.geometryNote}</p>
        )}
    </EditorPanel>
  )
}
