import type {
  ApplicationCommandId,
  ApplicationCommandOperationToken,
  CommandBusyScope,
} from './applicationCommandTypes.ts'

const BUSY_SCOPE_ORDER: Readonly<Record<CommandBusyScope, number>> = Object.freeze({
  'lifecycle.transition': 10,
  'workspace.navigation': 20,
  'dialog.project-file': 30,
  'dialog.project-replacement': 40,
  'persistence.read': 50,
  'persistence.write': 60,
  'application.termination': 70,
  'export.execution': 80,
  'dialog.export-warning': 90,
  'dialog.export-destination': 100,
  'persistence.export-write': 110,
})

const CHILD_LIFECYCLE_SCOPES = new Set<CommandBusyScope>([
  'dialog.project-file',
  'dialog.project-replacement',
  'persistence.read',
  'persistence.write',
  'application.termination',
])

const CHILD_EXPORT_SCOPES = new Set<CommandBusyScope>([
  'dialog.export-warning',
  'dialog.export-destination',
  'persistence.export-write',
])

export type CommandBusyState = Readonly<{
  occupiedScopes: readonly CommandBusyScope[]
}>

export type CommandBusyStateSubscriber = (state: CommandBusyState) => void

export type BusyScopeAcquisition =
  | Readonly<{
      acquired: false
      conflictingScopes: readonly CommandBusyScope[]
    }>
  | Readonly<{
      acquired: true
      operation: ApplicationCommandOperationToken
      release: () => void
    }>

type NestedBusyScopeAcquisition =
  | Readonly<{
      acquired: false
      conflictingScopes: readonly CommandBusyScope[]
    }>
  | Readonly<{
      acquired: true
      release: () => void
    }>

type OperationRecord = {
  active: boolean
  commandId: ApplicationCommandId
  rootScopes: readonly CommandBusyScope[]
  ownedScopes: Set<CommandBusyScope>
}

function orderScopes(
  scopes: readonly CommandBusyScope[],
): readonly CommandBusyScope[] {
  return Object.freeze(
    [...new Set(scopes)].sort(
      (first, second) => BUSY_SCOPE_ORDER[first] - BUSY_SCOPE_ORDER[second],
    ),
  )
}

export function doBusyScopesConflict(
  first: CommandBusyScope,
  second: CommandBusyScope,
): boolean {
  if (first === second) return true
  if (first === 'application.termination' || second === 'application.termination') {
    return true
  }
  if (first === 'lifecycle.transition' || second === 'lifecycle.transition') {
    return true
  }
  if (first === 'workspace.navigation' || second === 'workspace.navigation') {
    return (
      (first === 'workspace.navigation' && second === 'workspace.navigation') ||
      first === 'export.execution' ||
      second === 'export.execution'
    )
  }
  if (first === 'export.execution' || second === 'export.execution') {
    return first === 'export.execution' && second === 'export.execution'
  }
  return (
    (first === 'persistence.read' && second === 'persistence.write') ||
    (first === 'persistence.write' && second === 'persistence.read')
  )
}

export function hasBusyScopeConflict(
  requestedScopes: readonly CommandBusyScope[],
  state: CommandBusyState,
): boolean {
  return requestedScopes.some((requested) =>
    state.occupiedScopes.some((occupied) =>
      doBusyScopesConflict(requested, occupied)))
}

export class CommandBusyScopeCoordinator {
  private readonly owners = new Map<CommandBusyScope, string>()
  private readonly operations = new Map<string, OperationRecord>()
  private readonly subscribers = new Set<CommandBusyStateSubscriber>()

  getState(): CommandBusyState {
    return Object.freeze({
      occupiedScopes: orderScopes([...this.owners.keys()]),
    })
  }

  subscribe(subscriber: CommandBusyStateSubscriber): () => void {
    this.subscribers.add(subscriber)
    return () => this.subscribers.delete(subscriber)
  }

  disposeSubscriptions(): void {
    this.subscribers.clear()
  }

