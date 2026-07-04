import fs from 'node:fs'
import path from 'node:path'

export function createTextEditorSmokeAttachedRibbon({
  artifactDir,
  clickInlineTab,
  done,
  expectContextualShell,
  fail,
  getRectDelta,
  openInlineEditorFromTarget,
}) {
  async function getAttachedRibbonLayoutSnapshot(page, previewSmokeId) {
    return page.evaluate((targetPreviewSmokeId) => {
      const previewArea = document.querySelector('.preview-area')
      const header = document.querySelector('.preview-header')
      const label = document.querySelector('.preview-pane-label')
      const ribbon = document.querySelector('[data-smoke-id="contextual-text-ribbon-host"]')
      const shell = document.querySelector('.contextual-text-ribbon-shell')
      const preview = document.querySelector(`[data-smoke-id="${targetPreviewSmokeId}"]`)
      const toastStack = document.querySelector('.preview-toast-stack')

      const toRect = (element) => {
        const rect = element.getBoundingClientRect()

        return {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        }
      }

      if (
        !(previewArea instanceof HTMLElement) ||
        !(header instanceof HTMLElement) ||
        !(label instanceof HTMLElement) ||
        !(ribbon instanceof HTMLElement) ||
        !(shell instanceof HTMLElement) ||
        !(preview instanceof HTMLElement) ||
        !(toastStack instanceof HTMLElement)
      ) {
        return { error: 'missing attached ribbon layout nodes' }
      }

      const toast = document.createElement('div')
      toast.className = 'preview-toast preview-toast-info'
      toast.setAttribute('data-smoke-id', 'synthetic-preview-toast')
      toast.innerHTML = [
        '<span class="preview-toast-action">Smoke</span>',
        '<span class="preview-toast-icon" aria-hidden="true"></span>',
        '<span class="preview-toast-description">Ribbon offset</span>',
      ].join('')
      toastStack.append(toast)

      const toastStackStyle = window.getComputedStyle(toastStack)
      const previewAreaStyle = window.getComputedStyle(previewArea)
      const snapshot = {
        active: previewArea.classList.contains('has-contextual-text-ribbon-active'),
        header: toRect(header),
        label: toRect(label),
        preview: toRect(preview),
        previewArea: toRect(previewArea),
        ribbon: toRect(ribbon),
        shell: toRect(shell),
        toast: toRect(toast),
        toastStack: toRect(toastStack),
        toastStackTop: Number.parseFloat(toastStackStyle.top),
        availableHeaderWidth: Math.max(
          0,
          toRect(header).right - toRect(label).right,
        ),
        variables: {
          padding: previewAreaStyle.getPropertyValue('--preview-area-padding').trim(),
          ribbonHeight: previewAreaStyle
            .getPropertyValue('--contextual-text-ribbon-reserved-height')
            .trim(),
          ribbonMode: ribbon.getAttribute('data-contextual-text-ribbon-mode'),
          toastGap: previewAreaStyle
            .getPropertyValue('--contextual-text-ribbon-toast-gap')
            .trim(),
        },
        viewport: {
          height: window.innerHeight,
          width: window.innerWidth,
        },
      }

      toast.remove()

      return snapshot
    }, previewSmokeId)
  }

  async function assertAttachedRibbonLayoutAtViewports(page) {
    const originalViewport = page.viewportSize() ?? { height: 1500, width: 1800 }
    const previewSmokeId = 'case-preview-cover'
    const textSmokeId = 'case-text-block-cover-cover-title-text'
    const scenarios = [
      { height: 720, name: 'default-tauri', width: 1000 },
      { height: 650, name: 'minimum-tauri', width: 900 },
      { height: 1009, name: 'maximum-client', width: 1920 },
    ]

    try {
      for (const scenario of scenarios) {
        let failureMessage = null

        try {
          await done(page).catch(() => {})
          await page.setViewportSize({
            height: scenario.height,
            width: scenario.width,
          })
          await page.waitForTimeout(180)

          const inactive = await getAttachedRibbonLayoutSnapshot(
            page,
            previewSmokeId,
          )
          if (inactive.error) {
            failureMessage = `${scenario.name}: ${inactive.error}`
          } else {
            await openInlineEditorFromTarget(page, textSmokeId)
            await expectContextualShell(page)
            await clickInlineTab(page, 'presets')
            await page.waitForTimeout(120)
            const active = await getAttachedRibbonLayoutSnapshot(
              page,
              previewSmokeId,
            )

            if (active.error) {
              failureMessage = `${scenario.name}: ${active.error}`
            } else {
              const previewDelta = getRectDelta(inactive.preview, active.preview)
              const expectedInactiveToastTop = scenario.width <= 1000 ? 12 : 18
              const activeToastGap = active.toast.top - active.header.bottom
              const ribbonTopDelta = Math.abs(active.shell.top - active.header.top)
              const ribbonRightDelta = Math.abs(active.shell.right - active.header.right)
              const headerTopDelta = Math.abs(active.header.top - active.previewArea.top)
              const headerRightDelta = Math.abs(active.header.right - active.previewArea.right)
              const shellTopDelta = Math.abs(active.shell.top - active.previewArea.top)
              const shellRightDelta = Math.abs(active.shell.right - active.previewArea.right)
              const reservedRibbonHeight = Number.parseFloat(
                active.variables.ribbonHeight,
              )
              const availableHeaderWidth = active.availableHeaderWidth
              const expectedRibbonHeight = 148
              const surfaceOffsetFromLabel = active.preview.top - active.label.top

              if (
                active.shell.left < active.label.right - 1 ||
                active.ribbon.left < active.label.right - 1
              ) {
                failureMessage = `${scenario.name}: ribbon crossed the Live Preview label column: ${
                  JSON.stringify({ label: active.label, ribbon: active.ribbon, shell: active.shell })
                }`
              } else if (active.ribbon.width > availableHeaderWidth + 1.5) {
                failureMessage = `${scenario.name}: ribbon exceeded the header width available after Live Preview: ${
                  JSON.stringify({
                    availableHeaderWidth,
                    label: active.label,
                    ribbon: active.ribbon,
                    shell: active.shell,
                  })
                }`
              } else if (
                headerTopDelta > 1.5 ||
                headerRightDelta > 1.5 ||
                shellTopDelta > 1.5 ||
                shellRightDelta > 1.5
              ) {
                failureMessage = `${scenario.name}: ribbon did not use the preview top-right app-shell corner: ${
                  JSON.stringify({
                    header: active.header,
                    headerRightDelta,
                    headerTopDelta,
                    previewArea: active.previewArea,
                    shell: active.shell,
                    shellRightDelta,
                    shellTopDelta,
                  })
                }`
              } else if (ribbonTopDelta > 1.5 || ribbonRightDelta > 1.5) {
                failureMessage = `${scenario.name}: ribbon is not attached to the header top-right: ${
                  JSON.stringify({
                    header: active.header,
                    ribbonRightDelta,
                    ribbonTopDelta,
                    shell: active.shell,
                  })
                }`
              } else if (
                Math.abs(reservedRibbonHeight - expectedRibbonHeight) > 1 ||
                Math.abs(active.header.height - expectedRibbonHeight) > 1.5
              ) {
                failureMessage = `${scenario.name}: ribbon did not reserve the expected responsive toolbar height: ${
                  JSON.stringify({
                    expectedRibbonHeight,
                    header: active.header,
                    reservedRibbonHeight,
                    shell: active.shell,
                    variables: active.variables,
                  })
                }`
              } else if (
                surfaceOffsetFromLabel < expectedRibbonHeight - 1 ||
                surfaceOffsetFromLabel > expectedRibbonHeight + 2
              ) {
                failureMessage = `${scenario.name}: editable surface is not close enough under Live Preview text: ${
                  JSON.stringify({
                    expectedRibbonHeight,
                    label: active.label,
                    preview: active.preview,
                    shell: active.shell,
                    surfaceOffsetFromLabel,
                  })
                }`
              } else if (
                active.preview.bottom > scenario.height + 1 ||
                active.preview.right > scenario.width + 1 ||
                active.preview.top < -1 ||
                active.preview.left < -1
              ) {
                failureMessage = `${scenario.name}: preview escaped the viewport: ${
                  JSON.stringify({ preview: active.preview, viewport: active.viewport })
                }`
              } else if (active.preview.top < active.header.bottom - 1) {
                failureMessage = `${scenario.name}: preview underlapped the header/ribbon: ${
                  JSON.stringify({ header: active.header, preview: active.preview })
                }`
              } else if (
                Math.abs(previewDelta.left) > 1.5 ||
                Math.abs(previewDelta.top) > 1.5 ||
                Math.abs(previewDelta.width) > 1.5 ||
                Math.abs(previewDelta.height) > 1.5
              ) {
                failureMessage = `${scenario.name}: text activation moved the preview: ${
                  JSON.stringify({ active: active.preview, inactive: inactive.preview, previewDelta })
                }`
              } else if (
                Math.abs(inactive.toastStackTop - expectedInactiveToastTop) > 1
              ) {
                failureMessage = `${scenario.name}: inactive toast did not keep its normal top offset: ${
                  JSON.stringify({
                    expectedInactiveToastTop,
                    inactiveToastStackTop: inactive.toastStackTop,
                  })
                }`
              } else if (activeToastGap < 8) {
                failureMessage = `${scenario.name}: active toast overlapped or clipped into the ribbon: ${
                  JSON.stringify({
                    activeToastGap,
                    header: active.header,
                    toast: active.toast,
                    toastStackTop: active.toastStackTop,
                    variables: active.variables,
                  })
                }`
              } else if (active.toast.top <= inactive.toast.top + 20) {
                failureMessage = `${scenario.name}: active ribbon did not push toast stack below the header: ${
                  JSON.stringify({
                    activeToast: active.toast,
                    inactiveToast: inactive.toast,
                  })
                }`
              }
            }
          }
        } finally {
          if (failureMessage) {
            fs.mkdirSync(artifactDir, { recursive: true })
            await page.screenshot({
              fullPage: true,
              path: path.join(
                artifactDir,
                `attached-ribbon-${scenario.name}.png`,
              ),
            })
          }
        }

        if (failureMessage) {
          fail(failureMessage)
        }
      }
    } finally {
      await page.setViewportSize(originalViewport)
      await page.waitForTimeout(160)
      await openInlineEditorFromTarget(page, textSmokeId)
      await expectContextualShell(page)
    }
  }

  return {
    assertAttachedRibbonLayoutAtViewports,
    getAttachedRibbonLayoutSnapshot,
  }
}
