import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  captureImageCandidatePickerFocusPath,
  focusImageCandidatePickerTarget,
  getImageCandidatePickerInitialFocusTarget,
  getImageCandidatePickerTabTarget,
  isImageCandidatePickerFocusTargetUsable,
  restoreImageCandidatePickerFocus,
} from './imageCandidatePickerFocus'

export type ImageCandidatePickerItem = {
  id: string
  title: string
  subtitle: string
  details?: string[]
  imageUrl?: string | null
  imageFit?: 'cover' | 'contain'
  placeholderLabel?: string
  qualityLabel?: string
  qualityTone?: 'good' | 'neutral' | 'warning'
  isSelected?: boolean
}

export type ImageCandidatePreviewPickerProps = {
  ariaLabel: string
  title: string
  items: ImageCandidatePickerItem[]
  disabled?: boolean
  selectLabel?: string
  onSelect: (itemId: string) => void | Promise<void>
}

function getImageFitClass(item: ImageCandidatePickerItem) {
  return item.imageFit === 'contain'
    ? 'image-candidate-image-contain'
    : 'image-candidate-image-cover'
}

function getLoopingPreviewItems(items: ImageCandidatePickerItem[]) {
  if (items.length === 0) return []

  const previewItems = [...items]

  while (previewItems.length < 4) {
    previewItems.push(items[previewItems.length % items.length])
  }

  while (previewItems.length % 4 !== 0) {
    previewItems.push(items[previewItems.length % items.length])
  }

  return items.length > 4 ? [...previewItems, ...previewItems] : previewItems
}

