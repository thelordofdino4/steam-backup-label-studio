import type { ApplicationCommandCapability, CommandBusyScope } from '../lifecycle/applicationCommandTypes.ts'

export function applicationHelpCapability(modalActive: boolean, scopes: readonly CommandBusyScope[]): ApplicationCommandCapability {
  return modalActive || scopes.some(scope => scope.startsWith('dialog.'))
    ? Object.freeze({ canExecute: false, reasonCode: 'application-help.modal-active' })
    : Object.freeze({ canExecute: true })
}