  beginOperation(input: Readonly<{
    operationId: string
    commandId: ApplicationCommandId
    scopes: readonly CommandBusyScope[]
  }>): BusyScopeAcquisition {
    if (this.operations.has(input.operationId)) {
      throw new Error(`Operation token ${input.operationId} already exists.`)
    }

    const record: OperationRecord = {
      active: true,
      commandId: input.commandId,
      rootScopes: orderScopes(input.scopes),
      ownedScopes: new Set(),
    }
    this.operations.set(input.operationId, record)

    let acquisition: NestedBusyScopeAcquisition
    try {
      acquisition = this.acquireForOperation(input.operationId, input.scopes)
    } catch (error) {
      this.releaseOperation(input.operationId)
      throw error
    }
    if (!acquisition.acquired) {
      this.operations.delete(input.operationId)
      return acquisition
    }

    const operation = this.createToken(input.operationId, record)

    return Object.freeze({
      acquired: true,
      operation,
      release: () => this.releaseOperation(input.operationId),
    })
  }

  private createToken(
    operationId: string,
    record: OperationRecord,
  ): ApplicationCommandOperationToken {
    return Object.freeze({
      id: operationId,
      commandId: record.commandId,
      rootScopes: record.rootScopes,
      ownsScope: (scope: CommandBusyScope) =>
        this.operations.get(operationId)?.ownedScopes.has(scope) ?? false,
      withScopes: async <Value>(
        scopes: readonly CommandBusyScope[],
        operation: () => Promise<Value> | Value,
      ): Promise<Value> => {
        const acquisition = this.acquireForOperation(operationId, scopes)
        if (!acquisition.acquired) {
          throw new CommandBusyConflictError(acquisition.conflictingScopes)
        }

        try {
          return await operation()
        } finally {
          acquisition.release()
        }
      },
    })
  }

  private acquireForOperation(
    operationId: string,
    requestedScopes: readonly CommandBusyScope[],
  ): NestedBusyScopeAcquisition {
    const record = this.operations.get(operationId)
    if (!record?.active) {
      throw new Error(`Operation token ${operationId} is not active.`)
    }

    const scopes = orderScopes(requestedScopes)
    const willOwnLifecycle = record.ownedScopes.has('lifecycle.transition') ||
      scopes.includes('lifecycle.transition')

    if (scopes.some((scope) => CHILD_LIFECYCLE_SCOPES.has(scope)) && !willOwnLifecycle) {
      throw new Error('Lifecycle child scopes require lifecycle.transition ownership.')
    }

    const willOwnExport = record.ownedScopes.has('export.execution') ||
      scopes.includes('export.execution')
    if (scopes.some((scope) => CHILD_EXPORT_SCOPES.has(scope)) && !willOwnExport) {
      throw new Error('Export child scopes require export.execution ownership.')
    }

    const conflictingScopes = orderScopes(scopes.filter((requested) =>
      [...this.owners.entries()].some(([occupied, owner]) =>
        owner !== operationId && doBusyScopesConflict(requested, occupied))))

    if (conflictingScopes.length > 0) {
      return Object.freeze({ acquired: false, conflictingScopes })
    }

    const acquiredScopes = scopes.filter((scope) => !record.ownedScopes.has(scope))
    for (const scope of acquiredScopes) {
      this.owners.set(scope, operationId)
      record.ownedScopes.add(scope)
    }
    if (acquiredScopes.length > 0) this.notifySubscribers()

    let released = false
    return Object.freeze({
      acquired: true,
      release: () => {
        if (released) return
        released = true
        for (const scope of acquiredScopes) {
          if (this.owners.get(scope) === operationId) this.owners.delete(scope)
          record.ownedScopes.delete(scope)
        }
        if (acquiredScopes.length > 0) this.notifySubscribers()
      },
    })
  }

  private releaseOperation(operationId: string) {
    const record = this.operations.get(operationId)
    if (!record) return

    record.active = false
    for (const scope of record.ownedScopes) {
      if (this.owners.get(scope) === operationId) this.owners.delete(scope)
    }
    const hadOwnedScopes = record.ownedScopes.size > 0
    record.ownedScopes.clear()
    this.operations.delete(operationId)
    if (hadOwnedScopes) this.notifySubscribers()
  }

  private notifySubscribers() {
    const state = this.getState()
    for (const subscriber of [...this.subscribers]) {
      try {
        subscriber(state)
      } catch {
        // Busy state is already committed; one observer cannot block another.
      }
    }
  }
}

export class CommandBusyConflictError extends Error {
  readonly conflictingScopes: readonly CommandBusyScope[]

  constructor(conflictingScopes: readonly CommandBusyScope[]) {
    super(`Command busy-scope conflict: ${conflictingScopes.join(', ')}`)
    this.name = 'CommandBusyConflictError'
    this.conflictingScopes = conflictingScopes
  }
}
