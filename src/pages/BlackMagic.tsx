import { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import Timer, { type TimerHandle } from '../components/Timer'

type Phase = 'menu' | 'setup' | 'performer-out' | 'pick-target' | 'performer-back' | 'play' | 'reveal-secret'

interface GameState {
  items: string[]
  targetIndex: number
  playOrder: number[]   // indices into items[], includes -1 for signal slot
  currentStep: number
  signalLabel: string
}

function buildPlayOrder(items: string[], targetIndex: number): number[] {
  const others = items.map((_, i) => i).filter(i => i !== targetIndex)
  const shuffle = (arr: number[]) => [...arr].sort(() => Math.random() - 0.5)
  const before = shuffle(others).slice(0, Math.min(3, others.length))
  const after = shuffle(others.filter(i => !before.includes(i)))
  return [...before, -1, targetIndex, ...after]
}

export default function BlackMagic() {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('menu')
  const [inputItems, setInputItems] = useState<string[]>(['', '', '', '', ''])
  const [game, setGame] = useState<GameState | null>(null)
  const [secretRevealed, setSecretRevealed] = useState(false)
  const [timerPaused, setTimerPaused] = useState(false)
  const timerRef = useRef<TimerHandle>(null)

  const suggestedItems = t('blackmagic.suggestedItems', { returnObjects: true }) as string[]
  const darkSignals = t('blackmagic.darkSignals', { returnObjects: true }) as string[]

  // ── Setup ──────────────────────────────────────────────────────────────
  const updateItem = (i: number, val: string) => {
    setInputItems(prev => prev.map((v, idx) => idx === i ? val : v))
  }
  const addItem = () => setInputItems(prev => prev.length < 8 ? [...prev, ''] : prev)
  const removeItem = (i: number) => setInputItems(prev => prev.length > 3 ? prev.filter((_, idx) => idx !== i) : prev)

  const startGame = useCallback(() => {
    const items = inputItems.map(s => s.trim()).filter(Boolean)
    if (items.length < 3) return
    setGame({
      items,
      targetIndex: -1,
      playOrder: [],
      currentStep: 0,
      signalLabel: darkSignals[Math.floor(Math.random() * darkSignals.length)],
    })
    setPhase('performer-out')
  }, [inputItems, darkSignals])

  const pickTarget = (idx: number) => {
    if (!game) return
    const playOrder = buildPlayOrder(game.items, idx)
    setGame({ ...game, targetIndex: idx, playOrder, currentStep: 0 })
    setPhase('performer-back')
  }

  const startPlay = () => {
    setSecretRevealed(false)
    setPhase('play')
  }

  // ── Render helpers ──────────────────────────────────────────────────────
  const renderMenu = () => (
    <div className="flex flex-col items-center text-center gap-8 py-8">
      <div>
        <div className="text-7xl mb-4">🖤</div>
        <h1 className="text-4xl font-bold mb-2">{t('blackmagic.title')}</h1>
        <p className="text-gray-400 text-lg">{t('blackmagic.tagline')}</p>
      </div>
      <div className="max-w-sm text-gray-300 text-sm leading-relaxed bg-white/5 rounded-2xl p-5 text-left">
        <p className="font-semibold text-white mb-2">{t('blackmagic.howToPlay')}</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>{t('blackmagic.rule1')}</li>
          <li>{t('blackmagic.rule2')}</li>
          <li>{t('blackmagic.rule3')}</li>
          <li>{t('blackmagic.rule4')}</li>
        </ol>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => {
            const shuffled = [...suggestedItems].sort(() => Math.random() - 0.5)
            setInputItems(shuffled.slice(0, 5))
            setPhase('setup')
          }}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-6 rounded-2xl text-lg transition-colors"
        >
          {t('blackmagic.startBtn')}
        </button>
        <Link to="/" className="game-back-btn">{t('blackmagic.backHome')}</Link>
      </div>
    </div>
  )

  const renderSetup = () => (
    <div className="flex flex-col gap-6 py-4 max-w-sm mx-auto">
      <div>
        <button onClick={() => setPhase('menu')} className="text-gray-500 hover:text-gray-300 text-sm mb-4 transition-colors">{t('blackmagic.back')}</button>
        <h2 className="text-2xl font-bold">{t('blackmagic.setupTitle')}</h2>
        <p className="text-gray-400 text-sm mt-1">{t('blackmagic.setupDesc')}</p>
      </div>
      <div className="flex flex-col gap-2">
        {inputItems.map((val, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-gray-600 w-5 text-right text-sm">{i + 1}.</span>
            <input
              value={val}
              onChange={e => updateItem(i, e.target.value)}
              placeholder={suggestedItems[i] ?? t('blackmagic.itemPlaceholder')}
              className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:bg-white/15 transition-colors"
              {...(i === 0 ? { autoFocus: true } : {})}
            />
            {inputItems.length > 3 && (
              <button onClick={() => removeItem(i)} className="text-gray-600 hover:text-red-400 transition-colors px-2">✕</button>
            )}
          </div>
        ))}
        {inputItems.length < 8 && (
          <button onClick={addItem} className="text-purple-400 hover:text-purple-300 text-sm py-2 transition-colors">{t('blackmagic.addItem')}</button>
        )}
      </div>
      <button
        onClick={startGame}
        disabled={inputItems.filter(s => s.trim()).length < 3}
        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-lg transition-colors"
      >
        {t('blackmagic.next')}
      </button>
    </div>
  )

  const renderPerformerOut = () => (
    <div className="flex flex-col items-center justify-center text-center gap-8 py-16">
      <div className="text-7xl animate-bounce">🚶</div>
      <div>
        <h2 className="text-3xl font-bold mb-2">{t('blackmagic.performerOutTitle')}</h2>
        <p className="text-gray-400">{t('blackmagic.performerOutDesc')}</p>
      </div>
      <button
        onClick={() => setPhase('pick-target')}
        className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-10 rounded-2xl text-lg transition-colors"
      >
        {t('blackmagic.performerGone')}
      </button>
    </div>
  )

  const renderPickTarget = () => (
    <div className="flex flex-col gap-6 py-4 max-w-sm mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{t('blackmagic.pickTargetTitle')}</h2>
        <p className="text-gray-400 text-sm mt-1">{t('blackmagic.pickTargetDesc')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {game?.items.map((item, i) => (
          <button
            key={i}
            onClick={() => pickTarget(i)}
            className="bg-white/10 hover:bg-purple-600 text-white font-semibold py-5 px-4 rounded-2xl text-lg transition-all hover:scale-105"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )

  const renderPerformerBack = () => (
    <div className="flex flex-col items-center justify-center text-center gap-8 py-16">
      <div className="text-7xl">👋</div>
      <div>
        <h2 className="text-3xl font-bold mb-2">{t('blackmagic.performerBackTitle')}</h2>
        <p className="text-gray-400">{t('blackmagic.performerBackDesc')}</p>
      </div>
      <button
        onClick={startPlay}
        className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-10 rounded-2xl text-lg transition-colors"
      >
        {t('blackmagic.startGame')}
      </button>
    </div>
  )

  const renderPlay = () => {
    if (!game) return null
    const { items, playOrder, currentStep, signalLabel } = game
    const isFinished = currentStep >= playOrder.length
    const stepIdx = isFinished ? null : playOrder[currentStep]
    const isSignal = stepIdx === -1
    const itemName = isSignal ? signalLabel : stepIdx !== null ? items[stepIdx] : ''
    const isTarget = stepIdx === game.targetIndex

    if (isFinished) {
      return (
        <div className="flex flex-col items-center text-center gap-8 py-16">
          <div className="text-7xl">✨</div>
          <div>
            <h2 className="text-3xl font-bold mb-2">{t('blackmagic.finishTitle')}</h2>
            <p className="text-gray-400">{t('blackmagic.finishTarget', { item: items[game.targetIndex] })}</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={() => setPhase('reveal-secret')} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl text-lg transition-colors">
              {t('blackmagic.revealSecretBtn')}
            </button>
            <button
              onClick={() => { setGame({ ...game, currentStep: 0, playOrder: [] }); setPhase('performer-out') }}
              className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl transition-colors"
            >
              {t('blackmagic.playAgain')}
            </button>
            <button onClick={() => setPhase('menu')} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">{t('blackmagic.backMenu')}</button>
          </div>
        </div>
      )
    }

    const advance = () => { setTimerPaused(false); setGame({ ...game, currentStep: currentStep + 1 }) }

    return (
      <div className="flex flex-col items-center text-center gap-8 py-8 max-w-sm mx-auto">
        <div className="text-sm text-gray-500">{t('blackmagic.stepProgress', { current: currentStep + 1, total: playOrder.length })}</div>
        <Timer ref={timerRef} key={currentStep} seconds={30} onExpire={advance} />
        <button
          onClick={() => {
            if (timerPaused) { timerRef.current?.resume(); setTimerPaused(false) }
            else { timerRef.current?.pause(); setTimerPaused(true) }
          }}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          {timerPaused ? t('timer.resume') : t('timer.pause')}
        </button>

        {/* Current item card */}
        <div
          className={`w-full rounded-3xl p-10 transition-all duration-300 ${
            isSignal
              ? 'bg-gray-900 border-2 border-gray-700 shadow-lg shadow-black/50'
              : isTarget
              ? 'bg-gradient-to-br from-purple-600 to-indigo-700'
              : 'bg-white/10'
          }`}
        >
          {isSignal && <div className="text-4xl mb-3">🖤</div>}
          <div className="text-4xl font-bold text-white">{itemName}</div>
          {isSignal && <div className="text-gray-500 text-sm mt-2">{t('blackmagic.signalLabel')}</div>}
          {isSignal && <div className="text-yellow-400 text-sm mt-1 font-semibold">{t('blackmagic.signalNext')}</div>}
          {isTarget && <div className="text-purple-200 text-sm mt-2">{t('blackmagic.targetNote')}</div>}
        </div>

        {/* Guidance */}
        <div className="text-gray-400 text-sm">
          {isSignal
            ? t('blackmagic.signalHint')
            : t('blackmagic.itemHint', { item: itemName })}
        </div>

        <button
          onClick={advance}
          className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
        >
          {isTarget ? t('blackmagic.done') : t('blackmagic.nextItem')}
        </button>
      </div>
    )
  }

  const renderRevealSecret = () => (
    <div className="flex flex-col items-center text-center gap-8 py-8 max-w-sm mx-auto">
      <div className="text-6xl">🔮</div>
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('blackmagic.revealTitle')}</h2>
        {!secretRevealed ? (
          <>
            <p className="text-gray-400 text-sm mb-6">{t('blackmagic.confirmReveal')}</p>
            <button onClick={() => setSecretRevealed(true)} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-2xl transition-colors">
              {t('blackmagic.seeSecret')}
            </button>
          </>
        ) : (
          <div className="bg-white/10 rounded-2xl p-6 text-left mt-2">
            <p className="text-white font-semibold mb-3">{t('blackmagic.secretTitle')}</p>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">{t('blackmagic.secretDesc')}</p>
            <p className="text-gray-500 text-xs">{t('blackmagic.secretTip')}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={() => { setGame(g => g ? { ...g, currentStep: 0, playOrder: [] } : null); setSecretRevealed(false); setPhase('performer-out') }}
          className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl transition-colors"
        >
          {t('blackmagic.playAgain')}
        </button>
        <button onClick={() => setPhase('menu')} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">{t('blackmagic.backMenu')}</button>
      </div>
    </div>
  )

  return (
    <Layout>
      {phase === 'menu' && renderMenu()}
      {phase === 'setup' && renderSetup()}
      {phase === 'performer-out' && renderPerformerOut()}
      {phase === 'pick-target' && renderPickTarget()}
      {phase === 'performer-back' && renderPerformerBack()}
      {phase === 'play' && renderPlay()}
      {phase === 'reveal-secret' && renderRevealSecret()}
    </Layout>
  )
}
