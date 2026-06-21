import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getRandomPair, type Difficulty } from '../data/undercoverWords'
import Layout from '../components/Layout'
import Timer from '../components/Timer'

type Role = 'civilian' | 'undercover' | 'whiteboard'
type Phase = 'setup' | 'reveal' | 'round' | 'voting' | 'eliminated' | 'wb_guess' | 'gameover'
type Winner = 'civilian' | 'undercover' | 'whiteboard'

interface Player {
  id: number
  word: string
  role: Role
  alive: boolean
}

const GAME_LANGS: { code: string; flag: string }[] = [
  { code: 'zh-HK', flag: '🇭🇰' },
  { code: 'zh-TW', flag: '🇹🇼' },
  { code: 'zh-CN', flag: '🇨🇳' },
  { code: 'en',    flag: '🇬🇧' },
  { code: 'ja',    flag: '🇯🇵' },
  { code: 'es',    flag: '🇪🇸' },
  { code: 'pt-BR', flag: '🇧🇷' },
]

export default function Undercover() {
  const { t, i18n } = useTranslation()

  // Setup
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium')
  const [gameLang, setGameLang] = useState(() => i18n.language)
  const [playerCount, setPlayerCount] = useState(5)
  const [undercoverCount, setUndercoverCount] = useState(1)
  const [hasWhiteboard, setHasWhiteboard] = useState(false)
  // Game state
  const [phase, setPhase] = useState<Phase>('setup')
  const [players, setPlayers] = useState<Player[]>([])
  const [mainWord, setMainWord] = useState('')
  const [round, setRound] = useState(1)
  const [revealIndex, setRevealIndex] = useState(0)
  const [wordShowing, setWordShowing] = useState(false)
  const [showTapHint, setShowTapHint] = useState(false)
  const [voteTarget, setVoteTarget] = useState<number | null>(null)
  const [eliminatedPlayer, setEliminatedPlayer] = useState<Player | null>(null)
  const [winner, setWinner] = useState<Winner | null>(null)
  const [wbGuess, setWbGuess] = useState('')
  const [wbGuessResult, setWbGuessResult] = useState<'correct' | 'wrong' | null>(null)
  const [firstSpeaker, setFirstSpeaker] = useState<number | null>(null)
  const [initialUndercoverCount, setInitialUndercoverCount] = useState(0)
  const [eliminatedUndercoverCount, setEliminatedUndercoverCount] = useState(0)

  const lastTapRef = useRef<number>(0)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startGame = () => {
    const pair = getRandomPair(gameLang, selectedDifficulty)
    setMainWord(pair.main)
    const indices = Array.from({ length: playerCount }, (_, i) => i)
    const shuffled = [...indices].sort(() => Math.random() - 0.5)
    const roles: Role[] = Array(playerCount).fill('civilian')
    for (let i = 0; i < undercoverCount; i++) roles[shuffled[i]] = 'undercover'
    if (hasWhiteboard) roles[shuffled[undercoverCount]] = 'whiteboard'
    const newPlayers: Player[] = indices.map((i) => ({
      id: i + 1,
      word: roles[i] === 'whiteboard' ? '' : roles[i] === 'undercover' ? pair.undercover : pair.main,
      role: roles[i],
      alive: true,
    }))
    setPlayers(newPlayers)
    setRound(1)
    setRevealIndex(0)
    setWordShowing(false)
    setShowTapHint(false)
    setInitialUndercoverCount(undercoverCount)
    setEliminatedUndercoverCount(0)
    setPhase('reveal')
  }

  // Win condition uses original playerCount for threshold
  const checkWin = (alive: Player[]): Winner | null => {
    const spies = alive.filter((p) => p.role === 'undercover')
    const whites = alive.filter((p) => p.role === 'whiteboard')
    if (spies.length === 0 && whites.length === 0) return 'civilian'
    if (spies.length === 0 && whites.length > 0) return 'whiteboard'
    const threshold = playerCount >= 7 ? 3 : 2
    if (alive.length <= threshold && spies.length >= 1) return 'undercover'
    return null
  }

  const goToRound = (alive: Player[]) => {
    const picked = alive[Math.floor(Math.random() * alive.length)]
    setFirstSpeaker(picked.id)
    setPhase('round')
  }

  // Double-tap detection
  const handleRevealTap = () => {
    if (wordShowing) {
      setWordShowing(false)
      setShowTapHint(false)
      lastTapRef.current = 0
      const next = revealIndex + 1
      if (next >= players.length) {
        goToRound(players)
      } else {
        setRevealIndex(next)
      }
      return
    }
    const now = Date.now()
    const delta = now - lastTapRef.current
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    if (delta < 400 && delta > 50) {
      setWordShowing(true)
      setShowTapHint(false)
      lastTapRef.current = 0
    } else {
      setShowTapHint(true)
      lastTapRef.current = now
      hintTimerRef.current = setTimeout(() => {
        setShowTapHint(false)
        lastTapRef.current = 0
      }, 1500)
    }
  }

  const eliminateTarget = (targetId: number) => {
    const target = players.find((p) => p.id === targetId)!
    const updated = players.map((p) => (p.id === targetId ? { ...p, alive: false } : p))
    setPlayers(updated)
    setEliminatedPlayer(target)
    setVoteTarget(null)
    if (target.role === 'undercover') setEliminatedUndercoverCount((n) => n + 1)
    if (target.role === 'whiteboard') {
      setWbGuess('')
      setWbGuessResult(null)
      setPhase('wb_guess')
    } else {
      const w = checkWin(updated.filter((p) => p.alive))
      if (w) { setWinner(w); setPhase('gameover') }
      else setPhase('eliminated')
    }
  }

  const handleVoteConfirm = () => {
    if (voteTarget === null) return
    eliminateTarget(voteTarget)
  }

  const handleWbSubmit = () => {
    const alive = players.filter((p) => p.alive)
    if (wbGuess.trim().toLowerCase() === mainWord.toLowerCase()) {
      setWbGuessResult('correct')
      setWinner('whiteboard')
      setPhase('gameover')
    } else {
      setWbGuessResult('wrong')
      const w = checkWin(alive)
      if (w) { setWinner(w); setPhase('gameover') }
      // result shown, then user taps continue → eliminated screen
    }
  }

  const handleWbContinue = () => {
    setPhase('eliminated')
  }

  const continueRound = () => {
    setRound((r) => r + 1)
    setEliminatedPlayer(null)
    goToRound(players.filter((p) => p.alive))
  }

  const repickSpeaker = () => {
    const alive = players.filter((p) => p.alive)
    const picked = alive[Math.floor(Math.random() * alive.length)]
    setFirstSpeaker(picked.id)
  }

  const reset = () => {
    setPhase('setup')
    setPlayers([])
    setMainWord('')
    setRound(1)
    setRevealIndex(0)
    setWordShowing(false)
    setShowTapHint(false)
    setVoteTarget(null)
    setEliminatedPlayer(null)
    setWinner(null)
    setWbGuess('')
    setWbGuessResult(null)
    setFirstSpeaker(null)
    setInitialUndercoverCount(0)
    setEliminatedUndercoverCount(0)
  }

  const alivePlayers = players.filter((p) => p.alive)

  const roleColor = (role: Role) =>
    ({ civilian: 'text-blue-400', undercover: 'text-red-400', whiteboard: 'text-gray-400' }[role])

  return (
    <Layout>
      {/* ── SETUP ── */}
      {phase === 'setup' && (
        <div className="max-w-sm mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-center">{t('undercover.title')}</h1>

          <div className="bg-gray-900 rounded-2xl p-5 mb-3">
            <label className="text-sm text-gray-400 block mb-3">{t('undercover.players')}</label>
            <div className="flex items-center justify-between">
              <button onClick={() => setPlayerCount((n) => Math.max(3, n - 1))}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-xl font-bold transition-colors">−</button>
              <span className="text-4xl font-bold">{playerCount}</span>
              <button onClick={() => setPlayerCount((n) => Math.min(12, n + 1))}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-xl font-bold transition-colors">+</button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-5 mb-3">
            <label className="text-sm text-gray-400 block mb-3">{t('undercover.undercoverCount')}</label>
            <div className="flex items-center justify-between">
              <button onClick={() => setUndercoverCount((n) => Math.max(1, n - 1))}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-xl font-bold transition-colors">−</button>
              <span className="text-4xl font-bold text-red-400">{undercoverCount}</span>
              <button onClick={() => setUndercoverCount((n) => Math.min(Math.floor(playerCount / 2), n + 1))}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-xl font-bold transition-colors">+</button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-5 mb-3">
            <label className="text-sm text-gray-400 block mb-3">{t('undercover.difficulty.label')}</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
                const activeColor = d === 'easy' ? 'bg-green-600 text-white' : d === 'medium' ? 'bg-yellow-500 text-black' : 'bg-red-600 text-white'
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDifficulty(d)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${selectedDifficulty === d ? activeColor : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                  >
                    {t(`undercover.difficulty.${d}`)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-5 mb-3">
            <label className="text-sm text-gray-400 block mb-3">{t('undercover.gameLanguage')}</label>
            <div className="flex gap-1.5 flex-wrap">
              {GAME_LANGS.map(({ code, flag }) => (
                <button
                  key={code}
                  onClick={() => setGameLang(code)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${gameLang === code ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                >
                  {flag}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setHasWhiteboard((v) => !v)}
            className={`w-full p-4 rounded-2xl mb-6 flex items-center justify-between transition-colors ${hasWhiteboard ? 'bg-gray-700' : 'bg-gray-900 hover:bg-gray-800'}`}>
            <div className="text-left">
              <p className="font-medium">{t('undercover.enableWhiteboard')}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('undercover.whiteboardDesc')}</p>
            </div>
            <div className={`w-12 h-6 rounded-full relative flex-shrink-0 ml-4 transition-colors ${hasWhiteboard ? 'bg-purple-600' : 'bg-gray-600'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${hasWhiteboard ? 'left-7' : 'left-1'}`} />
            </div>
          </button>

          <button onClick={startGame}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold text-lg transition-colors">
            {t('undercover.startGame')}
          </button>
        </div>
      )}

      {/* ── REVEAL ── */}
      {phase === 'reveal' && (
        <div className="max-w-sm mx-auto text-center select-none">
          <p className="text-gray-400 text-sm mb-1">
            {t('undercover.progress', { current: revealIndex + 1, total: players.length })}
          </p>
          <h2 className="text-2xl font-bold mb-8">
            {t('undercover.playerN', { n: revealIndex + 1 })}
          </h2>

          <div
            onTouchEnd={(e) => { e.preventDefault(); handleRevealTap() }}
            onClick={handleRevealTap}
            className={`w-full min-h-64 rounded-3xl flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all ${wordShowing ? 'bg-purple-700' : showTapHint ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-750'}`}
          >
            {wordShowing ? (
              <>
                <p className="text-sm text-purple-300 mb-3">{t('undercover.yourWord')}</p>
                {players[revealIndex]?.word ? (
                  <p className="text-5xl font-bold mb-4 px-4">{players[revealIndex].word}</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold mb-2 text-gray-300">{t('undercover.youAreWhiteboard')}</p>
                    <p className="text-sm text-gray-400 mb-4">{t('undercover.whiteboardNote')}</p>
                  </>
                )}
                <p className="text-xs text-purple-300/70">{t('undercover.tapToHide')}</p>
              </>
            ) : showTapHint ? (
              <>
                <span className="text-4xl mb-3">☝️</span>
                <p className="text-xl text-white font-bold">{t('undercover.tapAgain')}</p>
              </>
            ) : (
              <>
                <span className="text-5xl mb-4">🫣</span>
                <p className="text-lg text-gray-300">{t('undercover.doubleTapReveal')}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ROUND ── */}
      {phase === 'round' && (
        <div className="max-w-sm mx-auto">
          <Timer key={round} seconds={60} onExpire={() => setPhase('voting')} label={t('timer.speechTime')} />
          <div className="mb-4 text-center">
            {(() => {
              const remaining = initialUndercoverCount - eliminatedUndercoverCount
              return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${remaining === 0 ? 'bg-green-900/50 border border-green-600 text-green-300' : 'bg-red-900/50 border border-red-600 text-red-300'}`}>
                  👥 {remaining === 0 ? t('undercover.allSpiesOut') : t('undercover.remainingSpy', { n: remaining })}
                </span>
              )
            })()}
          </div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{t('undercover.roundN', { n: round })}</h2>
            <span className="text-gray-400 text-sm">{t('undercover.alivePlayers', { n: alivePlayers.length })}</span>
          </div>

          <div className="bg-purple-800/50 border border-purple-500 rounded-2xl p-4 mb-6 text-center">
            <p className="text-sm text-purple-300 mb-1">{t('undercover.firstSpeaker')}</p>
            <p className="text-2xl font-bold">{t('undercover.playerN', { n: firstSpeaker })}</p>
            <button onClick={repickSpeaker} className="text-xs text-purple-400 hover:text-purple-200 mt-2 transition-colors">
              {t('undercover.repick')}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            {alivePlayers.map((p) => (
              <div key={p.id}
                className={`rounded-xl p-3 text-center transition-all ${p.id === firstSpeaker ? 'bg-purple-700 ring-2 ring-purple-400' : 'bg-gray-800'}`}>
                <p className="font-bold text-sm">{t('undercover.playerN', { n: p.id })}</p>
              </div>
            ))}
          </div>

          <p className="text-gray-500 text-sm text-center mb-6">{t('undercover.describeHint')}</p>

          <button onClick={() => setPhase('voting')}
            className="w-full py-4 bg-red-700 hover:bg-red-600 rounded-2xl font-bold text-lg transition-colors">
            {t('undercover.startVote')}
          </button>
        </div>
      )}

      {/* ── VOTING ── */}
      {phase === 'voting' && (
        <div className="max-w-sm mx-auto">
          {(() => {
            const remaining = initialUndercoverCount - eliminatedUndercoverCount
            return (
              <div className="mb-3 text-center">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${remaining === 0 ? 'bg-green-900/50 border border-green-600 text-green-300' : 'bg-red-900/50 border border-red-600 text-red-300'}`}>
                  👥 {remaining === 0 ? t('undercover.allSpiesOut') : t('undercover.remainingSpy', { n: remaining })}
                </span>
              </div>
            )
          })()}
          <Timer
            seconds={30}
            label={t('timer.voteTime')}
            onExpire={() => {
              const target = voteTarget ?? alivePlayers[Math.floor(Math.random() * alivePlayers.length)]?.id
              if (target != null) eliminateTarget(target)
            }}
          />
          <h2 className="text-xl font-bold text-center mb-2">{t('undercover.voting')}</h2>
          <p className="text-sm text-gray-400 text-center mb-6">{t('undercover.voteHint')}</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {alivePlayers.map((p) => (
              <button key={p.id} onClick={() => setVoteTarget(p.id)}
                className={`rounded-2xl py-5 text-center font-bold text-xl transition-all active:scale-95 ${voteTarget === p.id ? 'bg-red-600 ring-2 ring-red-400 scale-105' : 'bg-gray-800 hover:bg-gray-700'}`}>
                {t('undercover.playerN', { n: p.id })}
              </button>
            ))}
          </div>

          <button onClick={handleVoteConfirm} disabled={voteTarget === null}
            className="w-full py-4 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-lg transition-colors">
            {voteTarget
              ? `${t('undercover.confirmEliminate')} — ${t('undercover.playerN', { n: voteTarget })}`
              : t('undercover.confirmEliminate')}
          </button>
        </div>
      )}

      {/* ── ELIMINATED ── */}
      {phase === 'eliminated' && eliminatedPlayer && (
        <div className="max-w-sm mx-auto text-center">
          <div className="text-6xl mb-4">💀</div>
          <h2 className="text-2xl font-bold mb-2">
            {t('undercover.playerN', { n: eliminatedPlayer.id })} {t('undercover.eliminated')}
          </h2>
          <p className={`text-xl font-bold mb-1 ${roleColor(eliminatedPlayer.role)}`}>
            {t(`undercover.role_${eliminatedPlayer.role}`)}
          </p>
          {eliminatedPlayer.role === 'undercover' && eliminatedPlayer.word && (
            <p className="text-gray-400 mb-8">
              {t('undercover.theirWord')}：<span className="text-white font-bold">「{eliminatedPlayer.word}」</span>
            </p>
          )}
          {eliminatedPlayer.role !== 'undercover' && <div className="mb-8" />}
          <button onClick={continueRound}
            className="w-full py-4 bg-gray-700 hover:bg-gray-600 rounded-2xl font-bold text-lg transition-colors">
            {t('undercover.nextRound')}
          </button>
        </div>
      )}

      {/* ── WHITE BOARD GUESS ── */}
      {phase === 'wb_guess' && eliminatedPlayer && (
        <div className="max-w-sm mx-auto text-center">
          <div className="text-5xl mb-4">🕵️</div>
          <h2 className="text-xl font-bold mb-1">
            {t('undercover.playerN', { n: eliminatedPlayer.id })}
          </h2>
          <p className={`text-lg font-bold mb-4 ${roleColor('whiteboard')}`}>
            {t('undercover.role_whiteboard')}
          </p>
          <p className="text-gray-400 mb-6">{t('undercover.wbGuessHint')}</p>

          {wbGuessResult === null ? (
            <>
              <input
                value={wbGuess}
                onChange={(e) => setWbGuess(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && wbGuess.trim() && handleWbSubmit()}
                placeholder={t('undercover.wbGuessPlaceholder')}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-lg text-center mb-4 focus:outline-none focus:border-purple-500"
              />
              <button onClick={handleWbSubmit} disabled={!wbGuess.trim()}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-lg transition-colors">
                {t('undercover.submitGuess')}
              </button>
            </>
          ) : (
            <>
              <div className={`p-5 rounded-2xl mb-6 ${wbGuessResult === 'correct' ? 'bg-green-800' : 'bg-red-900/60'}`}>
                <p className="font-bold text-xl">
                  {wbGuessResult === 'correct' ? t('undercover.wbCorrect') : t('undercover.wbWrong')}
                </p>
                {wbGuessResult === 'wrong' && (
                  <p className="text-sm text-gray-300 mt-1">
                    {t('undercover.mainWordWas')}：<span className="font-bold text-white">「{mainWord}」</span>
                  </p>
                )}
              </div>
              {wbGuessResult === 'wrong' && (
                <button onClick={handleWbContinue}
                  className="w-full py-4 bg-gray-700 hover:bg-gray-600 rounded-2xl font-bold text-lg transition-colors">
                  {t('undercover.wbContinue')}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── GAME OVER ── */}
      {phase === 'gameover' && (
        <div className="max-w-sm mx-auto text-center">
          <div className="text-6xl mb-4">
            {winner === 'civilian' ? '🎉' : winner === 'undercover' ? '😈' : '🕵️'}
          </div>
          <h2 className="text-2xl font-bold mb-1">{t(`undercover.win_${winner}`)}</h2>
          <p className="text-gray-400 mb-6">
            {t('undercover.mainWordWas')}：<span className="text-white font-bold">「{mainWord}」</span>
          </p>

          <div className="bg-gray-900 rounded-2xl p-4 mb-6 text-left">
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-2">
                  {!p.alive && <span className="text-xs text-gray-600">💀</span>}
                  <span className={p.alive ? 'text-white' : 'text-gray-500'}>
                    {t('undercover.playerN', { n: p.id })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${roleColor(p.role)}`}>
                    {t(`undercover.role_${p.role}`)}
                  </span>
                  {p.word && (
                    <span className="text-gray-500 text-xs">「{p.word}」</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={reset}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold transition-colors">
              {t('undercover.newGame')}
            </button>
            <Link to="/"
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-2xl font-bold transition-colors text-center">
              {t('undercover.backHome')}
            </Link>
          </div>
        </div>
      )}
    </Layout>
  )
}
