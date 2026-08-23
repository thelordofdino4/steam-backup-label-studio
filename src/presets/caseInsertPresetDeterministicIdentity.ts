import { createCaseInsertPresetIdentityDigestFromChunks } from './caseInsertPresetIdentityDigest.ts'

type DeterministicIdentityEncodingPlan =
  | Readonly<{
      kind: 'literal'
      encodedLength: number
      literal: string
    }>
  | Readonly<{
      kind: 'string'
      encodedLength: number
      prefix: string
      value: string
    }>
  | Readonly<{
      kind: 'container'
      encodedLength: number
      prefix: string
      children: readonly (DeterministicIdentityEncodingPlan | undefined)[]
    }>

const DETERMINISTIC_IDENTITY_MAX_DEPTH = 256

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function addDeterministicIdentityLength(left: number, right: number) {
  const result = left + right
  if (!Number.isSafeInteger(result)) {
    throw new Error('Deterministic identity encoding is too large.')
  }
  return result
}

function createDeterministicIdentityEncodingPlan(
  value: unknown,
  ancestors = new WeakSet<object>(),
  depth = 0,
): DeterministicIdentityEncodingPlan {
  if (depth > DETERMINISTIC_IDENTITY_MAX_DEPTH) {
    throw new Error('Deterministic identity encoding is too deep.')
  }
  if (value === null) {
    return { kind: 'literal', encodedLength: 3, literal: 'n0:' }
  }
  if (typeof value === 'boolean') {
    const literal = `b1:${value ? '1' : '0'}`
    return { kind: 'literal', encodedLength: literal.length, literal }
  }
  if (typeof value === 'number') {
    const encoded = Object.is(value, -0) ? '-0' : String(value)
    const literal = `d${encoded.length}:${encoded}`
    return { kind: 'literal', encodedLength: literal.length, literal }
  }
  if (typeof value === 'string') {
    const prefix = `s${value.length}:`
    return {
      kind: 'string',
      encodedLength: addDeterministicIdentityLength(
        prefix.length,
        value.length,
      ),
      prefix,
      value,
    }
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      throw new Error('Cyclic deterministic identity value.')
    }
    ancestors.add(value)
    try {
      const children = value.map((child) =>
        createDeterministicIdentityEncodingPlan(
          child,
          ancestors,
          depth + 1,
        ))
      let bodyLength = 0
      children.forEach((child) => {
        bodyLength = addDeterministicIdentityLength(
          bodyLength,
          child.encodedLength,
        )
      })
      const prefix = `a${value.length}:${bodyLength}:`
      return {
        kind: 'container',
        encodedLength: addDeterministicIdentityLength(
          prefix.length,
          bodyLength,
        ),
        prefix,
        children,
      }
    } finally {
      ancestors.delete(value)
    }
  }
  if (isRecord(value)) {
    if (ancestors.has(value)) {
      throw new Error('Cyclic deterministic identity value.')
    }
    ancestors.add(value)
    try {
      const children: DeterministicIdentityEncodingPlan[] = []
      for (const key of Object.keys(value).sort()) {
        children.push(
          createDeterministicIdentityEncodingPlan(
            key,
            ancestors,
            depth + 1,
          ),
          createDeterministicIdentityEncodingPlan(
            value[key],
            ancestors,
            depth + 1,
          ),
        )
      }
      let bodyLength = 0
      for (const child of children) {
        bodyLength = addDeterministicIdentityLength(
          bodyLength,
          child.encodedLength,
        )
      }
      const prefix = `o${children.length / 2}:${bodyLength}:`
      return {
        kind: 'container',
        encodedLength: addDeterministicIdentityLength(
          prefix.length,
          bodyLength,
        ),
        prefix,
        children,
      }
    } finally {
      ancestors.delete(value)
    }
  }
  throw new Error('Unsupported deterministic identity value.')
}

function* emitDeterministicIdentityEncoding(
  plan: DeterministicIdentityEncodingPlan,
): Generator<string> {
  if (plan.kind === 'literal') {
    yield plan.literal
    return
  }
  yield plan.prefix
  if (plan.kind === 'string') {
    yield plan.value
    return
  }
  for (let index = 0; index < plan.children.length; index += 1) {
    if (!(index in plan.children)) continue
    const child = plan.children[index]
    if (child) yield* emitDeterministicIdentityEncoding(child)
  }
}

export function encodeCaseInsertPresetDeterministicIdentity(
  value: unknown,
): string {
  return [...emitDeterministicIdentityEncoding(
    createDeterministicIdentityEncodingPlan(value),
  )].join('')
}

export function createCaseInsertPresetDeterministicIdentityDigest(
  value: unknown,
) {
  return createCaseInsertPresetIdentityDigestFromChunks(
    emitDeterministicIdentityEncoding(
      createDeterministicIdentityEncodingPlan(value),
    ),
  )
}
