import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

export interface TimerHandle {
  pause: () => void
  resume: () => void
  reset: (seconds: number) => void
}

interface TimerProps {
  seconds: number
  onExpire: () => void
  label?: string
}

const Timer = forwardRef<TimerHandle, TimerProps>(({ seconds, onExpire, label }, ref) => {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(true)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useImperativeHandle(ref, () => ({
    pause: () => setRunning(false),
    resume: () => setRunning(true),
    reset: (s: number) => { setRemaining(s); setRunning(true) },
  }))

  useEffect(() => {
    setRemaining(seconds)
    setRunning(true)
  }, [seconds])

  useEffect(() => {
    if (!running) return
    if (remaining <= 0) {
      onExpireRef.current()
      return
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining, running])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const display = `${mins}:${secs.toString().padStart(2, '0')}`
  const isLow = remaining > 0 && remaining <= 10

  return (
    <div className="text-center mb-4">
      {label && <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{label}</p>}
      <p className={`text-4xl font-mono font-bold transition-colors ${isLow ? 'text-red-400 animate-pulse' : 'text-white'}`}>
        {display}
      </p>
    </div>
  )
})

Timer.displayName = 'Timer'

export default Timer
