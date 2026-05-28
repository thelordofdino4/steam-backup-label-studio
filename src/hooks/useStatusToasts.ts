import { useRef, useState } from 'react'
import toastArtworkIconUrl from '../assets/toast-artwork.png'
import toastErrorIconUrl from '../assets/toast-error.png'
import toastExportIconUrl from '../assets/toast-export.png'
import toastInfoIconUrl from '../assets/toast-info.png'
import toastLogoIconUrl from '../assets/toast-logo.png'
import toastProjectIconUrl from '../assets/toast-project.png'
import toastSteamIconUrl from '../assets/toast-steam.png'
import toastSuccessIconUrl from '../assets/toast-success.png'
import toastTemplateIconUrl from '../assets/toast-template.png'
import toastTextIconUrl from '../assets/toast-text.png'
import toastWarningIconUrl from '../assets/toast-warning.png'

export type StatusToastKind =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'steam'
  | 'artwork'
  | 'template'
  | 'export'
  | 'project'
  | 'logo'
  | 'text'

export type StatusToast = {
  id: string
  message: string
  kind: StatusToastKind
  actionLabel: string
  description: string
  iconUrl: string
}

type StatusToastDisplay = {
  actionLabel: string
  iconUrl: string
}

const STATUS_TOAST_DISPLAY: Record<StatusToastKind, StatusToastDisplay> = {
  info: {
    actionLabel: 'Status',
    iconUrl: toastInfoIconUrl,
  },
  success: {
    actionLabel: 'Done',
    iconUrl: toastSuccessIconUrl,
  },
  warning: {
    actionLabel: 'Warning',
    iconUrl: toastWarningIconUrl,
  },
  error: {
    actionLabel: 'Error',
    iconUrl: toastErrorIconUrl,
  },
  steam: {
    actionLabel: 'Steam',
    iconUrl: toastSteamIconUrl,
  },
  artwork: {
    actionLabel: 'Artwork',
    iconUrl: toastArtworkIconUrl,
  },
  template: {
    actionLabel: 'Template',
    iconUrl: toastTemplateIconUrl,
  },
  export: {
    actionLabel: 'Export',
    iconUrl: toastExportIconUrl,
  },
  project: {
    actionLabel: 'Project',
    iconUrl: toastProjectIconUrl,
  },
  logo: {
    actionLabel: 'Logo',
    iconUrl: toastLogoIconUrl,
  },
  text: {
    actionLabel: 'Text',
    iconUrl: toastTextIconUrl,
  },
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

  if (normalizedMessage.includes('logo')) {
    return 'logo'
  }

  if (
    normalizedMessage.includes('text') ||
    normalizedMessage.includes('title') ||
    normalizedMessage.includes('note') ||
    normalizedMessage.includes('copyright')
  ) {
    return 'text'
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
    return 'project'
  }

  return 'info'
}

function getStatusToastDescription(message: string, kind: StatusToastKind) {
  const trimmedMessage = message.trim()

  if (kind === 'export') {
    return trimmedMessage.replace(/^Exported\s+/i, '')
  }

  if (kind === 'project') {
    return trimmedMessage
      .replace(/^Saved project\s+/i, 'saved ')
      .replace(/^Loaded project\s+/i, 'loaded ')
  }

  return trimmedMessage
}

export function useStatusToasts() {
  const [projectStatus, setProjectStatus] = useState(
    'No project file saved yet.',
  )
  const [statusToasts, setStatusToasts] = useState<StatusToast[]>([])
  const nextStatusToastIdRef = useRef(0)

  function announceStatus(message: string) {
    const kind = getStatusToastKind(message)
    const display = STATUS_TOAST_DISPLAY[kind]
    const toastId = `status-toast-${nextStatusToastIdRef.current}`
    nextStatusToastIdRef.current += 1

    const toast: StatusToast = {
      id: toastId,
      message,
      kind,
      actionLabel: display.actionLabel,
      description: getStatusToastDescription(message, kind),
      iconUrl: display.iconUrl,
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
