import './CelestialCard.css';

function Detail({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="celestial-card__detail">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CelestialCard({ body }) {
  return (
    <article className="celestial-card" aria-label={body.name}>
      <h2 className="celestial-card__name">{body.name}</h2>
      <span className="celestial-card__badge">
        {body.type === 'exoplanet' ? 'Exoplanet' : 'Star'}
      </span>

      <p className="celestial-card__description">{body.description}</p>

      <dl className="celestial-card__details">
        <Detail label="Host star" value={body.host_star} />
        <Detail label="Constellation" value={body.constellation} />
        <Detail
          label="Distance"
          value={
            body.distance_ly != null ? `${body.distance_ly} light-years` : null
          }
        />
        <Detail label="Discovered" value={body.discovery_year} />
        <Detail label="Discovery method" value={body.discovery_method} />
        <Detail
          label="Orbital period"
          value={
            body.orbital_period_days != null
              ? `${body.orbital_period_days} days`
              : null
          }
        />
        <Detail
          label="Mass"
          value={body.mass_earth != null ? `${body.mass_earth}× Earth` : null}
        />
        <Detail
          label="Radius"
          value={
            body.radius_earth != null ? `${body.radius_earth}× Earth` : null
          }
        />
        <Detail
          label="Equilibrium temp"
          value={
            body.equilibrium_temp_k != null
              ? `${body.equilibrium_temp_k} K`
              : null
          }
        />
      </dl>

      <blockquote className="celestial-card__fact">
        <p>{body.fun_fact}</p>
      </blockquote>
    </article>
  );
}

export default CelestialCard;
