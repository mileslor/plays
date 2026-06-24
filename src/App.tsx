import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Undercover from './pages/Undercover'
import Werewolf from './pages/Werewolf'
import BlackMagic from './pages/BlackMagic'
import NumberGuess from './pages/NumberGuess'
import WheelOfFortune from './pages/WheelOfFortune'
import Ludo from './pages/Ludo'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/undercover" element={<Undercover />} />
      <Route path="/werewolf" element={<Werewolf />} />
      <Route path="/black-magic" element={<BlackMagic />} />
      <Route path="/number-guess" element={<NumberGuess />} />
      <Route path="/wheel" element={<WheelOfFortune />} />
      <Route path="/ludo" element={<Ludo />} />
    </Routes>
  )
}
