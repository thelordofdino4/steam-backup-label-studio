import {
  commandFailed,
  type ApplicationCommandDefinition,
  type ApplicationCommandDispatchResult,
  type ApplicationCommandId,
  type ApplicationCommandResult,
} from './applicationCommandTypes.ts'
import { CommandBusyScopeCoordinator } from './commandBusyScopes.ts'

type ErasedCommandDefinition<Context> = ApplicationCommandDefinition<
  Context,
  unknown,
  unknown
>

export class ApplicationCommandRegistry<Context> {
  private readonly definitions = new Map<
    ApplicationCommandId,
    ErasedCommandDefinition<Context>
  >()

  register<Input, Value>(
    definition: ApplicationCommandDefinition<Context, Input, Value>,
  ): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Duplicate application command ID: ${definition.id}`)
    }

    this.definitions.set(
      definition.id,
      definition as ErasedCommandDefinition<Context>,
    )
  }

  resolve(commandId: string): ErasedCommandDefinition<Context> | null {
    return this.definitions.get(commandId as ApplicationCommandId) ?? null
  }

  listIds(): readonly ApplicationCommandId[] {
    return Object.freeze([...this.definitions.keys()])
  }
}

type InFlightCommand = Readonly<{
  commandId: ApplicationCommandId
  repeatKey: string
  result: Promise<ApplicationCommandDispatchResult<unknown>>
}>

function unexpectedCommandFailure(
  commandId: ApplicationCommandId,
  error: unknown,
): ApplicationCommandDispatchResult<never> {
  return Object.freeze({
    disposition: 'executed',
    commandId,
    result: commandFailed({
      code: 'application.command-threw',
      userMessage: 'The command could not be completed.',
      diagnosticMessage: error instanceof Error ? error.message : String(error),
      cause: error,
      recoverable: true,
    }),
  })
}

export type ApplicationCommandDispatcherOptions = Readonly<{
  busyScopes?: CommandBusyScopeCoordinator
  createOperationId?: () => string
}>

export class ApplicationCommandDispatcher<Context> {
  private readonly registry: ApplicationCommandRegistry<Context>
  private readonly busyScopes: CommandBusyScopeCoordinator
  private readonly createOperationId: () => string
  private readonly inFlight = new Set<InFlightCommand>()
  private nextOperationNumber = 1

  constructor(
    registry: ApplicationCommandRegistry<Context>,
    options: ApplicationCommandDispatcherOptions = {},
  ) {
    this.registry = registry
    this.busyScopes = options.busyScopes ?? new CommandBusyScopeCoordinator()
    this.createOperationId = options.createOperationId ?? (() => {
      const id = `application-command-${this.nextOperationNumber}`
      this.nextOperationNumber += 1
      return id
    })
  }

  async dispatch<Value = void>(
    commandId: string,
    context: Context,
    input: unknown,
  ): Promise<ApplicationCommandDispatchResult<Value>> {
    const definition = this.registry.resolve(commandId)
    if (!definition) {
      return Object.freeze({
        disposition: 'not-executed',
        reason: 'unknown-command',
        commandId,
      })
    }

    let capability
    try {
      capability = definition.canExecute(context, input)
    } catch (error) {
      return unexpectedCommandFailure(
        definition.id,
        error,
      ) as ApplicationCommandDispatchResult<Value>
    }
    if (!capability.canExecute) {
      return Object.freeze({
        disposition: 'not-executed',
        reason: 'disabled',
        commandId,
        userMessage: capability.userMessage,
      })
    }

    let repeatKey: string
    try {
      repeatKey = definition.getRepeatKey?.(context, input) ?? commandId
    } catch (error) {
      return unexpectedCommandFailure(
        definition.id,
        error,
      ) as ApplicationCommandDispatchResult<Value>
    }
    const identical = [...this.inFlight].find((candidate) =>
      candidate.commandId === definition.id &&
      candidate.repeatKey === repeatKey)

    if (identical && definition.repeatPolicy === 'join-identical') {
      return identical.result as Promise<ApplicationCommandDispatchResult<Value>>
    }

    if (
      [...this.inFlight].some((candidate) => candidate.commandId === definition.id) &&
      definition.repeatPolicy === 'reject-while-busy'
    ) {
      return Object.freeze({
        disposition: 'not-executed',
        reason: 'busy',
        commandId,
      })
    }

    let acquisition
    try {
      acquisition = this.busyScopes.beginOperation({
        operationId: this.createOperationId(),
        commandId: definition.id,
        scopes: definition.acquireScopes(context, input),
      })
    } catch (error) {
      return unexpectedCommandFailure(
        definition.id,
        error,
      ) as ApplicationCommandDispatchResult<Value>
    }

    if (!acquisition.acquired) {
      return Object.freeze({
        disposition: 'not-executed',
        reason: 'busy',
        commandId,
      })
    }

    const result = (async (): Promise<ApplicationCommandDispatchResult<unknown>> => {
      let commandResult: ApplicationCommandResult<unknown>

      try {
        commandResult = await definition.execute(
          context,
          input,
          acquisition.operation,
        )
      } catch (error) {
        commandResult = commandFailed({
          code: 'application.command-threw',
          userMessage: 'The command could not be completed.',
          diagnosticMessage: error instanceof Error ? error.message : String(error),
          cause: error,
          recoverable: true,
        })
      } finally {
        acquisition.release()
      }

      return Object.freeze({
        disposition: 'executed',
        commandId: definition.id,
        result: commandResult,
      })
    })()

    const inFlight: InFlightCommand = Object.freeze({
      commandId: definition.id,
      repeatKey,
      result,
    })
    this.inFlight.add(inFlight)

    try {
      return await result as ApplicationCommandDispatchResult<Value>
    } finally {
      this.inFlight.delete(inFlight)
    }
  }
}
