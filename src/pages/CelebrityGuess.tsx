import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

type Phase = 'setup' | 'secret' | 'asking' | 'guessing' | 'result'
type Answer = 'yes' | 'no' | 'kinda'

interface Question {
  text: string
  answer: Answer
}

const MAX_Q = 20

export default function CelebrityGuess() {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('setup')
  const [celebrity, setCelebrity] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQ, setCurrentQ] = useState('')
  const [currentGuess, setCurrentGuess] = useState('')
  const [result, setResult] = useState<'win' | 'lose' | null>(null)
  const [revealed, setRevealed] = useState(false)

  const remaining = MAX_Q - questions.length

  const confirmSecret = () => {
    if (!celebrity.trim()) return
    setShowSecret(false)
    setPhase('asking')
  }

  const answerQuestion = (answer: Answer) => {
    if (!currentQ.trim()) return
    const newQuestions = [...questions, { text: currentQ.trim(), answer }]
    setQuestions(newQuestions)
    setCurrentQ('')
    if (newQuestions.length >= MAX_Q) {
      setPhase('guessing')
    }
  }

  const submitGuess = () => {
    if (!currentGuess.trim()) return
    const correct =
      currentGuess.trim().toLowerCase() === celebrity.trim().toLowerCase()
    setResult(correct ? 'win' : 'lose')
    setPhase('result')
  }

  const restart = () => {
    setPhase('setup')
    setCelebrity('')
    setShowSecret(false)
    setQuestions([])
    setCurrentQ('')
    setCurrentGuess('')
    setResult(null)
    setRevealed(false)
  }

  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-900 to-rose-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-7xl mb-4">🌟</div>
          <h1 className="text-4xl font-bold mb-2">{t('celebrity.title')}</h1>
          <p className="text-pink-300 text-lg mb-8">{t('celebrity.tagline')}</p>
          <div className="bg-white/10 rounded-2xl p-5 text-left text-sm text-pink-100 mb-8 space-y-2">
            <p className="font-bold text-white mb-3">{t('celebrity.howToPlay')}</p>
            <p>1. {t('celebrity.rule1')}</p>
            <p>2. {t('celebrity.rule2')}</p>
            <p>3. {t('celebrity.rule3')}</p>
            <p>4. {t('celebrity.rule4')}</p>
          </div>
          <button
            onClick={() => setPhase('secret')}
            className="w-full py-4 bg-pink-600 hover:bg-pink-500 rounded-2xl text-xl font-bold transition-colors"
          >
            {t('celebrity.startGame')}
          </button>
          <Link to="/" className="block mt-4 text-pink-400 hover:text-pink-200 text-sm">
            {t('celebrity.backHome')}
          </Link>
        </div>
      </div>
    )
  }

  if (phase === 'secret') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-900 to-rose-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full">
          <h2 className="text-2xl font-bold text-center mb-2">{t('celebrity.secretPhase')}</h2>
          <p className="text-pink-300 text-center text-sm mb-6">{t('celebrity.secretHint')}</p>
          <div className="relative mb-6">
            <input
              type={showSecret ? 'text' : 'password'}
              value={celebrity}
              onChange={e => setCelebrity(e.target.value)}
              placeholder={t('celebrity.secretPlaceholder')}
              className="w-full bg-white/10 border border-pink-500/40 rounded-xl px-4 py-4 text-xl text-center placeholder-pink-400/50 focus:outline-none focus:border-pink-400"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && confirmSecret()}
            />
            <button
              onClick={() => setShowSecret(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 text-xl"
            >
              {showSecret ? '🙈' : '👁️'}
            </button>
          </div>
          <button
            onClick={confirmSecret}
            disabled={!celebrity.trim()}
            className="w-full py-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl text-xl font-bold transition-colors"
          >
            {t('celebrity.confirm')}
          </button>
          <p className="text-center text-pink-400/60 text-xs mt-3">{t('celebrity.secretLabel')}</p>
        </div>
      </div>
    )
  }

  if (phase === 'asking' || phase === 'guessing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-900 to-rose-950 text-white flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={restart} className="text-pink-400 text-sm px-2 py-1">✕</button>
          <h1 className="text-lg font-bold">{t('celebrity.title')}</h1>
          <span
            className={`text-sm font-bold px-3 py-1 rounded-full ${
              remaining <= 5 ? 'bg-red-600' : 'bg-pink-700/60'
            }`}
          >
            {t('celebrity.questionsLeft', { n: remaining })}
          </span>
        </div>

        {/* Question log */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-2 min-h-0">
          {questions.length === 0 ? (
            <p className="text-center text-pink-400/50 text-sm py-8">
              {t('celebrity.noQuestionsYet')}
            </p>
          ) : (
            questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 bg-white/5 rounded-xl px-3 py-2">
                <span className="text-pink-400/60 text-xs w-5 shrink-0 mt-0.5">{i + 1}</span>
                <span className="flex-1 text-sm">{q.text}</span>
                <span
                  className={`text-sm font-bold shrink-0 ${
                    q.answer === 'yes'
                      ? 'text-green-400'
                      : q.answer === 'no'
                      ? 'text-red-400'
                      : 'text-yellow-400'
                  }`}
                >
                  {t(`celebrity.answer_${q.answer}`)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Input area */}
        {phase === 'asking' ? (
          <div className="space-y-3 shrink-0">
            <input
              type="text"
              value={currentQ}
              onChange={e => setCurrentQ(e.target.value)}
              placeholder={t('celebrity.questionPlaceholder')}
              className="w-full bg-white/10 border border-pink-500/40 rounded-xl px-4 py-3 placeholder-pink-400/50 focus:outline-none focus:border-pink-400"
            />
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => answerQuestion('yes')}
                disabled={!currentQ.trim()}
                className="py-3 bg-green-700 hover:bg-green-600 disabled:opacity-40 rounded-xl font-bold transition-colors"
              >
                {t('celebrity.answer_yes')}
              </button>
              <button
                onClick={() => answerQuestion('kinda')}
                disabled={!currentQ.trim()}
                className="py-3 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 rounded-xl font-bold transition-colors"
              >
                {t('celebrity.answer_kinda')}
              </button>
              <button
                onClick={() => answerQuestion('no')}
                disabled={!currentQ.trim()}
                className="py-3 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded-xl font-bold transition-colors"
              >
                {t('celebrity.answer_no')}
              </button>
            </div>
            <button
              onClick={() => setPhase('guessing')}
              className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors text-pink-200"
            >
              🎯 {t('celebrity.guessButton')}
            </button>
          </div>
        ) : (
          <div className="space-y-3 shrink-0">
            <p className="text-center text-pink-300 text-sm">{t('celebrity.guessPrompt')}</p>
            <input
              type="text"
              value={currentGuess}
              onChange={e => setCurrentGuess(e.target.value)}
              placeholder={t('celebrity.guessPlaceholder')}
              className="w-full bg-white/10 border border-pink-500/40 rounded-xl px-4 py-3 placeholder-pink-400/50 focus:outline-none focus:border-pink-400 text-center text-xl"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && submitGuess()}
            />
            <button
              onClick={submitGuess}
              disabled={!currentGuess.trim()}
              className="w-full py-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 rounded-2xl text-xl font-bold transition-colors"
            >
              {t('celebrity.submitGuess')}
            </button>
            {remaining > 0 && phase === 'guessing' && questions.length < MAX_Q && (
              <button
                onClick={() => setPhase('asking')}
                className="w-full py-2 text-pink-400 text-sm"
              >
                ← {t('celebrity.backToQuestions')}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Result screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 to-rose-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="text-7xl mb-4">{result === 'win' ? '🎉' : '😅'}</div>
        <h2 className="text-3xl font-bold mb-2">{t(`celebrity.${result}`)}</h2>
        <p className="text-pink-300 mb-4">{t('celebrity.questionCount', { n: questions.length })}</p>
        <div className="bg-white/10 rounded-2xl p-4 mb-6">
          <p className="text-pink-400 text-sm mb-2">{t('celebrity.correctAnswer')}</p>
          {revealed ? (
            <p className="text-2xl font-bold text-white">{celebrity}</p>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="text-pink-300 underline text-sm"
            >
              {t('celebrity.reveal')}
            </button>
          )}
        </div>
        <div className="space-y-3">
          <button
            onClick={restart}
            className="w-full py-4 bg-pink-600 hover:bg-pink-500 rounded-2xl text-xl font-bold transition-colors"
          >
            {t('celebrity.newGame')}
          </button>
          <Link to="/" className="block py-3 text-pink-400 hover:text-pink-200">
            {t('celebrity.backHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
