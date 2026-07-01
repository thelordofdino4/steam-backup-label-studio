import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT_DIR = path.join(
  process.cwd(),
  'artifacts',
  'steel-polish-stage6-5',
)
const BEFORE_DIR = path.join(ROOT_DIR, 'after-anisotropic-substrate-shading')
const COMPOSITION_DIR = path.join(ROOT_DIR, 'composition-verification')
const OUTPUT_DIR = path.join(ROOT_DIR, 'no-dot-verification')
const CHECKPOINTS = [0, 10, 25, 30, 50]
const LIGHT_POSITIONS = ['overhead', '45-degree', 'grazing']

async function assertReadable(filePath) {
  const info = await stat(filePath)

  if (!info.isFile()) {
    throw new Error(`Expected file at ${filePath}`)
  }

  return info
}

async function copyDiagnostic({
  description,
  from,
  panels,
  to,
}) {
  await assertReadable(from)
  await copyFile(from, to)

  return {
    description,
    fileName: path.basename(to),
    panels,
    sourcePath: from,
  }
}

function allSubstratePanels(label) {
  return CHECKPOINTS.flatMap((polish) =>
    LIGHT_POSITIONS.map((light) => `${polish}% ${light} ${label}`),
  )
}

function decalsDisabledEnabledPanels() {
  return CHECKPOINTS.flatMap((polish) =>
    LIGHT_POSITIONS.flatMap((light) => [
      `${polish}% ${light} decals disabled`,
      `${polish}% ${light} decals enabled`,
      `${polish}% ${light} disabled/enabled RGB diff`,
    ]),
  )
}

await mkdir(OUTPUT_DIR, { recursive: true })

const files = []
const beforeAfterSheets = [
  {
    description:
      'Before substrate AO from the historical dotted baseline. False-color diagnostic.',
    fileName: 'substrate-ao-contact-sheet.png',
    outputName: 'before-substrate-ao-contact-sheet.png',
    panels: allSubstratePanels('before normalized false-color substrate AO'),
  },
  {
    description:
      'Current substrate AO after no-dot work. False-color diagnostic.',
    fileName: 'substrate-ao-contact-sheet.png',
    outputName: 'after-substrate-ao-contact-sheet.png',
    panels: allSubstratePanels('after normalized false-color substrate AO'),
  },
  {
    description:
      'Before substrate height from the historical dotted baseline. False-color diagnostic.',
    fileName: 'substrate-height-contact-sheet.png',
    outputName: 'before-substrate-height-contact-sheet.png',
    panels: allSubstratePanels('before false-color substrate height'),
  },
  {
    description:
      'Current substrate height after no-dot work. False-color diagnostic.',
    fileName: 'substrate-height-contact-sheet.png',
    outputName: 'after-substrate-height-contact-sheet.png',
    panels: allSubstratePanels('after false-color substrate height'),
  },
  {
    description:
      'Before substrate normals from the historical dotted baseline. Diagnostic normal map colors.',
    fileName: 'substrate-normals-contact-sheet.png',
    outputName: 'before-substrate-normals-contact-sheet.png',
    panels: allSubstratePanels('before diagnostic substrate normals'),
  },
  {
    description:
      'Current substrate normals after no-dot work. Diagnostic normal map colors.',
    fileName: 'substrate-normals-contact-sheet.png',
    outputName: 'after-substrate-normals-contact-sheet.png',
    panels: allSubstratePanels('after diagnostic substrate normals'),
  },
  {
    description:
      'Before substrate-only shaded steel from the historical dotted baseline.',
    fileName: 'substrate-only-shaded-steel-contact-sheet.png',
    outputName: 'before-substrate-only-shaded-steel-contact-sheet.png',
    panels: allSubstratePanels('before substrate-only shaded steel'),
  },
  {
    description:
      'Current substrate-only shaded steel after no-dot work.',
    fileName: 'substrate-only-shaded-steel-contact-sheet.png',
    outputName: 'after-substrate-only-shaded-steel-contact-sheet.png',
    panels: allSubstratePanels('after substrate-only shaded steel'),
  },
]

for (const sheet of beforeAfterSheets) {
  const isBefore = sheet.outputName.startsWith('before-')
  const sourceDir = isBefore ? BEFORE_DIR : ROOT_DIR

  files.push(
    await copyDiagnostic({
      description: sheet.description,
      from: path.join(sourceDir, sheet.fileName),
      panels: sheet.panels,
      to: path.join(OUTPUT_DIR, sheet.outputName),
    }),
  )
}

