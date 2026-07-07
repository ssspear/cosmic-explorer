import './CelestialCard.css';

function CelestialCard({ body }) {
  return (
    <article className="celestial-card" aria-label={body.name}>
      <h2 className="celestial-card__name">{body.name}</h2>
      <span className="celestial-card__badge">
        {body.type === 'exoplanet' ? 'Exoplanet' : 'Star'}
      </span>

      <p className="celestial-card__description">{body.description}</p>

      <dl className="celestial-card__details">
        <div className="celestial-card__detail">
          <dt>Constellation</dt>
          <dd>{body.constellation}</dd>
        </div>
        <div className="celestial-card__detail">
          <dt>Distance</dt>
          <dd>{body.distance_ly} light-years</dd>
        </div>
        {body.discovery_year && (
          <div className="celestial-card__detail">
            <dt>Discovered</dt>
            <dd>{body.discovery_year}</dd>
          </div>
        )}
      </dl>

      <blockquote className="celestial-card__fact">
        <p>{body.fun_fact}</p>
      </blockquote>
    </article>
  );
}

export default CelestialCard;
