import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'

const COLORS = [
  '#e74c3c', '#e67e22', '#f39c12', '#27ae60',
  '#16a085', '#2980b9', '#8e44ad', '#c0392b',
  '#d35400', '#1abc9c', '#2c3e50', '#7f8c8d',
]

function drawWheel(canvas: HTMLCanvasElement, items: string[], rotation: number) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width
  const H = canvas.height
  const cx = W / 2
  const cy = H / 2
  const r = Math.min(cx, cy) - 8
  const n = items.length
  const arc = (Math.PI * 2) / n

  ctx.clearRect(0, 0, W, H)

  // Shadow ring
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 20
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = '#111'
  ctx.fill()
  ctx.restore()

  items.forEach((item, i) => {
    const startAngle = rotation + i * arc
    const endAngle = startAngle + arc

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, startAngle, endAngle)
    ctx.closePath()
    ctx.fillStyle = COLORS[i % COLORS.length]
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(startAngle + arc / 2)
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    const fontSize = n <= 6 ? 15 : n <= 10 ? 13 : 11
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 4
    const maxChars = n <= 4 ? 16 : n <= 8 ? 12 : 9
    const label = item.length > maxChars ? item.slice(0, maxChars) + '…' : item
    ctx.fillText(label, r - 12, 5)
    ctx.restore()
  })

  // Center cap
  ctx.beginPath()
  ctx.arc(cx, cy, 16, 0, Math.PI * 2)
  ctx.fillStyle = '#0f0f1a'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 2.5
  ctx.stroke()
}

export default function WheelOfFortune() {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<'setup' | 'spin'>('setup')
  const [itemText, setItemText] = useState('')
  const [items, setItems] = useState<string[]>([])
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [resultIndex, setResultIndex] = useState<number | null>(null)
  const [winners, setWinners] = useState<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(-Math.PI / 2)
  const animRef = useRef(0)

  const parsedItems = itemText
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  const goToSpin = () => {
    setItems(parsedItems)
    setResult(null)
    setWinners([])
    rotationRef.current = -Math.PI / 2
    setPhase('spin')
  }

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setResult(null)

    const extraRotations = 8 + Math.random() * 5
    const totalRotation = Math.PI * 2 * extraRotations
    const startRot = rotationRef.current
    const duration = 3000 + Math.random() * 2000
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      rotationRef.current = startRot + totalRotation * eased

      if (canvasRef.current) {
        drawWheel(canvasRef.current, items, rotationRef.current)
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        const n = items.length
        const arc = (Math.PI * 2) / n
        const pointerAngle = -Math.PI / 2
        const relAngle =
          ((pointerAngle - rotationRef.current) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
        const winnerIndex = Math.floor(relAngle / arc) % n
        setResult(items[winnerIndex])
        setResultIndex(winnerIndex)
        setSpinning(false)
      }
    }

    animRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    if (phase === 'spin' && canvasRef.current) {
      drawWheel(canvasRef.current, items, rotationRef.current)
    }
  }, [phase, items])

  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  if (phase === 'setup') {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-6 py-4 max-w-sm mx-auto">
          <div className="text-center">
            <div className="text-7xl mb-3">🎡</div>
            <h1 className="text-3xl font-bold">{t('wheel.title')}</h1>
          </div>
          <div className="w-full">
            <label className="text-gray-400 text-sm mb-2 block">{t('wheel.enterItems')}</label>
            <textarea
              value={itemText}
              onChange={e => setItemText(e.target.value)}
              className="w-full h-44 bg-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:bg-white/15 transition-colors resize-none"
              placeholder={'A\nB\nC\n...'}
            />
            {parsedItems.length > 0 && (
              <p className="text-gray-400 text-xs mt-1.5">
                {t('wheel.itemCount', { n: parsedItems.length })}
              </p>
            )}
          </div>
          <button
            onClick={goToSpin}
            disabled={parsedItems.length < 2}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-lg transition-all"
          >
            {parsedItems.length < 2 ? t('wheel.needAtLeastTwo') : t('wheel.spin')}
          </button>
          <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← {t('nav.home')}
          </Link>
        </div>
      </Layout>
    )
  }

  if (result && !spinning && items.length === 1) {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-6 py-8 max-w-sm mx-auto text-center">
          <div className="text-8xl">🏆</div>
          <div>
            <p className="text-gray-400 text-sm mb-1">{t('wheel.finalWinner')}</p>
            <p className="text-3xl font-bold text-yellow-300">{result}</p>
          </div>
          {winners.length > 0 && (
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-500 text-xs">{t('wheel.pastWinners')}</p>
                <button
                  onClick={() => setWinners([])}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {t('wheel.clearHistory')}
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {winners.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                    <span className="text-yellow-500 text-xs font-bold w-5 text-right">{i + 1}.</span>
                    <span className="text-white text-sm">{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => setPhase('setup')}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold py-4 rounded-2xl text-lg transition-all"
          >
            {t('wheel.newGame')}
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex flex-col items-center gap-5 py-2">
        {/* Wheel + pointer */}
        <div className="relative mt-2">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 pointer-events-none">
            <div
              className="w-0 h-0"
              style={{
                borderLeft: '11px solid transparent',
                borderRight: '11px solid transparent',
                borderTop: '22px solid white',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
              }}
            />
          </div>
          <canvas ref={canvasRef} width={300} height={300} className="block" />
        </div>

        {/* Result */}
        <div className="h-12 flex items-center justify-center">
          {result && !spinning ? (
            <p className="text-2xl font-bold text-yellow-300 animate-bounce px-4 text-center">
              🎉 {result} 🎉
            </p>
          ) : spinning ? (
            <p className="text-gray-400 animate-pulse text-sm">{t('wheel.spinning')}</p>
          ) : null}
        </div>

        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={spin}
            disabled={spinning}
            className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-base transition-all"
          >
            {result ? t('wheel.again') : t('wheel.spin')}
          </button>
          {!spinning && (
            <button
              onClick={() => setPhase('setup')}
              className="bg-white/10 hover:bg-white/20 text-white px-5 rounded-2xl transition-colors text-sm"
            >
              {t('wheel.modify')}
            </button>
          )}
        </div>
        {result && !spinning && items.length > 1 && (
          <button
            onClick={() => {
              const next = items.filter((_, i) => i !== resultIndex)
              setWinners(prev => [...prev, result!])
              setItems(next)
              setResult(null)
              setResultIndex(null)
              rotationRef.current = -Math.PI / 2
              if (canvasRef.current) drawWheel(canvasRef.current, next, rotationRef.current)
            }}
            className="text-sm text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
          >
            ✕ {t('wheel.removeWinner')}
          </button>
        )}
        {winners.length > 0 && (
          <div className="w-full max-w-xs mt-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-xs">{t('wheel.pastWinners')}</p>
              <button
                onClick={() => setWinners([])}
                className="text-gray-600 hover:text-red-400 text-xs transition-colors"
              >
                {t('wheel.clearHistory')}
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {winners.map((w, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                  <span className="text-yellow-500 text-xs font-bold w-5 text-right">{i + 1}.</span>
                  <span className="text-white text-sm">{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
