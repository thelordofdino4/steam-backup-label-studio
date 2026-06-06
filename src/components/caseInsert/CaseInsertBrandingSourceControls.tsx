import {
  createCaseInsertBrandingSourceSections,
  type CaseInsertBrandingSlotSourceItem,
  type CaseInsertBrandingSourceCatalog,
} from '../../caseInsert/brandingSlotSources'

export type CaseInsertBrandingSourceControlsProps = {
  brandingSources: CaseInsertBrandingSourceCatalog
  sectionIds?: readonly string[]
  allowedSlotKeys?: readonly CaseInsertBrandingSlotSourceItem['slotKey'][]
  showSectionTitles?: boolean
  onUseSource: (source: CaseInsertBrandingSlotSourceItem) => void | Promise<void>
}

export function CaseInsertBrandingSourceControls({
  brandingSources,
  sectionIds,
  allowedSlotKeys,
  showSectionTitles = true,
  onUseSource,
}: CaseInsertBrandingSourceControlsProps) {
  const allowedSlotKeySet = allowedSlotKeys
    ? new Set(allowedSlotKeys)
    : null
  const sectionIdSet = sectionIds ? new Set(sectionIds) : null
  const sections = createCaseInsertBrandingSourceSections(brandingSources)
    .filter((section) => !sectionIdSet || sectionIdSet.has(section.id))
    .map((section) => ({
      ...section,
      items: allowedSlotKeySet
        ? section.items.filter((item) => allowedSlotKeySet.has(item.slotKey))
        : section.items,
    }))
    .filter((section) => section.items.length > 0 || !allowedSlotKeySet)

  return (
    <div className="case-insert-branding-source-group">
      {sections.map((section) => (
        <div className="case-insert-source-section" key={section.id}>
          {showSectionTitles ? (
            <span className="field-label">{section.title}</span>
          ) : null}
          {section.items.length > 0 ? (
            <div className="button-row">
              {section.items.map((item) => (
                <button
                  className="secondary-button"
                  type="button"
                  key={item.id}
                  onClick={() => void onUseSource(item)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="hint">{section.emptyHint}</p>
          )}
        </div>
      ))}
    </div>
  )
}
