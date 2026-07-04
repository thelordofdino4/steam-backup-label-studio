import fs from 'node:fs'
import path from 'node:path'
import {
  EXPECTED_CONTEXTUAL_RIBBON_GROUPS_BY_TAB,
} from './text-editor-smoke-selectors.mjs'
import {
  expectVisible,
  smoke,
} from './text-editor-smoke-interactions.mjs'

export function createTextEditorSmokeRibbonGeometry({
  artifactDir,
  clickInlineTab,
  expectContextualShell,
  fail,
}) {
  async function getContextualRibbonGeometrySnapshot(page) {
    return page.evaluate(() => {
      const host = document.querySelector('[data-smoke-id="contextual-text-ribbon-host"]')
      const menu = document.querySelector('[data-smoke-id="inline-text-menu"]')
      const tabs = document.querySelector('[data-smoke-id="inline-text-tabs"]')
      const row = document.querySelector('.contextual-text-ribbon-control-row')

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
      const isVisible = (element) => {
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)

        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity) >= 0.01
        )
      }

      if (
        !(host instanceof HTMLElement) ||
        !(menu instanceof HTMLElement) ||
        !(tabs instanceof HTMLElement) ||
        !(row instanceof HTMLElement)
      ) {
        return { error: 'missing contextual ribbon geometry nodes' }
      }

      const rowStyle = window.getComputedStyle(row)
      const rowRect = toRect(row)
      const scrollbarSpace = Number.parseFloat(rowStyle.paddingBottom) || 0
      const rowUsableBottom = rowRect.bottom - scrollbarSpace
      const groups = Array.from(row.querySelectorAll(':scope > .contextual-text-ribbon-group'))
        .filter((element) => element instanceof HTMLElement && isVisible(element))
        .map((element) => {
          const label = element.querySelector('.contextual-text-ribbon-group-label')
          const body = element.querySelector('.contextual-text-ribbon-group-body')
          const rect = toRect(element)
          const visibleWidth = Math.max(
            0,
            Math.min(rect.right, rowRect.right) -
              Math.max(rect.left, rowRect.left),
          )
          const redundantInnerLabels = Array.from(
            element.querySelectorAll('.contextual-text-ribbon-control-label'),
          )
            .filter((innerLabel) => innerLabel instanceof HTMLElement)
            .map((innerLabel) => {
              const innerRect = innerLabel.getBoundingClientRect()

              return {
                rect: {
                  height: innerRect.height,
                  width: innerRect.width,
                },
                text: innerLabel.textContent?.trim() ?? '',
              }
            })
            .filter((innerLabel) =>
              innerLabel.text &&
              innerLabel.rect.width > 1 &&
              innerLabel.rect.height > 1)

          return {
            bodyChildCount: body instanceof HTMLElement
              ? Array.from(body.children).filter((child) =>
                  child instanceof HTMLElement && isVisible(child)).length
              : 0,
            controlSummary: body instanceof HTMLElement
              ? {
                  checkboxCount: body.querySelectorAll('input[type="checkbox"]').length,
                  colorCount: body.querySelectorAll('input[type="color"]').length,
                  comboboxCount: body.querySelectorAll('[role="combobox"]').length,
                  iconButtonCount: body.querySelectorAll('.contextual-text-ribbon-icon-button').length,
                  rangeCount: body.querySelectorAll('input[type="range"]').length,
                  selectCount: body.querySelectorAll('select').length,
                }
              : {
                  checkboxCount: 0,
                  colorCount: 0,
                  comboboxCount: 0,
                  iconButtonCount: 0,
                  rangeCount: 0,
                  selectCount: 0,
                },
            id: element.getAttribute('data-ribbon-group') ?? '',
            label: label?.textContent?.trim() ?? '',
            rect,
            redundantInnerLabels,
            rowIndex: Math.round(
              (rect.top - rowRect.top) /
                Math.max(1, Number.parseFloat(rowStyle.rowGap) || 1),
            ),
            text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            visibleWidth,
          }
        })
      const topGroups = groups
        .filter((group) => group.rect.top <= rowRect.top + 3)
        .map((group) => group.label)
      const bottomGroups = groups
        .filter((group) => group.rect.top > rowRect.top + 3)
        .map((group) => group.label)
      const rowTwoCovered = groups
        .filter((group) => group.rect.top > rowRect.top + 3)
        .filter((group) => group.rect.bottom > rowUsableBottom + 1.5)
        .map((group) => ({
          bottom: group.rect.bottom,
          label: group.label,
          rowUsableBottom,
        }))
      const clippedGroups = groups
        .filter((group) =>
          group.visibleWidth > 0 &&
          group.visibleWidth < group.rect.width - 1.5)
        .map((group) => ({
          label: group.label,
          visibleWidth: group.visibleWidth,
          width: group.rect.width,
        }))
      const emptyGroups = groups
        .filter((group) => group.bodyChildCount < 1)
        .map((group) => group.label)

      return {
        groups,
        host: toRect(host),
        menu: toRect(menu),
        mode: host.getAttribute('data-contextual-text-ribbon-mode'),
        row: {
          clientWidth: row.clientWidth,
          rect: rowRect,
          scrollLeft: row.scrollLeft,
          scrollWidth: row.scrollWidth,
          scrollbarSpace,
          rowUsableBottom,
        },
        tabs: toRect(tabs),
        topGroups,
        bottomGroups,
        clippedGroups,
        emptyGroups,
        rowTwoCovered,
      }
    })
  }

  function validateContextualRibbonSemanticGeometry(snapshot, tab, contextLabel) {
    if (snapshot.error) {
      fail(`${contextLabel}: ${snapshot.error}`)
    }

    const expectedLabels = EXPECTED_CONTEXTUAL_RIBBON_GROUPS_BY_TAB[tab]
    const actualLabels = snapshot.groups.map((group) => group.label)
    const unexpectedLabels = expectedLabels
      ? actualLabels.filter((label) => !expectedLabels.includes(label))
      : []
    const redundantLabels = snapshot.groups
      .flatMap((group) =>
        group.redundantInnerLabels.map((innerLabel) =>
          `${group.label}/${innerLabel.text}`))
    const expectedOrder = expectedLabels
      ? expectedLabels.filter((label) => actualLabels.includes(label))
      : []
    const wrongOrder = expectedOrder.some((label, index) =>
      actualLabels[index] !== label)
    const hasTwoRows = snapshot.groups
      .some((group) => group.rect.top > snapshot.row.rect.top + 3)
    const columnFirstBroken = hasTwoRows && snapshot.groups.length >= 3 &&
      (
        Math.abs(snapshot.groups[0].rect.left - snapshot.groups[1].rect.left) > 2 ||
        snapshot.groups[1].rect.top <= snapshot.groups[0].rect.top + 3 ||
        snapshot.groups[2].rect.left <= snapshot.groups[0].rect.left + 2
      )

    if (unexpectedLabels.length > 0) {
      fail(
        `${contextLabel}: semantic ribbon groups did not match ${tab}: ` +
        JSON.stringify({ actualLabels, expectedLabels, unexpectedLabels }),
      )
    }

    if (wrongOrder) {
      fail(
        `${contextLabel}: ribbon groups are not in semantic order: ` +
        JSON.stringify({ actualLabels, expectedOrder }),
      )
    }

    if (redundantLabels.length > 0) {
      fail(
        `${contextLabel}: redundant visible labels remain inside groups: ` +
        JSON.stringify({ redundantLabels }),
      )
    }

    if (snapshot.emptyGroups.length > 0) {
      fail(
        `${contextLabel}: empty ribbon group wrappers are visible: ` +
        JSON.stringify(snapshot.emptyGroups),
      )
    }

    if (snapshot.clippedGroups.length > 0) {
      fail(
        `${contextLabel}: ribbon exposed clipped group slivers: ` +
        JSON.stringify(snapshot.clippedGroups),
      )
    }

    if (snapshot.rowTwoCovered.length > 0) {
      fail(
        `${contextLabel}: horizontal scrollbar covered row-two groups: ` +
        JSON.stringify(snapshot.rowTwoCovered),
      )
    }

    if (columnFirstBroken) {
      fail(
        `${contextLabel}: ribbon did not pack groups column-first: ` +
        JSON.stringify({
          groups: snapshot.groups.map((group) => ({
            label: group.label,
            rect: group.rect,
          })),
        }),
      )
    }

    if (tab === 'text') {
      const fontGroup = snapshot.groups.find((group) => group.label === 'Font')
      const paragraphGroup = snapshot.groups.find((group) => group.label === 'Paragraph')

      if (!fontGroup || fontGroup.controlSummary.selectCount < 1) {
        fail(`${contextLabel}: Font group did not expose a native font dropdown.`)
      }

      if (!fontGroup || fontGroup.controlSummary.comboboxCount < 1) {
        fail(`${contextLabel}: Font group did not expose the point-size combobox.`)
      }

      if (!fontGroup || fontGroup.controlSummary.iconButtonCount < 3) {
        fail(`${contextLabel}: Font group did not own BIU buttons.`)
      }

      if (!paragraphGroup ||
        paragraphGroup.controlSummary.selectCount +
          paragraphGroup.controlSummary.comboboxCount < 1) {
        fail(`${contextLabel}: Paragraph group did not expose a native alignment dropdown.`)
      }
    }
  }

  async function assertHtmlSourceEditorUsable(page, contextLabel) {
    await expectVisible(page, 'inline-text-html-source', `${contextLabel} HTML source`)
    const result = await smoke(page, 'inline-text-html-source').first().evaluate((textarea) => {
      const style = window.getComputedStyle(textarea)
      const rect = textarea.getBoundingClientRect()
      const lineHeight = Number.parseFloat(style.lineHeight) || 14
      const paddingTop = Number.parseFloat(style.paddingTop) || 0
      const paddingBottom = Number.parseFloat(style.paddingBottom) || 0
      const visibleRows = (textarea.clientHeight - paddingTop - paddingBottom) / lineHeight

      return {
        clientHeight: textarea.clientHeight,
        clientWidth: textarea.clientWidth,
        height: rect.height,
        lineHeight,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        scrollHeight: textarea.scrollHeight,
        scrollWidth: textarea.scrollWidth,
        valueLength: textarea.value.length,
        visibleRows,
        whiteSpace: style.whiteSpace,
        width: rect.width,
        wrap: textarea.getAttribute('wrap'),
      }
    })

    if (result.visibleRows < 1.9) {
      fail(`${contextLabel}: HTML source editor collapsed below two rows: ${
        JSON.stringify(result)
      }`)
    }
    if (result.whiteSpace !== 'pre' || result.wrap !== 'off') {
      fail(`${contextLabel}: HTML source editor is not configured for raw source scrolling: ${
        JSON.stringify(result)
      }`)
    }
    if (!['auto', 'scroll'].includes(result.overflowX) ||
      !['auto', 'scroll'].includes(result.overflowY)) {
      fail(`${contextLabel}: HTML source editor does not own both scroll axes: ${
        JSON.stringify(result)
      }`)
    }
  }

  async function assertResponsiveContextualShell(page) {
    await expectContextualShell(page)

    const scenarios = [
      { name: 'wide', viewportWidth: 2200 },
      { name: 'compact', viewportWidth: 1040 },
      { name: 'narrow', viewportWidth: 760 },
    ]
    const originalViewport = page.viewportSize() ?? { height: 900, width: 1440 }

    for (const scenario of scenarios) {
      let failureMessage = null

      try {
        await page.setViewportSize({
          height: originalViewport.height,
          width: scenario.viewportWidth,
        })
        await page.waitForTimeout(180)
        await expectContextualShell(page)
        fs.mkdirSync(artifactDir, { recursive: true })
        fs.writeFileSync(
          path.join(artifactDir, `responsive-ribbon-${scenario.name}.png`),
          await smoke(page, 'contextual-text-ribbon-host').first().screenshot(),
        )

        const result = await page.evaluate(() => {
          const host = document.querySelector('[data-smoke-id="contextual-text-ribbon-host"]')
          const menu = document.querySelector('[data-smoke-id="inline-text-menu"]')
          const tabs = document.querySelector('[data-smoke-id="inline-text-tabs"]')
          const actions = document.querySelector('.contextual-text-ribbon-actions')

          if (
            !(host instanceof HTMLElement) ||
            !(menu instanceof HTMLElement) ||
            !(tabs instanceof HTMLElement) ||
            !(actions instanceof HTMLElement)
          ) {
            return { error: 'missing shell nodes' }
          }

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
          const rectsOverlapLocal = (first, second) =>
            first.left < second.right &&
            first.right > second.left &&
            first.top < second.bottom &&
            first.bottom > second.top
          const isVisible = (element) => {
            const rect = element.getBoundingClientRect()
            const style = window.getComputedStyle(element)

            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== 'hidden' &&
              style.display !== 'none'
            )
          }
          const inside = (child, parent, tolerance = 1.5) =>
            child.left >= parent.left - tolerance &&
            child.right <= parent.right + tolerance &&
            child.top >= parent.top - tolerance &&
            child.bottom <= parent.bottom + tolerance
          const horizontallyInside = (child, parent, tolerance = 1.5) =>
            child.left >= parent.left - tolerance &&
            child.right <= parent.right + tolerance
          const centerInside = (child, parent) => {
            const centerX = child.left + child.width / 2
            const centerY = child.top + child.height / 2

            return (
              centerX >= parent.left &&
              centerX <= parent.right &&
              centerY >= parent.top &&
              centerY <= parent.bottom
            )
          }
          const intersectRect = (first, second) => {
            const left = Math.max(first.left, second.left)
            const right = Math.min(first.right, second.right)
            const top = Math.max(first.top, second.top)
            const bottom = Math.min(first.bottom, second.bottom)

            return {
              bottom,
              height: Math.max(0, bottom - top),
              left,
              right,
              top,
              width: Math.max(0, right - left),
            }
          }

          const menuRect = toRect(menu)
          const tabsRect = toRect(tabs)
          const hostRect = toRect(host)
          const actionsRect = toRect(actions)
          const focusableSelector = [
            'button',
            'input',
            'select',
            'textarea',
          ].join(',')
          const menuFocusables = Array.from(menu.querySelectorAll(focusableSelector))
            .filter((element) => element instanceof HTMLElement && isVisible(element))
            .map((element) => {
              const scrollItem = element.closest(
                '.contextual-text-ribbon-group, .contextual-text-ribbon-command-button',
              )
              const scrollItemStyle = scrollItem instanceof HTMLElement
                ? window.getComputedStyle(scrollItem)
                : null
              const controlShell =
                element.closest('.contextual-text-ribbon-control-row') ||
                element.closest('.contextual-text-ribbon-group')
              const rawRect = toRect(element)
              const clipRect = controlShell instanceof HTMLElement
                ? toRect(controlShell)
                : toRect(menu)
              const visibleRect = intersectRect(
                intersectRect(rawRect, clipRect),
                menuRect,
              )

              return {
                clipRect,
                inputType: element instanceof HTMLInputElement
                  ? element.type
                  : '',
                label: element.getAttribute('data-smoke-id') ||
                  element.getAttribute('aria-label') ||
                  element.textContent?.trim() ||
                  element.tagName,
                rawRect,
                rect: visibleRect,
                scrollItemHidden: scrollItemStyle
                  ? Number(scrollItemStyle.opacity) < 0.01 ||
                    scrollItemStyle.pointerEvents === 'none'
                  : false,
              }
            })
          const ribbonScrollItems = Array.from(menu.querySelectorAll(
            '.contextual-text-ribbon-control-row > .contextual-text-ribbon-group, ' +
              '.contextual-text-ribbon-control-row > .contextual-text-ribbon-command-button',
          ))
            .filter((element) => element instanceof HTMLElement && isVisible(element))
            .map((element) => {
              const row = element.closest('.contextual-text-ribbon-control-row')
              const rowRect = row instanceof HTMLElement ? toRect(row) : menuRect
              const rect = toRect(element)
              const visibleWidth = Math.max(
                0,
                Math.min(rect.right, rowRect.right) -
                  Math.max(rect.left, rowRect.left),
              )
              const style = window.getComputedStyle(element)

              return {
                label: Array.from(element.querySelectorAll('[data-smoke-id]'))
                  .map((child) => child.getAttribute('data-smoke-id'))
                  .filter(Boolean)
                  .join(',') ||
                  element.textContent?.trim() ||
                  element.className,
                itemWidth: rect.width,
                opacity: Number(style.opacity),
                pointerEvents: style.pointerEvents,
                rect,
                rowWidth: rowRect.width,
                rowRect,
                visibleWidth,
              }
            })
          const tabButtons = Array.from(tabs.querySelectorAll('button'))
            .filter((element) => element instanceof HTMLElement && isVisible(element))
            .map((element) => ({
              label: element.getAttribute('data-smoke-id') ||
                element.textContent?.trim(),
              rect: toRect(element),
            }))
          const visibleMenuFocusables = menuFocusables
            .filter((item) => !item.scrollItemHidden)
            .filter((item) =>
              centerInside(item.rawRect, item.clipRect) &&
              centerInside(item.rawRect, menuRect))
          const visiblePartialItems = ribbonScrollItems
            .filter((item) =>
              item.itemWidth <= item.rowWidth + 1.5 &&
              item.visibleWidth > 0 &&
              !horizontallyInside(item.rect, item.rowRect) &&
              item.opacity >= 0.01 &&
              item.pointerEvents !== 'none')
            .map((item) => `${item.label}:${Math.round(item.visibleWidth)}px`)
          const outside = [
            ...(!inside(tabsRect, hostRect) ? ['tabs'] : []),
            ...(!inside(menuRect, hostRect) ? ['menu'] : []),
            ...(!inside(actionsRect, hostRect) ? ['actions'] : []),
            ...visibleMenuFocusables
              .filter((item) => !horizontallyInside(item.rect, menuRect))
              .map((item) => `menu:${item.label}`),
            ...tabButtons
              .filter((item) => !inside(item.rect, tabsRect))
              .map((item) => `tabs:${item.label}`),
          ]
          const tooSmall = visibleMenuFocusables
            .filter((item) =>
              item.inputType !== 'checkbox' &&
              (item.rect.width < 24 || item.rect.height < 24))
            .map((item) =>
              `${item.label}:${Math.round(item.rect.width)}x${Math.round(item.rect.height)}`)
          const overlaps = []

          for (let index = 0; index < visibleMenuFocusables.length; index += 1) {
            for (
              let nextIndex = index + 1;
              nextIndex < visibleMenuFocusables.length;
              nextIndex += 1
            ) {
              const first = visibleMenuFocusables[index]
              const second = visibleMenuFocusables[nextIndex]

              if (rectsOverlapLocal(first.rect, second.rect)) {
                overlaps.push(`${first.label}/${second.label}`)
              }
            }
          }

          for (let index = 0; index < tabButtons.length; index += 1) {
            for (
              let nextIndex = index + 1;
              nextIndex < tabButtons.length;
              nextIndex += 1
            ) {
              const first = tabButtons[index]
              const second = tabButtons[nextIndex]

              if (rectsOverlapLocal(first.rect, second.rect)) {
                overlaps.push(`${first.label}/${second.label}`)
              }
            }
          }

          return {
            actionsInside: inside(actionsRect, hostRect),
            host: {
              height: Math.round(hostRect.height),
              width: Math.round(hostRect.width),
            },
            outside,
            overlaps,
            partialItems: visiblePartialItems,
            tabCount: tabButtons.length,
            tooSmall,
            width: Math.round(menuRect.width),
          }
        }, scenario)

        if (result.error) {
          failureMessage = `Responsive ribbon ${scenario.name} check failed: ${
            result.error
          }`
        } else if (result.outside.length > 0) {
          failureMessage =
            `Responsive ribbon ${scenario.name} controls escaped their containers: ${
              JSON.stringify(result)
            }`
        } else if (result.overlaps.length > 0) {
          failureMessage = `Responsive ribbon ${scenario.name} controls overlapped: ${
            JSON.stringify(result)
          }`
        } else if (result.partialItems.length > 0) {
          failureMessage =
            `Responsive ribbon ${scenario.name} exposed clipped control groups: ${
              JSON.stringify(result)
            }`
        } else if (result.tooSmall.length > 0) {
          failureMessage =
            `Responsive ribbon ${scenario.name} controls became too small: ${
              JSON.stringify(result)
            }`
        } else if (!result.actionsInside) {
          failureMessage =
            `Responsive ribbon ${scenario.name} actions were not visible: ${
              JSON.stringify(result)
            }`
        } else if (result.tabCount !== 5) {
          failureMessage = `Responsive ribbon ${scenario.name} lost tabs: ${
            JSON.stringify(result)
          }`
        }
      } finally {
        await page.setViewportSize(originalViewport)
        await page.waitForTimeout(120)
        await expectContextualShell(page)
      }

      if (failureMessage) {
        fail(failureMessage)
      }
    }
  }

  async function captureContextualRibbonTabScreenshots(page, surfaceName, openEditor) {
    const originalViewport = page.viewportSize() ?? { height: 1500, width: 1800 }
    const scenarios = [
      { height: 720, name: 'default-tauri', width: 1000 },
      { height: 650, name: 'minimum-tauri', width: 900 },
      { height: 1009, name: 'maximum-client', width: 1920 },
    ]
    const tabs = ['presets', 'text', 'art', 'utilities', 'html']
    const geometryReports = []

    fs.mkdirSync(artifactDir, { recursive: true })

    try {
      for (const scenario of scenarios) {
        await page.setViewportSize({
          height: scenario.height,
          width: scenario.width,
        })
        await page.waitForTimeout(180)
        await openEditor()
        await expectContextualShell(page)

        for (const tab of tabs) {
          await clickInlineTab(page, tab)
          await expectContextualShell(page)
          await page.waitForTimeout(100)
          const geometry = await getContextualRibbonGeometrySnapshot(page)
          validateContextualRibbonSemanticGeometry(
            geometry,
            tab,
            `${surfaceName} ${scenario.name} ${tab}`,
          )
          if (tab === 'html') {
            await assertHtmlSourceEditorUsable(
              page,
              `${surfaceName} ${scenario.name} ${tab}`,
            )
          }
          geometryReports.push({
            scenario,
            surfaceName,
            tab,
            geometry,
          })
          await smoke(page, 'contextual-text-ribbon-host').first().screenshot({
            path: path.join(
              artifactDir,
              `native-ribbon-${surfaceName}-${scenario.name}-${tab}.png`,
            ),
          })
          if (tab === 'html') {
            await page.screenshot({
              fullPage: true,
              path: path.join(
                artifactDir,
                `native-ribbon-full-${surfaceName}-${scenario.name}-${tab}.png`,
              ),
            })
          }
        }
      }

      fs.writeFileSync(
        path.join(artifactDir, `native-ribbon-${surfaceName}-geometry.json`),
        JSON.stringify(geometryReports, null, 2),
      )
    } finally {
      await page.setViewportSize(originalViewport)
      await page.waitForTimeout(160)
      await openEditor()
      await expectContextualShell(page)
    }
  }

  return {
    assertHtmlSourceEditorUsable,
    assertResponsiveContextualShell,
    captureContextualRibbonTabScreenshots,
    getContextualRibbonGeometrySnapshot,
    validateContextualRibbonSemanticGeometry,
  }
}
