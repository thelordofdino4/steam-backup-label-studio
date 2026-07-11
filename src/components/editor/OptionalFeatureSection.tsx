import type { ReactNode, Ref } from 'react'
import { useId } from 'react'
import { getOptionalFeatureSectionModel } from './optionalFeatureSectionModel'

export type OptionalFeatureSectionProps = {
  actions?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
  enabled: boolean
  enableControlRef?: Ref<HTMLInputElement>
  enableLabel: ReactNode
  onEnabledChange: (enabled: boolean) => void
  status?: ReactNode
}

export function OptionalFeatureSection({
  actions,
  children,
  className,
  contentClassName,
  enabled,
  enableControlRef,
  enableLabel,
  onEnabledChange,
  status,
}: OptionalFeatureSectionProps) {
  const contentId = useId()
  const model = getOptionalFeatureSectionModel({
    enabled,
    hasActions: actions !== undefined && actions !== null,
    hasChildren: children !== undefined && children !== null,
    hasStatus: status !== undefined && status !== null,
  })

  return (
    <div className={className}>
      <label className="field-label">
        <input
          ref={enableControlRef}
          type="checkbox"
          checked={enabled}
          aria-controls={model.contentVisible ? contentId : undefined}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        {enableLabel}
      </label>

      {model.contentVisible ? (
        <div id={contentId} className={contentClassName}>
          {model.statusSlotVisible ? status : null}
          {children}
          {model.actionSlotVisible ? actions : null}
        </div>
      ) : null}
    </div>
  )
}
