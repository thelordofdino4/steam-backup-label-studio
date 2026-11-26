/** Copy only enumerable own data in the declared document write footprint. */
export function readClosedDataFootprint(
  input: unknown,
  allowed: ReadonlySet<string>,
  mayBeUndefined?: ReadonlySet<string>,
): Record<string, unknown> | null {
  if (typeof input !== 'object' || input === null) return null
  const prototype = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) return null
  const descriptors = Object.getOwnPropertyDescriptors(input)
  const entries: [string, unknown][] = []
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string' || !allowed.has(key)) return null
    const descriptor = descriptors[key]
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable ||
        (descriptor.value === undefined && !mayBeUndefined?.has(key))) return null
    entries.push([key, descriptor.value])
  }
  return Object.fromEntries(entries)
}
