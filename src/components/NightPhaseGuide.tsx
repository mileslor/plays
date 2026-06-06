import { useEffect, useState } from 'react'

interface NightPhaseGuideProps {
  phase: 'werewolf' | 'witch' | 'seer'
  title: string
  hint?: string
}

const PHASE_CONFIG = {
  werewolf: { emoji: '🐺', bg: 'bg-red-950/80', border: 'border-red-800/60' },
  seer: { emoji: '🔮', bg: 'bg-purple-950/80', border: 'border-purple-800/60' },
  witch: { emoji: '🧙♀️', bg: 'bg-emerald-950/80', border: 'border-emerald-800/60' },
}

export default function NightPhaseGuide({ phase, title, hint }: NightPhaseGuideProps) {
  const [visible, setVisible] = useState(false)
  const cfg = PHASE_CONFIG[phase]

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(id)
  }, [phase])

  return (
    <div
      className={`text-center rounded-2xl py-6 mb-6 border ${cfg.bg} ${cfg.border} transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <span className="text-7xl block mb-3">{cfg.emoji}</span>
      <p className="text-2xl font-bold text-white">{title}</p>
      {hint && <p className="text-sm text-gray-400 mt-2 px-4">{hint}</p>}
    </div>
  )
}