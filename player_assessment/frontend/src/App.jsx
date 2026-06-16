import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PlayerPage from './PlayerPage'
import CoachPage from './CoachPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter basename="/hmh_coaching/player_assessment/dist">
      <Routes>
        <Route path="/" element={<PlayerPage />} />
        <Route path="/coach" element={<CoachPage />} />
      </Routes>
    </BrowserRouter>
  )
}
