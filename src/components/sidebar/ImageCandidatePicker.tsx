import { useId, useMemo, useState, type CSSProperties } from 'react'

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

export type ImageCandidatePickerProps = {
  buttonLabel: string
  title: string
  items: ImageCandidatePickerItem[]
  disabled?: boolean
  selectLabel?: string
  onSelect: (itemId: string) => void | Promise<void>
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
  closePicker,
  handleSelect,
}: {
  titleId: string
  title: string
  items: ImageCandidatePickerItem[]
  selectLabel: string
  selectingItemId: string | null
  closePicker: () => void
  handleSelect: (itemId: string) => void
}) {
  return (
    <div
      className="image-candidate-picker-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePicker()
      }}
    >
      <section
        className="image-candidate-picker-dialog"
        aria-labelledby={titleId}
        aria-modal="true"
        role="dialog"
        onKeyDown={(event) => {
          if (event.key === 'Escape') closePicker()
        }}
      >
        <div className="image-candidate-picker-header">
          <h2 id={titleId}>{title}</h2>
          <button
            className="secondary-button image-candidate-picker-close"
            type="button"
            disabled={Boolean(selectingItemId)}
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

  const closePicker = () => {
    if (!selectingItemId) {
      setIsOpen(false)
    }
  }

  const handleSelect = async (itemId: string) => {
    setSelectingItemId(itemId)

    try {
      await onSelect(itemId)
      setIsOpen(false)
    } finally {
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
        onClick={() => setIsOpen(true)}
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
          closePicker={closePicker}
          handleSelect={(itemId) => void handleSelect(itemId)}
        />
      ) : null}
    </>
  )
}

export function ImageCandidatePicker({
  buttonLabel,
  title,
  items,
  disabled = false,
  selectLabel = 'Use image',
  onSelect,
}: ImageCandidatePickerProps) {
  const titleId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [selectingItemId, setSelectingItemId] = useState<string | null>(null)

  const closePicker = () => {
    if (!selectingItemId) {
      setIsOpen(false)
    }
  }

  const handleSelect = async (itemId: string) => {
    setSelectingItemId(itemId)

    try {
      await onSelect(itemId)
      setIsOpen(false)
    } finally {
      setSelectingItemId(null)
    }
  }

  return (
    <>
      <button
        className="secondary-button"
        type="button"
        disabled={disabled || items.length === 0}
        onClick={() => setIsOpen(true)}
      >
        {buttonLabel}
      </button>

      {isOpen ? (
        <ImageCandidatePickerDialog
          titleId={titleId}
          title={title}
          items={items}
          selectLabel={selectLabel}
          selectingItemId={selectingItemId}
          closePicker={closePicker}
          handleSelect={(itemId) => void handleSelect(itemId)}
        />
      ) : null}
    </>
  )
}
