import type { DiscDimensionFieldView } from '../../templates/discDimensionEditing'
import type { DiscTemplate } from '../../types/template'
import type { SelectedDiscTemplateId } from '../../project/projectTypes'
import type { CustomDiscDimensionKey } from '../../templates/discTemplateStateModel'
import { EditorPanel } from '../editor/EditorPanel'
import {
  useRegisteredWorkflowNavigationControl,
} from '../editor/applicationWorkflowNavigation'

type TemplatePanelProps = {
  selectedDiscTemplateId: SelectedDiscTemplateId
  selectedDiscTemplate: DiscTemplate
  isCustomDiscTemplate: boolean
  customDimensionFields: readonly DiscDimensionFieldView[]
  discTemplateOptions: DiscTemplate[]
  handleTemplateChange: (templateId: SelectedDiscTemplateId) => void
  handleCustomDimensionChange: (dimensionKey: CustomDiscDimensionKey, rawValue: string) => void
}

export function TemplatePanel({
  selectedDiscTemplateId,
  selectedDiscTemplate,
  isCustomDiscTemplate,
  customDimensionFields,
  discTemplateOptions,
  handleTemplateChange,
  handleCustomDimensionChange,
}: TemplatePanelProps) {
  const { detailsRef, controlRef } =
    useRegisteredWorkflowNavigationControl<HTMLSelectElement>({
      workflowId: 'workflow.disc-template',
      ownerId: 'owner.disc-template',
      controlId: 'control.disc-template.selector',
    })

  return (
    <EditorPanel detailsRef={detailsRef} title="Template">
        <label className="field-label" htmlFor="disc-template">
          Disc type
        </label>
        <select
          ref={controlRef}
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
            {customDimensionFields.map(field => (
              <div className="custom-dimension-row" key={field.key}>
                <label htmlFor={field.inputId}>{field.label}</label>
                <input
                  id={field.inputId}
                  type="text"
                  inputMode="decimal"
                  value={field.value}
                  aria-invalid={field.messages.length > 0 || undefined}
                  aria-describedby={field.messages.length ? field.errorId : undefined}
                  onChange={event => handleCustomDimensionChange(field.key, event.target.value)}
                />
                <span className="custom-dimension-unit">mm</span>
                <span id={field.errorId} className="hint custom-dimension-error" aria-live="polite">
                  {field.messages.join(' ')}
                </span>
              </div>
            ))}
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
