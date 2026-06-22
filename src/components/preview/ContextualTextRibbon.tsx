import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT,
  getContextualTextRibbonLayoutMode,
  getContextualTextRibbonReservedHeight,
  type ContextualTextRibbonMode,
} from './contextualTextRibbonModel'

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
    let animationFrame: number | null = null

    const applyMeasuredMode = () => {
      animationFrame = null
      const nextMode = getContextualTextRibbonLayoutMode(
        host.getBoundingClientRect().width,
      )
      const nextReservedHeight =
        getContextualTextRibbonReservedHeight(nextMode)

      host.style.setProperty(
        '--contextual-text-ribbon-reserved-height',
        `${nextReservedHeight}px`,
      )
      previewArea?.style.setProperty(
        '--contextual-text-ribbon-reserved-height',
        `${nextReservedHeight}px`,
      )
      setMode((currentMode) =>
        currentMode === nextMode ? currentMode : nextMode)
    }

    const scheduleMeasuredMode = () => {
      if (animationFrame !== null) return
      animationFrame = window.requestAnimationFrame(applyMeasuredMode)
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(scheduleMeasuredMode)

    applyMeasuredMode()
    resizeObserver?.observe(host)

    return () => {
      resizeObserver?.disconnect()
      previewArea?.style.removeProperty(
        '--contextual-text-ribbon-reserved-height',
      )

      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame)
      }
    }
  }, [])

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