files.push(
  await copyDiagnostic({
    description:
      'Fixed-threshold substrate speckle guard. Hot pixels indicate local AO/height/normal dot contrast; not range-normalized away.',
    from: path.join(ROOT_DIR, 'substrate-speckle-guard-contact-sheet.png'),
    panels: allSubstratePanels('fixed-threshold substrate speckle guard'),
    to: path.join(OUTPUT_DIR, 'substrate-speckle-guard-contact-sheet.png'),
  }),
)
files.push(
  await copyDiagnostic({
    description:
      'Active pit decal ownership in the substrate diagnostic package: stable pit candidates, active pit bodies, and physical pit response are separated from substrate maps.',
    from: path.join(ROOT_DIR, 'active-pit-decal-diagnostic-contact-sheet.png'),
    panels: allSubstratePanels('active pit ownership diagnostic'),
    to: path.join(OUTPUT_DIR, 'active-pit-decal-diagnostic-contact-sheet.png'),
  }),
)
files.push(
  await copyDiagnostic({
    description:
      'Composition-level active pit ownership: speckle guard, stable pit candidates, active pit bodies, and active pit physical response.',
    from: path.join(
      COMPOSITION_DIR,
      'active-pit-decal-ownership-contact-sheet.png',
    ),
    panels: CHECKPOINTS.flatMap((polish) => [
      `${polish}% substrate speckle guard`,
      `${polish}% stable pit candidates`,
      `${polish}% active pit body maps`,
      `${polish}% active pit physical response`,
    ]),
    to: path.join(
      OUTPUT_DIR,
      'composition-active-pit-decal-ownership-contact-sheet.png',
    ),
  }),
)
files.push(
  await copyDiagnostic({
    description:
      'Substrate/steel with decals disabled and enabled across overhead, 45-degree, and grazing light.',
    from: path.join(
      COMPOSITION_DIR,
      'same-substrate-decals-disabled-enabled-light-contact-sheet.png',
    ),
    panels: decalsDisabledEnabledPanels(),
    to: path.join(
      OUTPUT_DIR,
      'same-substrate-decals-disabled-enabled-light-contact-sheet.png',
    ),
  }),
)
files.push(
  await copyDiagnostic({
    description:
      'Substrate/decal composition overview: substrate-only, active body maps, physical maps, decals disabled, decals enabled.',
    from: path.join(COMPOSITION_DIR, 'substrate-decal-composition-contact-sheet.png'),
    panels: CHECKPOINTS.flatMap((polish) => [
      `${polish}% substrate-only steel`,
      `${polish}% active decal body maps`,
      `${polish}% active decal physical maps`,
      `${polish}% steel with decals disabled`,
      `${polish}% full composed steel with decals enabled`,
    ]),
    to: path.join(OUTPUT_DIR, 'substrate-decal-composition-contact-sheet.png'),
  }),
)
files.push(
  await copyDiagnostic({
    description:
      'Frame-ring clipping guard. Red pixels indicate substrate, decal, rust, shadow, or final-alpha bleed outside the frame ring.',
    from: path.join(COMPOSITION_DIR, 'frame-ring-clipping-guard-contact-sheet.png'),
    panels: [
      '0% substrate bleed guard',
      '0% active decal bleed guard',
      '0% physical decal bleed guard',
      '0% rust bleed guard',
      '0% final alpha bleed guard',
      '50% tarnish 100 substrate bleed guard',
      '50% tarnish 100 active decal bleed guard',
      '50% tarnish 100 physical decal bleed guard',
      '50% tarnish 100 rust bleed guard',
      '50% tarnish 100 final alpha bleed guard',
    ],
    to: path.join(OUTPUT_DIR, 'frame-ring-clipping-guard-contact-sheet.png'),
  }),
)

await writeFile(
  path.join(OUTPUT_DIR, 'stage6-5-no-dot-verification-manifest.json'),
  JSON.stringify(
    {
      acceptance: [
        'Substrate AO should no longer contain dotted speckle fields.',
        'Substrate height and normals should no longer contain pit-like dot relief.',
        'Pit-like marks should appear only when active pit decals are enabled.',
        'Base steel should still read as detailed metal, not flat plastic.',
        'No substrate, decal, rust, shadow, or final alpha bleed should appear outside the frame ring.',
      ],
      beforeSource:
        'Historical Stage 6.5 baseline copied from after-anisotropic-substrate-shading, which preserves the dotted substrate diagnostics for comparison.',
      checkpoints: CHECKPOINTS,
      files,
      generatedAt: new Date().toISOString(),
      lightPositions: LIGHT_POSITIONS,
      notes: [
        'This package is diagnostic-only and does not change production rendering.',
        'False-color and AO panels are intentionally exaggerated diagnostics.',
        'The speckle guard uses fixed local contrast thresholds so substrate dots cannot be hidden by visualization range changes alone.',
        'No copyrighted reference images are stored in this package.',
        'This package does not claim native Tauri visual acceptance.',
      ],
    },
    null,
    2,
  ),
)

for (const file of files) {
  console.log(path.join(OUTPUT_DIR, file.fileName))
}
console.log(path.join(OUTPUT_DIR, 'stage6-5-no-dot-verification-manifest.json'))
