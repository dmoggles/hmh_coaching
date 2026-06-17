import { useState } from 'react'

const OUTFIELD_POSITIONS = ['Defender', 'Midfielder', 'Winger', 'Striker']
const POS_ABBR = { Goalkeeper: 'GK', Defender: 'DEF', Midfielder: 'MID', Winger: 'WNG', Striker: 'ST' }

const skillSetFor = (primary) => (primary === 'Goalkeeper' ? 'goalkeeper' : 'outfield')

// Continuous red -> amber -> green scale for scores 1..5
const scoreColor = (score) => {
  if (score == null) return 'transparent'
  const t = Math.max(0, Math.min(1, (score - 1) / 4))
  const hue = t * 120 // 0 = red, 120 = green
  return `hsl(${hue}, 62%, 47%)`
}

const ratingsToMap = (assessment) => {
  const m = {}
  for (const r of assessment.ratings) m[r.skill_id] = r.score
  return m
}

const fmt = (v) => (v == null ? '' : Number.isInteger(v) ? String(v) : v.toFixed(1))

export default function HeatmapView({ matrix, assessments }) {
  const [level, setLevel] = useState('individual') // individual | position
  const [skillSet, setSkillSet] = useState('outfield') // outfield | goalkeeper

  // Coach assessments only, matching the chosen skill set.
  const subjects = assessments.filter(a => a.assessor === 'coach' && a.position === skillSet)
  const sections = matrix.sections.filter(s => s.applies_to.includes(skillSet))

  // Build columns + a value lookup: valueFor(skillId, columnKey) -> number|null
  let columns = []
  let valueFor = () => null

  if (level === 'individual') {
    columns = subjects.map(a => ({ key: a.player_name, label: a.player_name, sub: POS_ABBR[a.primary_position] ?? '' }))
    const maps = Object.fromEntries(subjects.map(a => [a.player_name, ratingsToMap(a)]))
    valueFor = (skillId, key) => maps[key]?.[skillId] ?? null
  } else {
    const buckets = skillSet === 'goalkeeper' ? ['Goalkeeper'] : OUTFIELD_POSITIONS
    const present = buckets.filter(b => subjects.some(a => a.primary_position === b))
    columns = present.map(b => ({
      key: b,
      label: POS_ABBR[b] ?? b,
      sub: `${subjects.filter(a => a.primary_position === b).length}`,
    }))
    const grouped = Object.fromEntries(
      present.map(b => [b, subjects.filter(a => a.primary_position === b).map(ratingsToMap)])
    )
    valueFor = (skillId, key) => {
      const vals = grouped[key].map(m => m[skillId]).filter(v => v != null)
      if (!vals.length) return null
      return vals.reduce((s, v) => s + v, 0) / vals.length
    }
  }

  return (
    <div className="heatmap">
      <div className="heatmap-controls">
        <div className="toggle-group">
          <button type="button" className={level === 'individual' ? 'active' : ''} onClick={() => setLevel('individual')}>Individual</button>
          <button type="button" className={level === 'position' ? 'active' : ''} onClick={() => setLevel('position')}>By Position</button>
        </div>
        <div className="toggle-group">
          <button type="button" className={skillSet === 'outfield' ? 'active' : ''} onClick={() => setSkillSet('outfield')}>Outfield</button>
          <button type="button" className={skillSet === 'goalkeeper' ? 'active' : ''} onClick={() => setSkillSet('goalkeeper')}>Goalkeeper</button>
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="muted">No coach assessments for this skill set yet.</p>
      ) : (
        <div className="heatmap-scroll">
          <table className="heatmap-table">
            <thead>
              <tr>
                <th className="hm-skill-head">Skill</th>
                {columns.map(c => (
                  <th key={c.key} className="hm-col-head">
                    <span className="hm-col-label">{c.label}</span>
                    {c.sub && <span className="hm-col-sub">{c.sub}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map(section => (
                <SectionRows
                  key={section.id}
                  section={section}
                  columns={columns}
                  valueFor={valueFor}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SectionRows({ section, columns, valueFor }) {
  return (
    <>
      <tr className="hm-section-row">
        <td colSpan={columns.length + 1}>{section.label}</td>
      </tr>
      {section.skills.map(skill => (
        <tr key={skill.id}>
          <td className="hm-skill">{skill.label}</td>
          {columns.map(c => {
            const v = valueFor(skill.id, c.key)
            return (
              <td
                key={c.key}
                className="hm-cell"
                style={{ background: scoreColor(v), color: v == null ? 'var(--muted)' : '#fff' }}
              >
                {fmt(v)}
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}
