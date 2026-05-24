export type PreviewToast = {
  id: string
  message: string
  kind: string
  icon: string
}

export type PreviewToastStackProps = {
  statusToasts: PreviewToast[]
}

export function PreviewToastStack({ statusToasts }: PreviewToastStackProps) {
  return (
    <div className="preview-toast-stack" aria-live="polite" aria-atomic="false">
      {statusToasts.map((toast) => (
        <div className={`preview-toast preview-toast-${toast.kind}`} key={toast.id}>
          <span className="preview-toast-message">{toast.message}</span>
          <span className="preview-toast-icon" aria-hidden="true">
            {toast.icon}
          </span>
        </div>
      ))}
    </div>
  )
}
