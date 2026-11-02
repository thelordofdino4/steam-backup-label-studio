import { useEffect, useRef, type ChangeEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { useTitleArtwork } from '../useTitleArtwork'
import { discTemplates } from '../../templates/discTemplates'
import type { ProjectTitleArtwork } from '../../project/projectTypes'
import { createApplicationLifecycleRuntime } from '../../app/applicationLifecycleRuntime.ts'
import { ApplicationLifecycleRuntimeContext } from '../../app/applicationLifecycleRuntimeContext.ts'
import { createApplicationLifecycleCompositionRoot } from '../../lifecycle/applicationLifecycleCompositionRoot.ts'
import { createNewProjectSession } from '../../lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '../../project/blankDiscProject.ts'

function rasterDataUrl(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  context.fillStyle = '#123456'
  context.fillRect(0, 0, width, height)
  return canvas.toDataURL('image/png')
}

declare global {
  interface Window {
    __titleUploadHarness?: {
      seed(enabled: boolean): void
      upload(file: File): Promise<string>
      snapshot(): { artwork: ProjectTitleArtwork; messages: string[]; placements: number; completions: number }
    }
  }
}

export function TitleArtworkUploadHarness() {
  const evidence = useRef({ messages: [] as string[], placements: 0, completions: 0 })
  const title = useTitleArtwork({
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
    steamLogoPlacement: 'top',
    announceStatus: (message) => { evidence.current.messages.push(message) },
    applyActivePresetPlacement: (artwork) => { evidence.current.placements++; return artwork },
    onDiscGuidedSlotCompleted: () => { evidence.current.completions++ },
  })
  useEffect(() => {
    window.__titleUploadHarness = {
      seed(enabled) {
        const asset = {
          steamArtworkAssetId: 'retained-steam-default',
          sourceLabel: 'Retained default',
          imageDataUrl: rasterDataUrl(120, 40),
          imageSize: { width: 120, height: 40 },
        }
        flushSync(() => title.setProjectTitleArtwork({
          ...title.projectTitleArtwork,
          source: 'custom',
          sourceLabel: 'Accepted custom title',
          imageDataUrl: rasterDataUrl(96, 32),
          imageSize: { width: 96, height: 32, contentBounds: { x: 0, y: 0, width: 96, height: 32 } },
          defaultSteamLogo: asset,
          layout: { enabled, scale: 1.4, x: 52, y: 24 },
        }))
      },
      async upload(file) {
        const target = { files: [file], value: 'selected-file' }
        await title.handleTitleArtworkUpload({ target } as unknown as ChangeEvent<HTMLInputElement>)
        return target.value
      },
      snapshot: () => ({ artwork: title.projectTitleArtwork, ...evidence.current }),
    }
    return () => { delete window.__titleUploadHarness }
  }, [title])
  return null
}

const runtime = createApplicationLifecycleRuntime({
  createRoot: (options) => createApplicationLifecycleCompositionRoot({
    ...options,
    initialState: createNewProjectSession({ sessionId: 'title-upload', project: createBlankDiscSavedProject() }),
  }),
})
createRoot(document.getElementById('root')!).render(
  <ApplicationLifecycleRuntimeContext.Provider value={runtime}>
    <TitleArtworkUploadHarness />
  </ApplicationLifecycleRuntimeContext.Provider>,
)
