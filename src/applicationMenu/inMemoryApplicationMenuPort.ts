import type {
  ApplicationMenuPlatformDescriptor,
  ApplicationMenuProjection,
} from './applicationMenuTypes.ts'

export type ApplicationMenuProjectionApplyResult =
  | Readonly<{
      status: 'applied'
      windowLabel: string
      generation: number
    }>
  | Readonly<{
      status: 'ignored'
      windowLabel: string
      generation: number
      reason: 'duplicate-generation' | 'stale-generation'
    }>

export interface ApplicationMenuProjectionPort {
  readonly platformDescriptor: ApplicationMenuPlatformDescriptor
  applyProjection(
    projection: ApplicationMenuProjection,
  ): ApplicationMenuProjectionApplyResult
}

function deepFreeze<Value>(value: Value): Value {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value
  }
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(Reflect.get(value, key))
  }
  return Object.freeze(value)
}

function immutableCopy<Value>(value: Value): Value {
  return deepFreeze(structuredClone(value))
}

function assertProjectionMatchesDescriptor(
  descriptor: ApplicationMenuPlatformDescriptor,
  projection: ApplicationMenuProjection,
) {
  if (projection.platform !== descriptor.platform) {
    throw new Error(
      `Projection platform ${projection.platform} does not match port ` +
      `platform ${descriptor.platform}.`,
    )
  }
  const expectedIds = descriptor.items.map((item) => item.itemId)
  const actualIds = projection.items.map((item) => item.itemId)
  if (
    actualIds.length !== expectedIds.length ||
    actualIds.some((id, index) => id !== expectedIds[index])
  ) {
    throw new Error('Projection items do not match the platform descriptor.')
  }
}

export class InMemoryApplicationMenuProjectionPort
implements ApplicationMenuProjectionPort {
  readonly platformDescriptor: ApplicationMenuPlatformDescriptor
  private readonly projections = new Map<string, ApplicationMenuProjection>()

  constructor(platformDescriptor: ApplicationMenuPlatformDescriptor) {
    this.platformDescriptor = immutableCopy(platformDescriptor)
  }

  applyProjection(
    projection: ApplicationMenuProjection,
  ): ApplicationMenuProjectionApplyResult {
    assertProjectionMatchesDescriptor(this.platformDescriptor, projection)
    const current = this.projections.get(projection.windowLabel)
    if (current && projection.generation <= current.generation) {
      return Object.freeze({
        status: 'ignored',
        windowLabel: projection.windowLabel,
        generation: projection.generation,
        reason: projection.generation === current.generation
          ? 'duplicate-generation'
          : 'stale-generation',
      })
    }

    const stored = immutableCopy(projection)
    this.projections.set(stored.windowLabel, stored)
    return Object.freeze({
      status: 'applied',
      windowLabel: stored.windowLabel,
      generation: stored.generation,
    })
  }

  getProjection(windowLabel: string): ApplicationMenuProjection | null {
    return this.projections.get(windowLabel) ?? null
  }

  listWindowLabels(): readonly string[] {
    return Object.freeze([...this.projections.keys()].toSorted())
  }
}
