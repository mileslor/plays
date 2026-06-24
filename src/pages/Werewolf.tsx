import { useState, useRef, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import Timer, { type TimerHandle } from '../components/Timer'
import NightPhaseGuide from '../components/NightPhaseGuide'
import WitchPotionStatus from '../components/WitchPotionStatus'
import { ROLE_CONFIG, PRESETS, type WerewolfRole } from '../data/werewolfRoles'

type Phase =
  | 'setup'
  | 'reveal'       // pass phone — each player sees role
  | 'night_intro'  // all close eyes
  | 'night_wolves' // wolves act
  | 'night_seer'   // seer checks
  | 'night_witch'  // witch acts
  | 'dawn'         // reveal who died
  | 'day'          // discussion
  | 'voting'
  | 'eliminated'
  | 'hunter_shot'  // hunter gets to shoot
  | 'gameover'

interface Player {
  id: number
  role: WerewolfRole
  alive: boolean
}

export default function Werewolf() {
  const { t } = useTranslation()

  // Setup
  const [preset, setPreset] = useState(() => Number(localStorage.getItem('werewolf-preset')) || 0)
  const [customRoles] = useState<WerewolfRole[]>([])
  const [useCustom] = useState(false)

  // Game state
  const [phase, setPhase] = useState<Phase>('setup')
  const [players, setPlayers] = useState<Player[]>([])
  const [night, setNight] = useState(1)
  const [revealIndex, setRevealIndex] = useState(0)
  const [wordShowing, setWordShowing] = useState(false)
  const [showTapHint, setShowTapHint] = useState(false)

  // Night actions
  const [wolfTarget, setWolfTarget] = useState<number | null>(null)
  const [witchSaved, setWitchSaved] = useState(false)
  const [witchDeclinedSave, setWitchDeclinedSave] = useState(false)
  const [witchPoisoned, setWitchPoisoned] = useState<number | null>(null)
  const [witchSaveUsed, setWitchSaveUsed] = useState(false)
  const [witchPoisonUsed, setWitchPoisonUsed] = useState(false)
  const [seerTarget, setSeerTarget] = useState<number | null>(null)
  const [seerResult, setSeerResult] = useState<'wolf' | 'good' | null>(null)
  const [nightDead, setNightDead] = useState<number[]>([])

  // Day/vote state
  const [voteTarget, setVoteTarget] = useState<number | null>(null)
  const [eliminatedPlayer, setEliminatedPlayer] = useState<Player | null>(null)
  const [hunterTarget, setHunterTarget] = useState<number | null>(null)
  const [winner, setWinner] = useState<'wolf' | 'good' | null>(null)

  // Dawn animation
  const [dawnAnimating, setDawnAnimating] = useState(false)

  // Speaker order tracking
  const [speakerOrder, setSpeakerOrder] = useState<number[]>([])
  const [currentSpeakerIndex, setCurrentSpeakerIndex] = useState(0)
  const [skippedSpeakers, setSkippedSpeakers] = useState<Set<number>>(new Set())
  const [timerPaused, setTimerPaused] = useState(false)
  const dayTimerRef = useRef<TimerHandle>(null)
  const [voteTimerPaused, setVoteTimerPaused] = useState(false)
  const voteTimerRef = useRef<TimerHandle>(null)

  const lastTapRef = useRef<number>(0)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (phase === 'dawn') {
      setDawnAnimating(true)
      const t = setTimeout(() => setDawnAnimating(false), 1500)
      return () => clearTimeout(t)
    }
  }, [phase])

  const roles = useCustom ? customRoles : PRESETS[preset].roles
  const alivePlayers = players.filter((p) => p.alive)

  // ── Helpers ──

  const roleOf = (id: number) => players.find((p) => p.id === id)?.role
  const hasRole = (role: WerewolfRole) => players.some((p) => p.role === role && p.alive)

  const checkWin = (alive: Player[]): 'wolf' | 'good' | null => {
    const wolves = alive.filter((p) => p.role === 'werewolf')
    const good = alive.filter((p) => p.role !== 'werewolf')
    if (wolves.length === 0) return 'good'
    if (wolves.length >= good.length) return 'wolf'
    return null
  }

  const killPlayers = (ids: number[]) => {
    return players.map((p) => (ids.includes(p.id) ? { ...p, alive: false } : p))
  }

  // ── Double-tap reveal ──

  const handleRevealTap = () => {
    if (wordShowing) {
      setWordShowing(false)
      setShowTapHint(false)
      lastTapRef.current = 0
      if (revealIndex + 1 >= players.length) {
        setPhase('night_intro')
      } else {
        setRevealIndex((i) => i + 1)
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

  // ── Start game ──

  const startGame = () => {
    const shuffled = [...roles].sort(() => Math.random() - 0.5)
    const newPlayers: Player[] = shuffled.map((role, i) => ({
      id: i + 1,
      role,
      alive: true,
    }))
    setPlayers(newPlayers)
    setNight(1)
    setRevealIndex(0)
    setWordShowing(false)
    setWitchSaveUsed(false)
    setWitchPoisonUsed(false)
    setPhase('reveal')
  }

  // ── Night flow ──

  const startNight = () => {
    setWolfTarget(null)
    setWitchSaved(false)
    setWitchDeclinedSave(false)
    setWitchPoisoned(null)
    setSeerTarget(null)
    setSeerResult(null)
    setPhase('night_intro')
  }

  const afterNightIntro = () => setPhase('night_wolves')

  const confirmWolfKill = () => setPhase(hasRole('seer') ? 'night_seer' : hasRole('witch') ? 'night_witch' : 'dawn')

  const confirmSeer = () => {
    if (seerTarget === null) return
    const role = roleOf(seerTarget)
    setSeerResult(role === 'werewolf' ? 'wolf' : 'good')
  }

  const afterSeer = () => {
    setSeerTarget(null)
    setSeerResult(null)
    setPhase(hasRole('witch') ? 'night_witch' : 'dawn')
  }

  const afterWitch = () => resolveDawn()

  const resolveDawn = () => {
    const dead: number[] = []
    if (wolfTarget !== null && !witchSaved) dead.push(wolfTarget)
    if (witchPoisoned !== null) dead.push(witchPoisoned)
    setNightDead(dead)
    const updated = killPlayers(dead)
    setPlayers(updated)
    const w = checkWin(updated.filter((p) => p.alive))
    if (w) { setWinner(w); setPhase('gameover'); return }
    clearSpeakerState()
    setPhase('dawn')
  }

  // ── Day / vote ──

  const eliminateTarget = (targetId: number) => {
    const target = players.find((p) => p.id === targetId)!
    const updated = killPlayers([targetId])
    setPlayers(updated)
    setEliminatedPlayer(target)
    setVoteTarget(null)
    if (target.role === 'hunter') {
      setPhase('hunter_shot')
      return
    }
    const w = checkWin(updated.filter((p) => p.alive))
    if (w) { setWinner(w); setPhase('gameover'); return }
    setPhase('eliminated')
  }

  const handleVoteConfirm = () => {
    if (voteTarget === null) return
    eliminateTarget(voteTarget)
  }

  // ── Speaker order ──

  const spokenIds = useMemo(() => new Set(speakerOrder), [speakerOrder])

  const advanceToNextSpeaker = () => {
    const next = currentSpeakerIndex + 1
    if (next >= alivePlayers.length) {
      setPhase('voting')
      setVoteTimerPaused(false)
    } else {
      setTimerPaused(false)
      setCurrentSpeakerIndex(next)
    }
  }

  const markCurrentSpeakerDone = () => {
    const current = alivePlayers[currentSpeakerIndex]
    if (!current) return
    if (!spokenIds.has(current.id)) {
      setSpeakerOrder((prev) => [...prev, current.id])
    }
    advanceToNextSpeaker()
  }

  const skipCurrentSpeaker = () => {
    const current = alivePlayers[currentSpeakerIndex]
    if (!current) return
    setSkippedSpeakers((prev) => new Set(prev).add(current.id))
    if (!spokenIds.has(current.id)) {
      setSpeakerOrder((prev) => [...prev, current.id])
    }
    advanceToNextSpeaker()
  }

  const finishAllSpeakers = () => {
    // Mark remaining as spoken in order
    const remaining = alivePlayers
      .filter((p) => !spokenIds.has(p.id))
      .map((p) => p.id)
    setSpeakerOrder((prev) => [...prev, ...remaining])
    setPhase('voting')
    setVoteTimerPaused(false)
  }

  // Clear speaker state when entering night
  const clearSpeakerState = () => {
    setSpeakerOrder([])
    setCurrentSpeakerIndex(0)
    setSkippedSpeakers(new Set())
    setTimerPaused(false)
  }

  const toggleTimerPause = () => {
    if (timerPaused) {
      dayTimerRef.current?.resume()
      setTimerPaused(false)
    } else {
      dayTimerRef.current?.pause()
      setTimerPaused(true)
    }
  }

  const handleHunterShoot = (targetId: number | null) => {
    let updated = players
    if (targetId !== null) {
      updated = killPlayers([targetId])
      setPlayers(updated)
    }
    const w = checkWin(updated.filter((p) => p.alive))
    if (w) { setWinner(w); setPhase('gameover'); return }
    setPhase('eliminated')
  }

  const continueToNight = () => {
    setEliminatedPlayer(null)
    setNight((n) => n + 1)
    startNight()
  }

  const reset = () => {
    setPhase('setup')
    setPlayers([])
    setNight(1)
    setRevealIndex(0)
    setWordShowing(false)
    setWolfTarget(null)
    setWitchSaved(false)
    setWitchDeclinedSave(false)
    setWitchPoisoned(null)
    setWitchSaveUsed(false)
    setWitchPoisonUsed(false)
    setSeerTarget(null)
    setSeerResult(null)
    setNightDead([])
    setVoteTarget(null)
    setEliminatedPlayer(null)
    setHunterTarget(null)
    setWinner(null)
    clearSpeakerState()
  }

  const rc = (role: WerewolfRole) => ROLE_CONFIG[role]

  return (
    <Layout>

      {/* ── SETUP ── */}
      {phase === 'setup' && (
        <div className="max-w-sm mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-center">{t('werewolf.title')}</h1>

          <p className="text-xs text-gray-500 mb-3 text-center uppercase tracking-widest">{t('werewolf.preset')}</p>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {PRESETS.map((p, i) => (
              <button key={i} onClick={() => { setPreset(i); localStorage.setItem('werewolf-preset', String(i)) }}
                className={`rounded-xl py-3 font-bold text-sm transition-all ${!useCustom && preset === i ? 'bg-red-700 ring-2 ring-red-400 scale-105' : 'bg-gray-800 hover:bg-gray-700'}`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Role summary */}
          <div className="bg-gray-900 rounded-2xl p-4 mb-6">
            {Object.entries(
              (useCustom ? customRoles : PRESETS[preset].roles).reduce<Record<string, number>>((acc, r) => {
                acc[r] = (acc[r] || 0) + 1; return acc
              }, {})
            ).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between py-1.5">
                <span className={`font-medium ${rc(role as WerewolfRole).color}`}>
                  {rc(role as WerewolfRole).emoji} {t(`werewolf.role_${role}`)}
                </span>
                <span className="text-gray-400 text-sm">×{count}</span>
              </div>
            ))}
          </div>

          <button onClick={startGame}
            className="w-full py-4 bg-red-700 hover:bg-red-600 rounded-2xl font-bold text-lg transition-colors">
            {t('werewolf.startGame')}
          </button>
        </div>
      )}

      {/* ── REVEAL ── */}
      {phase === 'reveal' && (
        <div className="max-w-sm mx-auto text-center select-none">
          <p className="text-gray-400 text-sm mb-1">
            {t('werewolf.progress', { current: revealIndex + 1, total: players.length })}
          </p>
          <h2 className="text-2xl font-bold mb-8">
            {t('undercover.playerN', { n: revealIndex + 1 })}
          </h2>
          <div
            onTouchEnd={(e) => { e.preventDefault(); handleRevealTap() }}
            onClick={handleRevealTap}
            className={`w-full min-h-64 rounded-3xl flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all ${wordShowing ? 'bg-gray-700' : showTapHint ? 'bg-gray-700' : 'bg-gray-800'}`}
          >
            {wordShowing ? (() => {
              const p = players[revealIndex]
              const cfg = rc(p.role)
              return (
                <>
                  <p className="text-sm text-gray-400 mb-3">{t('werewolf.yourRole')}</p>
                  <span className="text-6xl mb-3">{cfg.emoji}</span>
                  <p className={`text-3xl font-bold mb-2 ${cfg.color}`}>{t(`werewolf.role_${p.role}`)}</p>
                  <p className="text-xs text-gray-400 mb-4 px-6">{t(`werewolf.ability_${p.role}`)}</p>
                  <p className="text-xs text-gray-500">{t('werewolf.tapToHide')}</p>
                </>
              )
            })() : showTapHint ? (
              <>
                <span className="text-4xl mb-3">☝️</span>
                <p className="text-xl text-white font-bold">{t('werewolf.tapAgain')}</p>
              </>
            ) : (
              <>
                <span className="text-5xl mb-4">🫣</span>
                <p className="text-lg text-gray-300">{t('werewolf.doubleTapReveal')}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── NIGHT INTRO ── */}
      {phase === 'night_intro' && (
        <div className="max-w-sm mx-auto text-center">
          <div className="text-8xl mb-4">🌙</div>
          <h2 className="text-3xl font-bold mb-3">{t('werewolf.roundN', { n: night })}</h2>
          <p className="text-xl text-gray-300 mb-10">{t('werewolf.allClose')}</p>
          <button onClick={afterNightIntro}
            className="w-full py-5 bg-gray-700 hover:bg-gray-600 rounded-2xl font-bold text-xl transition-colors">
            {t('werewolf.role_werewolf')} 🐺
          </button>
        </div>
      )}

      {/* ── WOLVES ACT ── */}
      {phase === 'night_wolves' && (
        <div className="max-w-sm mx-auto">
          <NightPhaseGuide phase="werewolf" title={t('werewolf.werewolvesOpen')} hint={t('werewolf.werewolfHint')} />
          <div className="grid grid-cols-2 gap-3 mb-6">
            {alivePlayers.filter((p) => p.role !== 'werewolf').map((p) => (
              <button key={p.id} onClick={() => setWolfTarget(p.id)}
                className={`rounded-2xl py-5 text-center font-bold text-xl transition-all active:scale-95 ${wolfTarget === p.id ? 'bg-red-700 ring-2 ring-red-400 scale-105' : 'bg-gray-800 hover:bg-gray-700'}`}>
                {t('undercover.playerN', { n: p.id })}
              </button>
            ))}
          </div>
          <button onClick={confirmWolfKill} disabled={wolfTarget === null}
            className="w-full py-4 bg-red-800 hover:bg-red-700 disabled:opacity-40 rounded-2xl font-bold text-lg transition-colors">
            {t('werewolf.werewolvesClose')}
          </button>
        </div>
      )}

      {/* ── SEER ── */}
      {phase === 'night_seer' && (
        <div className="max-w-sm mx-auto">
          <NightPhaseGuide phase="seer" title={t('werewolf.seerOpen')} hint={t('werewolf.seerHint')} />
          {seerResult === null ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {alivePlayers.map((p) => (
                  <button key={p.id} onClick={() => setSeerTarget(p.id)}
                    className={`rounded-2xl py-5 text-center font-bold text-xl transition-all active:scale-95 ${seerTarget === p.id ? 'bg-purple-700 ring-2 ring-purple-400 scale-105' : 'bg-gray-800 hover:bg-gray-700'}`}>
                    {t('undercover.playerN', { n: p.id })}
                  </button>
                ))}
              </div>
              <button onClick={confirmSeer} disabled={seerTarget === null}
                className="w-full py-4 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 rounded-2xl font-bold text-lg transition-colors">
                🔮
              </button>
            </>
          ) : (
            <div className="text-center">
              <p className="text-xl font-bold mb-2">{t('undercover.playerN', { n: seerTarget })}</p>
              <div className={`text-2xl font-bold p-6 rounded-2xl mb-6 ${seerResult === 'wolf' ? 'bg-red-900/60' : 'bg-green-900/60'}`}>
                {t(`werewolf.seerResult_${seerResult}`)}
              </div>
              <button onClick={afterSeer}
                className="w-full py-4 bg-gray-700 hover:bg-gray-600 rounded-2xl font-bold text-lg transition-colors">
                {t('werewolf.seerClose')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── WITCH ── */}
      {phase === 'night_witch' && (
        <div className="max-w-sm mx-auto">
          <NightPhaseGuide phase="witch" title={t('werewolf.witchOpen')} hint={t('werewolf.witchHint')} />
          {/* 解藥/毒藥狀態 */}
          <WitchPotionStatus witchSaveUsed={witchSaveUsed} witchPoisonUsed={witchPoisonUsed} />

          {/* Save */}
          {wolfTarget !== null && !witchSaveUsed && !witchSaved && !witchDeclinedSave && (
            <div className="bg-gray-900 rounded-2xl p-4 mb-4">
              <p className="text-sm text-gray-400 mb-3">
                {t('werewolf.witchSave', { n: wolfTarget })}
              </p>
              <div className="flex gap-3">
                <button onClick={() => { setWitchSaved(true); setWitchSaveUsed(true) }}
                  className="flex-1 py-3 bg-green-700 hover:bg-green-600 rounded-xl font-bold transition-colors">
                  {t('werewolf.yes')}
                </button>
                <button onClick={() => setWitchDeclinedSave(true)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-colors">
                  {t('werewolf.no')}
                </button>
              </div>
            </div>
          )}
          {witchSaved && (
            <div className="bg-green-900/40 rounded-2xl p-3 mb-4 text-center text-green-400 font-bold">
              {t('werewolf.witchSavedConfirm', { n: wolfTarget })}
            </div>
          )}
          {witchDeclinedSave && !witchSaved && (
            <div className="bg-gray-800 rounded-2xl p-3 mb-4 text-center text-gray-500 text-sm">
              {t('werewolf.witchDeclinedSave')}
            </div>
          )}

          {/* Poison */}
          {!witchPoisonUsed && witchPoisoned === null && (
            <div className="bg-gray-900 rounded-2xl p-4 mb-4">
              <p className="text-sm text-gray-400 mb-3">{t('werewolf.witchPoison')}</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {alivePlayers.map((p) => (
                  <button key={p.id} onClick={() => setWitchPoisoned(p.id)}
                    className="rounded-xl py-3 text-sm font-bold bg-gray-700 hover:bg-red-800 transition-colors">
                    {t('undercover.playerN', { n: p.id })}
                  </button>
                ))}
              </div>
              <button onClick={() => setWitchPoisoned(-1)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                {t('werewolf.witchSkipPoison')}
              </button>
            </div>
          )}
          {witchPoisoned !== null && witchPoisoned > 0 && (
            <div className="bg-red-900/40 rounded-2xl p-3 mb-4 text-center text-red-400 font-bold">
              {t('werewolf.witchPoisonedConfirm', { n: witchPoisoned })}
            </div>
          )}

          <button
            onClick={() => {
              if (witchPoisoned !== null && witchPoisoned > 0) setWitchPoisonUsed(true)
              afterWitch()
            }}
            disabled={witchPoisoned === null && wolfTarget !== null && !witchSaved && !witchSaveUsed && !witchDeclinedSave}
            className="w-full py-4 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-2xl font-bold text-lg transition-colors">
            {t('werewolf.witchClose')}
          </button>
        </div>
      )}

      {/* ── DAWN ── */}
      {phase === 'dawn' && (
        <div className="max-w-sm mx-auto text-center">
          {dawnAnimating ? (
            <div className="animate-fadeIn flex flex-col items-center justify-center min-h-64">
              <div className="text-8xl mb-6">🌅</div>
              <h2 className="text-4xl font-bold text-white">{t('werewolf.nightResult')}</h2>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <div className="text-6xl mb-4">🌅</div>
              <h2 className="text-2xl font-bold mb-4">{t('werewolf.nightResult')}</h2>
              {nightDead.length === 0 ? (
                <p className="text-xl text-gray-300 mb-8">{t('werewolf.peacefulNight')}</p>
              ) : (
                <div className="mb-8">
                  {nightDead.map((id) => {
                    const dead = players.find((p) => p.id === id)
                    if (!dead) return null
                    const cfg = rc(dead.role)
                    return (
                      <div key={id} className="bg-gray-900 rounded-2xl p-4 mb-3 flex items-center gap-4">
                        <span className="text-4xl">{cfg.emoji}</span>
                        <div className="text-left">
                          <p className="text-sm text-gray-400">{t('undercover.playerN', { n: id })}</p>
                          <p className={`text-lg font-bold ${cfg.color}`}>{t(`werewolf.role_${dead.role}`)}</p>
                        </div>
                        <span className="ml-auto text-gray-500 text-2xl">💀</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <button onClick={() => { clearSpeakerState(); setPhase('day') }}
                className="w-full py-4 bg-yellow-700 hover:bg-yellow-600 rounded-2xl font-bold text-lg transition-colors">
                {t('werewolf.discuss')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── DAY ── */}
      {phase === 'day' && (
        <div className="max-w-sm mx-auto">
          {/* Speaker Progress Indicator */}
          <div className="bg-gray-900 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">
                {t('speaker.speakerProgress', { current: speakerOrder.length, total: alivePlayers.length })}
              </span>
              <div className="flex items-center gap-2">
                {speakerOrder.length === alivePlayers.length && (
                  <span className="text-xs text-green-400 font-bold">✅</span>
                )}
                {speakerOrder.length > 0 && (
                  <button
                    onClick={clearSpeakerState}
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
                style={{ width: `${alivePlayers.length > 0 ? (speakerOrder.length / alivePlayers.length) * 100 : 0}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {alivePlayers.map((p, idx) => {
                const spoken = spokenIds.has(p.id)
                const skipped = skippedSpeakers.has(p.id)
                const current = idx === currentSpeakerIndex
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      current
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : spoken
                          ? skipped
                            ? 'bg-gray-800 border border-gray-700 text-gray-500 line-through'
                            : 'bg-green-900/50 border border-green-700 text-green-300'
                          : 'bg-gray-800 border border-gray-600 text-gray-400'
                    }`}
                  >
                    {current && '🎤 '}
                    {spoken && !current && !skipped && '✅ '}
                    <span>{t('undercover.playerN', { n: p.id })}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <Timer ref={dayTimerRef} key={currentSpeakerIndex} seconds={60} onExpire={markCurrentSpeakerDone} label={t('timer.speechTime')} />
          <div className="flex justify-center mb-2">
            <button
              onClick={toggleTimerPause}
              className="px-5 py-1.5 rounded-full text-sm font-medium bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              {timerPaused ? t('timer.resume') : t('timer.pause')}
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{t('werewolf.dayPhase')}</h2>
              <p className="text-xs text-gray-500">{t('werewolf.roundN', { n: night })}</p>
            </div>
            <span className="text-sm text-gray-400">
              {t('werewolf.alive')} {alivePlayers.length}
            </span>
          </div>

          {/* Current speaker highlight */}
          {alivePlayers[currentSpeakerIndex] && (
            <div className="bg-yellow-900/30 border-2 border-yellow-600 rounded-2xl p-4 mb-4 text-center">
              <p className="text-xs text-yellow-400 uppercase tracking-widest mb-1">{t('speaker.current')}</p>
              <p className="text-2xl font-bold text-yellow-200">
                {t('undercover.playerN', { n: alivePlayers[currentSpeakerIndex].id })}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-4">
            {alivePlayers.map((p, idx) => (
              <div
                key={p.id}
                className={`rounded-xl p-3 text-center transition-all ${
                  idx === currentSpeakerIndex
                    ? 'bg-yellow-800 ring-2 ring-yellow-400'
                    : spokenIds.has(p.id)
                      ? 'bg-gray-800 opacity-60'
                      : 'bg-gray-800'
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

          {/* Speaker controls */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={markCurrentSpeakerDone}
              disabled={!alivePlayers[currentSpeakerIndex] || spokenIds.has(alivePlayers[currentSpeakerIndex]?.id)}
              className="flex-1 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-40 rounded-xl font-bold transition-colors"
            >
              {t('speaker.speechComplete')}
            </button>
            <button
              onClick={skipCurrentSpeaker}
              disabled={!alivePlayers[currentSpeakerIndex]}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-xl font-bold transition-colors"
            >
              {t('speaker.skipped')}
            </button>
          </div>

          <button
            onClick={finishAllSpeakers}
            className="w-full py-3 bg-red-700 hover:bg-red-600 rounded-xl font-bold text-base transition-colors"
          >
            {t('speaker.allSpoken')}
          </button>
        </div>
      )}

      {/* ── VOTING ── */}
      {phase === 'voting' && (
        <div className="max-w-sm mx-auto">
          <Timer
            ref={voteTimerRef}
            seconds={30}
            label={t('timer.voteTime')}
            onExpire={() => {
              const target = voteTarget ?? alivePlayers[Math.floor(Math.random() * alivePlayers.length)]?.id
              if (target != null) eliminateTarget(target)
            }}
          />
          <div className="flex justify-center mb-2">
            <button
              onClick={() => {
                if (voteTimerPaused) { voteTimerRef.current?.resume(); setVoteTimerPaused(false) }
                else { voteTimerRef.current?.pause(); setVoteTimerPaused(true) }
              }}
              className="px-5 py-1.5 rounded-full text-sm font-medium bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              {voteTimerPaused ? t('timer.resume') : t('timer.pause')}
            </button>
          </div>
          <h2 className="text-xl font-bold text-center mb-2">{t('werewolf.voting')}</h2>
          <p className="text-sm text-gray-400 text-center mb-6">{t('werewolf.voteHint')}</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {alivePlayers.map((p) => (
              <button key={p.id} onClick={() => setVoteTarget(p.id)}
                className={`rounded-2xl py-5 text-center font-bold text-xl transition-all active:scale-95 ${voteTarget === p.id ? 'bg-red-600 ring-2 ring-red-400 scale-105' : 'bg-gray-800 hover:bg-gray-700'}`}>
                {t('undercover.playerN', { n: p.id })}
              </button>
            ))}
          </div>
          <button onClick={handleVoteConfirm} disabled={voteTarget === null}
            className="w-full py-4 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded-2xl font-bold text-lg transition-colors">
            {voteTarget ? `${t('werewolf.confirmEliminate')} — ${t('undercover.playerN', { n: voteTarget })}` : t('werewolf.confirmEliminate')}
          </button>
        </div>
      )}

      {/* ── ELIMINATED ── */}
      {phase === 'eliminated' && eliminatedPlayer && (
        <div className="max-w-sm mx-auto text-center">
          <div className="text-6xl mb-4">{rc(eliminatedPlayer.role).emoji}</div>
          <h2 className="text-2xl font-bold mb-2">
            {t('undercover.playerN', { n: eliminatedPlayer.id })} {t('werewolf.eliminated')}
          </h2>
          <p className={`text-xl font-bold mb-8 ${rc(eliminatedPlayer.role).color}`}>
            {t(`werewolf.role_${eliminatedPlayer.role}`)}
          </p>
          <button onClick={continueToNight}
            className="w-full py-4 bg-gray-800 hover:bg-gray-700 rounded-2xl font-bold text-lg transition-colors">
            {t('werewolf.nextNight')}
          </button>
        </div>
      )}

      {/* ── HUNTER SHOT ── */}
      {phase === 'hunter_shot' && (
        <div className="max-w-sm mx-auto text-center">
          <NightPhaseGuide
            phase="hunter"
            title={t('werewolf.hunterShot')}
            hint={eliminatedPlayer ? `${t('werewolf.role_hunter')} — ${t('undercover.playerN', { n: eliminatedPlayer.id })}` : t('werewolf.role_hunter')}
          />
          <div className="grid grid-cols-2 gap-3 mb-4">
            {alivePlayers.map((p) => (
              <button key={p.id} onClick={() => setHunterTarget(p.id)}
                className={`rounded-2xl py-4 text-center font-bold text-lg transition-all ${hunterTarget === p.id ? 'bg-orange-700 ring-2 ring-orange-400 scale-105' : 'bg-gray-800 hover:bg-gray-700'}`}>
                {t('undercover.playerN', { n: p.id })}
              </button>
            ))}
          </div>
          <button onClick={() => handleHunterShoot(hunterTarget)}
            className="w-full py-4 bg-orange-700 hover:bg-orange-600 rounded-2xl font-bold text-lg transition-colors mb-2">
            {hunterTarget ? t('werewolf.hunterShootConfirm', { n: hunterTarget }) : t('werewolf.skipShot')}
          </button>
          {hunterTarget && (
            <button onClick={() => handleHunterShoot(null)}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
              {t('werewolf.skipShot')}
            </button>
          )}
        </div>
      )}

      {/* ── GAME OVER ── */}
      {phase === 'gameover' && (
        <div className="max-w-sm mx-auto text-center">
          <div className="text-6xl mb-4">{winner === 'wolf' ? '😈' : '🎉'}</div>
          <h2 className="text-2xl font-bold mb-6">
            {t(winner === 'wolf' ? 'werewolf.wolfWin' : 'werewolf.goodWin')}
          </h2>
          <div className="bg-gray-900 rounded-2xl p-4 mb-6 text-left">
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-2">
                  {!p.alive && <span className="text-xs text-gray-600">💀</span>}
                  <span className={p.alive ? 'text-white' : 'text-gray-500'}>
                    {t('undercover.playerN', { n: p.id })}
                  </span>
                </div>
                <span className={`text-sm font-bold ${rc(p.role).color}`}>
                  {rc(p.role).emoji} {t(`werewolf.role_${p.role}`)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={reset}
              className="flex-1 py-3 bg-red-700 hover:bg-red-600 rounded-2xl font-bold transition-colors">
              {t('werewolf.newGame')}
            </button>
            <Link to="/"
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-2xl font-bold transition-colors text-center">
              {t('werewolf.backHome')}
            </Link>
          </div>
        </div>
      )}

    </Layout>
  )
}
