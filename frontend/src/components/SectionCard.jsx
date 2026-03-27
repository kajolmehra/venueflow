export function SectionCard({ id, title, kicker, actions, children, className = '' }) {
  return (
    <section className={`section-card ${className}`.trim()} id={id}>
      <div className="section-head">
        <div>
          {kicker ? <p className="section-kicker">{kicker}</p> : null}
          <h2>{title}</h2>
        </div>
        {actions ? <div className="section-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}
