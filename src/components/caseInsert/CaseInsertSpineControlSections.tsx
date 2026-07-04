import { Fragment, type ReactNode } from 'react'
import type { JewelCaseSpineSide } from '../../caseInsert/types'
import type {
  ProjectJewelCaseSpineState,
} from '../../project/projectTypes'
import { EditorFeaturePanel } from '../editor/EditorPanel'
import type { CaseInsertSpineControlSection } from './CaseInsertSpineControls.types'

const SPINE_SIDES: CaseInsertSpineControlSection[] = [
  { side: 'left', label: 'Left Spine' },
  { side: 'right', label: 'Right Spine' },
]

const MIRRORED_SPINE_CONTROL_SIDE: JewelCaseSpineSide = 'left'

function SpineSideSection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <EditorFeaturePanel
      title={label}
      className="case-insert-spine-side-section"
    >
      {children}
    </EditorFeaturePanel>
  )
}

function getSpineControlSections(spine: ProjectJewelCaseSpineState) {
  return spine.mirrored
    ? [{ side: MIRRORED_SPINE_CONTROL_SIDE, label: 'Spine' }]
    : SPINE_SIDES
}

export function CaseInsertSpineControlSections({
  spine,
  renderControls,
}: {
  spine: ProjectJewelCaseSpineState
  renderControls: (section: CaseInsertSpineControlSection) => ReactNode
}) {
  return (
    <>
      {getSpineControlSections(spine).map((section) => {
        const controls = renderControls(section)

        return spine.mirrored ? (
          <Fragment key={section.side}>{controls}</Fragment>
        ) : (
          <SpineSideSection key={section.side} label={section.label}>
            {controls}
          </SpineSideSection>
        )
      })}
    </>
  )
}
