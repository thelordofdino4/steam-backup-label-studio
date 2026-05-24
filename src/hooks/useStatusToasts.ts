import { useRef, useState } from 'react'

export type StatusToastKind = 'info' | 'success' | 'warning' | 'error' | 'steam' | 'artwork' | 'template' | 'export'

export type StatusToast = {
  id: string
  message: string
  kind: StatusToastKind
  icon: string
}

function getStatusToastKind(message: string): StatusToastKind {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('failed') || normalizedMessage.includes('could not')) {
    return 'error'
  }

  if (normalizedMessage.includes('cancelled')) {
    return 'warning'
  }

  if (normalizedMessage.includes('export')) {
    return 'export'
  }

  if (normalizedMessage.includes('steam') || normalizedMessage.includes('app id')) {
    return 'steam'
  }

  if (
    normalizedMessage.includes('background') ||
    normalizedMessage.includes('artwork') ||
    normalizedMessage.includes('image')
  ) {
    return 'artwork'
  }

  if (
    normalizedMessage.includes('template') ||
    normalizedMessage.includes('disc') ||
    normalizedMessage.includes('dimension')
  ) {
    return 'template'
  }

  if (normalizedMessage.includes('saved') || normalizedMessage.includes('loaded')) {
    return 'success'
  }

  return 'info'
}

function getStatusToastIcon(kind: StatusToastKind) {
  switch (kind) {
    case 'success':
      return '?'
    case 'warning':
      return '!'
    case 'error':
      return '×'
    case 'steam':
      return 'S'
    case 'artwork':
      return '?'
    case 'template':
      return '?'
    case 'export':
      return '?'
    default:
      return '•'
  }
}

export function useStatusToasts() {
  const [projectStatus, setProjectStatus] = useState(
    'No project file saved yet.',
  )
  const [statusToasts, setStatusToasts] = useState<StatusToast[]>([])
  const nextStatusToastIdRef = useRef(0)

  function announceStatus(message: string) {
    const kind = getStatusToastKind(message)
    const toastId = `status-toast-${nextStatusToastIdRef.current}`
    nextStatusToastIdRef.current += 1

    const toast: StatusToast = {
      id: toastId,
      message,
      kind,
      icon: getStatusToastIcon(kind),
    }

    setProjectStatus(message)
    setStatusToasts((currentToasts) => [...currentToasts, toast].slice(-5))

    window.setTimeout(() => {
      setStatusToasts((currentToasts) =>
        currentToasts.filter((currentToast) => currentToast.id !== toastId),
      )
    }, 3600)
  }

  return {
    projectStatus,
    statusToasts,
    announceStatus,
  }
}
