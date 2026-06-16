import { useState } from 'react'

const SCALE = [1, 2, 3, 4, 5]
const ANCHOR_LABELS = { 1: 'Developing', 3: 'Achieving', 5: 'Excelling' }

export default function SkillForm({ matrix, position, ratings, onChange, readOnly = false }) {
  const relevantSections = matrix.sections.filter(s =>
    s.applies_to.includes(position)
  )

  return (
    <div className="skill-form">
      {relevantSections.map(section => (
        <div key={section.id} className="section">
          <h3>{section.label}</h3>
          {section.skills.map(skill => {
            const score = ratings[skill.id] ?? null
            return (
              <div key={skill.id} className="skill-row">
                <div className="skill-header">
                  <span className="skill-label">{skill.label}</span>
                  {score && (
                    <span className="current-score">
                      {ANCHOR_LABELS[score] ? `${score} – ${ANCHOR_LABELS[score]}` : score}
                    </span>
                  )}
                </div>
                {skill.descriptors[score] && (
                  <p className="descriptor active-descriptor">{skill.descriptors[score]}</p>
                )}
                <div className="scale-buttons">
                  {SCALE.map(n => (
                    <button
                      key={n}
                      type="button"
                      disabled={readOnly}
                      className={`score-btn ${score === n ? 'selected' : ''}`}
                      title={skill.descriptors[n] ?? ''}
                      onClick={() => !readOnly && onChange(skill.id, score === n ? null : n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {score && skill.descriptors[score] === undefined && (
                  <p className="descriptor muted">
                    Between {skill.descriptors[score - 1] ? ANCHOR_LABELS[score - 1] ?? '' : ''} and {ANCHOR_LABELS[score + 1] ?? ''}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
