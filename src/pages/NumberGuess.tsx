import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'

type Phase = 'menu' | 'setup' | 'play' | 'lost' | 'giveup'

interface Guess {
  name: string
  value: number
  result: 'low' | 'high' | 'correct'
}

export default function NumberGuess() {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('menu')
  const [rangeMin, setRangeMin] = useState(1)
  const [rangeMax, setRangeMax] = useState(100)
  const secretRef = useRef(0)

  const [currentMin, setCurrentMin] = useState(1)
  const [currentMax, setCurrentMax] = useState(100)
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [guesserName, setGuesserName] = useState('')
  const [guessValue, setGuessValue] = useState('')
  const [loser, setLoser] = useState('')

  useEffect(() => {
    if (phase === 'play' && currentMin === currentMax) {
      setGuessValue(String(currentMin))
    }
  }, [currentMin, currentMax, phase])

  const startGame = () => {
    const min = Math.max(1, rangeMin)
    const max = Math.max(min + 1, rangeMax)
    secretRef.current = Math.floor(Math.random() * (max - min + 1)) + min
    setCurrentMin(min)
    setCurrentMax(max)
    setGuesses([])
    setGuesserName('')
    setGuessValue('')
    setPhase('play')
  }

  const submitGuess = () => {
    const val = parseInt(guessValue)
    if (isNaN(val) || val < currentMin || val > currentMax) return
    const name = guesserName.trim() || t('numberguess.anonymous')
    const secret = secretRef.current

    let result: Guess['result']
    if (val === secret) {
      result = 'correct'
    } else if (val < secret) {
      result = 'low'
    } else {
      result = 'high'
    }

    const newGuess: Guess = { name, value: val, result }
    setGuesses(prev => [...prev, newGuess])
    setGuessValue('')
    setGuesserName('')

    if (result === 'correct') {
      setLoser(name)
      setPhase('lost')
    } else if (result === 'low') {
      setCurrentMin(val + 1)
    } else {
      setCurrentMax(val - 1)
    }
  }

  const renderMenu = () => (
    <div className="flex flex-col items-center text-center gap-8 py-8">
      <div>
        <div className="text-7xl mb-4">🔢</div>
        <h1 className="text-4xl font-bold mb-2">{t('numberguess.title')}</h1>
        <p className="text-gray-400 text-lg">{t('numberguess.subtitle')}</p>
      </div>
      <div className="max-w-sm text-gray-300 text-sm leading-relaxed bg-white/5 rounded-2xl p-5 text-left">
        <p className="font-semibold text-white mb-2">{t('numberguess.howToPlay')}</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>{t('numberguess.rule1')}</li>
          <li>{t('numberguess.rule2')}</li>
          <li>{t('numberguess.rule3')}</li>
          <li>{t('numberguess.rule4')}</li>
        </ol>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => setPhase('setup')}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-2xl text-lg transition-colors"
        >
          {t('numberguess.startPlay')}
        </button>
        <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">{t('numberguess.backHome')}</Link>
      </div>
    </div>
  )

  const renderSetup = () => (
    <div className="flex flex-col gap-6 py-4 max-w-sm mx-auto">
      <div>
        <button onClick={() => setPhase('menu')} className="text-gray-500 hover:text-gray-300 text-sm mb-4 transition-colors">{t('numberguess.back')}</button>
        <h2 className="text-2xl font-bold">{t('numberguess.setupTitle')}</h2>
        <p className="text-gray-400 text-sm mt-1">{t('numberguess.setupSubtitle')}</p>
      </div>
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <label className="text-gray-400 text-xs mb-1 block">{t('numberguess.min')}</label>
          <input
            type="number"
            value={rangeMin}
            onChange={e => setRangeMin(parseInt(e.target.value) || 1)}
            className="w-full bg-white/10 rounded-xl px-4 py-3 text-white text-xl text-center outline-none focus:bg-white/15 transition-colors"
          />
        </div>
        <div className="text-gray-500 text-2xl mt-5">—</div>
        <div className="flex-1">
          <label className="text-gray-400 text-xs mb-1 block">{t('numberguess.max')}</label>
          <input
            type="number"
            value={rangeMax}
            onChange={e => setRangeMax(parseInt(e.target.value) || 100)}
            className="w-full bg-white/10 rounded-xl px-4 py-3 text-white text-xl text-center outline-none focus:bg-white/15 transition-colors"
          />
        </div>
      </div>
      <div className="flex gap-3">
        {[
          { label: '1–50', min: 1, max: 50 },
          { label: '1–100', min: 1, max: 100 },
          { label: '1–1000', min: 1, max: 1000 },
        ].map(p => (
          <button
            key={p.label}
            onClick={() => { setRangeMin(p.min); setRangeMax(p.max) }}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm py-2 rounded-xl transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>
      <button
        onClick={startGame}
        disabled={rangeMax <= rangeMin}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-lg transition-colors"
      >
        {t('numberguess.start')}
      </button>
    </div>
  )

  const remaining = currentMax - currentMin + 1
  const dangerLevel = remaining <= 3 ? 'critical' : remaining <= 8 ? 'danger' : remaining <= 20 ? 'warn' : 'safe'

  const renderPlay = () => (
    <div className="flex flex-col gap-5 py-4 max-w-sm mx-auto">
      {/* Range display */}
      <div className={`rounded-2xl p-5 text-center transition-colors ${
        dangerLevel === 'critical' ? 'bg-red-900/40 ring-1 ring-red-500/50' :
        dangerLevel === 'danger' ? 'bg-orange-900/30 ring-1 ring-orange-500/30' :
        dangerLevel === 'warn' ? 'bg-yellow-900/20' :
        'bg-white/5'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-xs">{t('numberguess.currentRange')}</p>
          {guesses.length > 0 && (
            <p className="text-gray-500 text-xs">{t('numberguess.guessCount', { n: guesses.length })}</p>
          )}
        </div>
        <div className="flex items-center justify-center gap-4">
          <span className={`text-3xl font-bold ${dangerLevel === 'critical' ? 'text-red-400' : dangerLevel === 'danger' ? 'text-orange-400' : 'text-blue-400'}`}>{currentMin}</span>
          <span className="text-gray-500 text-2xl">—</span>
          <span className={`text-3xl font-bold ${dangerLevel === 'critical' ? 'text-red-400' : dangerLevel === 'danger' ? 'text-orange-400' : 'text-blue-400'}`}>{currentMax}</span>
        </div>
        <p className={`text-xs mt-2 ${
          dangerLevel === 'critical' ? 'text-red-400 font-semibold' :
          dangerLevel === 'danger' ? 'text-orange-400' :
          dangerLevel === 'warn' ? 'text-yellow-400' :
          'text-gray-500'
        }`}>
          {dangerLevel === 'critical' && remaining === 1
            ? t('numberguess.onlyOne')
            : dangerLevel === 'critical'
            ? t('numberguess.critical', { n: remaining })
            : dangerLevel === 'danger'
            ? t('numberguess.danger', { n: remaining })
            : t('numberguess.remaining', { n: remaining })}
        </p>
      </div>

      {/* Input */}
      <div className="flex flex-col gap-3">
        <input
          value={guesserName}
          onChange={e => setGuesserName(e.target.value)}
          placeholder={t('numberguess.namePlaceholder')}
          className="bg-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:bg-white/15 transition-colors"
        />
        <div className="flex gap-3">
          <input
            type="number"
            value={guessValue}
            onChange={e => setGuessValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitGuess()}
            placeholder={`${currentMin}–${currentMax}`}
            min={currentMin}
            max={currentMax}
            className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-white text-xl text-center placeholder-gray-600 outline-none focus:bg-white/15 transition-colors"
          />
          <button
            onClick={submitGuess}
            disabled={!guessValue || parseInt(guessValue) < currentMin || parseInt(guessValue) > currentMax}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 rounded-xl transition-colors"
          >
            {t('numberguess.guess')}
          </button>
        </div>
      </div>

      {/* Give up */}
      <div className="flex justify-center">
        <button
          onClick={() => setPhase('giveup')}
          className="text-gray-600 hover:text-gray-400 text-xs transition-colors underline underline-offset-2"
        >
          {t('numberguess.giveUp')}
        </button>
      </div>

      {/* Guess history */}
      {guesses.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-gray-500 text-xs">{t('numberguess.guessHistory')}</p>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {[...guesses].reverse().map((g, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  g.result === 'low'
                    ? 'bg-orange-900/40'
                    : g.result === 'high'
                    ? 'bg-indigo-900/40'
                    : 'bg-green-900/40'
                }`}
              >
                <span className="text-white font-medium">{g.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold text-lg">{g.value}</span>
                  <span className="text-xl">
                    {g.result === 'low' ? t('numberguess.tooLow') : g.result === 'high' ? t('numberguess.tooHigh') : t('numberguess.correct')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderLost = () => (
    <div className="flex flex-col items-center text-center gap-8 py-16">
      <div className="text-7xl animate-bounce">💥</div>
      <div>
        <h2 className="text-3xl font-bold mb-2">{t('numberguess.lostTitle')}</h2>
        <p className="text-4xl font-bold text-red-400 mt-3">{loser}</p>
        <p className="text-gray-400 mt-2">{t('numberguess.lostDesc')}</p>
        <p className="text-gray-500 text-sm mt-1">{t('numberguess.totalGuesses', { n: guesses.length })}</p>
        <div className="mt-4 bg-white/5 rounded-2xl px-6 py-3 inline-block">
          <span className="text-gray-400 text-sm">{t('numberguess.secretWas')} </span>
          <span className="text-white font-bold text-2xl">{secretRef.current}</span>
        </div>
      </div>
      {/* Guess recap */}
      {guesses.length > 0 && (
        <div className="w-full max-w-xs">
          <p className="text-gray-500 text-xs mb-2 text-left">{t('numberguess.guessHistory')}</p>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {guesses.map((g, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                  g.result === 'correct'
                    ? 'bg-red-900/50 ring-1 ring-red-500/40'
                    : g.result === 'low'
                    ? 'bg-orange-900/30'
                    : 'bg-indigo-900/30'
                }`}
              >
                <span className="text-white">{g.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{g.value}</span>
                  <span className="text-base">
                    {g.result === 'low' ? '⬆️' : g.result === 'high' ? '⬇️' : '💥'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={startGame}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
        >
          {t('numberguess.playAgain')}
        </button>
        <button
          onClick={() => setPhase('setup')}
          className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl transition-colors"
        >
          {t('numberguess.changeRange')}
        </button>
        <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">{t('numberguess.backHome')}</Link>
      </div>
    </div>
  )

  const renderGiveUp = () => (
    <div className="flex flex-col items-center text-center gap-8 py-16">
      <div className="text-7xl">🏳️</div>
      <div>
        <h2 className="text-3xl font-bold mb-2">{t('numberguess.giveUpTitle')}</h2>
        <p className="text-gray-400 mt-2">{t('numberguess.giveUpDesc')}</p>
        <p className="text-gray-500 text-sm mt-1">{t('numberguess.totalGuesses', { n: guesses.length })}</p>
        <div className="mt-4 bg-white/5 rounded-2xl px-6 py-3 inline-block">
          <span className="text-gray-400 text-sm">{t('numberguess.secretWas')} </span>
          <span className="text-white font-bold text-2xl">{secretRef.current}</span>
        </div>
      </div>
      {guesses.length > 0 && (
        <div className="w-full max-w-xs">
          <p className="text-gray-500 text-xs mb-2 text-left">{t('numberguess.guessHistory')}</p>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {guesses.map((g, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                  g.result === 'low'
                    ? 'bg-orange-900/30'
                    : 'bg-indigo-900/30'
                }`}
              >
                <span className="text-white">{g.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{g.value}</span>
                  <span className="text-base">
                    {g.result === 'low' ? '⬆️' : '⬇️'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={startGame}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
        >
          {t('numberguess.playAgain')}
        </button>
        <button
          onClick={() => setPhase('setup')}
          className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl transition-colors"
        >
          {t('numberguess.changeRange')}
        </button>
        <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">{t('numberguess.backHome')}</Link>
      </div>
    </div>
  )

  return (
    <Layout>
      {phase === 'menu' && renderMenu()}
      {phase === 'setup' && renderSetup()}
      {phase === 'play' && renderPlay()}
      {phase === 'lost' && renderLost()}
      {phase === 'giveup' && renderGiveUp()}
    </Layout>
  )
}
