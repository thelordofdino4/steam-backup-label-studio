const GUIDED_LABEL_SINGLE_LINE_MAX_LENGTH = 11

export const DISC_GUIDED_PLACEHOLDER_LABEL_LINE_HEIGHT = 3.4

export function getDiscGuidedPlaceholderLabelLines(label: string) {
  const words = label.trim().split(/\s+/)

  if (
    label.length <= GUIDED_LABEL_SINGLE_LINE_MAX_LENGTH ||
    words.length < 2
  ) {
    return Object.freeze([label] as const)
  }

  let bestSplitIndex = 1
  let smallestLengthDifference = Number.POSITIVE_INFINITY

  for (let index = 1; index < words.length; index += 1) {
    const firstLineLength = words.slice(0, index).join(' ').length
    const secondLineLength = words.slice(index).join(' ').length
    const lengthDifference = Math.abs(firstLineLength - secondLineLength)

    if (lengthDifference < smallestLengthDifference) {
      bestSplitIndex = index
      smallestLengthDifference = lengthDifference
    }
  }

  return Object.freeze([
    words.slice(0, bestSplitIndex).join(' '),
    words.slice(bestSplitIndex).join(' '),
  ] as const)
}
