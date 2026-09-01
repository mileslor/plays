import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buildDeck, type CardCategory } from '../data/storyCards'
import { makeRoomCode, useRoom, type RoomPlayer } from '../lib/room'

type Phase = 'lobby' | 'playing' | 'ended'

interface PlayedCard {
  card: number
  by: string
  ending?: boolean
}

interface LastAction {
  type: 'play' | 'interrupt' | 'stuck'
  by: string
  card?: number
}

interface GameState {
  phase: Phase
  lang: string
  order: string[]
  names: Record<string, string>
  hands: Record<string, number[]>
  endings: Record<string, number>
  drawPile: number[]
  played: PlayedCard[]
  storyteller: string
  winner: string | null
  last: LastAction | null
}

const MIN_PLAYERS = 2
const HAND_SIZE = 6

const CAT_COLOR: Record<CardCategory | 'ending', string> = {
  character: 'bg-rose-600',
  place: 'bg-emerald-600',
  thing: 'bg-amber-600',
  event: 'bg-sky-600',
  aspect: 'bg-violet-600',
  ending: 'bg-fuchsia-700',
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Story() {
  const { t, i18n } = useTranslation()

  const [mode, setMode] = useState<'host' | 'join' | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [name, setName] = useState(() => localStorage.getItem('plays-name') || '')

  const [game, setGame] = useState<GameState | null>(null)
  const gameRef = useRef<GameState | null>(null)
  const isHost = mode === 'host'

  const applyGame = useCallback((g: GameState | null) => {
    gameRef.current = g
    setGame(g)
  }, [])

  // --- realtime wiring -------------------------------------------------------
  const sendRef = useRef<(m: Record<string, unknown>) => void>(() => {})
  const playersRef = useRef<RoomPlayer[]>([])

  const broadcastState = useCallback((g: GameState) => {
    applyGame(g)
    sendRef.current({ t: 'state', state: g as unknown as Record<string, unknown> })
  }, [applyGame])

  const advanceStoryteller = useCallback((g: GameState, from: string): string => {
    const present = new Set(playersRef.current.map((p) => p.id))
    const idx = g.order.indexOf(from)
    for (let k = 1; k <= g.order.length; k++) {
      const cand = g.order[(idx + k) % g.order.length]
      if (present.has(cand)) return cand
    }
    return from
  }, [])

  const handleMessage = useCallback(
    (msg: Record<string, unknown>, fromId: string) => {
      const type = msg.t as string

      if (type === 'state') {
        if (!isHost) applyGame((msg.state as GameState) ?? null)
        return
      }
      if (!isHost) return

      const g = gameRef.current

      if (type === 'hello') {
        if (g) sendRef.current({ t: 'state', state: g as unknown as Record<string, unknown> })
        return
      }
      if (type === 'start') {
        const roster = playersRef.current
        if (roster.length < MIN_PLAYERS) return
        const lang = i18n.language
        const { story, endings } = buildDeck(lang)
        const storyIds = shuffle(story.map((c) => c.id))
        const endingIds = shuffle(endings.map((c) => c.id))
        const order = roster.map((p) => p.id)
        const hands: Record<string, number[]> = {}
        const endMap: Record<string, number> = {}
        order.forEach((id, i) => {
          hands[id] = storyIds.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE)
          endMap[id] = endingIds[i % endingIds.length]
        })
        broadcastState({
          phase: 'playing',
          lang,
          order,
          names: Object.fromEntries(roster.map((p) => [p.id, p.name])),
          hands,
          endings: endMap,
          drawPile: storyIds.slice(order.length * HAND_SIZE),
          played: [],
          storyteller: order[Math.floor(Math.random() * order.length)],
          winner: null,
          last: null,
        })
        return
      }

      if (type === 'restart') {
        if (!g) return
        broadcastState({
          ...g,
          phase: 'lobby',
          played: [],
          hands: {},
          winner: null,
          last: null,
        })
        return
      }

      if (!g || g.phase !== 'playing') return

      if (type === 'play' || type === 'interrupt') {
        const card = msg.card as number
        const hand = g.hands[fromId] || []
        if (!hand.includes(card)) return
        const isInterrupt = type === 'interrupt'
        if (isInterrupt && fromId === g.storyteller) return
        if (!isInterrupt && fromId !== g.storyteller) return
        broadcastState({
          ...g,
          hands: { ...g.hands, [fromId]: hand.filter((c) => c !== card) },
          played: [...g.played, { card, by: fromId }],
          storyteller: isInterrupt ? fromId : g.storyteller,
          last: { type, by: fromId, card },
        })
        return
      }

      if (type === 'stuck') {
        if (fromId !== g.storyteller) return
        const draw = g.drawPile[0]
        const nextHand =
          draw != null ? [...(g.hands[fromId] || []), draw] : g.hands[fromId] || []
        broadcastState({
          ...g,
          hands: { ...g.hands, [fromId]: nextHand },
          drawPile: draw != null ? g.drawPile.slice(1) : g.drawPile,
          storyteller: advanceStoryteller(g, fromId),
          last: { type: 'stuck', by: fromId },
        })
        return
      }

      if (type === 'claimEnding') {
        if (fromId !== g.storyteller) return
        if ((g.hands[fromId] || []).length !== 0) return
        broadcastState({
          ...g,
          played: [...g.played, { card: g.endings[fromId], by: fromId, ending: true }],
          winner: fromId,
          phase: 'ended',
        })
        return
      }
    },
    [isHost, i18n.language, applyGame, broadcastState, advanceStoryteller],
  )

  const { players, status, send, myId } = useRoom({
    code,
    name: name || t('story.guest'),
    isHost,
    onMessage: handleMessage,
  })

  useEffect(() => {
    sendRef.current = send
    playersRef.current = players
  })

  // Non-host asks the host for current state once connected.
  useEffect(() => {
    if (status === 'joined' && !isHost) send({ t: 'hello' })
  }, [status, isHost, send])

  // Host re-syncs late joiners while a game is running.
  useEffect(() => {
    if (isHost && gameRef.current && gameRef.current.phase !== 'lobby') {
      send({ t: 'state', state: gameRef.current as unknown as Record<string, unknown> })
    }
  }, [players, isHost, send])

  // --- helpers -------------------------------------------------------------
  const deck = useMemo(() => buildDeck(game?.lang || i18n.language), [game?.lang, i18n.language])
  const cardText = useCallback(
    (id: number) => deck.byId.get(id)?.text ?? '?',
    [deck],
  )
  const cardCat = useCallback(
    (id: number): CardCategory | 'ending' => deck.byId.get(id)?.cat ?? 'thing',
    [deck],
  )

  const displayName = useCallback(
    (id: string) => game?.names[id] || players.find((p) => p.id === id)?.name || '?',
    [game, players],
  )

  const leave = () => {
    setCode(null)
    setMode(null)
    applyGame(null)
  }

  const startAsHost = () => {
    if (!name.trim()) return
    localStorage.setItem('plays-name', name.trim())
    setMode('host')
    setCode(makeRoomCode())
  }
  const joinRoom = (joinCode: string) => {
    if (!name.trim() || !/^\d{4}$/.test(joinCode)) return
    localStorage.setItem('plays-name', name.trim())
    setMode('join')
    setCode(joinCode)
  }

  const phase: Phase | 'entry' = !code ? 'entry' : game?.phase ?? 'lobby'
  const hostPresent = players.some((p) => p.isHost)

  // --- ENTRY -------------------------------------------------------------
  if (phase === 'entry') {
    return <Entry t={t} name={name} setName={setName} onHost={startAsHost} onJoin={joinRoom} />
  }

  const wrap =
    'min-h-screen bg-gradient-to-br from-violet-900 to-fuchsia-950 text-white flex flex-col'

  // --- LOBBY -----------------------------------------------------------------
  if (phase === 'lobby') {
    return (
      <div className={`${wrap} items-center justify-center p-6`}>
        <div className="max-w-md w-full text-center">
          <button onClick={leave} className="game-back-btn mb-6">✕ {t('story.leave')}</button>
          <p className="text-violet-300 text-sm mb-1">{t('story.roomCode')}</p>
          <div className="text-5xl font-black tracking-[0.3em] mb-2 pl-[0.3em]">{code}</div>
          <p className="text-violet-300/70 text-sm mb-8">{t('story.roomCodeHint')}</p>

          {status !== 'joined' && (
            <p className="text-amber-300 text-sm mb-4">
              {status === 'error' ? t('story.connError') : t('story.connecting')}
            </p>
          )}

          <div className="bg-white/10 rounded-2xl p-4 mb-6 text-left">
            <p className="text-xs text-violet-300 mb-2">
              {t('story.playersJoined', { n: players.length })}
            </p>
            <ul className="space-y-1">
              {players.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span>{p.isHost ? '👑' : '🙂'}</span>
                  <span>{p.name}</span>
                  {p.id === myId && <span className="text-violet-400/70">({t('story.you')})</span>}
                </li>
              ))}
            </ul>
          </div>

          {isHost ? (
            <>
              <button
                onClick={() => send({ t: 'start' })}
                disabled={players.length < MIN_PLAYERS}
                className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl text-xl font-bold transition-colors"
              >
                {t('story.startGame')}
              </button>
              {players.length < MIN_PLAYERS && (
                <p className="text-violet-300/70 text-xs mt-2">
                  {t('story.needPlayers', { n: MIN_PLAYERS })}
                </p>
              )}
            </>
          ) : (
            <p className="text-violet-200">{t('story.waitHost')}</p>
          )}

          <Link to="/" className="block mt-5 text-violet-400 hover:text-violet-200 text-sm">
            {t('story.backHome')}
          </Link>
        </div>
      </div>
    )
  }

  const g = game as GameState
  const iAmStoryteller = g.storyteller === myId
  const myHand = g.hands[myId] || []
  const myEnding = g.endings[myId]

  // --- ENDED ---------------------------------------------------------------
  if (phase === 'ended') {
    return (
      <div className={`${wrap} items-center justify-center p-6`}>
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold mb-4">
            {t('story.winner', { name: displayName(g.winner || '') })}
          </h2>
          <div className="bg-white/10 rounded-2xl p-4 mb-6 text-left max-h-72 overflow-y-auto">
            <p className="text-xs text-violet-300 mb-2">{t('story.theStory')}</p>
            <ol className="space-y-1.5 text-sm">
              {g.played.map((pc, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-violet-400/60">{i + 1}.</span>
                  <span className={pc.ending ? 'font-bold text-fuchsia-300' : ''}>
                    {cardText(pc.card)}
                  </span>
                  <span className="text-violet-400/60 ml-auto shrink-0">{displayName(pc.by)}</span>
                </li>
              ))}
            </ol>
          </div>
          {isHost ? (
            <button
              onClick={() => send({ t: 'restart' })}
              className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-2xl text-xl font-bold transition-colors"
            >
              {t('story.playAgain')}
            </button>
          ) : (
            <p className="text-violet-200">{t('story.waitHostRestart')}</p>
          )}
          <Link to="/" className="block mt-4 text-violet-400 hover:text-violet-200 text-sm">
            {t('story.backHome')}
          </Link>
        </div>
      </div>
    )
  }

  // --- PLAYING -----------------------------------------------------------------
  return (
    <div className={`${wrap} p-4`}>
      <div className="max-w-2xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between mb-3">
          <button onClick={leave} className="game-back-btn">✕</button>
          <span className="text-sm text-violet-300">
            {t('story.roomCode')} <span className="font-mono tracking-widest">{code}</span>
          </span>
          <span className="w-4" />
        </div>

        {!hostPresent && (
          <p className="text-amber-300 text-sm text-center mb-2">{t('story.hostLeft')}</p>
        )}

        {/* players strip */}
        <div className="flex flex-wrap gap-2 mb-3">
          {g.order.map((id) => (
            <span
              key={id}
              className={`text-xs px-2 py-1 rounded-full ${
                id === g.storyteller ? 'bg-fuchsia-600' : 'bg-white/10'
              }`}
            >
              {id === g.storyteller ? '👑 ' : ''}
              {displayName(id)} · {(g.hands[id] || []).length}
            </span>
          ))}
        </div>

        {/* story so far */}
        <div className="bg-white/5 rounded-2xl p-3 mb-3 flex-1 min-h-24 overflow-y-auto">
          <p className="text-xs text-violet-300 mb-2">{t('story.storySoFar')}</p>
          {g.played.length === 0 ? (
            <p className="text-violet-400/50 text-sm">{t('story.noCardsYet')}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {g.played.map((pc, i) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-1 rounded-lg text-white/90 ${CAT_COLOR[cardCat(pc.card)]} ${
                    i === g.played.length - 1 ? 'ring-2 ring-white/70' : ''
                  }`}
                  title={displayName(pc.by)}
                >
                  {cardText(pc.card)}
                </span>
              ))}
            </div>
          )}
        </div>

        {g.last && (
          <p className="text-sm text-center text-violet-200 mb-2">
            {g.last.type === 'stuck'
              ? t('story.actStuck', { name: displayName(g.last.by) })
              : g.last.type === 'interrupt'
              ? t('story.actInterrupt', {
                  name: displayName(g.last.by),
                  card: cardText(g.last.card as number),
                })
              : t('story.actPlay', {
                  name: displayName(g.last.by),
                  card: cardText(g.last.card as number),
                })}
          </p>
        )}

        {/* my turn banner */}
        <p className="text-center font-bold mb-2">
          {iAmStoryteller
            ? `🎙 ${t('story.yourTurn')}`
            : t('story.someoneTelling', { name: displayName(g.storyteller) })}
        </p>
        <p className="text-center text-violet-300/80 text-xs mb-3">
          {iAmStoryteller ? t('story.playHint') : t('story.interruptHint')}
        </p>

        {/* my hand */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {myHand.map((id) => (
            <button
              key={id}
              onClick={() => send({ t: iAmStoryteller ? 'play' : 'interrupt', card: id })}
              className={`px-3 py-3 rounded-xl text-sm font-semibold text-white/95 hover:brightness-110 active:scale-95 transition ${CAT_COLOR[cardCat(id)]}`}
            >
              {cardText(id)}
            </button>
          ))}
          {myHand.length === 0 && (
            <p className="col-span-full text-center text-violet-300/70 text-sm py-2">
              {t('story.handEmpty')}
            </p>
          )}
        </div>

        {/* ending card / stuck / finish */}
        <div className="shrink-0 space-y-2">
          {iAmStoryteller && myHand.length === 0 ? (
            <button
              onClick={() => send({ t: 'claimEnding' })}
              className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-2xl text-lg font-bold transition-colors"
            >
              🏁 {t('story.finishStory')} — “{cardText(myEnding)}”
            </button>
          ) : (
            <EndingPeek t={t} text={cardText(myEnding)} />
          )}
          {iAmStoryteller && myHand.length > 0 && (
            <button
              onClick={() => send({ t: 'stuck' })}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium text-violet-200 transition-colors"
            >
              🥴 {t('story.stuck')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------

type TFn = (key: string, opts?: Record<string, unknown>) => string

function Entry({
  t,
  name,
  setName,
  onHost,
  onJoin,
}: {
  t: TFn
  name: string
  setName: (v: string) => void
  onHost: () => void
  onJoin: (code: string) => void
}) {
  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 to-fuchsia-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl mb-4">📖</div>
        <h1 className="text-4xl font-bold mb-2">{t('story.title')}</h1>
        <p className="text-violet-300 text-lg mb-8">{t('story.tagline')}</p>

        <div className="bg-white/10 rounded-2xl p-5 text-left text-sm text-violet-100 mb-8 space-y-2">
          <p className="font-bold text-white mb-3">{t('story.howToPlay')}</p>
          <p>1. {t('story.rule1')}</p>
          <p>2. {t('story.rule2')}</p>
          <p>3. {t('story.rule3')}</p>
          <p>4. {t('story.rule4')}</p>
        </div>

        <label className="block text-sm text-violet-200 mb-1.5 font-medium">
          1. {t('story.enterNameStep')}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('story.namePlaceholder')}
          maxLength={12}
          autoFocus
          className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-center placeholder-violet-400/50 focus:outline-none focus:border-violet-400 ${
            name.trim() ? 'border-violet-500/40 mb-2' : 'border-amber-400/70 mb-2'
          }`}
        />
        <p className="text-sm mb-3 min-h-5">
          {name.trim() ? (
            <span className="text-violet-300/80">2. {t('story.pickRoomStep')}</span>
          ) : (
            <span className="text-amber-300">👆 {t('story.nameFirst')}</span>
          )}
        </p>

        {!showJoin ? (
          <div className="space-y-3">
            <button
              onClick={onHost}
              disabled={!name.trim()}
              className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 rounded-2xl text-xl font-bold transition-colors"
            >
              🎬 {t('story.createRoom')}
            </button>
            <button
              onClick={() => setShowJoin(true)}
              disabled={!name.trim()}
              className="w-full py-4 bg-white/10 hover:bg-white/20 disabled:opacity-40 rounded-2xl text-xl font-bold transition-colors"
            >
              🚪 {t('story.joinRoom')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              inputMode="numeric"
              className="w-full bg-white/10 border border-violet-500/40 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.4em] pl-[0.4em] placeholder-violet-400/40 focus:outline-none focus:border-violet-400"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && onJoin(joinCode)}
            />
            <button
              onClick={() => onJoin(joinCode)}
              disabled={joinCode.length !== 4}
              className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 rounded-2xl text-xl font-bold transition-colors"
            >
              {t('story.enterRoom')}
            </button>
            <button
              onClick={() => setShowJoin(false)}
              className="w-full py-2 text-violet-400 text-sm"
            >
              ← {t('story.back')}
            </button>
          </div>
        )}

        <Link to="/" className="block mt-5 text-violet-400 hover:text-violet-200 text-sm">
          {t('story.backHome')}
        </Link>
      </div>
    </div>
  )
}

function EndingPeek({ t, text }: { t: TFn; text: string }) {
  const [show, setShow] = useState(false)
  return (
    <button
      onClick={() => setShow((s) => !s)}
      className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-violet-200 transition-colors"
    >
      {show ? `🏁 ${t('story.yourEnding')}: “${text}”` : `👁️ ${t('story.peekEnding')}`}
    </button>
  )
}
