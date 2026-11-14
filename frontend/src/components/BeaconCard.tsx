import { formatCountdown, isRunningLow } from '../lib/time';
import type { Beacon, Notify, Squad } from '../lib/types';
import { ClockIcon, PinIcon } from './Icons';
import MapButtons from './MapButtons';
import SquadTracker from './SquadTracker';
import VenueImage from './VenueImage';

interface BeaconCardProps {
  beacon: Beacon;
  squads: Squad[];
  clock: number;
  callsign: string;
  selected: boolean;
  notify: Notify;
  onSelect: (id: number) => void;
  onJoin: (code: string) => Promise<boolean>;
  onStartSquad: (beaconId: number) => void;
}

export default function BeaconCard({
  beacon,
  squads,
  clock,
  callsign,
  selected,
  notify,
  onSelect,
  onJoin,
  onStartSquad,
}: BeaconCardProps) {
  const msLeft = beacon.closes_at_ms - clock;
  const forming = squads.filter((squad) => !squad.unlocked);

  return (
    <article
      id={`beacon-${beacon.id}`}
      className={`beacon-card${selected ? ' beacon-card-selected' : ''}`}
      onClick={() => onSelect(beacon.id)}
    >
      <VenueImage
        src={beacon.image_url}
        locked={!beacon.unlocked}
        alt={`Photo of ${beacon.secret_name}`}
      />

      <div className="beacon-body">
        <div className="beacon-tags">
          <span className="tag tag-vibe">{beacon.vibe}</span>
          <span className="tag tag-bounty">Bounty: {beacon.bounty}</span>
        </div>

        <p className="zone-hint">
          <PinIcon className="inline-icon" />
          {beacon.zone_hint}
        </p>

        <p className={`countdown${isRunningLow(msLeft) ? ' countdown-low' : ''}`}>
          <ClockIcon className="inline-icon" />
          {formatCountdown(msLeft)}
          <span className="countdown-note">until the door closes</span>
        </p>

        {beacon.unlocked ? (
          <div className="reveal">
            <p className="mono-label">Seal broken</p>
            <h3 className="reveal-name">{beacon.secret_name}</h3>
            <p className="reveal-address">{beacon.secret_address}</p>
            <div className="pin-row" aria-label={`Entry PIN ${beacon.entry_pin}`}>
              {beacon.entry_pin.split('').map((digit, index) => (
                <span key={index} className="pin-digit">
                  {digit}
                </span>
              ))}
            </div>
            <MapButtons beacon={beacon} />
          </div>
        ) : (
          <dl className="sealed-rows">
            <div>
              <dt>Venue</dt>
              <dd>{beacon.secret_name}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{beacon.secret_address}</dd>
            </div>
            <div>
              <dt>Entry PIN</dt>
              <dd>{beacon.entry_pin}</dd>
            </div>
          </dl>
        )}

        {!beacon.unlocked && (
          <div className="squad-list">
            {forming.map((squad) => (
              <SquadTracker
                key={squad.code}
                squad={squad}
                callsign={callsign}
                notify={notify}
                onJoin={onJoin}
              />
            ))}
            <button
              type="button"
              className="btn-notch btn-notch-small"
              onClick={(event) => {
                event.stopPropagation();
                onStartSquad(beacon.id);
              }}
            >
              {forming.length === 0 ? 'Start a Squad Bounty' : 'Start another squad'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
