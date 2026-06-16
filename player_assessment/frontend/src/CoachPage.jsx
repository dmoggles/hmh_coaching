import { useState, useEffect } from 'react'
import { getSkillMatrix, getPeriods, getPlayersForPeriod, submitCoachAssessment, createPeriod } from './api'
import SkillForm from './SkillForm'

export default function CoachPage() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('coach_api_key') ?? '')
  const [authed, setAuthed] = useState(false)
  const [matrix, setMatrix] = useState(null)
  const [periods, setPeriods] = useState([])
  const [periodId, setPeriodId] = useState('')
  const [players, setPlayers] = useState([])
  const [playerName, setPlayerName] = useState('')
  const [position, setPosition] = useState('outfield')
  const [ratings, setRatings] = useState({})
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [newPeriodLabel, setNewPeriodLabel] = useState('')
  const [showNewPeriod, setShowNewPeriod] = useState(false)

  const login = async () => {
    try {
      const data = await getPeriods()
      setPeriods(data)
      setAuthed(true)
      localStorage.setItem('coach_api_key', apiKey)
      getSkillMatrix().then(setMatrix)
    } catch {
      setErrorMsg('Could not connect. Check the API URL.')
    }
  }

  useEffect(() => {
    if (authed && periodId) {
      getPlayersForPeriod(periodId, apiKey).then(setPlayers).catch(() => {})
    }
  }, [authed, periodId, apiKey])

  const handlePlayerSelect = (name, pos) => {
    setPlayerName(name)
    setPosition(pos)
    setRatings({})
    setStatus('idle')
  }

  const handleRating = (skillId, score) => {
    setRatings(r => ({ ...r, [skillId]: score }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')
    try {
      const allSkills = matrix.sections
        .filter(s => s.applies_to.includes(position))
        .flatMap(s => s.skills)
      const ratingList = allSkills.map(skill => ({
        skill_id: skill.id,
        score: ratings[skill.id] ?? null,
      }))
      await submitCoachAssessment({
        player_name: playerName.trim(),
        position,
        period_id: Number(periodId),
        ratings: ratingList,
      }, apiKey)
      setStatus('saved')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.response?.data?.detail ?? 'Something went wrong')
    }
  }

  const handleCreatePeriod = async () => {
    if (!newPeriodLabel.trim()) return
    try {
      const p = await createPeriod({ label: newPeriodLabel.trim(), is_active: true }, apiKey)
      setPeriods(prev => [p, ...prev])
      setPeriodId(p.id)
      setNewPeriodLabel('')
      setShowNewPeriod(false)
    } catch (err) {
      setErrorMsg(err.response?.data?.detail ?? 'Failed to create period')
    }
  }

  if (!authed) {
    return (
      <div className="page login-page">
        <h1>Coach Login</h1>
        <div className="field">
          <label>API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
          />
        </div>
        {errorMsg && <p className="error">{errorMsg}</p>}
        <button className="submit-btn" onClick={login}>Enter</button>
      </div>
    )
  }

  return (
    <div className="page">
      <header>
        <h1>Coach Assessment</h1>
        {matrix && <p className="subtitle">{matrix.meta.team} · {matrix.meta.season}</p>}
      </header>

      <div className="coach-controls">
        <div className="field">
          <label>Period</label>
          <select value={periodId} onChange={e => { setPeriodId(e.target.value); setPlayerName(''); setRatings({}) }}>
            <option value="">Select period…</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.label}{p.is_active ? ' ✓' : ''}</option>)}
          </select>
          <button type="button" className="link-btn" onClick={() => setShowNewPeriod(v => !v)}>
            + New period
          </button>
        </div>

        {showNewPeriod && (
          <div className="inline-row">
            <input
              type="text"
              placeholder="e.g. Summer 2026"
              value={newPeriodLabel}
              onChange={e => setNewPeriodLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreatePeriod()}
            />
            <button type="button" onClick={handleCreatePeriod}>Create</button>
          </div>
        )}
      </div>

      {periodId && (
        <div className="coach-layout">
          <aside className="player-list">
            <h3>Players</h3>
            {players.map(p => (
              <button
                key={p.player_name}
                type="button"
                className={`player-btn ${playerName === p.player_name ? 'active' : ''}`}
                onClick={() => handlePlayerSelect(p.player_name, p.position)}
              >
                {p.player_name}
                <span className="pos-tag">{p.position === 'goalkeeper' ? 'GK' : 'OF'}</span>
              </button>
            ))}
            <div className="new-player">
              <input
                type="text"
                placeholder="Type a name…"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
              />
              <select value={position} onChange={e => { setPosition(e.target.value); setRatings({}) }}>
                <option value="outfield">Outfield</option>
                <option value="goalkeeper">GK</option>
              </select>
            </div>
          </aside>

          <main>
            {playerName && matrix ? (
              <form onSubmit={handleSubmit}>
                <h2>{playerName}</h2>
                <SkillForm
                  matrix={matrix}
                  position={position}
                  ratings={ratings}
                  onChange={handleRating}
                />
                {status === 'error' && <p className="error">{errorMsg}</p>}
                {status === 'saved' && <p className="success">Saved.</p>}
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? 'Saving…' : 'Save Coach Assessment'}
                </button>
              </form>
            ) : (
              <p className="muted">Select or type a player name to begin.</p>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
