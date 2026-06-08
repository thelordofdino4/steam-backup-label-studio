export type EditorImageAssetSize = {
  width: number
  height: number
}

export type EditorImageAssetContent<TSize = EditorImageAssetSize> = {
  imageDataUrl: string | null
  imageSize: TSize | null
}

export type EditorImageAssetInput<TSize = EditorImageAssetSize> = {
  imageDataUrl: string
  imageSize: TSize
}

export type EditorImageAssetSourceContent<
  TSource,
  TSize = EditorImageAssetSize,
> = EditorImageAssetContent<TSize> & {
  imageSource?: TSource | null
}

export type EditorImageAssetSourceInput<
  TSource,
  TSize = EditorImageAssetSize,
> = EditorImageAssetInput<TSize> & {
  imageSource: TSource | null
}

export function setEditorImageAssetContent<
  TState extends EditorImageAssetContent<TSize>,
  TSize = EditorImageAssetSize,
>(
  state: TState,
  image: EditorImageAssetInput<TSize>,
): TState {
  return {
    ...state,
    imageDataUrl: image.imageDataUrl,
    imageSize: image.imageSize,
  } as TState
}

export function clearEditorImageAssetContent<
  TState extends EditorImageAssetContent<TSize>,
  TSize = EditorImageAssetSize,
>(state: TState): TState {
  return {
    ...state,
    imageDataUrl: null,
    imageSize: null,
  } as TState
}

export function setEditorImageAssetSourceContent<
  TState extends EditorImageAssetSourceContent<TSource, TSize>,
  TSource,
  TSize = EditorImageAssetSize,
>(
  state: TState,
  image: EditorImageAssetSourceInput<TSource, TSize>,
): TState {
  return {
    ...setEditorImageAssetContent(state, image),
    imageSource: image.imageSource,
  } as TState
}

export function clearEditorImageAssetSourceContent<
  TState extends EditorImageAssetSourceContent<TSource, TSize>,
  TSource,
  TSize = EditorImageAssetSize,
>(state: TState): TState {
  return {
    ...state,
    imageDataUrl: null,
    imageSize: null,
    imageSource: null,
  } as TState
}
