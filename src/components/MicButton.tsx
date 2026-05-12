import './MicButton.css'
import type { Phase } from '../App'

const BAR_COUNT = 5

interface Props {
  phase: Phase
  userIsSpeaking: boolean
  isMuted: boolean
  vadLoading: boolean
  onStart: () => void
  onMute: () => void
  onUnmute: () => void
}

export default function MicButton({ phase, userIsSpeaking, onStart, onMute, onUnmute, isMuted, vadLoading }: Props) {
  const isIdle = phase === 'idle'
  const showWave = userIsSpeaking && !isMuted
  const showPulse = phase === 'thinking' || phase === 'transcribing'

  const micBtnClass = [
    'mb-mic-btn',
    isMuted && 'mb-mic-btn--muted',
    showPulse && 'mb-mic-btn--pulse',
  ].filter(Boolean).join(' ')

  return (
    <div className="mb-wrapper">
      {isIdle ? (
        <button className="mb-start-btn" onClick={onStart} disabled={vadLoading} aria-label="Start Palate">
          <span className="mb-start-inner">
            <MicIcon size={28} color="#0f0f0f" />
          </span>
          <span className="mb-start-label">{vadLoading ? 'Loading…' : 'Start'}</span>
        </button>
      ) : (
        <div className="mb-active-wrapper">
          {showPulse && <div className="mb-pulse-ring" />}
          <button
            className={micBtnClass}
            onClick={isMuted ? onUnmute : onMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOffIcon size={22} color="var(--text-muted)" />
            ) : (
              <MicIcon size={22} color="#0f0f0f" />
            )}
          </button>

          {showWave && (
            <div className="mb-waveform" aria-hidden="true">
              {Array.from({ length: BAR_COUNT }, (_, i) => (
                <div
                  key={i}
                  className="mb-bar"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.5 + Math.random() * 0.3}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MicIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}

function MicOffIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}
