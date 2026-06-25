import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

type Color = 'red' | 'black'
type PieceType = 'general' | 'advisor' | 'elephant' | 'horse' | 'chariot' | 'cannon' | 'soldier'
type Piece = { type: PieceType; color: Color }
type Board = (Piece | null)[][]

// Chinese characters for each piece by color
const PIECE_CHAR: Record<PieceType, Record<Color, string>> = {
  general:  { red: '帅', black: '将' },
  advisor:  { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse:    { red: '马', black: '馬' },
  chariot:  { red: '车', black: '車' },
  cannon:   { red: '炮', black: '砲' },
  soldier:  { red: '兵', black: '卒' },
}

function initBoard(): Board {
  const b: Board = Array(10).fill(null).map(() => Array(9).fill(null))
  const p = (r: number, c: number, t: PieceType, col: Color) => { b[r][c] = { type: t, color: col } }

  // Black (top, rows 0-4)
  p(0,0,'chariot','black'); p(0,8,'chariot','black')
  p(0,1,'horse','black');   p(0,7,'horse','black')
  p(0,2,'elephant','black');p(0,6,'elephant','black')
  p(0,3,'advisor','black'); p(0,5,'advisor','black')
  p(0,4,'general','black')
  p(2,1,'cannon','black');  p(2,7,'cannon','black')
  for (const c of [0,2,4,6,8]) p(3,c,'soldier','black')

  // Red (bottom, rows 5-9)
  p(9,0,'chariot','red'); p(9,8,'chariot','red')
  p(9,1,'horse','red');   p(9,7,'horse','red')
  p(9,2,'elephant','red');p(9,6,'elephant','red')
  p(9,3,'advisor','red'); p(9,5,'advisor','red')
  p(9,4,'general','red')
  p(7,1,'cannon','red');  p(7,7,'cannon','red')
  for (const c of [0,2,4,6,8]) p(6,c,'soldier','red')

  return b
}

function inBounds(r: number, c: number) { return r >= 0 && r <= 9 && c >= 0 && c <= 8 }

function rawMoves(board: Board, row: number, col: number): [number, number][] {
  const piece = board[row][col]
  if (!piece) return []
  const { type, color } = piece
  const moves: [number, number][] = []
  const isEmpty = (r: number, c: number) => board[r][c] === null
  const isEnemy = (r: number, c: number) => board[r][c] !== null && board[r][c]!.color !== color
  const canLand = (r: number, c: number) => inBounds(r, c) && (isEmpty(r, c) || isEnemy(r, c))

  if (type === 'chariot') {
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
      let r = row+dr, c = col+dc
      while (inBounds(r,c)) {
        if (isEmpty(r,c)) { moves.push([r,c]); r+=dr; c+=dc }
        else { if (isEnemy(r,c)) moves.push([r,c]); break }
      }
    }
  } else if (type === 'cannon') {
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
      let r = row+dr, c = col+dc, screen = false
      while (inBounds(r,c)) {
        if (!screen) {
          if (isEmpty(r,c)) moves.push([r,c])
          else screen = true
        } else {
          if (!isEmpty(r,c)) { if (isEnemy(r,c)) moves.push([r,c]); break }
        }
        r+=dr; c+=dc
      }
    }
  } else if (type === 'horse') {
    const steps: [number,number,number,number][] = [[-2,-1,-1,0],[-2,1,-1,0],[-1,-2,0,-1],[-1,2,0,1],[1,-2,0,-1],[1,2,0,1],[2,-1,1,0],[2,1,1,0]]
    for (const [dr,dc,br,bc] of steps) {
      if (inBounds(row+br,col+bc) && isEmpty(row+br,col+bc) && canLand(row+dr,col+dc))
        moves.push([row+dr,col+dc])
    }
  } else if (type === 'elephant') {
    const home = color === 'red' ? (r: number) => r >= 5 : (r: number) => r <= 4
    for (const [dr,dc] of [[-2,-2],[-2,2],[2,-2],[2,2]] as const) {
      const mr = row+dr/2, mc = col+dc/2, nr = row+dr, nc = col+dc
      if (inBounds(nr,nc) && home(nr) && isEmpty(mr,mc) && canLand(nr,nc)) moves.push([nr,nc])
    }
  } else if (type === 'advisor') {
    const pRows = color === 'red' ? [7,8,9] : [0,1,2]
    for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]] as const) {
      const nr = row+dr, nc = col+dc
      if (inBounds(nr,nc) && pRows.includes(nr) && nc >= 3 && nc <= 5 && canLand(nr,nc)) moves.push([nr,nc])
    }
  } else if (type === 'general') {
    const pRows = color === 'red' ? [7,8,9] : [0,1,2]
    for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
      const nr = row+dr, nc = col+dc
      if (inBounds(nr,nc) && pRows.includes(nr) && nc >= 3 && nc <= 5 && canLand(nr,nc)) moves.push([nr,nc])
    }
  } else if (type === 'soldier') {
    const fwd = color === 'red' ? -1 : 1
    const crossed = color === 'red' ? row <= 4 : row >= 5
    if (canLand(row+fwd, col)) moves.push([row+fwd, col])
    if (crossed) {
      if (canLand(row, col-1)) moves.push([row, col-1])
      if (canLand(row, col+1)) moves.push([row, col+1])
    }
  }
  return moves
}

