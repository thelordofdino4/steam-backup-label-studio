import type {
  ApplicationCommandId,
  ApplicationCommandOperationToken,
  ApplicationCommandResult,
} from './applicationCommandTypes.ts'
import type {
  ApplicationLifecycleStateCommitResult,
  ApplicationLifecycleStateSnapshot,
  ApplicationLifecycleStateTransition,
} from './applicationLifecycleStateStore.ts'
import type {
  ApplicationCommandOwnerAvailability,
} from './lifecycleCommandCapabilities.ts'

export type ApplicationCommandContext = Readonly<{
  commandId: ApplicationCommandId
  stateSnapshot: ApplicationLifecycleStateSnapshot
  getCurrentStateSnapshot: () => ApplicationLifecycleStateSnapshot
  commitState: (
    expectedGeneration: number,
    transition: ApplicationLifecycleStateTransition,
  ) => ApplicationLifecycleStateCommitResult
  createSessionId: () => string
}>

export type ApplicationLifecycleCommandContext = ApplicationCommandContext

type InactiveCommandOwner = Readonly<{
  availability: 'unavailable' | 'unimplemented'
}>

export type NewDiscCommandInput = undefined
export type NewCaseCommandInput = undefined
export type OpenProjectCommandInput = undefined
export type SaveProjectCommandInput = undefined
export type SaveProjectAsCommandInput = undefined
export type ReturnHomeCommandInput = undefined
export type ResumeProjectCommandInput = undefined
export type CloseProjectCommandInput = undefined
export type CloseWindowCommandInput = undefined
export type QuitApplicationCommandInput = undefined

export type NewDiscCommandResult = ApplicationCommandResult<void>
export type NewCaseCommandResult = ApplicationCommandResult<void>
export type OpenProjectCommandResult = ApplicationCommandResult<void>
export type SaveProjectCommandResult = ApplicationCommandResult<void>
export type SaveProjectAsCommandResult = ApplicationCommandResult<void>
export type ReturnHomeCommandResult = ApplicationCommandResult<void>
export type ResumeProjectCommandResult = ApplicationCommandResult<void>
export type CloseProjectCommandResult = ApplicationCommandResult<void>
export type CloseWindowCommandResult = ApplicationCommandResult<void>
export type QuitApplicationCommandResult = ApplicationCommandResult<void>

export type NewDiscCommandOwner = InactiveCommandOwner | Readonly<{
  availability: 'implemented'
  executeNewDisc(
    context: ApplicationLifecycleCommandContext,
    input: NewDiscCommandInput,
    operation: ApplicationCommandOperationToken,
  ): Promise<NewDiscCommandResult> | NewDiscCommandResult
}>

export type NewCaseCommandOwner = InactiveCommandOwner | Readonly<{
  availability: 'implemented'
  executeNewCase(
    context: ApplicationLifecycleCommandContext,
    input: NewCaseCommandInput,
    operation: ApplicationCommandOperationToken,
  ): Promise<NewCaseCommandResult> | NewCaseCommandResult
}>

export type OpenProjectCommandOwner = InactiveCommandOwner | Readonly<{
  availability: 'implemented'
  executeOpenProject(
    context: ApplicationLifecycleCommandContext,
    input: OpenProjectCommandInput,
    operation: ApplicationCommandOperationToken,
  ): Promise<OpenProjectCommandResult> | OpenProjectCommandResult
}>

export type SaveProjectCommandOwner = InactiveCommandOwner | Readonly<{
  availability: 'implemented'
  executeSaveProject(
    context: ApplicationLifecycleCommandContext,
    input: SaveProjectCommandInput,
    operation: ApplicationCommandOperationToken,
  ): Promise<SaveProjectCommandResult> | SaveProjectCommandResult
}>

export type SaveProjectAsCommandOwner = InactiveCommandOwner | Readonly<{
  availability: 'implemented'
  executeSaveProjectAs(
    context: ApplicationLifecycleCommandContext,
    input: SaveProjectAsCommandInput,
    operation: ApplicationCommandOperationToken,
  ): Promise<SaveProjectAsCommandResult> | SaveProjectAsCommandResult
}>

export type ReturnHomeCommandOwner = InactiveCommandOwner | Readonly<{
  availability: 'implemented'
  executeReturnHome(
    context: ApplicationLifecycleCommandContext,
    input: ReturnHomeCommandInput,
    operation: ApplicationCommandOperationToken,
  ): Promise<ReturnHomeCommandResult> | ReturnHomeCommandResult
}>

export type ResumeProjectCommandOwner = InactiveCommandOwner | Readonly<{
  availability: 'implemented'
  executeResumeProject(
    context: ApplicationLifecycleCommandContext,
    input: ResumeProjectCommandInput,
    operation: ApplicationCommandOperationToken,
  ): Promise<ResumeProjectCommandResult> | ResumeProjectCommandResult
}>

export type CloseProjectCommandOwner = InactiveCommandOwner | Readonly<{
  availability: 'implemented'
  executeCloseProject(
    context: ApplicationLifecycleCommandContext,
    input: CloseProjectCommandInput,
    operation: ApplicationCommandOperationToken,
  ): Promise<CloseProjectCommandResult> | CloseProjectCommandResult
}>

export type CloseWindowCommandOwner = InactiveCommandOwner | Readonly<{
  availability: 'implemented'
  executeCloseWindow(
    context: ApplicationLifecycleCommandContext,
    input: CloseWindowCommandInput,
    operation: ApplicationCommandOperationToken,
  ): Promise<CloseWindowCommandResult> | CloseWindowCommandResult
}>

export type QuitApplicationCommandOwner = InactiveCommandOwner | Readonly<{
  availability: 'implemented'
  executeQuitApplication(
    context: ApplicationLifecycleCommandContext,
    input: QuitApplicationCommandInput,
    operation: ApplicationCommandOperationToken,
  ): Promise<QuitApplicationCommandResult> | QuitApplicationCommandResult
}>

export type ApplicationLifecycleCommandPorts = Readonly<{
  newDisc?: NewDiscCommandOwner
  newCase?: NewCaseCommandOwner
  openProject?: OpenProjectCommandOwner
  saveProject?: SaveProjectCommandOwner
  saveProjectAs?: SaveProjectAsCommandOwner
  returnHome?: ReturnHomeCommandOwner
  resumeProject?: ResumeProjectCommandOwner
  closeProject?: CloseProjectCommandOwner
  closeWindow?: CloseWindowCommandOwner
  quitApplication?: QuitApplicationCommandOwner
}>

function availability(
  owner: InactiveCommandOwner | Readonly<{ availability: 'implemented' }> |
    undefined,
) {
  return owner?.availability ?? 'unimplemented'
}

export function getApplicationLifecycleCommandOwnerAvailability(
  ports: ApplicationLifecycleCommandPorts,
): ApplicationCommandOwnerAvailability {
  return Object.freeze({
    'project.new-disc': availability(ports.newDisc),
    'project.new-case': availability(ports.newCase),
    'project.open': availability(ports.openProject),
    'project.save': availability(ports.saveProject),
    'project.save-as': availability(ports.saveProjectAs),
    'workspace.return-home': availability(ports.returnHome),
    'project.resume': availability(ports.resumeProject),
    'project.close': availability(ports.closeProject),
    'application.close-window': availability(ports.closeWindow),
    'application.quit': availability(ports.quitApplication),
  })
}
