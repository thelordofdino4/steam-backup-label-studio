import { createContext } from 'react'

// Presentation depth only. Role navigation and project state stay with their owners.
export const EditorInspectorDepthContext = createContext<number | null>(null)
