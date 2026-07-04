import type {
  RemoteImageCandidateKind,
  RemoteImageCandidateWorkflow,
  RemoteLogoCandidateSourceKind,
} from './steamLogoCandidateRouting.ts'
import type {
  RemoteLogoCandidateFileType,
} from './steamLogoCandidateUrls.ts'

export type RemoteLogoCandidate = {
  id: string
  url: string
  previewUrl?: string
  sourcePageUrl: string
  label: string
  sourceKind: RemoteLogoCandidateSourceKind
  fileType: RemoteLogoCandidateFileType
  transparencyHint: boolean
  score: number
  width?: number
  height?: number
  alt?: string
  selector?: string
  targetWorkflow: RemoteImageCandidateWorkflow
  contentKind: RemoteImageCandidateKind
  routingReasons: string[]
  reasons: string[]
}

export type RemoteLogoCandidateSeed = {
  url: string
  sourcePageUrl: string
  label: string
  sourceKind: RemoteLogoCandidateSourceKind
  width?: number
  height?: number
  alt?: string
  selector?: string
  context: string
}
