import { useEffect, useState } from 'react';
import { LockIcon } from './Icons';

interface VenueImageProps {
  src: string;
  locked: boolean;
  alt: string;
}

export default function VenueImage({ src, locked, alt }: VenueImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src, locked]);

  if (locked) {
    return (
      <div className="venue-art venue-art-locked">
        {!failed && (
          <img
            src="/images/radar-bg.png"
            alt=""
            className="venue-img venue-img-blur"
            onError={() => setFailed(true)}
          />
        )}
        <div className="venue-lock">
          <LockIcon className="venue-lock-icon" />
          <span className="venue-lock-label">Sealed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="venue-art">
      {failed ? (
        <div className="venue-fallback" />
      ) : (
        <img src={src} alt={alt} className="venue-img" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
