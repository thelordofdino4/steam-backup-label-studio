import { fail } from './text-editor-smoke-reporting.mjs'
import { smokeSelector } from './text-editor-smoke-selectors.mjs'

export function smoke(page, smokeId) {
  return page.locator(smokeSelector(smokeId))
}

export function visibleSmoke(page, smokeId) {
  return page.locator(`${smokeSelector(smokeId)}:visible`)
}

export async function expectAttached(page, smokeId, message = smokeId) {
  await smoke(page, smokeId).waitFor({ state: 'attached', timeout: 5_000 })
  const count = await smoke(page, smokeId).count()
  if (count < 1) fail(`${message} was not attached.`)
}

export async function expectVisible(page, smokeId, message = smokeId) {
  await visibleSmoke(page, smokeId).first().waitFor({
    state: 'visible',
    timeout: 5_000,
  })
  const count = await visibleSmoke(page, smokeId).count()
  if (count < 1) fail(`${message} was not visible.`)
}

export async function clickSmoke(page, smokeId) {
  await expectAttached(page, smokeId)
  await smoke(page, smokeId).first().evaluate((element) => {
    element.click()
  })
}

export async function clickVisibleSmoke(page, smokeId) {
  await expectVisible(page, smokeId)
  await visibleSmoke(page, smokeId).first().click({ force: true })
}

export async function ensureChecked(page, smokeId, checked = true) {
  await expectAttached(page, smokeId)
  await smoke(page, smokeId).first().evaluate(
    (element, nextChecked) => {
      const input = element instanceof HTMLInputElement
        ? element
        : element.querySelector('input[type="checkbox"]')
      if (!(input instanceof HTMLInputElement)) return
      if (input.checked === nextChecked) return
      input.click()
    },
    checked,
  )
}

export async function setNativeInputValue(locator, value) {
  await locator.evaluate((element, nextValue) => {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
    descriptor?.set?.call(element, nextValue)
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

export async function setSelectValue(locator, value) {
  await locator.evaluate((element, nextValue) => {
    if (!(element instanceof HTMLSelectElement)) return
    element.value = nextValue
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}
