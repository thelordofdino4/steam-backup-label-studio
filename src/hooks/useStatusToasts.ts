import { useCallback, useRef, useState } from 'react'
import { STATUS_TOAST_ICON_URLS } from '../assets/assetManifest'

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
    iconUrl: STATUS_TOAST_ICON_URLS.info,
  },
  success: {
    actionLabel: 'Done',
    iconUrl: STATUS_TOAST_ICON_URLS.success,
  },
  warning: {
    actionLabel: 'Warning',
    iconUrl: STATUS_TOAST_ICON_URLS.warning,
  },
  error: {
    actionLabel: 'Error',
    iconUrl: STATUS_TOAST_ICON_URLS.error,
  },
  steam: {
    actionLabel: 'Steam',
    iconUrl: STATUS_TOAST_ICON_URLS.steam,
  },
  artwork: {
    actionLabel: 'Artwork',
    iconUrl: STATUS_TOAST_ICON_URLS.artwork,
  },
  template: {
    actionLabel: 'Template',
    iconUrl: STATUS_TOAST_ICON_URLS.template,
  },
  export: {
    actionLabel: 'Export',
    iconUrl: STATUS_TOAST_ICON_URLS.export,
  },
  project: {
    actionLabel: 'Project',
    iconUrl: STATUS_TOAST_ICON_URLS.project,
  },
  logo: {
    actionLabel: 'Logo',
    iconUrl: STATUS_TOAST_ICON_URLS.logo,
  },
  text: {
    actionLabel: 'Text',
    iconUrl: STATUS_TOAST_ICON_URLS.text,
  },
}

export type StatusAnnouncementOptions = Readonly<{
  kind?: StatusToastKind
  deduplicationKey?: string
}>

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
  const activeDeduplicationKeysRef = useRef(new Map<string, string>())

  const announceStatus = useCallback((
    message: string,
    options: StatusAnnouncementOptions = {},
  ): boolean => {
    const deduplicationKey = options.deduplicationKey
    if (
      deduplicationKey &&
      activeDeduplicationKeysRef.current.has(deduplicationKey)
    ) {
      return false
    }

    const kind = options.kind ?? getStatusToastKind(message)
    const display = STATUS_TOAST_DISPLAY[kind]
    const toastId = `status-toast-${nextStatusToastIdRef.current}`
    nextStatusToastIdRef.current += 1
    if (deduplicationKey) {
      activeDeduplicationKeysRef.current.set(deduplicationKey, toastId)
    }

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
      if (
        deduplicationKey &&
        activeDeduplicationKeysRef.current.get(deduplicationKey) === toastId
      ) {
        activeDeduplicationKeysRef.current.delete(deduplicationKey)
      }
      setStatusToasts((currentToasts) =>
        currentToasts.filter((currentToast) => currentToast.id !== toastId),
      )
    }, 3600)
    return true
  }, [])

  return {
    projectStatus,
    statusToasts,
    announceStatus,
  }
}
