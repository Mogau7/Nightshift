import { appleMapsUrl, googleMapsUrl } from '../lib/maps';
import type { Beacon } from '../lib/types';
import { PinIcon } from './Icons';

interface MapButtonsProps {
  beacon: Beacon;
}

export default function MapButtons({ beacon }: MapButtonsProps) {
  return (
    <div className="map-buttons">
      <a
        className="btn-map btn-map-google"
        href={googleMapsUrl(beacon)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <PinIcon className="btn-icon" />
        Google Maps
      </a>
      <a
        className="btn-map btn-map-apple"
        href={appleMapsUrl(beacon)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <PinIcon className="btn-icon" />
        Apple Maps
      </a>
    </div>
  );
}
