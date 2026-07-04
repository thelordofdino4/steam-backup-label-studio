export function escapeHtmlText(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function escapeHtmlAttribute(text: string) {
  return escapeHtmlText(text).replace(/"/g, '&quot;')
}

export function decodeHtmlEntities(text: string) {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
    (_, entity: string) => {
      const normalizedEntity = entity.toLowerCase()

      if (normalizedEntity === 'amp') return '&'
      if (normalizedEntity === 'lt') return '<'
      if (normalizedEntity === 'gt') return '>'
      if (normalizedEntity === 'quot') return '"'
      if (normalizedEntity === 'apos') return "'"
      if (normalizedEntity === 'nbsp') return ' '
      if (normalizedEntity.startsWith('#x')) {
        const codePoint = Number.parseInt(normalizedEntity.slice(2), 16)
        try {
          return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : ''
        } catch {
          return ''
        }
      }
      if (normalizedEntity.startsWith('#')) {
        const codePoint = Number.parseInt(normalizedEntity.slice(1), 10)
        try {
          return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : ''
        } catch {
          return ''
        }
      }

      return ''
    },
  )
}
