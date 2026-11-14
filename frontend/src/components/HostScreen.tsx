import { useState } from 'react';
import type { FormEvent } from 'react';
import { formatCountdown } from '../lib/time';
import type { Beacon, NewBeaconInput, Notify, Squad } from '../lib/types';
import { PinIcon } from './Icons';

interface HostScreenProps {
  beacons: Beacon[];
  squads: Squad[];
  myBeacons: number[];
  clock: number;
  notify: Notify;
  onHost: (input: NewBeaconInput) => Promise<boolean>;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const IMAGE_CHOICES = [
  { url: '/images/venue-1.jpg', label: 'Roastery' },
  { url: '/images/venue-2.jpg', label: 'Record room' },
  { url: '/images/venue-3.jpg', label: 'Supper room' },
  { url: '/images/venue-4.jpg', label: 'Studio loft' },
];

const VIBES = ['Late roast', 'Vinyl + vermouth', 'Studio jam', 'Supper club', 'Silent disco'];

const DURATIONS = [
  { minutes: 60, label: '1 h' },
  { minutes: 120, label: '2 h' },
  { minutes: 240, label: '4 h' },
  { minutes: 480, label: '8 h' },
];

interface PresetThumbProps {
  url: string;
  label: string;
  active: boolean;
  onPick: () => void;
}

function PresetThumb({ url, label, active, onPick }: PresetThumbProps) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      className={`preset${active ? ' preset-active' : ''}`}
      aria-pressed={active}
      onClick={onPick}
    >
      {failed ? (
        <span className="preset-fallback" />
      ) : (
        <img src={url} alt="" className="preset-img" onError={() => setFailed(true)} />
      )}
      <span className="preset-label">{label}</span>
    </button>
  );
}

export default function HostScreen({ beacons, squads, myBeacons, clock, notify, onHost }: HostScreenProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [pin, setPin] = useState('');
  const [zoneHint, setZoneHint] = useState('');
  const [bounty, setBounty] = useState('');
  const [vibe, setVibe] = useState(VIBES[0]);
  const [imageUrl, setImageUrl] = useState(IMAGE_CHOICES[0].url);
  const [minutes, setMinutes] = useState(120);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const mine = beacons.filter((beacon) => myBeacons.includes(beacon.id));

  function dropPin() {
    if (!('geolocation' in navigator)) {
      notify('This device cannot share a location. The address still works.', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
        notify('Pin dropped where you are standing.', 'info');
      },
      () => {
        setLocating(false);
        notify('Location was blocked. Maps will search by address instead.', 'error');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function firstProblem(): string | null {
    if (name.trim().length < 2) return 'Give the venue a name (2 characters or more).';
    if (address.trim().length < 5) return 'Add the full street address.';
    if (!/^\d{4}$/.test(pin)) return 'The entry PIN is exactly 4 digits.';
    if (zoneHint.trim().length < 3) return 'Add a rough zone hint, like "Maboneng, 400 m east".';
    if (bounty.trim().length < 2) return 'Name the bounty your crew will earn.';
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = firstProblem();
    if (problem) {
      notify(problem, 'error');
      return;
    }
    setSaving(true);
    try {
      const lit = await onHost({
        secret_name: name.trim(),
        secret_address: address.trim(),
        image_url: imageUrl,
        entry_pin: pin,
        zone_hint: zoneHint.trim(),
        vibe,
        bounty: bounty.trim(),
        duration_minutes: minutes,
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lng : null,
      });
      if (lit) {
        setName('');
        setAddress('');
        setPin('');
        setZoneHint('');
        setBounty('');
        setCoords(null);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="screen-head">
        <p className="eyebrow">Host</p>
        <h1 className="screen-title">Light a beacon for your closed door</h1>
        <p className="screen-sub">
          Your name, address, photo and PIN stay sealed until a squad fills up. The street only
          sees a rough zone and the bounty.
        </p>
      </div>

      <form className="panel host-form" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Venue name (sealed)</span>
          <input
            className="field-input"
            value={name}
            maxLength={60}
            placeholder="Ember & Ash Roastery"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Street address (sealed)</span>
          <input
            className="field-input"
            value={address}
            maxLength={120}
            placeholder="28 Juta Street, Braamfontein"
            autoComplete="street-address"
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>

        <div className="field">
          <span className="field-label">Map pin (optional)</span>
          <button type="button" className="btn-ghost-edge" onClick={dropPin} disabled={locating}>
            <PinIcon className="btn-icon" />
            {coords
              ? `Pin saved ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
              : locating
                ? 'Finding you…'
                : 'Drop pin at my location'}
          </button>
        </div>

        <label className="field">
          <span className="field-label">Entry PIN (sealed)</span>
          <input
            className="field-input field-code"
            value={pin}
            inputMode="numeric"
            maxLength={4}
            placeholder="0000"
            autoComplete="off"
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </label>

        <p className="field-label">Venue photo (sealed)</p>
        <div className="preset-grid">
          {IMAGE_CHOICES.map((choice) => (
            <PresetThumb
              key={choice.url}
              url={choice.url}
              label={choice.label}
              active={imageUrl === choice.url}
              onPick={() => setImageUrl(choice.url)}
            />
          ))}
        </div>

        <label className="field">
          <span className="field-label">Zone hint (public)</span>
          <input
            className="field-input"
            value={zoneHint}
            maxLength={40}
            placeholder="Maboneng, 400 m east"
            onChange={(event) => setZoneHint(event.target.value)}
          />
        </label>

        <p className="field-label">Vibe tag (public)</p>
        <div className="chip-row">
          {VIBES.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip${vibe === option ? ' chip-active' : ''}`}
              aria-pressed={vibe === option}
              onClick={() => setVibe(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <label className="field">
          <span className="field-label">Bounty (public)</span>
          <input
            className="field-input"
            value={bounty}
            maxLength={48}
            placeholder="Free dessert for the whole squad"
            onChange={(event) => setBounty(event.target.value)}
          />
        </label>

        <p className="field-label">Door stays lit for</p>
        <div className="chip-row">
          {DURATIONS.map((option) => (
            <button
              key={option.minutes}
              type="button"
              className={`chip${minutes === option.minutes ? ' chip-active' : ''}`}
              aria-pressed={minutes === option.minutes}
              onClick={() => setMinutes(option.minutes)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button type="submit" className="btn-scan btn-scan-wide" disabled={saving}>
          <span>{saving ? 'Lighting beacon…' : 'Light the beacon'}</span>
        </button>
      </form>

      <p className="section-label">Your beacons</p>
      {mine.length === 0 ? (
        <p className="empty-note">Beacons you light on this phone show up here.</p>
      ) : (
        <div className="stack">
          {mine.map((beacon) => {
            const crew = squads.filter((squad) => squad.beacon_id === beacon.id).length;
            return (
              <div key={beacon.id} className="host-beacon">
                <div>
                  <p className="my-squad-zone">{beacon.zone_hint}</p>
                  <p className="host-beacon-meta">
                    {beacon.vibe} · {crew} {crew === 1 ? 'squad' : 'squads'} ·{' '}
                    {formatCountdown(beacon.closes_at_ms - clock)}
                  </p>
                </div>
                <span className={`status-chip${beacon.unlocked ? ' status-chip-open' : ''}`}>
                  {beacon.unlocked ? 'Open' : 'Sealed'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
