import fs from 'node:fs'
import path from 'node:path'

export function createTextEditorSmokeGeometry({
  artifactDir,
  expectVisible,
  fail,
  getPaintBoundsFromScreenshot,
  slugDiagnosticLabel,
  smoke,
  visibleSmoke,
}) {
  async function getRect(page, smokeId) {
    await expectVisible(page, smokeId)
    return visibleSmoke(page, smokeId).first().evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      }
    })
  }

  async function waitForStableRect(page, smokeId) {
    let previous = await getRect(page, smokeId)

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await page.waitForTimeout(60)
      const current = await getRect(page, smokeId)

      if (
        Math.abs(previous.left - current.left) < 0.5 &&
        Math.abs(previous.top - current.top) < 0.5 &&
        Math.abs(previous.width - current.width) < 0.5 &&
        Math.abs(previous.height - current.height) < 0.5
      ) {
        return current
      }

      previous = current
    }

    return previous
  }

  async function assertScreenshotPaintDoesNotTouchHorizontalEdges(
    page,
    smokeId,
    label,
  ) {
    await expectVisible(page, smokeId)
    const buffer = await smoke(page, smokeId).first().screenshot()
    const bounds = getPaintBoundsFromScreenshot(buffer)
    const leftMargin = bounds.left
    const rightMargin = bounds.width - 1 - bounds.right

    if (leftMargin < 1 || rightMargin < 1) {
      fs.mkdirSync(artifactDir, { recursive: true })
      const elementScreenshotPath = path.join(
        artifactDir,
        `${slugDiagnosticLabel(label)}-element.png`,
      )
      fs.writeFileSync(elementScreenshotPath, buffer)
      fail(
        `${label} paint touched screenshot edge: ` +
        `leftMargin=${leftMargin}, rightMargin=${rightMargin}, ` +
        `imageWidth=${bounds.width}, paintLeft=${bounds.left}, ` +
        `paintRight=${bounds.right}, elementScreenshot=${elementScreenshotPath}.`,
      )
    }
  }

  return {
    assertScreenshotPaintDoesNotTouchHorizontalEdges,
    getRect,
    waitForStableRect,
  }
}
