import { createContext, useContext } from 'react'
import type {
  CaseInsertContinuousEditValue,
} from './caseInsertContinuousEditCoordinator.ts'

export type CaseInsertContinuousEditPresentationPort = Readonly<{
  update<Value extends CaseInsertContinuousEditValue>(input: Readonly<{
    targetId: string
    value: Value
    project(value: Value): void
  }>): void
  finish(targetId?: string): void
  release(targetId?: string): void
}>

export const CaseInsertContinuousEditContext =
  createContext<CaseInsertContinuousEditPresentationPort | null>(null)

/** The shared field remains immediate outside the Case editor boundary. */
export function useCaseInsertContinuousEditPresentationPort() {
  return useContext(CaseInsertContinuousEditContext)
}
