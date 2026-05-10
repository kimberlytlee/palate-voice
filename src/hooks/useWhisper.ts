import { useCallback } from 'react'

interface WhisperResponse {
  text?: string
}

export function useWhisper() {
  const transcribe = useCallback(async (audioFloat32: Float32Array): Promise<string> => {
    const wavBlob = encodeWAV(audioFloat32, 16000)
    const formData = new FormData()
    formData.append('file', wavBlob, 'audio.wav')
    formData.append('model', 'whisper-1')
    formData.append('language', 'en')

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) throw new Error(`Whisper ${res.status}`)
    const data: WhisperResponse = await res.json()
    return data.text?.trim() ?? ''
  }, [])

  return { transcribe }
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  write(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)   // PCM
  view.setUint16(22, 1, true)   // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}
