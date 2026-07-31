import { createContext } from 'react'

import type {
  ApplicationMenuRuntime,
} from '../applicationMenu/applicationMenuRuntime.ts'

export const ApplicationMenuRuntimeContext =
  createContext<ApplicationMenuRuntime | null>(null)
