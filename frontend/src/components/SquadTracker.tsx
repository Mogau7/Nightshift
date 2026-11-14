import { useState } from 'react';
import { burnerLink, copyText } from '../lib/share';
import type { Notify, Squad } from '../lib/types';
import { LinkIcon } from './Icons';

interface SquadTrackerProps {
  squad: Squad;
  callsign: string;
  notify: Notify;
  onJoin?: (code: string) => Promise<boolean>;
}

export default function SquadTracker({ squad, callsign, notify, onJoin }: SquadTrackerProps) {
  const [joining, setJoining] = useState(false);

  const me = callsign.trim().toLowerCase();
  const isMember = me.length > 0 && squad.members.some((member) => member.toLowerCase() === me);
  const isFull = squad.members.length >= squad.target_size;
  const canJoin = onJoin !== undefined && !squad.unlocked && !isFull && !isMember;
  const stillNeeded = Math.max(squad.target_size - squad.members.length, 0);

  async function copyLink() {
    const copied = await copyText(burnerLink(squad.code));
    if (copied) {
      notify('Burner link copied. Send it to your crew.', 'info');
    } else {
      notify(`Could not copy. Share the code ${squad.code} instead.`, 'error');
    }
  }

  async function join() {
    if (!onJoin) {
      return;
    }
    setJoining(true);
    try {
      await onJoin(squad.code);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className={`squad${squad.unlocked ? ' squad-open' : ''}`}>
      <div className="squad-head">
        <span className="squad-code">{squad.code}</span>
        <span className="squad-status">
          {squad.unlocked ? 'Seal broken' : `${stillNeeded} more to unlock`}
        </span>
      </div>

      <div className="pips" aria-label={`${squad.members.length} of ${squad.target_size} members`}>
        {Array.from({ length: squad.target_size }, (_, index) => (
          <span key={index} className={`pip${index < squad.members.length ? ' pip-on' : ''}`} />
        ))}
      </div>

      <p className="squad-members">
        Led by {squad.leader}
        {squad.members.length > 1 ? ` with ${squad.members.slice(1).join(', ')}` : ''}
      </p>

      <div className="squad-actions">
        <button type="button" className="btn-ghost-edge" onClick={copyLink}>
          <LinkIcon className="btn-icon" />
          Copy Burner Link
        </button>
        {canJoin && (
          <button type="button" className="btn-join" onClick={join} disabled={joining}>
            {joining ? 'Joining…' : 'Join squad'}
          </button>
        )}
        {isMember && !squad.unlocked && <span className="squad-flag">You are in</span>}
      </div>
    </div>
  );
}
