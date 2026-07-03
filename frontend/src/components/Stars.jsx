import { useState } from 'react';

export function StarRating({ value = 0, onChange, readonly = false, size = '1.2rem' }) {
  const [hover, setHover] = useState(0);

  return (
    <div className={`stars${readonly ? ' stars-display' : ''}`} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`star${i <= (hover || value) ? ' filled' : ''}`}
          onClick={() => !readonly && onChange?.(i)}
          onMouseEnter={() => !readonly && setHover(i)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function StarDisplay({ value = 0, size = '1rem' }) {
  const full = Math.floor(value);
  return (
    <div className="stars stars-display" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`star${i <= full ? ' filled' : ''}`}>★</span>
      ))}
    </div>
  );
}
