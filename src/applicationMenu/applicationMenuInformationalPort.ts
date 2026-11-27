import type { ApplicationCommandCapability } from '../lifecycle/applicationCommandTypes.ts'
import type { ApplicationMenuInformationalOperationId } from './applicationMenuTypes.ts'

// Informational presentation only; it cannot execute a lifecycle/domain command.
export type ApplicationMenuInformationalPort = Readonly<{
  getCapabilities(): Readonly<Record<ApplicationMenuInformationalOperationId, ApplicationCommandCapability>>
  dismissForNavigation?(): void
  invoke(operation: ApplicationMenuInformationalOperationId): boolean
}>
