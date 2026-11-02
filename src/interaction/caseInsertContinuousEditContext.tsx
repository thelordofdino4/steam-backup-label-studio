import {
  type ReactNode,
} from 'react'
import {
  CaseInsertContinuousEditContext,
  type CaseInsertContinuousEditPresentationPort,
} from './caseInsertContinuousEditPresentationPort.ts'

export function CaseInsertContinuousEditBoundary({
  children,
  port,
}: Readonly<{
  children: ReactNode
  port: CaseInsertContinuousEditPresentationPort
}>) {
  return (
    <CaseInsertContinuousEditContext.Provider value={port}>
      {children}
    </CaseInsertContinuousEditContext.Provider>
  )
}
