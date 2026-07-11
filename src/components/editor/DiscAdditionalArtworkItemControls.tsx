import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  AdditionalArtworkElementControls,
  type AdditionalArtworkElementControlsProps,
} from '../sidebar/artwork/AdditionalArtworkControls.tsx'
import {
  getPendingAdditionalArtworkItemFocusTarget,
  registerAdditionalArtworkItemEnableFocusTarget,
  registerAdditionalArtworkItemUploadFocusTarget,
} from './discAdditionalArtworkRoleFocusRegistration.ts'
import { useEditorRoleFocus } from './editorRoleFocusContext.ts'

export function DiscAdditionalArtworkItemControls(
  props: AdditionalArtworkElementControlsProps,
) {
  const { element } = props
  const { registerFocusTarget, state } = useEditorRoleFocus()
  const [itemCardOpen, setItemCardOpen] = useState(true)
  const [localFilePanelOpen, setLocalFilePanelOpen] = useState(false)
  const itemEnableRef = useRef<HTMLInputElement | null>(null)
  const uploadRef = useRef<HTMLInputElement | null>(null)
  const openItemCard = useCallback(() => setItemCardOpen(true), [])
  const openLocalFilePanel = useCallback(
    () => setLocalFilePanelOpen(true),
    [],
  )
  const pendingTarget = getPendingAdditionalArtworkItemFocusTarget(
    state.pendingRequest,
    element.id,
  )
  const itemCardFocusPending = pendingTarget !== null
  const uploadFocusPending =
    pendingTarget === 'disc:additional-artwork:upload' &&
    element.layout.enabled

  useLayoutEffect(() => registerAdditionalArtworkItemEnableFocusTarget({
    elementId: element.id,
    enableElement: () => itemEnableRef.current,
    openItemCard,
    registerFocusTarget,
  }), [element.id, openItemCard, registerFocusTarget])

  useLayoutEffect(() => {
    if (!element.layout.enabled) return undefined

    return registerAdditionalArtworkItemUploadFocusTarget({
      elementId: element.id,
      openItemCard,
      openLocalFilePanel,
      registerFocusTarget,
      uploadElement: () => uploadRef.current,
    })
  }, [
    element.id,
    element.layout.enabled,
    openItemCard,
    openLocalFilePanel,
    registerFocusTarget,
  ])

  return (
    <AdditionalArtworkElementControls
      {...props}
      itemCardOpen={itemCardOpen || itemCardFocusPending}
      itemEnableControlRef={itemEnableRef}
      localFilePanelOpen={localFilePanelOpen || uploadFocusPending}
      onItemCardOpenChange={setItemCardOpen}
      onLocalFilePanelOpenChange={setLocalFilePanelOpen}
      uploadControlRef={uploadRef}
    />
  )
}
