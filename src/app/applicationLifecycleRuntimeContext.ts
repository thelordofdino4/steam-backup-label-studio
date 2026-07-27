import { createContext } from 'react'
import type {
  ApplicationLifecycleRuntime,
} from './applicationLifecycleRuntime.ts'

export const ApplicationLifecycleRuntimeContext =
  createContext<ApplicationLifecycleRuntime | null>(null)
