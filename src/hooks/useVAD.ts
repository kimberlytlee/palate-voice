import { useState, useRef, useCallback } from 'react'
import { MicVAD } from '@ricky0123/vad-web'

interface VADOptions {
  onSpeechEnd?: (audio: Float32Array) => void
  onSpeechStart?: () => void
  onSpeechRealStart?: () => void
}

export function useVAD({ onSpeechEnd, onSpeechStart, onSpeechRealStart }: VADOptions = {}) {
  const vadRef = useRef<MicVAD | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [userIsSpeaking, setUserIsSpeaking] = useState(false)

  // Store callbacks in refs so the VAD closure always reads the latest version
  const onSpeechEndRef = useRef(onSpeechEnd)
  const onSpeechStartRef = useRef(onSpeechStart)
  const onSpeechRealStartRef = useRef(onSpeechRealStart)
  onSpeechEndRef.current = onSpeechEnd
  onSpeechStartRef.current = onSpeechStart
  onSpeechRealStartRef.current = onSpeechRealStart

  const init = useCallback(async () => {
    if (vadRef.current) return

    vadRef.current = await MicVAD.new({
      baseAssetPath: '/',
      onnxWASMBasePath: '/',
      model: 'legacy',
      startOnLoad: false,
      positiveSpeechThreshold: 0.5,
      negativeSpeechThreshold: 0.35,
      minSpeechFrames: 4,
      redemptionFrames: 10,
      preSpeechPadFrames: 2,
      onSpeechStart: () => {
        setUserIsSpeaking(true)
        onSpeechStartRef.current?.()
      },
      onSpeechRealStart: () => {
        onSpeechRealStartRef.current?.()
      },
      onSpeechEnd: (audio: Float32Array) => {
        setUserIsSpeaking(false)
        onSpeechEndRef.current?.(audio)
      },
      onVADMisfire: () => {
        setUserIsSpeaking(false)
      },
    })
  }, [])

  const start = useCallback(async () => {
    await init()
    await vadRef.current!.start()
    setIsListening(true)
  }, [init])

  const pause = useCallback(async () => {
    if (!vadRef.current) return
    await vadRef.current.pause()
    setIsListening(false)
    setUserIsSpeaking(false)
  }, [])

  const resume = useCallback(async () => {
    if (!vadRef.current) return
    await vadRef.current.start()
    setIsListening(true)
  }, [])

  const destroy = useCallback(() => {
    vadRef.current?.destroy?.()
    vadRef.current = null
    setIsListening(false)
    setUserIsSpeaking(false)
  }, [])

  return { isListening, userIsSpeaking, start, pause, resume, destroy }
}
