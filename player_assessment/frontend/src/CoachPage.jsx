import { useState, useEffect } from 'react'
import { getSkillMatrix, getPeriods, getPlayersForPeriod, getCoachAssessment, getComparison, getPeriodAssessments, submitCoachAssessment, createPeriod } from './api'
import SkillForm from './SkillForm'
import ComparisonView from './ComparisonView'
import SummaryView from './SummaryView'
import PrioritiesView from './PrioritiesView'
import HeatmapView from './HeatmapView'
import { ALL_POSITIONS, POSITION_LABELS, POSITION_ABBR, FREQUENCIES, skillSetFor, sectionsFor, norm } from './matrix'

export default function CoachPage() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('coach_api_key') ?? '')
  const [authed, setAuthed] = useState(false)
  const [matrix, setMatrix] = useState(null)
  const [periods, setPeriods] = useState([])
  const [periodId, setPeriodId] = useState('')
  const [players, setPlayers] = useState([])
  const [playerName, setPlayerName] = useState('')
  const [primaryPosition, setPrimaryPosition] = useState('defender')
  const [secondaryPosition, setSecondaryPosition] = useState('')
  const [secondaryFrequency, setSecondaryFrequency] = useState('sometimes')
  const [ratings, setRatings] = useState({})
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [newPeriodLabel, setNewPeriodLabel] = useState('')
  const [showNewPeriod, setShowNewPeriod] = useState(false)
  const [mode, setMode] = useState('assess') // assess | compare
  const [comparison, setComparison] = useState(null)
  const [view, setView] = useState('players') // players | heatmap
  const [periodAssessments, setPeriodAssessments] = useState([])

  const position = skillSetFor(primaryPosition)

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

  useEffect(() => {
    if ((mode === 'compare' || mode === 'summary' || mode === 'priorities') && periodId && playerName) {
      setComparison(null)
      getComparison(periodId, playerName, apiKey).then(setComparison).catch(() => {})
    }
  }, [mode, periodId, playerName, apiKey])

  useEffect(() => {
    if (view === 'heatmap' && periodId) {
      getPeriodAssessments(periodId, apiKey).then(setPeriodAssessments).catch(() => {})
    }
  }, [view, periodId, apiKey])

  const handlePlayerSelect = async (p) => {
    setPlayerName(p.player_name)
    setPrimaryPosition(norm(p.primary_position) ?? (p.position === 'goalkeeper' ? 'goalkeeper' : 'defender'))
    setSecondaryPosition(norm(p.secondary_position) ?? '')
    setSecondaryFrequency(p.secondary_position_frequency ?? 'sometimes')
    setRatings({})
    setStatus('idle')

    try {
      const existing = await getCoachAssessment(periodId, p.player_name, apiKey)
      if (existing) {
        if (existing.primary_position) setPrimaryPosition(norm(existing.primary_position))
        setSecondaryPosition(norm(existing.secondary_position) ?? '')
        setSecondaryFrequency(existing.secondary_position_frequency ?? 'sometimes')
        const map = {}
        for (const r of existing.ratings) {
          if (r.score != null) map[r.skill_id] = r.score
        }
        setRatings(map)
      }
    } catch {
      // no saved coach assessment yet — leave the form blank
    }
  }

  const handleRating = (skillId, score) => {
    setRatings(r => ({ ...r, [skillId]: score }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')
    try {
      const allSkills = sectionsFor(matrix, position).flatMap(s => s.skills)
      const ratingList = allSkills.map(skill => ({
        skill_id: skill.id,
        score: ratings[skill.id] ?? null,
      }))
      await submitCoachAssessment({
        player_name: playerName.trim(),
        primary_position: primaryPosition,
        secondary_position: secondaryPosition || null,
        secondary_position_frequency: secondaryPosition ? secondaryFrequency : null,
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

      <div className="view-tabs">
        <button type="button" className={view === 'players' ? 'active' : ''} onClick={() => setView('players')}>Players</button>
        <button type="button" className={view === 'heatmap' ? 'active' : ''} onClick={() => setView('heatmap')}>Heatmap</button>
      </div>

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

      {periodId && view === 'heatmap' && matrix && (
        <HeatmapView matrix={matrix} assessments={periodAssessments} />
      )}

      {periodId && view === 'players' && (
        <div className="coach-layout">
          <aside className="player-list">
            <h3>Players</h3>
            {players.map(p => (
              <button
                key={p.player_name}
                type="button"
                className={`player-btn ${playerName === p.player_name ? 'active' : ''}`}
                onClick={() => handlePlayerSelect(p)}
              >
                {p.player_name}
                <span className="pos-tag">
                  {POSITION_ABBR[norm(p.primary_position)] ?? (p.position === 'goalkeeper' ? 'GK' : 'OF')}
                </span>
              </button>
            ))}
            <div className="new-player">
              <input
                type="text"
                placeholder="Type a name…"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
              />
            </div>
          </aside>

          <main>
            {playerName && matrix ? (
              <>
                <div className="cmp-toggle">
                  <h2>{playerName}</h2>
                  <div className="toggle-group">
                    <button
                      type="button"
                      className={mode === 'assess' ? 'active' : ''}
                      onClick={() => setMode('assess')}
                    >
                      Assess
                    </button>
                    <button
                      type="button"
                      className={mode === 'compare' ? 'active' : ''}
                      onClick={() => setMode('compare')}
                    >
                      Compare
                    </button>
                    <button
                      type="button"
                      className={mode === 'summary' ? 'active' : ''}
                      onClick={() => setMode('summary')}
                    >
                      Summary
                    </button>
                    <button
                      type="button"
                      className={mode === 'priorities' ? 'active' : ''}
                      onClick={() => setMode('priorities')}
                    >
                      Priorities
                    </button>
                  </div>
                </div>

                {mode === 'compare' || mode === 'summary' || mode === 'priorities' ? (
                  comparison ? (
                    mode === 'compare' ? (
                      <ComparisonView matrix={matrix} coach={comparison.coach} player={comparison.player} />
                    ) : mode === 'summary' ? (
                      <SummaryView matrix={matrix} coach={comparison.coach} player={comparison.player} />
                    ) : (
                      <PrioritiesView
                        matrix={matrix}
                        coach={comparison.coach}
                        player={comparison.player}
                        periodId={periodId}
                        playerName={playerName}
                        apiKey={apiKey}
                      />
                    )
                  ) : (
                    <p className="muted">Loading…</p>
                  )
                ) : (
              <form onSubmit={handleSubmit}>
                <div className="position-fields">
                  <div className="field">
                    <label>Primary position</label>
                    <select
                      value={primaryPosition}
                      onChange={e => {
                        const next = e.target.value
                        // Only clear ratings when the skill set itself changes
                        // (GK uses different skills than outfield roles).
                        if (skillSetFor(next) !== skillSetFor(primaryPosition)) setRatings({})
                        setPrimaryPosition(next)
                        if (secondaryPosition === next) setSecondaryPosition('')
                      }}
                    >
                      {ALL_POSITIONS.map(p => <option key={p} value={p}>{POSITION_LABELS[p]}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Secondary position <span className="optional">(optional)</span></label>
                    <select
                      value={secondaryPosition}
                      onChange={e => setSecondaryPosition(e.target.value)}
                    >
                      <option value="">None</option>
                      {ALL_POSITIONS.filter(p => p !== primaryPosition).map(p => (
                        <option key={p} value={p}>{POSITION_LABELS[p]}</option>
                      ))}
                    </select>
                  </div>
                  {secondaryPosition && (
                    <div className="field">
                      <label>How often?</label>
                      <select value={secondaryFrequency} onChange={e => setSecondaryFrequency(e.target.value)}>
                        {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>

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
                )}
              </>
            ) : (
              <p className="muted">Select or type a player name to begin.</p>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
