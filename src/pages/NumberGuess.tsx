import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

type Phase = 'menu' | 'setup' | 'play' | 'lost'

interface Guess {
  name: string
  value: number
  result: 'low' | 'high' | 'correct'
}

export default function NumberGuess() {
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
    const name = guesserName.trim() || '匿名'
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
        <h1 className="text-4xl font-bold mb-2">終極密碼</h1>
        <p className="text-gray-400 text-lg">數字猜謎 · 猜中就輸</p>
      </div>
      <div className="max-w-sm text-gray-300 text-sm leading-relaxed bg-white/5 rounded-2xl p-5 text-left">
        <p className="font-semibold text-white mb-2">點玩？</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>設定數字範圍（預設 1–100）</li>
          <li>App 秘密揀一個數字</li>
          <li>玩家輪流猜，每次範圍會縮窄</li>
          <li>猜中嗰個人要受罰！</li>
        </ol>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => setPhase('setup')}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-2xl text-lg transition-colors"
        >
          開始玩 →
        </button>
        <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← 返主頁</Link>
      </div>
    </div>
  )

  const renderSetup = () => (
    <div className="flex flex-col gap-6 py-4 max-w-sm mx-auto">
      <div>
        <button onClick={() => setPhase('menu')} className="text-gray-500 hover:text-gray-300 text-sm mb-4 transition-colors">← 返回</button>
        <h2 className="text-2xl font-bold">設定範圍</h2>
        <p className="text-gray-400 text-sm mt-1">揀一個數字範圍</p>
      </div>
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <label className="text-gray-400 text-xs mb-1 block">最小</label>
          <input
            type="number"
            value={rangeMin}
            onChange={e => setRangeMin(parseInt(e.target.value) || 1)}
            className="w-full bg-white/10 rounded-xl px-4 py-3 text-white text-xl text-center outline-none focus:bg-white/15 transition-colors"
          />
        </div>
        <div className="text-gray-500 text-2xl mt-5">—</div>
        <div className="flex-1">
          <label className="text-gray-400 text-xs mb-1 block">最大</label>
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
        開始！揀密碼 🎲
      </button>
    </div>
  )

  const renderPlay = () => (
    <div className="flex flex-col gap-5 py-4 max-w-sm mx-auto">
      {/* Range display */}
      <div className="bg-white/5 rounded-2xl p-5 text-center">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-xs">現在範圍</p>
          {guesses.length > 0 && (
            <p className="text-gray-500 text-xs">已猜 {guesses.length} 次</p>
          )}
        </div>
        <div className="flex items-center justify-center gap-4">
          <span className="text-3xl font-bold text-blue-400">{currentMin}</span>
          <span className="text-gray-500 text-2xl">—</span>
          <span className="text-3xl font-bold text-blue-400">{currentMax}</span>
        </div>
        <p className="text-gray-500 text-xs mt-2">共 {currentMax - currentMin + 1} 個可能</p>
      </div>

      {/* Input */}
      <div className="flex flex-col gap-3">
        <input
          value={guesserName}
          onChange={e => setGuesserName(e.target.value)}
          placeholder="你係邊個？（可選）"
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
            猜！
          </button>
        </div>
      </div>

      {/* Guess history */}
      {guesses.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-gray-500 text-xs">猜測記錄</p>
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
                    {g.result === 'low' ? '⬆️ 細咗' : g.result === 'high' ? '⬇️ 大咗' : '💥 中！'}
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
        <h2 className="text-3xl font-bold mb-2">受罰喇！</h2>
        <p className="text-4xl font-bold text-red-400 mt-3">{loser}</p>
        <p className="text-gray-400 mt-2">你猜中咗密碼，要受罰！</p>
        <p className="text-gray-500 text-sm mt-1">共用咗 {guesses.length} 次</p>
        <div className="mt-4 bg-white/5 rounded-2xl px-6 py-3 inline-block">
          <span className="text-gray-400 text-sm">密碼係 </span>
          <span className="text-white font-bold text-2xl">{secretRef.current}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={startGame}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
        >
          再玩一次 🎲
        </button>
        <button
          onClick={() => setPhase('setup')}
          className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl transition-colors"
        >
          改範圍
        </button>
        <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">返主頁</Link>
      </div>
    </div>
  )

  return (
    <Layout>
      {phase === 'menu' && renderMenu()}
      {phase === 'setup' && renderSetup()}
      {phase === 'play' && renderPlay()}
      {phase === 'lost' && renderLost()}
    </Layout>
  )
}
