import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'

type Phase = 'menu' | 'setup' | 'performer-out' | 'pick-target' | 'performer-back' | 'play' | 'reveal-secret'

const SUGGESTED_ITEMS = ['杯', '書', '電話', '銀包', '筆', '鎖匙', '眼鏡', '遙控']
const DARK_SIGNALS = ['黑色物品', '深色物品', '黑色嘅嘢', '暗色嘅嘢']

interface GameState {
  items: string[]
  targetIndex: number
  playOrder: number[]   // indices into items[], includes -1 for signal slot
  currentStep: number
  signalLabel: string
}

function buildPlayOrder(items: string[], targetIndex: number): number[] {
  // Put some random items before signal, then signal(-1), then target, then rest
  const others = items.map((_, i) => i).filter(i => i !== targetIndex)
  const shuffle = (arr: number[]) => [...arr].sort(() => Math.random() - 0.5)
  const before = shuffle(others).slice(0, Math.min(3, others.length))
  const after = shuffle(others.filter(i => !before.includes(i)))
  return [...before, -1, targetIndex, ...after]
}

export default function BlackMagic() {
  const [phase, setPhase] = useState<Phase>('menu')
  const [inputItems, setInputItems] = useState<string[]>(['', '', '', '', ''])
  const [game, setGame] = useState<GameState | null>(null)
  const [secretRevealed, setSecretRevealed] = useState(false)

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
      signalLabel: DARK_SIGNALS[Math.floor(Math.random() * DARK_SIGNALS.length)],
    })
    setPhase('performer-out')
  }, [inputItems])

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
        <h1 className="text-4xl font-bold mb-2">黑魔法</h1>
        <p className="text-gray-400 text-lg">心靈感應魔術系列</p>
      </div>
      <div className="max-w-sm text-gray-300 text-sm leading-relaxed bg-white/5 rounded-2xl p-5 text-left">
        <p className="font-semibold text-white mb-2">點玩？</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>揀好一堆物品（用真實房間入面嘅嘢）</li>
          <li>表演者離開，大家揀一件目標物品</li>
          <li>助手拎住手機，逐一指向物品問「係唔係？」</li>
          <li>表演者每次都答岩！</li>
        </ol>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => {
            setInputItems(SUGGESTED_ITEMS.slice(0, 5).map(s => s))
            setPhase('setup')
          }}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-6 rounded-2xl text-lg transition-colors"
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
        <h2 className="text-2xl font-bold">揀物品</h2>
        <p className="text-gray-400 text-sm mt-1">輸入房間入面嘅物品（3–8件）</p>
      </div>
      <div className="flex flex-col gap-2">
        {inputItems.map((val, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-gray-600 w-5 text-right text-sm">{i + 1}.</span>
            <input
              value={val}
              onChange={e => updateItem(i, e.target.value)}
              placeholder={SUGGESTED_ITEMS[i] ?? '物品名稱'}
              className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:bg-white/15 transition-colors"
            />
            {inputItems.length > 3 && (
              <button onClick={() => removeItem(i)} className="text-gray-600 hover:text-red-400 transition-colors px-2">✕</button>
            )}
          </div>
        ))}
        {inputItems.length < 8 && (
          <button onClick={addItem} className="text-purple-400 hover:text-purple-300 text-sm py-2 transition-colors">+ 加多一件</button>
        )}
      </div>
      <button
        onClick={startGame}
        disabled={inputItems.filter(s => s.trim()).length < 3}
        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-lg transition-colors"
      >
        下一步 →
      </button>
    </div>
  )

  const renderPerformerOut = () => (
    <div className="flex flex-col items-center justify-center text-center gap-8 py-16">
      <div className="text-7xl animate-bounce">🚶</div>
      <div>
        <h2 className="text-3xl font-bold mb-2">表演者請離開</h2>
        <p className="text-gray-400">等佢行遠少少，唔見到手機先</p>
      </div>
      <button
        onClick={() => setPhase('pick-target')}
        className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-10 rounded-2xl text-lg transition-colors"
      >
        表演者走咗，繼續 →
      </button>
    </div>
  )

  const renderPickTarget = () => (
    <div className="flex flex-col gap-6 py-4 max-w-sm mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold">揀目標物品</h2>
        <p className="text-gray-400 text-sm mt-1">大家一齊揀一件，唔好俾表演者知！</p>
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
        <h2 className="text-3xl font-bold mb-2">叫表演者返嚟</h2>
        <p className="text-gray-400">準備好就開始！助手拎住手機，<br />逐一指向物品問「係唔係呢個？」</p>
      </div>
      <button
        onClick={startPlay}
        className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-10 rounded-2xl text-lg transition-colors"
      >
        開始！
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
            <h2 className="text-3xl font-bold mb-2">表演者已經答岩！</h2>
            <p className="text-gray-400">目標係：<span className="text-white font-bold">{items[game.targetIndex]}</span></p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={() => setPhase('reveal-secret')} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl text-lg transition-colors">
              揭曉秘密 🔓
            </button>
            <button
              onClick={() => { setGame({ ...game, currentStep: 0, playOrder: buildPlayOrder(game.items, game.targetIndex) }); setPhase('pick-target') }}
              className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl transition-colors"
            >
              再玩一次
            </button>
            <button onClick={() => setPhase('menu')} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">返主頁</button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center text-center gap-8 py-8 max-w-sm mx-auto">
        <div className="text-sm text-gray-500">步驟 {currentStep + 1} / {playOrder.length}</div>

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
          {isSignal && <div className="text-gray-500 text-sm mt-2">指向呢件黑色/深色嘅嘢</div>}
          {isTarget && <div className="text-purple-200 text-sm mt-2">👆 下一件就係目標！</div>}
        </div>

        {/* Guidance */}
        <div className="text-gray-400 text-sm">
          {isSignal
            ? '指向附近任何黑色/深色物品，問「係唔係呢個？」'
            : isTarget
            ? '指向「' + itemName + '」，問「係唔係呢個？」'
            : '指向「' + itemName + '」，問「係唔係呢個？」'}
        </div>

        <button
          onClick={() => setGame({ ...game, currentStep: currentStep + 1 })}
          className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
        >
          {isTarget ? '表演者答係！結束 ✓' : '下一件 →'}
        </button>
      </div>
    )
  }

  const renderRevealSecret = () => (
    <div className="flex flex-col items-center text-center gap-8 py-8 max-w-sm mx-auto">
      <div className="text-6xl">🔮</div>
      <div>
        <h2 className="text-2xl font-bold mb-2">秘密揭曉</h2>
        {!secretRevealed ? (
          <>
            <p className="text-gray-400 text-sm mb-6">確定要睇秘密？睇完就唔神秘喇！</p>
            <button onClick={() => setSecretRevealed(true)} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-2xl transition-colors">
              睇秘密！
            </button>
          </>
        ) : (
          <div className="bg-white/10 rounded-2xl p-6 text-left mt-2">
            <p className="text-white font-semibold mb-3">🖤 黑魔法嘅暗號</p>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              助手喺指向目標之前，會先指一件<span className="text-white font-bold">黑色/深色</span>嘅物品。
              表演者見到「黑色物品」就知道：<span className="text-purple-300 font-bold">下一件就係答案！</span>
            </p>
            <p className="text-gray-500 text-xs">小提示：下次可以試試用唔同顏色作暗號，令人更難識穿！</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={() => { setPhase('pick-target'); setSecretRevealed(false) }}
          className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl transition-colors"
        >
          再玩一次
        </button>
        <button onClick={() => setPhase('menu')} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">返主頁</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between max-w-2xl mx-auto">
        <Link to="/" className="font-bold text-lg tracking-tight hover:text-purple-400 transition-colors">🎮 Plays</Link>
        <span className="text-gray-500 text-sm">🖤 黑魔法</span>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        {phase === 'menu' && renderMenu()}
        {phase === 'setup' && renderSetup()}
        {phase === 'performer-out' && renderPerformerOut()}
        {phase === 'pick-target' && renderPickTarget()}
        {phase === 'performer-back' && renderPerformerBack()}
        {phase === 'play' && renderPlay()}
        {phase === 'reveal-secret' && renderRevealSecret()}
      </main>
    </div>
  )
}
