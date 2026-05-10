import { useMicVAD } from '@ricky0123/vad-react'

interface VADOptions {
  onSpeechEnd?: (audio: Float32Array) => void
  onSpeechStart?: () => void
}

export function useVAD({ onSpeechEnd, onSpeechStart }: VADOptions = {}) {
  const vad = useMicVAD({
    baseAssetPath: '/',
    onnxWASMBasePath: '/',
    model: 'legacy',
    startOnLoad: false,
    positiveSpeechThreshold: 0.5,
    negativeSpeechThreshold: 0.35,
    minSpeechMs: 120,
    redemptionMs: 300,
    preSpeechPadMs: 60,
    onSpeechStart: () => {
      onSpeechStart?.()
    },
    onSpeechEnd: (audio: Float32Array) => {
      onSpeechEnd?.(audio)
    },
    onVADMisfire: () => {},
  })

  return {
    isListening: vad.listening,
    userIsSpeaking: vad.userSpeaking,
    loading: vad.loading,
    errored: vad.errored,
    start: vad.start,
    pause: vad.pause,
    resume: vad.start,
  }
}
