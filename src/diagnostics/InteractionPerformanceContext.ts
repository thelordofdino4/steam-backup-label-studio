import { createContext } from 'react'
import type { InteractionPerformanceObserver } from './interactionPerformanceObserver.ts'
export const InteractionPerformanceContext = createContext<InteractionPerformanceObserver | undefined>(undefined)