function applyMove(board: Board, fr: number, fc: number, tr: number, tc: number): Board {
  const nb = board.map(r => [...r])
  nb[tr][tc] = nb[fr][fc]
  nb[fr][fc] = null
  return nb
}

function findGeneral(board: Board, color: Color): [number,number] {
  for (let r = 0; r <= 9; r++)
    for (let c = 0; c <= 8; c++)
      if (board[r][c]?.type === 'general' && board[r][c]?.color === color) return [r,c]
  return [-1,-1]
}

function isInCheck(board: Board, color: Color): boolean {
  const [gr, gc] = findGeneral(board, color)
  if (gr === -1) return true

  // Flying general rule
  const opp: Color = color === 'red' ? 'black' : 'red'
  const [ogr, ogc] = findGeneral(board, opp)
  if (ogc === gc) {
    const minR = Math.min(gr, ogr), maxR = Math.max(gr, ogr)
    let blocked = false
    for (let r = minR+1; r < maxR; r++) if (board[r][gc] !== null) { blocked = true; break }
    if (!blocked) return true
  }

  // Any opponent piece attacks the general
  for (let r = 0; r <= 9; r++)
    for (let c = 0; c <= 8; c++)
      if (board[r][c]?.color === opp)
        if (rawMoves(board, r, c).some(([mr,mc]) => mr === gr && mc === gc)) return true

  return false
}

function legalMoves(board: Board, row: number, col: number): [number,number][] {
  const piece = board[row][col]
  if (!piece) return []
  return rawMoves(board, row, col).filter(([r,c]) => !isInCheck(applyMove(board,row,col,r,c), piece.color))
}

function hasAnyMoves(board: Board, color: Color): boolean {
  for (let r = 0; r <= 9; r++)
    for (let c = 0; c <= 8; c++)
      if (board[r][c]?.color === color && legalMoves(board,r,c).length > 0) return true
  return false
}

type Snapshot = { board: Board; turn: Color; check: boolean; lastMove: [[number,number],[number,number]] | null }

