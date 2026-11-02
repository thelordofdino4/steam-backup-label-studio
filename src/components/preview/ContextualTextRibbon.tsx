import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT,
  getContextualTextRibbonActiveWidth,
  getContextualTextRibbonLayoutMode,
  getContextualTextRibbonReservedHeight,
  type ContextualTextRibbonMode,
} from './contextualTextRibbonModel'

import { bindContextualTextRibbonInteractionLock } from './contextualTextRibbonInteractionLock'
import {
  applyColumnPackedGroupWidths,
  getFixedWidthProfile,
  getRibbonWidthProfile,
} from './contextualTextRibbonDomLayout'

export type ContextualTextRibbonHostProps = {
  active?: boolean
  children?: ReactNode
  label?: string
}

export function ContextualTextRibbonHost({
  active = false,
  children,
  label = 'Contextual text controls',
}: ContextualTextRibbonHostProps) {
  const isVisible = active && Boolean(children)
  const hostRef = useRef<HTMLElement | null>(null)
  const [mode, setMode] = useState<ContextualTextRibbonMode>('wide')
  const reservedHeight = getContextualTextRibbonReservedHeight(mode)

  useLayoutEffect(() => {
    const host = hostRef.current

    if (!host) return undefined

    const previewArea = host.closest<HTMLElement>('.preview-area')
    const header = host.closest<HTMLElement>('.preview-header')
    const label = header?.querySelector<HTMLElement>('.preview-pane-label')
    let animationFrame: number | null = null

    const applyMeasuredMode = () => {
      animationFrame = null
      if (interactionLock.isFrozen()) return
      const headerRect = header?.getBoundingClientRect()
      const labelRect = label?.getBoundingClientRect()
      const availableWidth = Math.max(
        0,
        headerRect
          ? headerRect.right - (labelRect?.right ?? headerRect.left)
          : host.getBoundingClientRect().width,
      )
      const controlRow = host.querySelector<HTMLElement>(
        '.contextual-text-ribbon-control-row',
      )
      const measuredMode = getContextualTextRibbonLayoutMode(
        availableWidth,
      )
      const nextMode = measuredMode
      const nextReservedHeight =
        getContextualTextRibbonReservedHeight(nextMode)
      const widthProfile = isVisible
        ? getRibbonWidthProfile(host)
        : getFixedWidthProfile(availableWidth)
      const nextActiveWidth = Math.min(
        availableWidth,
        isVisible
          ? getContextualTextRibbonActiveWidth(availableWidth, widthProfile)
          : availableWidth,
      )

      host.style.setProperty(
        '--contextual-text-ribbon-reserved-height',
        `${nextReservedHeight}px`,
      )
      host.style.setProperty(
        '--contextual-text-ribbon-active-width',
        `${Math.ceil(nextActiveWidth)}px`,
      )
      host.style.setProperty(
        '--contextual-text-ribbon-min-width',
        `${Math.ceil(widthProfile.min)}px`,
      )
      host.style.setProperty(
        '--contextual-text-ribbon-preferred-width',
        `${Math.ceil(widthProfile.preferred)}px`,
      )
      host.style.setProperty(
        '--contextual-text-ribbon-max-width',
        `${Math.ceil(widthProfile.max)}px`,
      )
      previewArea?.style.setProperty(
        '--contextual-text-ribbon-reserved-height',
        `${nextReservedHeight}px`,
      )
      applyColumnPackedGroupWidths(controlRow)
      setMode((currentMode) =>
        currentMode === nextMode ? currentMode : nextMode)
    }

    const scheduleMeasuredMode = () => {
      if (animationFrame !== null) return
      animationFrame = window.requestAnimationFrame(applyMeasuredMode)
    }

    const interactionLock = bindContextualTextRibbonInteractionLock(host, scheduleMeasuredMode)

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(scheduleMeasuredMode)
    const mutationObserver =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(records => {
          // Controlled value/text changes are not a new card layout. Structural
          // changes (tab/target/control ownership) still receive a measurement.
          if (records.some(record => [...record.addedNodes, ...record.removedNodes]
            .some(node => node instanceof HTMLElement))) scheduleMeasuredMode()
        })

    applyMeasuredMode()
    if (header) resizeObserver?.observe(header)
    if (label) resizeObserver?.observe(label)
    resizeObserver?.observe(host)
    mutationObserver?.observe(host, {
      childList: true,
      subtree: true,
    })

    return () => {
      interactionLock.dispose()
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
      previewArea?.style.removeProperty(
        '--contextual-text-ribbon-reserved-height',
      )

      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame)
      }
    }
  }, [isVisible, mode])

  return (
    <section
      ref={hostRef}
      aria-hidden={!isVisible}
      aria-label={label}
      className={[
        'contextual-text-ribbon-host',
        active ? 'is-active' : '',
        isVisible ? 'has-controls' : '',
      ].filter(Boolean).join(' ')}
      data-contextual-text-ribbon-active={active}
      data-contextual-text-ribbon-mode={mode}
      data-contextual-text-ribbon-visible={isVisible}
      data-smoke-id="contextual-text-ribbon-host"
      style={{
        '--contextual-text-ribbon-reserved-height':
          `${reservedHeight || CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT}px`,
      } as CSSProperties}
    >
      <div className="contextual-text-ribbon-shell">
        {children}
      </div>
    </section>
  )
}
