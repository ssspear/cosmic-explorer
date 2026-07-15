import CelestialCard from './CelestialCard';
import { planetImage } from '../lib/planetImages';
import './PlanetDetailDrawer.css';

function PlanetDetailDrawer({ body, onClose }) {
  const image = body.type === 'exoplanet' ? planetImage(body.size_class) : null;
  return (
    <aside className="detail-drawer" aria-label={`Details for ${body.name}`}>
      <button type="button" className="detail-drawer__close" onClick={onClose}>
        Close
      </button>
      {image && (
        <figure className="detail-drawer__figure">
          <img src={image.src} alt="" loading="lazy" />
          <figcaption>{image.caption}</figcaption>
        </figure>
      )}
      <CelestialCard body={body} />
    </aside>
  );
}

export default PlanetDetailDrawer;
