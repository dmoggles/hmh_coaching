import { useState, useEffect, useMemo } from 'react'
import { ratingMap, completeness, priorityScores, suggestedPriorities } from './assessment'
import { getPriorities, setPriorities } from './api'

const fmt1 = (v) => (v == null ? '—' : v.toFixed(1))

export default function PrioritiesView({ matrix, coach, player, periodId, playerName, apiKey }) {
  const ranked = useMemo(() => priorityScores(matrix, coach, player), [matrix, coach, player])
  const suggested = useMemo(() => suggestedPriorities(matrix, coach, player), [matrix, coach, player])
  const byId = useMemo(() => Object.fromEntries(ranked.map(r => [r.skill_id, r])), [ranked])

  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (!coach) return
    // Seed from existing confirmations, else from the algorithm's suggestions.
    getPriorities(periodId, playerName, apiKey)
      .then(existing => {
        if (existing.length) {
          setRows(existing
            .sort((a, b) => a.rank - b.rank)
            .map(e => ({ skill_id: e.skill_id, coach_note: e.coach_note ?? '' })))
        } else {
          setRows(suggested.map(s => ({ skill_id: s.skill_id, coach_note: '' })))
        }
      })
      .catch(() => setRows(suggested.map(s => ({ skill_id: s.skill_id, coach_note: '' }))))
    setStatus('idle')
  }, [periodId, playerName, apiKey, coach, suggested])

  if (!coach) {
    return <p className="muted">No coach assessment for this player yet — assess them first.</p>
  }

  const comp = completeness(matrix, coach.position, ratingMap(coach))
  if (comp.pct < 100) {
    return (
      <div className="priorities">
        <p className="warning">Priorities unlock once the coach assessment is 100% complete.</p>
        <div className="completeness">
          <span className="completeness-label">Coach assessment</span>
          <div className="completeness-bar"><div className="completeness-fill" style={{ width: `${comp.pct}%` }} /></div>
          <span className="completeness-num">{comp.assessed}/{comp.applicable} ({Math.round(comp.pct)}%)</span>
        </div>
      </div>
    )
  }

  const updateRow = (i, patch) => setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const save = async () => {
    setStatus('saving')
    const payload = {
      player_name: playerName,
      period_id: Number(periodId),
      priorities: rows.map((r, i) => ({
        skill_id: r.skill_id,
        rank: i + 1,
        // True only if it matches the algorithm's suggestion at this rank.
        algorithm_suggested: suggested[i]?.skill_id === r.skill_id,
        coach_note: r.coach_note?.trim() || null,
      })),
    }
    try {
      await setPriorities(payload, apiKey)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  const chosen = new Set(rows.map(r => r.skill_id))

  return (
    <div className="priorities">
      <p className="muted small">
        The algorithm suggests the 3 highest-urgency skills. Accept, or replace any with a different skill from the ranked list.
      </p>

      {rows.map((row, i) => {
        const info = byId[row.skill_id]
        const isSuggested = suggested[i]?.skill_id === row.skill_id
        return (
          <div key={i} className="priority-row">
            <div className="priority-rank">{i + 1}</div>
            <div className="priority-body">
              <div className="priority-select-line">
                <select
                  value={row.skill_id}
                  onChange={e => updateRow(i, { skill_id: e.target.value })}
                >
                  {ranked.map(r => (
                    <option
                      key={r.skill_id}
                      value={r.skill_id}
                      disabled={chosen.has(r.skill_id) && r.skill_id !== row.skill_id}
                    >
                      {r.label} — urgency {fmt1(r.score)}
                    </option>
                  ))}
                </select>
                <span className={`alg-tag ${isSuggested ? 'suggested' : 'override'}`}>
                  {isSuggested ? 'Suggested' : 'Override'}
                </span>
              </div>
              {info && (
                <div className="priority-meta">
                  score {fmt1(info.avg)} · weight {fmt1(info.weight)}
                  {info.bonus > 0 && <span className="dep-bonus"> · +{fmt1(info.bonus)} dependency</span>}
                </div>
              )}
              <input
                type="text"
                className="priority-note"
                placeholder="Optional note on why this is a priority…"
                value={row.coach_note}
                onChange={e => updateRow(i, { coach_note: e.target.value })}
              />
            </div>
          </div>
        )
      })}

      <button type="button" className="submit-btn" onClick={save} disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving…' : 'Save priorities'}
      </button>
      {status === 'saved' && <p className="success">Priorities saved.</p>}
      {status === 'error' && <p className="error">Could not save priorities.</p>}
    </div>
  )
}
