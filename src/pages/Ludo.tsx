import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'

// ── Board constants ────────────────────────────────────────

// 52-square outer path (clockwise), starting from Red's start square
const MAIN_PATH: [number, number][] = [
  [6,1],[6,2],[6,3],[6,4],[6,5],                          // 0-4:  Red straight →
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],                    // 5-10: ↑ left column
  [0,7],                                                    // 11:   top-centre-left
  [0,8],                                                    // 12:   top-centre-right (Blue safe)
  [1,8],[2,8],[3,8],[4,8],[5,8],                          // 13-17: Blue straight ↓
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],               // 18-23: right-side top →
  [7,14],                                                   // 24:   right-centre-top
  [8,14],                                                   // 25:   right-centre-bottom (Green safe)
  [8,13],[8,12],[8,11],[8,10],[8,9],                      // 26-30: Green straight ←
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],               // 31-36: right column ↓
  [14,7],                                                   // 37:   bottom-centre-right
  [14,6],                                                   // 38:   bottom-centre-left (Yellow safe)
  [13,6],[12,6],[11,6],[10,6],[9,6],                      // 39-43: Yellow straight ↑
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],                    // 44-49: left-side bottom ←
  [7,0],                                                    // 50:   left-centre-bottom
  [6,0],                                                    // 51:   left-centre-top (Red safe)
]

// 5 coloured home-column squares per player (leading toward centre)
const HOME_PATH: [number, number][][] = [
  [[7,1],[7,2],[7,3],[7,4],[7,5]],      // Red  → right
  [[1,7],[2,7],[3,7],[4,7],[5,7]],      // Blue ↓ down
  [[7,13],[7,12],[7,11],[7,10],[7,9]],  // Green ← left
  [[13,7],[12,7],[11,7],[10,7],[9,7]],  // Yellow ↑ up
]

// Where on MAIN_PATH each player's start square is
const START_OFFSET = [0, 13, 26, 39]

// Four token positions within each corner base
const BASE_POSITIONS: [number, number][][] = [
  [[1,1],[1,4],[4,1],[4,4]],          // Red   (top-left)
  [[1,10],[1,13],[4,10],[4,13]],      // Blue  (top-right)
  [[10,10],[10,13],[13,10],[13,13]], // Green (bottom-right)
  [[10,1],[10,4],[13,1],[13,4]],     // Yellow (bottom-left)
]

// Safe squares (absolute MAIN_PATH index, 0–51) — purely cosmetic (no eating mechanic)
const SAFE_SET = new Set([0, 8, 12, 13, 21, 25, 26, 34, 38, 39, 47, 51])

const PLAYER_HEX  = ['#ef4444','#3b82f6','#22c55e','#eab308']
const PLAYER_BG   = ['bg-red-600','bg-blue-600','bg-green-600','bg-yellow-500']
const PLAYER_LIGHT = ['bg-red-950','bg-blue-950','bg-green-950','bg-yellow-950']
const PLAYER_HOME  = ['bg-red-400','bg-blue-400','bg-green-400','bg-yellow-400']
const PLAYER_TRI   = ['bg-red-700','bg-blue-700','bg-green-700','bg-yellow-700']
const PLAYER_NAME  = ['紅隊','藍隊','綠隊','黃隊']
const PLAYER_EMOJI = ['🔴','🔵','🟢','🟡']
const DICE_FACE    = ['⚀','⚁','⚂','⚃','⚄','⚅']

const CELL_PX = 28  // board = 15 × 28 = 420 px — fits most screens

// ── Types ─────────────────────────────────────────────────

// -1 = in base; 0-51 = main path (relative to player start)
// 52-56 = home column; 57 = won (centre)
type PiecePos = number

type GameState = {
  phase: 'setup' | 'game' | 'over'
  numPlayers: number
  pieces: PiecePos[][]
  currentPlayer: number
  dice: number | null
  rolled: boolean
  noMoves: boolean
  winner: number | null
}

// ── Board cell type ────────────────────────────────────────

type CellType =
  | 'empty'
  | 'path'
  | 'safe'
  | 'centre'
  | { base: number }
  | { home: number }
  | { tri: number }

function classifyCell(r: number, c: number): CellType {
  // Centre 3×3 — check first to override path/base
  if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
    if (r === 6 && c === 6) return { tri: 0 }
    if (r === 6 && c === 8) return { tri: 1 }
    if (r === 8 && c === 8) return { tri: 2 }
    if (r === 8 && c === 6) return { tri: 3 }
    return 'centre'
  }
  // Home columns
  for (let p = 0; p < 4; p++) {
    for (const [hr, hc] of HOME_PATH[p]) {
      if (hr === r && hc === c) return { home: p }
    }
  }
  // Main path
  for (let i = 0; i < MAIN_PATH.length; i++) {
    const [pr, pc] = MAIN_PATH[i]
    if (pr === r && pc === c) return SAFE_SET.has(i) ? 'safe' : 'path'
  }
  // Corner bases
  if (r < 6 && c < 6)   return { base: 0 }
  if (r < 6 && c > 8)   return { base: 1 }
  if (r > 8 && c > 8)   return { base: 2 }
  if (r > 8 && c < 6)   return { base: 3 }
  return 'empty'
}

