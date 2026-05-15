import { useState, useCallback, useRef } from 'react';
import './App.css';
import { useGeolocation } from './hooks/useGeolocation';
import { useVAD } from './hooks/useVAD';
import { useWhisper } from './hooks/useWhisper';
import { useClaude } from './hooks/useClaude';
import type { Restaurant } from './hooks/useClaude';
import { usePlaces } from './hooks/usePlaces';
import { useElevenLabs } from './hooks/useElevenLabs';
import MicButton from './components/MicButton';
import RestaurantCard from './components/RestaurantCard';
import StatusDisplay from './components/StatusDisplay';

export type Phase =
  | 'idle'
  | 'initializing'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'recommendations'
  | 'complete';

export default function App() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const phaseRef = useRef<Phase>('idle');
  const isMutedRef = useRef(false);

  const syncPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const syncMuted = (m: boolean) => {
    isMutedRef.current = m;
    setIsMuted(m);
  };

  const { detectCity } = useGeolocation();
  const { transcribe } = useWhisper();
  const { sendMessage, resetHistory } = useClaude();
  const { enrichRestaurants } = usePlaces();
  const { speak, stop: stopTTS } = useElevenLabs();

  // ---------- speech-end handler (defined before VAD so ref stays current) ----------
  const handleSpeechEnd = useCallback(
    async (audioFloat32: Float32Array) => {
      if (isMutedRef.current) return;
      const currentPhase = phaseRef.current;
      if (currentPhase !== 'listening' && currentPhase !== 'recommendations')
        return;

      syncPhase('transcribing');

      try {
        const transcript = await transcribe(audioFloat32);
        if (!transcript) {
          syncPhase(currentPhase);
          return;
        }

        syncPhase('thinking');
        const { spokenText, restaurants: recs } = await sendMessage(transcript);

        if (recs) {
          const enriched = await enrichRestaurants(recs);
          setRestaurants(enriched);
          setSelectedIdx(null);
        }

        const nextPhase: Phase = recs ? 'recommendations' : 'listening';
        syncPhase('speaking');

        speak(spokenText, () => {
          syncPhase(nextPhase);
        });
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
        syncPhase(currentPhase);
      }
    },
    [transcribe, sendMessage, speak, enrichRestaurants],
  );

  const {
    userIsSpeaking,
    loading: vadLoading,
    errored: vadError,
    start: startVAD,
    pause: pauseVAD,
    resume: resumeVAD,
  } = useVAD({
    onSpeechStart: () => console.log('Speech started'),
    onSpeechEnd: handleSpeechEnd,
  });

  // ---------- start session ----------
  const handleStart = useCallback(async () => {
    setError(null);
    resetHistory();
    setRestaurants([]);
    setSelectedIdx(null);
    syncMuted(false);
    syncPhase('initializing');

    try {
      // Prime mic permission before VAD requests it — makes the dialog appear
      // immediately and prevents getUserMedia from hanging silently.
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      micStream.getTracks().forEach((t) => t.stop());

      const [city] = await Promise.all([detectCity(), startVAD()]);

      const greeting = city
        ? `Looks like you're in ${city} — is that right? Do you know what type of cuisine you're in the mood for?`
        : `Hey, I'm Palate! First — what city or neighborhood are you in?`;

      syncPhase('speaking');
      speak(greeting, () => {
        syncPhase('listening');
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      syncPhase('idle');
    }
  }, [detectCity, startVAD, speak, resetHistory]);

  // ---------- mute / unmute ----------
  const handleMute = useCallback(() => {
    syncMuted(true);
    pauseVAD();
    stopTTS();
    if (
      ['listening', 'recommendations', 'speaking'].includes(phaseRef.current)
    ) {
      syncPhase(restaurants.length ? 'recommendations' : 'listening');
    }
  }, [pauseVAD, stopTTS, restaurants.length]);

  const handleUnmute = useCallback(() => {
    syncMuted(false);
    resumeVAD();
  }, [resumeVAD]);

  // ---------- card selection ----------
  const handleCardSelect = useCallback(
    async (idx: number) => {
      if (selectedIdx === idx) return;
      setSelectedIdx(idx);
      pauseVAD();
      stopTTS();
      syncPhase('complete');

      const picked = restaurants[idx];
      try {
        const { spokenText } = await sendMessage(
          `I'd like to go to ${picked.name}.`,
        );
        speak(spokenText, () => {});
      } catch {
        speak(`Great choice! Enjoy your meal at ${picked.name}!`, () => {});
      }
    },
    [selectedIdx, restaurants, pauseVAD, stopTTS, sendMessage, speak],
  );

  const isSessionActive = phase !== 'idle';

  return (
    <div className="app-root">
      <header className="app-header">
        <span className="app-logo">Palate</span>
        {isSessionActive && (
          <button
            className="app-reset-btn"
            onClick={handleStart}
            aria-label="Start over"
          >
            New Search
          </button>
        )}
      </header>

      <main className="app-main">
        <section className="app-hero">
          {phase === 'idle' && (
            <div className="app-intro">
              <h1 className="app-headline">
                Find your next
                <br />
                great meal.
              </h1>
              <p className="app-sub">
                Tell me what you're craving — I'll find it.
              </p>
            </div>
          )}

          <MicButton
            phase={phase}
            userIsSpeaking={userIsSpeaking}
            isMuted={isMuted}
            vadLoading={vadLoading}
            onStart={handleStart}
            onMute={handleMute}
            onUnmute={handleUnmute}
          />

          <div className="app-status-area">
            <StatusDisplay phase={phase} />
            {isMuted && phase !== 'idle' && (
              <span className="app-muted-badge">Muted — tap mic to resume</span>
            )}
          </div>
        </section>

        {restaurants.length > 0 && (
          <section
            className="app-cards-section"
            aria-label="Restaurant recommendations"
          >
            <div className="app-cards-header">
              <span className="app-cards-title">
                {selectedIdx !== null
                  ? 'Your pick'
                  : `${restaurants.length} recommendations`}
              </span>
              {phase === 'recommendations' && selectedIdx === null && (
                <span className="app-listening-chip">
                  <span className="app-listening-dot" />
                  Listening
                </span>
              )}
            </div>

            <div className="app-cards-list">
              {restaurants.map((r, i) => (
                <RestaurantCard
                  key={`${r.name}-${i}`}
                  restaurant={r}
                  index={i}
                  selected={selectedIdx === i}
                  onSelect={() => handleCardSelect(i)}
                />
              ))}
            </div>
          </section>
        )}

        {vadError && (
          <div className="app-error-banner">
            <span>Mic error: {vadError}</span>
          </div>
        )}

        {error && (
          <div className="app-error-banner">
            <span>Something went wrong: {error}</span>
            <button
              className="app-error-dismiss"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
