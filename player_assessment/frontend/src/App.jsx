import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PlayerPage from './PlayerPage'
import CoachPage from './CoachPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter basename="/player_assessment">
      <Routes>
        <Route path="/" element={<PlayerPage />} />
        <Route path="/coach" element={<CoachPage />} />
      </Routes>
    </BrowserRouter>
  )
}
