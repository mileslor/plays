import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface TrackerPlayer {
  id: number
}

interface SpeakingTrackerProps {
  players: TrackerPlayer[]
  currentIndex: number
  speakerOrder: number[]
  skippedSpeakers: Set<number>
  onMarkDone: () => void
  onSkip: () => void
  onFinishAll: () => void
  onReset: () => void
}

export default function SpeakingTracker({
  players,
  currentIndex,
  speakerOrder,
  skippedSpeakers,
  onMarkDone,
  onSkip,
  onFinishAll,
  onReset,
}: SpeakingTrackerProps) {
  const { t } = useTranslation()
  const spokenIds = useMemo(() => new Set(speakerOrder), [speakerOrder])
  const current = players[currentIndex]

  return (
    <>
      {/* Progress indicator with player pills */}
      <div className="bg-gray-900 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-medium">
            {t('speaker.speakerProgress', { current: speakerOrder.length, total: players.length })}
          </span>
          <div className="flex items-center gap-2">
            {speakerOrder.length === players.length && (
              <span className="text-xs text-green-400 font-bold">✅</span>
            )}
            {speakerOrder.length > 0 && (
              <button
                onClick={onReset}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-0.5 rounded border border-gray-700 hover:border-gray-500"
              >
                ↺ {t('werewolf.speakingTracker.resetAll')}
              </button>
            )}
          </div>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${players.length > 0 ? (speakerOrder.length / players.length) * 100 : 0}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {players.map((p, idx) => {
            const spoken = spokenIds.has(p.id)
            const skipped = skippedSpeakers.has(p.id)
            const isCurrent = idx === currentIndex
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : spoken
                      ? skipped
                        ? 'bg-gray-800 border border-gray-700 text-gray-500 line-through'
                        : 'bg-green-900/50 border border-green-700 text-green-300'
                      : 'bg-gray-800 border border-red-900 text-gray-300 animate-pulse-unspoken'
                }`}
              >
                {isCurrent && '🎤 '}
                {spoken && !isCurrent && !skipped && '✅ '}
                <span>{t('undercover.playerN', { n: p.id })}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current speaker highlight */}
      {current && (
        <div className="bg-yellow-900/30 border-2 border-yellow-600 rounded-2xl p-4 mb-4 text-center">
          <p className="text-xs text-yellow-400 uppercase tracking-widest mb-1">{t('speaker.current')}</p>
          <p className="text-2xl font-bold text-yellow-200">
            {t('undercover.playerN', { n: current.id })}
          </p>
        </div>
      )}

      {/* Player grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {players.map((p, idx) => (
          <div
            key={p.id}
            className={`rounded-xl p-3 text-center transition-all ${
              idx === currentIndex
                ? 'bg-yellow-800 ring-2 ring-yellow-400'
                : spokenIds.has(p.id)
                  ? 'bg-gray-800 opacity-60'
                  : 'bg-red-950/40 border border-red-900/60'
            }`}
          >
            <p className="font-bold text-sm">{t('undercover.playerN', { n: p.id })}</p>
            {spokenIds.has(p.id) && (
              <p className="text-xs text-gray-500 mt-0.5">
                {skippedSpeakers.has(p.id) ? t('speaker.skipped') : '✓'}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={onMarkDone}
          disabled={!current || spokenIds.has(current.id)}
          className="flex-1 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-40 rounded-xl font-bold transition-colors"
        >
          {t('speaker.speechComplete')}
        </button>
        <button
          onClick={onSkip}
          disabled={!current}
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-xl font-bold transition-colors"
        >
          {t('speaker.skipped')}
        </button>
      </div>

      <button
        onClick={onFinishAll}
        className="w-full py-3 bg-red-700 hover:bg-red-600 rounded-xl font-bold text-base transition-colors"
      >
        {t('speaker.allSpoken')}
      </button>
    </>
  )
}
