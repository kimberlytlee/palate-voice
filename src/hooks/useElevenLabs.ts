import { useState, useRef, useCallback } from 'react'

const VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM'

export function useElevenLabs() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  const speak = useCallback(async (text: string, onEnd?: () => void): Promise<void> => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current = null
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }

    setIsSpeaking(true)

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_KEY,
          'content-type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.1 },
        }),
      }
    )

    if (!res.ok) {
      setIsSpeaking(false)
      throw new Error(`ElevenLabs ${res.status}`)
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    urlRef.current = url

    const audio = new Audio(url)
    audioRef.current = audio

    audio.onended = () => {
      setIsSpeaking(false)
      URL.revokeObjectURL(url)
      urlRef.current = null
      audioRef.current = null
      onEnd?.()
    }

    audio.onerror = () => {
      setIsSpeaking(false)
      onEnd?.()
    }

    await audio.play()
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current = null
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  return { isSpeaking, speak, stop }
}
