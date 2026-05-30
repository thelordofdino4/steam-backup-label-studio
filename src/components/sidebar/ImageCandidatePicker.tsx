import { useId, useState } from 'react'

export type ImageCandidatePickerItem = {
  id: string
  title: string
  subtitle: string
  details?: string[]
  imageUrl?: string | null
  placeholderLabel?: string
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
                    onClick={() => void handleSelect(item.id)}
                  >
                    <span className="image-candidate-picker-preview">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" loading="lazy" draggable={false} />
                      ) : (
                        <span>{item.placeholderLabel ?? 'Image'}</span>
                      )}
                    </span>
                    <span className="image-candidate-picker-copy">
                      <strong>
                        {item.title}
                        {item.isSelected ? ' · selected' : ''}
                      </strong>
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
      ) : null}
    </>
  )
}
