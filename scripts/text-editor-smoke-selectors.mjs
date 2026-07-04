export const EXPECTED_CONTEXTUAL_RIBBON_GROUPS_BY_TAB = Object.freeze({
  art: ['Text Color', 'Contrast', 'Background', 'Border'],
  html: ['HTML'],
  presets: ['Style', 'Layout', 'Reset'],
  text: ['Font', 'Paragraph'],
  utilities: ['Position', 'Layout', 'Reset'],
})

export const TEXT_EDITOR_SMOKE_IDS = Object.freeze({
  contextualRibbonHost: 'contextual-text-ribbon-host',
  discTextLayerHitTarget: 'disc-text-layer-hit-target',
  inlineTextInput: 'inline-text-input',
  inlineTextMenu: 'inline-text-menu',
  inlineTextMoveHandle: 'inline-text-move-handle',
  inlineTextTabs: 'inline-text-tabs',
  previewViewport: 'preview-viewport',
  previewViewportControls: 'preview-viewport-controls',
  previewViewportStage: 'preview-viewport-stage',
})

export function smokeSelector(smokeId) {
  return `[data-smoke-id="${smokeId}"]`
}

export function discTextLayerHitTargetSelector(descendantSelector = '') {
  const descendant = descendantSelector ? ` ${descendantSelector}` : ''

  return `${smokeSelector(TEXT_EDITOR_SMOKE_IDS.discTextLayerHitTarget)}${descendant}`
}
