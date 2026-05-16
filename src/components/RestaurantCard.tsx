import './RestaurantCard.css';
import type { Restaurant } from '../hooks/useClaude';

interface Props {
  restaurant: Restaurant;
  selected: boolean;
  onSelect: () => void;
  index: number;
}

export default function RestaurantCard({
  restaurant,
  selected,
  onSelect,
  index,
}: Props) {
  const {
    name,
    cuisine,
    rating,
    priceRange,
    address,
    why,
    tags = [],
    placeId,
    description,
  } = restaurant;

  const mapsQuery = encodeURIComponent(`${name} ${address ?? ''}`);
  const mapsUrl = placeId
    ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
    : `https://maps.google.com/?q=${mapsQuery}`;
  // Apple Maps doesn't support Google place_id — use verified address when available
  const appleMapsUrl = placeId
    ? `https://maps.apple.com/?q=${encodeURIComponent(address ?? name)}`
    : `https://maps.apple.com/?q=${mapsQuery}`;

  return (
    <article
      className={`rc-card${selected ? ' rc-card--selected' : ''}`}
      style={{ animationDelay: `${index * 0.08}s` }}
      onClick={onSelect}
      aria-pressed={selected}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="rc-header">
        <div className="rc-name-row">
          <h3 className="rc-name">{name}</h3>
          {selected && <span className="rc-selected-badge">✓ Selected</span>}
        </div>
        <div className="rc-meta">
          <span className="rc-cuisine">{cuisine}</span>
          {rating && <span className="rc-rating">★ {rating}</span>}
          {priceRange && <span className="rc-price">{priceRange}</span>}
        </div>
      </div>

      {description && <p className="rc-description">{description}</p>}
      <p className="rc-why">{why}</p>

      {address && <p className="rc-address">{address}</p>}

      {tags.length > 0 && (
        <div className="rc-tags">
          {tags.map((tag) => (
            <span key={tag} className="rc-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {selected && (
        <div className="rc-actions" onClick={(e) => e.stopPropagation()}>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rc-action-btn"
          >
            <MapIcon size={14} />
            Open in Google Maps
          </a>
          <a
            href={appleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rc-action-btn"
          >
            <PinIcon size={14} />
            Open in Maps
          </a>
        </div>
      )}
    </article>
  );
}

function MapIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

function PinIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
