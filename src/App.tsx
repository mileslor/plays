import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Undercover from './pages/Undercover'
import Werewolf from './pages/Werewolf'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/undercover" element={<Undercover />} />
      <Route path="/werewolf" element={<Werewolf />} />
    </Routes>
  )
}
