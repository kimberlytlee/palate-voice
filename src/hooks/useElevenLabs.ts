import { useState, useRef, useCallback } from 'react';

export function useElevenLabs() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const speak = useCallback(
    async (text: string, onEnd?: () => void): Promise<void> => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current = null;
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }

      setIsSpeaking(true);

      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
            style: 0.1,
          },
        }),
      });

      if (!res.ok) {
        setIsSpeaking(false);
        throw new Error(`ElevenLabs ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      const audio = new Audio(url);
      audio.playbackRate = 1.2; // speeds up audio
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        urlRef.current = null;
        audioRef.current = null;
        onEnd?.();
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        onEnd?.();
      };

      await audio.play();
    },
    [],
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, stop };
}
