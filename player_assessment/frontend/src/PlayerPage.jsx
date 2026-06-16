import { useState, useEffect } from 'react'
import { getSkillMatrix, getPeriods, submitPlayerAssessment } from './api'
import SkillForm from './SkillForm'

export default function PlayerPage() {
  const [matrix, setMatrix] = useState(null)
  const [periods, setPeriods] = useState([])
  const [name, setName] = useState('')
  const [position, setPosition] = useState('outfield')
  const [periodId, setPeriodId] = useState('')
  const [ratings, setRatings] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | done | error | already_submitted
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    getSkillMatrix().then(setMatrix)
    getPeriods().then(data => {
      const active = data.filter(p => p.is_active)
      setPeriods(active)
      if (active.length === 1) setPeriodId(active[0].id)
    })
  }, [])

  const handleRating = (skillId, score) => {
    setRatings(r => ({ ...r, [skillId]: score }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
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
      await submitPlayerAssessment({
        player_name: name.trim(),
        position,
        period_id: Number(periodId),
        ratings: ratingList,
      })
      setStatus('done')
    } catch (err) {
      if (err.response?.status === 409) {
        setStatus('already_submitted')
      } else {
        setStatus('error')
        setErrorMsg(err.response?.data?.detail ?? 'Something went wrong')
      }
    }
  }

  if (!matrix) return <p className="loading">Loading…</p>

  if (status === 'done') {
    return (
      <div className="done-message">
        <h2>Thanks, {name}!</h2>
        <p>Your self-assessment has been saved.</p>
      </div>
    )
  }

  if (status === 'already_submitted') {
    return (
      <div className="done-message">
        <h2>Already submitted</h2>
        <p>You've already completed your self-assessment for this period, {name}.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header>
        <h1>Bob-Tails Self-Assessment</h1>
        <p className="subtitle">{matrix.meta.team} · {matrix.meta.season} · {matrix.meta.format}</p>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="form-fields">
          <div className="field">
            <label>Your name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="First name or full name"
              required
            />
          </div>

          <div className="field">
            <label>Position</label>
            <select value={position} onChange={e => { setPosition(e.target.value); setRatings({}) }}>
              <option value="outfield">Outfield</option>
              <option value="goalkeeper">Goalkeeper</option>
            </select>
          </div>

          {periods.length > 1 && (
            <div className="field">
              <label>Period</label>
              <select value={periodId} onChange={e => setPeriodId(e.target.value)} required>
                <option value="">Select…</option>
                {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          )}
          {periods.length === 1 && (
            <p className="period-label">Period: <strong>{periods[0].label}</strong></p>
          )}
          {periods.length === 0 && (
            <p className="warning">No active assessment periods right now.</p>
          )}
        </div>

        {periodId && (
          <>
            <div className="scale-legend">
              <span>Scale: </span>
              {[1, 3, 5].map(n => (
                <span key={n} className="legend-item"><strong>{n}</strong> {matrix.meta.scale.anchors[n]}</span>
              ))}
              <span className="legend-item muted">2 &amp; 4 are intermediate</span>
            </div>

            <SkillForm
              matrix={matrix}
              position={position}
              ratings={ratings}
              onChange={handleRating}
            />

            {status === 'error' && <p className="error">{errorMsg}</p>}

            <button
              type="submit"
              className="submit-btn"
              disabled={status === 'submitting' || !name.trim()}
            >
              {status === 'submitting' ? 'Saving…' : 'Submit Assessment'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
