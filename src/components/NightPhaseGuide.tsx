interface Props {
  phase: 'werewolf' | 'seer' | 'witch'
  title: string
  hint?: string
}

const CONFIG = {
  werewolf: { emoji: '🐺', bg: 'bg-red-950/60' },
  seer:     { emoji: '🔮', bg: 'bg-purple-950/60' },
  witch:    { emoji: '🧙‍♀️', bg: 'bg-emerald-950/60' },
}

export default function NightPhaseGuide({ phase, title, hint }: Props) {
  const { emoji, bg } = CONFIG[phase]
  return (
    <div className={`text-center mb-6 ${bg} rounded-2xl py-5`}>
      <span className="text-6xl">{emoji}</span>
      <p className="text-2xl font-bold mt-2">{title}</p>
      {hint && hint !== `werewolf.${phase}Hint` && (
        <p className="text-sm text-gray-400 mt-1 px-4">{hint}</p>
      )}
    </div>
  )
}
