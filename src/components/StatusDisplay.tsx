import './StatusDisplay.css'
import type { Phase } from '../App'

const PHASE_LABELS: Partial<Record<Phase, string>> = {
  initializing: 'Starting up…',
  listening: 'Listening…',
  transcribing: 'Heard you…',
  thinking: 'Thinking…',
  speaking: 'Palate is speaking',
  recommendations: 'Listening…',
}

const PHASE_COLORS: Partial<Record<Phase, string>> = {
  listening: 'var(--accent)',
  transcribing: 'var(--text-muted)',
  thinking: 'var(--accent)',
  speaking: 'var(--green)',
  recommendations: 'var(--accent)',
}

interface Props {
  phase: Phase
}

export default function StatusDisplay({ phase }: Props) {
  const label = PHASE_LABELS[phase] ?? ''
  const color = PHASE_COLORS[phase] ?? 'var(--text-muted)'

  if (!label) return null

  return (
    <div className="sd-wrapper" aria-live="polite" aria-atomic="true">
      <div className="sd-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <span className="sd-label" style={{ color }}>{label}</span>
    </div>
  )
}
