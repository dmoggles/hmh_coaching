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
                </div>
                <div className="option-buttons">
                  {SCALE.map(n => {
                    const descriptor = skill.descriptors[n]
                    const isAnchor = descriptor !== undefined
                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={readOnly}
                        className={`option-btn ${isAnchor ? 'anchor' : 'intermediate'} ${score === n ? 'selected' : ''}`}
                        onClick={() => !readOnly && onChange(skill.id, score === n ? null : n)}
                      >
                        <span className="option-num">{n}</span>
                        {isAnchor ? (
                          <span className="option-text">
                            <span className="option-anchor-label">{ANCHOR_LABELS[n]}</span>
                            <span className="option-descriptor">{descriptor}</span>
                          </span>
                        ) : (
                          <span className="option-text option-intermediate-text">In between</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