function ImageCandidatePickerDialog({
  titleId,
  title,
  items,
  selectLabel,
  selectingItemId,
  restorationPath,
  closePicker,
  handleSelect,
}: {
  titleId: string
  title: string
  items: ImageCandidatePickerItem[]
  selectLabel: string
  selectingItemId: string | null
  restorationPath: readonly HTMLElement[]
  closePicker: () => void
  handleSelect: (itemId: string) => void
}) {
  const dialogRef = useRef<HTMLElement | null>(null)
  const previousSelectingItemIdRef = useRef<string | null>(selectingItemId)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    focusImageCandidatePickerTarget(
      getImageCandidatePickerInitialFocusTarget(dialog),
    )

    function handleDocumentKeyDown(event: KeyboardEvent) {
      const currentDialog = dialogRef.current
      if (!currentDialog) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closePicker()
        return
      }
      if (event.key !== 'Tab') return

      event.preventDefault()
      focusImageCandidatePickerTarget(getImageCandidatePickerTabTarget(
        currentDialog,
        currentDialog.ownerDocument.activeElement,
        event.shiftKey,
      ))
    }

    function containDocumentFocus(event: FocusEvent) {
      const currentDialog = dialogRef.current
      if (
        !currentDialog ||
        (event.target instanceof Node && currentDialog.contains(event.target))
      ) {
        return
      }
      focusImageCandidatePickerTarget(
        getImageCandidatePickerInitialFocusTarget(currentDialog),
      )
    }

    document.addEventListener('keydown', handleDocumentKeyDown, true)
    document.addEventListener('focusin', containDocumentFocus, true)
    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown, true)
      document.removeEventListener('focusin', containDocumentFocus, true)
      queueMicrotask(() => restoreImageCandidatePickerFocus(restorationPath))
    }
  }, [closePicker, restorationPath])

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previousSelectingItemId = previousSelectingItemIdRef.current
    previousSelectingItemIdRef.current = selectingItemId
    const activeElement = dialog.ownerDocument.activeElement
    if (
      selectingItemId &&
      (!(activeElement instanceof HTMLElement) ||
        !dialog.contains(activeElement) ||
        !isImageCandidatePickerFocusTargetUsable(activeElement))
    ) {
      focusImageCandidatePickerTarget(dialog)
      return
    }

    if (!selectingItemId && previousSelectingItemId) {
      const previousCandidate = [
        ...dialog.querySelectorAll<HTMLElement>(
          '[data-image-candidate-item-id]',
        ),
      ].find((candidate) =>
        candidate.getAttribute('data-image-candidate-item-id') ===
          previousSelectingItemId &&
        isImageCandidatePickerFocusTargetUsable(candidate))
      if (previousCandidate) {
        focusImageCandidatePickerTarget(previousCandidate)
        return
      }
    }

    if (
      !selectingItemId &&
      (!(activeElement instanceof HTMLElement) ||
        !dialog.contains(activeElement) ||
        activeElement === dialog)
    ) {
      focusImageCandidatePickerTarget(
        getImageCandidatePickerInitialFocusTarget(dialog),
      )
    }
  }, [selectingItemId])

  return (
    <div
      className="image-candidate-picker-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePicker()
      }}
    >
      <section
        ref={dialogRef}
        className="image-candidate-picker-dialog"
        aria-labelledby={titleId}
        aria-modal="true"
        aria-busy={Boolean(selectingItemId)}
        role="dialog"
        tabIndex={-1}
        data-smoke-id="image-candidate-picker-dialog"
      >
        <div className="image-candidate-picker-header">
          <h2 id={titleId}>{title}</h2>
          <button
            className="secondary-button image-candidate-picker-close"
            type="button"
            disabled={Boolean(selectingItemId)}
            data-image-candidate-close="true"
            data-smoke-id="image-candidate-picker-close"
            onClick={closePicker}
          >
            Close
          </button>
        </div>

        <div className="image-candidate-picker-grid">
          {items.map((item) => {
            const isSelecting = selectingItemId === item.id

            return (
              <button
                className="image-candidate-picker-item"
                key={item.id}
                type="button"
                disabled={Boolean(selectingItemId)}
                data-image-candidate-item="true"
                data-image-candidate-selected={item.isSelected ? 'true' : 'false'}
                data-image-candidate-item-id={item.id}
                onClick={() => handleSelect(item.id)}
              >
                <span className="image-candidate-picker-preview">
                  {item.imageUrl ? (
                    <img
                      className={getImageFitClass(item)}
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <span>{item.placeholderLabel ?? 'Image'}</span>
                  )}
                </span>
                <span className="image-candidate-picker-copy">
                  <strong>
                    {item.title}
                    {item.isSelected ? ' · selected' : ''}
                  </strong>
                  {item.qualityLabel ? (
                    <span
                      className={`image-candidate-picker-quality image-candidate-picker-quality-${item.qualityTone ?? 'neutral'}`}
                    >
                      {item.qualityLabel}
                    </span>
                  ) : null}
                  <span>{item.subtitle}</span>
                  {item.details?.map((detail) => (
                    <span key={detail}>{detail}</span>
                  ))}
                  <span className="image-candidate-picker-action">
                    {isSelecting ? 'Applying...' : selectLabel}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export function ImageCandidatePreviewPicker({
  ariaLabel,
  title,
  items,
  disabled = false,
  selectLabel = 'Use image',
  onSelect,
}: ImageCandidatePreviewPickerProps) {
  const titleId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [selectingItemId, setSelectingItemId] = useState<string | null>(null)
  const isOpenRef = useRef(false)
  const selectingItemIdRef = useRef<string | null>(null)
  const [restorationPath, setRestorationPath] =
    useState<readonly HTMLElement[]>([])
  const loopingPreviewItems = useMemo(
    () => getLoopingPreviewItems(items),
    [items],
  )
  const previewPageCount = Math.max(1, loopingPreviewItems.length / 8)
  const previewStyle = useMemo(
    () => ({
      '--image-candidate-preview-duration': `${previewPageCount * 7}s`,
      '--image-candidate-preview-translate': `${previewPageCount * -100}%`,
    }) as CSSProperties,
    [previewPageCount],
  )
  const canAnimatePreview = items.length > 4

  const closePicker = useCallback(() => {
    if (!isOpenRef.current || selectingItemIdRef.current) return
    isOpenRef.current = false
    setIsOpen(false)
  }, [])

  const openPicker = useCallback((opener: HTMLButtonElement) => {
    setRestorationPath(captureImageCandidatePickerFocusPath(opener))
    isOpenRef.current = true
    setIsOpen(true)
  }, [])

  const handleSelect = async (itemId: string) => {
    if (selectingItemIdRef.current) return
    selectingItemIdRef.current = itemId
    setSelectingItemId(itemId)

    try {
      await onSelect(itemId)
      isOpenRef.current = false
      setIsOpen(false)
    } finally {
      selectingItemIdRef.current = null
      setSelectingItemId(null)
    }
  }

  if (items.length === 0) return null

  return (
    <>
      <button
        className={`image-candidate-preview-picker${canAnimatePreview ? ' is-animated' : ''}`}
        type="button"
        disabled={disabled || Boolean(selectingItemId)}
        aria-label={`${ariaLabel}. Open picker with ${items.length} image candidate${items.length === 1 ? '' : 's'}.`}
        aria-busy={Boolean(selectingItemId)}
        data-smoke-id="image-candidate-picker-opener"
        onClick={(event) => openPicker(event.currentTarget)}
      >
        <span
          className="image-candidate-preview-picker-track"
          style={previewStyle}
          aria-hidden="true"
        >
          {loopingPreviewItems.map((item, index) => (
            <span
              className={`image-candidate-preview-picker-tile${item.isSelected ? ' is-selected' : ''}`}
              key={`${item.id}-${index}`}
              title={item.title}
            >
              {item.imageUrl ? (
                <img
                  className={getImageFitClass(item)}
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <span>{item.placeholderLabel ?? 'Image'}</span>
              )}
            </span>
          ))}
        </span>
        <span className="image-candidate-preview-picker-status" aria-hidden="true">
          {items.length} option{items.length === 1 ? '' : 's'}
        </span>
      </button>

      {isOpen ? (
        <ImageCandidatePickerDialog
          titleId={titleId}
          title={title}
          items={items}
          selectLabel={selectLabel}
          selectingItemId={selectingItemId}
          restorationPath={restorationPath}
          closePicker={closePicker}
          handleSelect={(itemId) => void handleSelect(itemId)}
        />
      ) : null}
    </>
  )
}
