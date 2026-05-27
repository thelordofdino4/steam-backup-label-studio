const keys = [
  'title',
  'subtitle',
  'discNumber',
  'backupDate',
  'appId',
  'developer',
  'publisher',
  'installNotes',
  'customNote',
  'copyright',
];

const round = (value, digits = 4) =>
  Number.isFinite(value) ? Math.round(value * 10 ** digits) / 10 ** digits : value;

const rect = (box) => ({
  x: round(box.x),
  y: round(box.y),
  width: round(box.width),
  height: round(box.height),
});

const percentRect = (box, root) =>
  root
    ? {
        x: round(((box.left - root.left) / root.width) * 100),
        y: round(((box.top - root.top) / root.height) * 100),
        width: round((box.width / root.width) * 100),
        height: round((box.height / root.height) * 100),
      }
    : null;

function svgBox(element) {
  try {
    return element instanceof SVGGraphicsElement ? rect(element.getBBox()) : null;
  } catch {
    return null;
  }
}

function styleOf(element) {
  const style = getComputedStyle(element);
  return {
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
    filter: style.filter,
    textShadow: style.textShadow,
    paintOrder: style.paintOrder,
  };
}

function collect() {
  const preview = document.querySelector('.disc-preview');
  const previewRect = preview ? preview.getBoundingClientRect() : null;

  const textNodes = Array.from(
    document.querySelectorAll('.disc-straight-text, .disc-curved-text'),
  ).map((element, index) => {
    const box = element.getBoundingClientRect();

    return {
      index,
      text: element.textContent?.trim() ?? '',
      className: element.getAttribute('class') ?? '',
      bboxViewBoxUnits: svgBox(element),
      rectPx: rect(box),
      rectPercentOfPreview: percentRect(box, previewRect),
      computedStyle: styleOf(element),
    };
  });

  const controls = keys.map((key) => {
    const input = document.querySelector(`#disc-text-value-${key}`);
    const checkbox = input
      ?.closest('.disc-text-control')
      ?.querySelector('input[type="checkbox"]');

    const inputValue = input instanceof HTMLInputElement ? input.value.trim() : '';

    return {
      key,
      enabled: checkbox instanceof HTMLInputElement ? checkbox.checked : null,
      inputValue,
      matchedPreviewNodes: textNodes.filter(
        (node) =>
          inputValue &&
          (node.text === inputValue ||
            inputValue.includes(node.text) ||
            node.text.includes(inputValue)),
      ),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    diagnostic: 'sbls-text-parity-dom-snapshot',
    environment: {
      userAgent: navigator.userAgent,
      devicePixelRatio: devicePixelRatio,
      previewRectPx: previewRect ? rect(previewRect) : null,
      previewPxPerViewBoxUnit: previewRect ? round(previewRect.width / 100) : null,
    },
    controls,
    textNodes,
  };
}

async function copy() {
  const report = collect();
  await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  console.info('Copied text parity diagnostics', report);
  return report;
}

window.sblsTextParityDiagnostics = { collect, copy };

console.info(
  'Text parity diagnostics loaded. Run: await window.sblsTextParityDiagnostics.copy()',
);
