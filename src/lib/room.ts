import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient, type RealtimeChannel } from '@supabase/supabase-js'

// Reuses the Milestone Supabase project (already used by apps.js / meetnotes / pilot).
// Only Realtime broadcast + presence are used here — no tables, no auth, no RLS.
const SUPABASE_URL = 'https://ovgbebznuxvnzdfuqypj.supabase.co'
const SUPABASE_KEY = 'sb_publishable_49NmVW0qHKVF_Npb8NndEg_kN2FITUL'

let _client: ReturnType<typeof createClient> | null = null
function client() {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 20 } },
    })
  }
  return _client
}

/** Stable per-browser id so a refresh keeps your seat. */
export function getPlayerId(): string {
  const k = 'plays-player-id'
  let id = localStorage.getItem(k)
  if (!id) {
    id = Math.random().toString(36).slice(2, 10)
    localStorage.setItem(k, id)
  }
  return id
}

export function makeRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export interface RoomPlayer {
  id: string
  name: string
  isHost: boolean
  joinedAt: number
}

type Status = 'idle' | 'connecting' | 'joined' | 'error'

interface Opts {
  code: string | null
  name: string
  isHost: boolean
  onMessage?: (msg: Record<string, unknown>, fromId: string) => void
}

/**
 * Connects to a room channel keyed by `code`. Presence drives the player roster;
 * broadcast carries game messages. Pass `code: null` to stay disconnected.
 */
export function useRoom({ code, name, isHost, onMessage }: Opts) {
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const chanRef = useRef<RealtimeChannel | null>(null)
  const msgRef = useRef(onMessage)
  const nameRef = useRef(name)
  const joinedAtRef = useRef(0)
  const myId = getPlayerId()

  // Keep the latest callback / name reachable from the subscription without
  // re-subscribing on every render.
  useEffect(() => {
    msgRef.current = onMessage
    nameRef.current = name
  })

  useEffect(() => {
    if (!code) {
      setStatus('idle')
      return
    }
    setStatus('connecting')
    joinedAtRef.current = Date.now()
    const c = client()
    const channel = c.channel(`plays:story:${code}`, {
      config: { broadcast: { self: true }, presence: { key: myId } },
    })
    chanRef.current = channel

    channel.on('broadcast', { event: 'm' }, ({ payload }) => {
      msgRef.current?.(payload.msg, payload.from)
    })
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<
        string,
        Array<{ name?: string; isHost?: boolean; joinedAt?: number }>
      >
      const list: RoomPlayer[] = Object.entries(state)
        .map(([id, metas]) => {
          const m = metas[0] || {}
          return {
            id,
            name: m.name || '?',
            isHost: !!m.isHost,
            joinedAt: m.joinedAt || 0,
          }
        })
        .sort((a, b) => a.joinedAt - b.joinedAt)
      setPlayers(list)
    })
    channel.subscribe((s) => {
      if (s === 'SUBSCRIBED') {
        channel.track({ name: nameRef.current, isHost, joinedAt: joinedAtRef.current })
        setStatus('joined')
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
        setStatus('error')
      }
    })

    return () => {
      c.removeChannel(channel)
      chanRef.current = null
    }
  }, [code, myId, isHost])

  // Push a name change into presence without changing seat order.
  useEffect(() => {
    if (status === 'joined') {
      chanRef.current?.track({ name, isHost, joinedAt: joinedAtRef.current })
    }
  }, [name, isHost, status])

  const send = useCallback(
    (msg: Record<string, unknown>) => {
      chanRef.current?.send({ type: 'broadcast', event: 'm', payload: { msg, from: myId } })
    },
    [myId],
  )

  return { players, status, send, myId }
}
