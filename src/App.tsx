import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'

const Undercover = lazy(() => import('./pages/Undercover'))
const Werewolf = lazy(() => import('./pages/Werewolf'))
const BlackMagic = lazy(() => import('./pages/BlackMagic'))
const NumberGuess = lazy(() => import('./pages/NumberGuess'))
const WheelOfFortune = lazy(() => import('./pages/WheelOfFortune'))
const Ludo = lazy(() => import('./pages/Ludo'))
const Chess = lazy(() => import('./pages/Chess'))
const CelebrityGuess = lazy(() => import('./pages/CelebrityGuess'))
const Story = lazy(() => import('./pages/Story'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/undercover" element={<Undercover />} />
        <Route path="/werewolf" element={<Werewolf />} />
        <Route path="/black-magic" element={<BlackMagic />} />
        <Route path="/number-guess" element={<NumberGuess />} />
        <Route path="/wheel" element={<WheelOfFortune />} />
        <Route path="/ludo" element={<Ludo />} />
        <Route path="/chess" element={<Chess />} />
        <Route path="/celebrity" element={<CelebrityGuess />} />
        <Route path="/story" element={<Story />} />
      </Routes>
    </Suspense>
  )
}
