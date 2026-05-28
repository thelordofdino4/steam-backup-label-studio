export type PreviewToast = {
  id: string
  message: string
  kind: string
  actionLabel: string
  description: string
  iconUrl: string
}

export type PreviewToastStackProps = {
  statusToasts: PreviewToast[]
}

export function PreviewToastStack({ statusToasts }: PreviewToastStackProps) {
  return (
    <div className="preview-toast-stack" aria-live="polite" aria-atomic="false">
      {statusToasts.map((toast) => (
        <div
          aria-label={`${toast.actionLabel}: ${toast.description}`}
          className={`preview-toast preview-toast-${toast.kind}`}
          key={toast.id}
        >
          <span className="preview-toast-action">{toast.actionLabel}</span>
          <img
            alt=""
            aria-hidden="true"
            className="preview-toast-icon"
            src={toast.iconUrl}
          />
          <span className="preview-toast-description">{toast.description}</span>
        </div>
      ))}
    </div>
  )
}