const BOARD: CellType[][] = Array.from({ length: 15 }, (_, r) =>
  Array.from({ length: 15 }, (_, c) => classifyCell(r, c))
)

// ── Game logic helpers ────────────────────────────────────

function getCoord(player: number, pieceIdx: number, pos: PiecePos): [number, number] {
  if (pos === -1)  return BASE_POSITIONS[player][pieceIdx]
  if (pos === 57)  return [7, 7]
  if (pos < 52)    return MAIN_PATH[(START_OFFSET[player] + pos) % 52]
  return HOME_PATH[player][pos - 52]
}

function canMove(pos: PiecePos, dice: number): boolean {
  if (pos === 57)  return false
  if (pos === -1)  return dice === 6
  return pos + dice <= 57
}

function advancePos(pos: PiecePos, dice: number): PiecePos {
  if (pos === -1) return 0
  return Math.min(pos + dice, 57)
}

// ── Component ─────────────────────────────────────────────

export default function Ludo() {
  const [state, setState] = useState<GameState>({
    phase: 'setup',
    numPlayers: 4,
    pieces: [],
    currentPlayer: 0,
    dice: null,
    rolled: false,
    noMoves: false,
    winner: null,
  })

  // Auto-pass when no moves available
  useEffect(() => {
    if (!state.rolled || !state.noMoves || state.phase !== 'game') return
    const t = setTimeout(() => {
      setState(s => ({
        ...s,
        rolled: false,
        dice: null,
        noMoves: false,
        currentPlayer: (s.currentPlayer + 1) % s.numPlayers,
      }))
    }, 1500)
    return () => clearTimeout(t)
  }, [state.rolled, state.noMoves, state.phase, state.numPlayers])

  const startGame = useCallback((n: number) => {
    setState({
      phase: 'game',
      numPlayers: n,
      pieces: Array.from({ length: n }, () => Array(4).fill(-1) as PiecePos[]),
      currentPlayer: 0,
      dice: null,
      rolled: false,
      noMoves: false,
      winner: null,
    })
  }, [])

  const rollDice = useCallback(() => {
    setState(s => {
      if (s.rolled || s.phase !== 'game') return s
      const val = Math.floor(Math.random() * 6) + 1
      const anyMove = s.pieces[s.currentPlayer].some(pos => canMove(pos, val))
      if (!anyMove) {
        // Show dice then auto-pass (handled by useEffect)
        return { ...s, dice: val, rolled: true, noMoves: true }
      }
      return { ...s, dice: val, rolled: true, noMoves: false }
    })
  }, [])

  const clickPiece = useCallback((player: number, pieceIdx: number) => {
    setState(s => {
      if (s.phase !== 'game') return s
      if (player !== s.currentPlayer) return s
      if (!s.rolled || s.dice === null || s.noMoves) return s
      const pos = s.pieces[player][pieceIdx]
      if (!canMove(pos, s.dice)) return s

      const newPieces = s.pieces.map((pp, pi) =>
        pi === player
          ? pp.map((p, i) => i === pieceIdx ? advancePos(p, s.dice!) : p)
          : pp
      )

      const allHome = newPieces[player].every(p => p === 57)
      if (allHome) {
        return { ...s, pieces: newPieces, winner: player, phase: 'over' }
      }

      // Rolling 6 grants another turn
      if (s.dice === 6) {
        return { ...s, pieces: newPieces, rolled: false, dice: null }
      }

      return {
        ...s,
        pieces: newPieces,
        rolled: false,
        dice: null,
        currentPlayer: (player + 1) % s.numPlayers,
      }
    })
  }, [])

  // Piece-coordinate map for rendering
  const pieceMap = useMemo(() => {
    const map = new Map<string, { player: number; pieceIdx: number }[]>()
    state.pieces.forEach((pp, player) => {
      pp.forEach((pos, pieceIdx) => {
        const [r, c] = getCoord(player, pieceIdx, pos)
        const key = `${r},${c}`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push({ player, pieceIdx })
      })
    })
    return map
  }, [state.pieces])

  // ── Setup screen ─────────────────────────────────────────

  if (state.phase === 'setup') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
        <Link to="/" className="absolute top-4 left-4 text-gray-400 hover:text-white text-sm">
          ← 返回主頁
        </Link>
        <div className="text-7xl mb-4">✈️</div>
        <h1 className="text-4xl font-bold mb-2">飛行棋</h1>
        <p className="text-gray-400 mb-10">選擇玩家人數</p>
        <div className="flex gap-6">
          {[2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => startGame(n)}
              className="w-24 h-24 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-3xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
              {n}人
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Win screen ────────────────────────────────────────────

  if (state.phase === 'over' && state.winner !== null) {
    const w = state.winner
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="text-8xl mb-4">🏆</div>
        <h1 className="text-4xl font-bold mb-2">
          {PLAYER_EMOJI[w]} {PLAYER_NAME[w]} 勝利！
        </h1>
        <p className="text-gray-400 mb-10">4隻棋全數回家！</p>
        <div className="flex gap-4">
          <button
            onClick={() => startGame(state.numPlayers)}
            className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-lg"
          >
            再玩一次
          </button>
          <Link
            to="/"
            className="px-8 py-4 rounded-2xl bg-gray-700 hover:bg-gray-600 font-bold text-lg"
          >
            返回主頁
          </Link>
        </div>
      </div>
    )
  }

  // ── Game screen ───────────────────────────────────────────

  const cp = state.currentPlayer
  const movable = state.rolled && state.dice !== null && !state.noMoves
    ? new Set(
        state.pieces[cp]
          .map((pos, i) => canMove(pos, state.dice!) ? i : -1)
          .filter(i => i !== -1)
      )
    : new Set<number>()

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center py-4 px-2">

      {/* Header */}
      <div className="flex items-center w-full max-w-[440px] mb-3">
        <Link to="/" className="text-gray-400 hover:text-white text-sm mr-3">←</Link>
        <h1 className="text-lg font-bold flex-1 text-center">✈️ 飛行棋</h1>
        <button
          onClick={() => startGame(state.numPlayers)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          重新開始
        </button>
      </div>

      {/* Player turn badges */}
      <div className="flex gap-2 mb-3 flex-wrap justify-center">
        {Array.from({ length: state.numPlayers }, (_, i) => (
          <div
            key={i}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              i === cp
                ? `${PLAYER_BG[i]} text-white ring-2 ring-white/50 scale-110`
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {PLAYER_EMOJI[i]} {PLAYER_NAME[i]}
            {i === cp && ' 出招'}
          </div>
        ))}
      </div>

      {/* Board */}
      <div
        className="border-2 border-gray-600 shadow-2xl"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(15, ${CELL_PX}px)`,
          gridTemplateRows: `repeat(15, ${CELL_PX}px)`,
        }}
      >
        {BOARD.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`
            const piecesHere = pieceMap.get(key) ?? []
            const multi = piecesHere.length > 1
            const tiny = piecesHere.length > 2

            // Cell background
            let bg = 'bg-gray-800'
            if (cell === 'path' || cell === 'safe') bg = 'bg-gray-100'
            else if (cell === 'centre') bg = 'bg-gray-700'
            else if (typeof cell === 'object' && 'base' in cell) bg = PLAYER_LIGHT[cell.base]
            else if (typeof cell === 'object' && 'home' in cell) bg = PLAYER_HOME[cell.home]
            else if (typeof cell === 'object' && 'tri' in cell) bg = PLAYER_TRI[cell.tri]

            const isCentre = r === 7 && c === 7

            return (
              <div
                key={key}
                className={`${bg} border border-gray-600/20 relative flex items-center justify-center`}
                style={{ width: CELL_PX, height: CELL_PX }}
              >
                {cell === 'safe' && (
                  <span className="absolute text-[8px] text-yellow-400 pointer-events-none select-none">★</span>
                )}
                {isCentre && piecesHere.length === 0 && (
                  <span className="text-[10px] select-none">🏠</span>
                )}
                {/* Pieces */}
                {piecesHere.length > 0 && (
                  <div className={`flex flex-wrap gap-px p-px items-center justify-center w-full h-full`}>
                    {piecesHere.map(({ player, pieceIdx }) => {
                      const isMovable = player === cp && movable.has(pieceIdx)
                      const sz = tiny ? 7 : multi ? 10 : 18
                      return (
                        <div
                          key={`${player}-${pieceIdx}`}
                          onClick={() => clickPiece(player, pieceIdx)}
                          className={`rounded-full border border-white/60 flex-shrink-0 transition-transform ${
                            isMovable
                              ? 'cursor-pointer ring-2 ring-white animate-pulse'
                              : player === cp ? 'cursor-default' : 'cursor-default'
                          }`}
                          style={{
                            width: sz,
                            height: sz,
                            backgroundColor: PLAYER_HEX[player],
                          }}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Dice + status */}
      <div className="mt-5 flex flex-col items-center gap-3">
        <div
          onClick={rollDice}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-xl transition-all select-none ${
            !state.rolled && state.phase === 'game'
              ? 'bg-white text-gray-900 cursor-pointer hover:scale-110 active:scale-95'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          {state.dice !== null ? DICE_FACE[state.dice - 1] : '🎲'}
        </div>

        <p className="text-sm text-gray-400 text-center min-h-[20px]">
          {state.noMoves && state.dice !== null
            ? `擲到 ${state.dice}，冇棋可走，自動跳過…`
            : !state.rolled
            ? `${PLAYER_EMOJI[cp]} ${PLAYER_NAME[cp]}，點骰子！`
            : state.dice !== null
            ? `擲到 ${state.dice}，揀一隻棋移動`
            : ''}
        </p>

        {state.dice === 6 && state.rolled && !state.noMoves && (
          <p className="text-yellow-400 text-xs font-bold">🎉 擲到 6！走完可以再擲！</p>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs text-gray-500 flex-wrap justify-center">
        <span>★ 安全格</span>
        <span>擲6先可出棋</span>
        <span>4隻棋回家先贏</span>
      </div>
    </div>
  )
}