export default function Chess() {
  const { t } = useTranslation()
  const [board, setBoard] = useState<Board>(initBoard)
  const [selected, setSelected] = useState<[number,number] | null>(null)
  const [highlights, setHighlights] = useState<Set<string>>(new Set())
  const [turn, setTurn] = useState<Color>('red')
  const [winner, setWinner] = useState<Color | null>(null)
  const [check, setCheck] = useState(false)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [lastMove, setLastMove] = useState<[[number,number],[number,number]] | null>(null)

  const restart = useCallback(() => {
    setBoard(initBoard())
    setSelected(null)
    setHighlights(new Set())
    setTurn('red')
    setWinner(null)
    setCheck(false)
    setHistory([])
    setLastMove(null)
  }, [])

  const undo = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setBoard(prev.board)
    setTurn(prev.turn)
    setCheck(prev.check)
    setLastMove(prev.lastMove)
    setWinner(null)
    setSelected(null)
    setHighlights(new Set())
    setHistory(h => h.slice(0, -1))
  }, [history])

  const handleClick = useCallback((row: number, col: number) => {
    if (winner) return
    const piece = board[row][col]
    const key = `${row},${col}`

    // Execute move
    if (selected && highlights.has(key)) {
      const [fr, fc] = selected
      const nb = applyMove(board, fr, fc, row, col)
      const opp: Color = turn === 'red' ? 'black' : 'red'
      const move: [[number,number],[number,number]] = [[fr, fc], [row, col]]

      setHistory(h => [...h, { board, turn, check, lastMove }])

      // Win: opponent general captured or no moves left
      const [ogr] = findGeneral(nb, opp)
      if (ogr === -1 || !hasAnyMoves(nb, opp)) {
        setBoard(nb)
        setSelected(null)
        setHighlights(new Set())
        setWinner(turn)
        setCheck(false)
        setLastMove(move)
        return
      }

      setBoard(nb)
      setSelected(null)
      setHighlights(new Set())
      setTurn(opp)
      setCheck(isInCheck(nb, opp))
      setLastMove(move)
      return
    }

    // Select own piece
    if (piece && piece.color === turn) {
      const moves = legalMoves(board, row, col)
      setSelected([row, col])
      setHighlights(new Set(moves.map(([r,c]) => `${r},${c}`)))
      return
    }

    setSelected(null)
    setHighlights(new Set())
  }, [board, selected, highlights, turn, winner, check])

  const statusText = winner
    ? t(`games.chess.${winner}_wins`)
    : check
      ? `⚠️ ${t(`games.chess.${turn}_turn`)} — ${t('games.chess.check')}`
      : t(`games.chess.${turn}_turn`)

  const statusBg = winner
    ? 'bg-yellow-600'
    : check
      ? 'bg-red-800'
      : turn === 'red' ? 'bg-red-900/60' : 'bg-gray-700/60'

  // Board cell size — fit within ~360px for mobile
  const CELL = 38

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 to-stone-900 text-white flex flex-col items-center p-3">
      <div className="w-full" style={{ maxWidth: CELL * 9 + 32 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="text-amber-300 hover:text-amber-100 text-sm">← {t('home.heading')}</Link>
          <h1 className="text-xl font-bold text-amber-200">{t('games.chess.name')}</h1>
          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="text-amber-300 hover:text-amber-100 text-sm bg-amber-900/40 px-2 py-1 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↩ {t('games.chess.undo')}
            </button>
            <button onClick={restart} className="text-amber-300 hover:text-amber-100 text-sm bg-amber-900/40 px-2 py-1 rounded">
              {t('games.chess.new_game')}
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className={`text-center mb-3 text-base font-bold rounded-lg py-2 px-3 ${statusBg}`}>
          {statusText}
        </div>

        {/* Board */}
        <div
          className="relative mx-auto rounded-lg overflow-hidden border-2 border-amber-700/50"
          style={{
            width: CELL * 9,
            height: CELL * 10,
            background: 'linear-gradient(135deg, #92400e 0%, #78350f 100%)',
          }}
        >
          {/* Grid lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={CELL * 9}
            height={CELL * 10}
          >
            {/* Vertical lines */}
            {Array.from({ length: 9 }, (_, c) => (
              <line
                key={`v${c}`}
                x1={CELL * c + CELL / 2}
                y1={CELL / 2}
                x2={CELL * c + CELL / 2}
                y2={c === 0 || c === 8
                  ? CELL * 10 - CELL / 2
                  : CELL * 4 + CELL / 2
                }
                stroke="#d97706"
                strokeWidth="1"
                opacity="0.6"
              />
            ))}
            {/* Bottom half vertical lines (excluding edges) */}
            {Array.from({ length: 7 }, (_, i) => i + 1).map(c => (
              <line
                key={`vb${c}`}
                x1={CELL * c + CELL / 2}
                y1={CELL * 5 + CELL / 2}
                x2={CELL * c + CELL / 2}
                y2={CELL * 10 - CELL / 2}
                stroke="#d97706"
                strokeWidth="1"
                opacity="0.6"
              />
            ))}
            {/* Horizontal lines */}
            {Array.from({ length: 10 }, (_, r) => (
              <line
                key={`h${r}`}
                x1={CELL / 2}
                y1={CELL * r + CELL / 2}
                x2={CELL * 9 - CELL / 2}
                y2={CELL * r + CELL / 2}
                stroke="#d97706"
                strokeWidth="1"
                opacity="0.6"
              />
            ))}
            {/* Palace diagonals — Black (top) */}
            <line x1={CELL*3+CELL/2} y1={CELL/2} x2={CELL*5+CELL/2} y2={CELL*2+CELL/2} stroke="#d97706" strokeWidth="1" opacity="0.5"/>
            <line x1={CELL*5+CELL/2} y1={CELL/2} x2={CELL*3+CELL/2} y2={CELL*2+CELL/2} stroke="#d97706" strokeWidth="1" opacity="0.5"/>
            {/* Palace diagonals — Red (bottom) */}
            <line x1={CELL*3+CELL/2} y1={CELL*7+CELL/2} x2={CELL*5+CELL/2} y2={CELL*9+CELL/2} stroke="#d97706" strokeWidth="1" opacity="0.5"/>
            <line x1={CELL*5+CELL/2} y1={CELL*7+CELL/2} x2={CELL*3+CELL/2} y2={CELL*9+CELL/2} stroke="#d97706" strokeWidth="1" opacity="0.5"/>
          </svg>

          {/* River label */}
          <div
            className="absolute text-amber-300/60 text-xs font-bold tracking-widest select-none flex justify-between px-4"
            style={{
              top: CELL * 4 + CELL / 2 + 2,
              left: 0,
              right: 0,
            }}
          >
            <span>楚河</span>
            <span>漢界</span>
          </div>

          {/* Cells (click targets + pieces) */}
          {Array.from({ length: 10 }, (_, row) =>
            Array.from({ length: 9 }, (_, col) => {
              const piece = board[row][col]
              const key = `${row},${col}`
              const isSelected = selected?.[0] === row && selected?.[1] === col
              const isHighlight = highlights.has(key)
              const isCapture = isHighlight && piece !== null
              const isLastMoveFrom = lastMove && lastMove[0][0] === row && lastMove[0][1] === col
              const isLastMoveTo = lastMove && lastMove[1][0] === row && lastMove[1][1] === col

              return (
                <div
                  key={key}
                  onClick={() => handleClick(row, col)}
                  className="absolute flex items-center justify-center cursor-pointer"
                  style={{
                    left: CELL * col,
                    top: CELL * row,
                    width: CELL,
                    height: CELL,
                  }}
                >
                  {/* Last move highlight */}
                  {(isLastMoveFrom || isLastMoveTo) && !isSelected && (
                    <div
                      className="absolute rounded-sm"
                      style={{
                        width: CELL - 2,
                        height: CELL - 2,
                        background: isLastMoveTo ? 'rgba(250,204,21,0.25)' : 'rgba(250,204,21,0.12)',
                        border: isLastMoveTo ? '1px solid rgba(250,204,21,0.4)' : '1px solid rgba(250,204,21,0.2)',
                      }}
                    />
                  )}

                  {/* Move highlight dot */}
                  {isHighlight && !isCapture && (
                    <div className="absolute w-3 h-3 rounded-full bg-yellow-300/60 z-10" />
                  )}

                  {/* Piece */}
                  {piece && (
                    <div
                      className={`
                        relative z-20 flex items-center justify-center rounded-full
                        font-bold select-none transition-transform
                        ${isSelected ? 'scale-110 ring-2 ring-yellow-300' : ''}
                        ${isCapture ? 'ring-2 ring-yellow-400' : ''}
                      `}
                      style={{
                        width: CELL - 4,
                        height: CELL - 4,
                        fontSize: CELL * 0.42,
                        background: piece.color === 'red'
                          ? 'radial-gradient(circle at 35% 35%, #fca5a5, #dc2626)'
                          : 'radial-gradient(circle at 35% 35%, #6b7280, #111827)',
                        color: piece.color === 'red' ? '#7f1d1d' : '#d1d5db',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        border: piece.color === 'red' ? '2px solid #991b1b' : '2px solid #374151',
                      }}
                    >
                      {PIECE_CHAR[piece.type][piece.color]}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Legend */}
        <div className="mt-3 text-center text-xs text-amber-400/60">
          {turn === 'red' ? '🔴' : '⚫'} {t(`games.chess.${turn}_turn`)}
        </div>
      </div>
    </div>
  )
}
