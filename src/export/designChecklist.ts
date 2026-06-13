export type DesignCheckStatus = 'pass' | 'warning' | 'note'

export type DesignCheckItem = {
  id: string
  label: string
  status: DesignCheckStatus
  detail: string
}

export type DesignCheckSummary = {
  message: string
  hasWarnings: boolean
  warnings: string[]
  notes: string[]
  items: DesignCheckItem[]
}

export function createDesignCheckItem(params: {
  id: string
  label: string
  passes: boolean
  passDetail: string
  warningDetail: string
  warningStatus?: Exclude<DesignCheckStatus, 'pass'>
}): DesignCheckItem {
  return {
    id: params.id,
    label: params.label,
    status: params.passes ? 'pass' : params.warningStatus ?? 'warning',
    detail: params.passes ? params.passDetail : params.warningDetail,
  }
}

export function getDesignCheckItemWarnings(items: readonly DesignCheckItem[]) {
  return items
    .filter((item) => item.status === 'warning')
    .map((item) => item.detail)
}

export function getDesignCheckItemNotes(items: readonly DesignCheckItem[]) {
  return items
    .filter((item) => item.status === 'note')
    .map((item) => item.detail)
}

export function mergeUniqueWarnings(
  ...warningGroups: Array<readonly string[]>
) {
  const warnings: string[] = []
  const seenWarnings = new Set<string>()

  for (const warning of warningGroups.flat()) {
    if (seenWarnings.has(warning)) {
      continue
    }

    seenWarnings.add(warning)
    warnings.push(warning)
  }

  return warnings
}
