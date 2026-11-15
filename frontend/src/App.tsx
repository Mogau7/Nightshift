import { useCallback, useEffect, useRef, useState } from 'react';
import BottomNav from './components/BottomNav';
import ConnectorScreen from './components/ConnectorScreen';
import HostScreen from './components/HostScreen';
import Landing from './components/Landing';
import RadarScreen from './components/RadarScreen';
import Toasts from './components/Toasts';
import TopBar from './components/TopBar';
import { useNow } from './hooks/useNow';
import { createBeacon, createSquad, fastForward, fetchState, joinSquad } from './lib/api';
import { inviteFromUrl, messageOf } from './lib/share';
import {
  loadCallsign,
  loadMyBeacons,
  loadMySquads,
  rememberBeacon,
  rememberSquad,
  saveCallsign,
} from './lib/storage';
import type { GameState, NewBeaconInput, Squad, Tab, ToastItem, ToastKind } from './lib/types';

const POLL_MS = 3000;

export default function App() {
  const [entered, setEntered] = useState(() => inviteFromUrl() !== '');
  const [tab, setTab] = useState<Tab>('radar');
  const [game, setGame] = useState<GameState | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [offline, setOffline] = useState(false);
  const [callsign, setCallsign] = useState(loadCallsign);
  const [mySquads, setMySquads] = useState<string[]>(loadMySquads);
  const [myBeacons, setMyBeacons] = useState<number[]>(loadMyBeacons);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [connectorTarget, setConnectorTarget] = useState<number | null>(null);
  const [inviteCode, setInviteCode] = useState(inviteFromUrl);
  const [demoBusy, setDemoBusy] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const previous = useRef<GameState | null>(null);
  const toastCounter = useRef(0);

  const now = useNow(1000);
  const clock = now + clockOffset;

  const pushToast = useCallback((text: string, kind: ToastKind) => {
    toastCounter.current += 1;
    const id = toastCounter.current;
    setToasts((list) => [...list.slice(-2), { id, text, kind }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const applyState = useCallback(
    (next: GameState) => {
      const before = previous.current;
      if (before) {
        const knownBeacons = new Set(before.beacons.map((beacon) => beacon.id));
        next.beacons
          .filter((beacon) => !knownBeacons.has(beacon.id))
          .forEach((beacon) => pushToast(`New beacon on the radar near ${beacon.zone_hint}`, 'beacon'));

        const wasOpen = new Set(before.squads.filter((squad) => squad.unlocked).map((squad) => squad.code));
        next.squads
          .filter((squad) => squad.unlocked && !wasOpen.has(squad.code))
          .forEach((squad) => pushToast(`Squad ${squad.code} is full. Seal broken.`, 'unlock'));
      }
      previous.current = next;
      setGame(next);
      setClockOffset(next.server_time_ms - Date.now());
    },
    [pushToast],
  );

  const refresh = useCallback(async () => {
    try {
      applyState(await fetchState());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [applyState]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  function changeCallsign(value: string) {
    setCallsign(value);
    saveCallsign(value);
  }

  const joinByCode = useCallback(
    async (code: string): Promise<boolean> => {
      const name = callsign.trim();
      if (name.length < 2) {
        pushToast('Set a callsign first. It needs 2 or more characters.', 'error');
        return false;
      }
      try {
        const squad = await joinSquad(code.trim().toUpperCase(), name);
        rememberSquad(squad.code);
        setMySquads(loadMySquads());
        setInviteCode('');
        window.history.replaceState(null, '', window.location.pathname);
        if (!squad.unlocked) {
          const left = squad.target_size - squad.members.length;
          pushToast(`You are in. ${left} more to break the seal.`, 'info');
        }
        await refresh();
        return true;
      } catch (error) {
        pushToast(messageOf(error), 'error');
        return false;
      }
    },
    [callsign, pushToast, refresh],
  );

  const launchSquad = useCallback(
    async (beaconId: number, targetSize: number): Promise<Squad | null> => {
      const name = callsign.trim();
      if (name.length < 2) {
        pushToast('Set a callsign first. It needs 2 or more characters.', 'error');
        return null;
      }
      try {
        const squad = await createSquad(beaconId, name, targetSize);
        rememberSquad(squad.code);
        setMySquads(loadMySquads());
        pushToast(`Squad ${squad.code} is live. Copy the burner link and send it.`, 'info');
        await refresh();
        return squad;
      } catch (error) {
        pushToast(messageOf(error), 'error');
        return null;
      }
    },
    [callsign, pushToast, refresh],
  );

  const hostBeacon = useCallback(
    async (input: NewBeaconInput): Promise<boolean> => {
      try {
        const beacon = await createBeacon(input);
        rememberBeacon(beacon.id);
        setMyBeacons(loadMyBeacons());
        setSelectedId(beacon.id);
        await refresh();
        return true;
      } catch (error) {
        pushToast(messageOf(error), 'error');
        return false;
      }
    },
    [pushToast, refresh],
  );

  async function demoUnlock() {
    const targetId = selectedId ?? (game && game.beacons.length > 0 ? game.beacons[0].id : null);
    if (targetId === null) {
      pushToast('No beacon on the radar to unlock.', 'error');
      return;
    }
    const target = game ? game.beacons.find((beacon) => beacon.id === targetId) : undefined;
    if (target && target.unlocked) {
      pushToast('That door is already open.', 'info');
      return;
    }
    setDemoBusy(true);
    try {
      await fastForward(targetId);
      setSelectedId(targetId);
      setTab('radar');
      await refresh();
    } catch (error) {
      pushToast(messageOf(error), 'error');
    } finally {
      setDemoBusy(false);
    }
  }

  function startSquadFor(beaconId: number) {
    setConnectorTarget(beaconId);
    setTab('connector');
  }

  function viewBeacon(beaconId: number) {
    setSelectedId(beaconId);
    setTab('radar');
  }

  if (!entered) {
    const stats = {
      beacons: game ? game.beacons.length : 0,
      squads: game ? game.squads.filter((squad) => !squad.unlocked).length : 0,
      opened: game ? game.beacons.filter((beacon) => beacon.unlocked).length : 0,
    };
    return (
      <div className="shell">
        <Landing stats={stats} onEnter={() => setEntered(true)} />
      </div>
    );
  }

  let content;
  if (game === null) {
    content = (
      <div className="booting">
        <div className="booting-ring" aria-hidden="true" />
        <p className="booting-text">
          {offline ? 'Cannot reach the radar. Start the backend on port 3001.' : 'Tuning the radar…'}
        </p>
      </div>
    );
  } else if (tab === 'radar') {
    content = (
      <RadarScreen
        beacons={game.beacons}
        squads={game.squads}
        clock={clock}
        callsign={callsign}
        onCallsign={changeCallsign}
        selectedId={selectedId}
        onSelect={setSelectedId}
        inviteCode={inviteCode}
        notify={pushToast}
        onJoin={joinByCode}
        onStartSquad={startSquadFor}
      />
    );
  } else if (tab === 'connector') {
    content = (
      <ConnectorScreen
        beacons={game.beacons}
        squads={game.squads}
        mySquads={mySquads}
        callsign={callsign}
        onCallsign={changeCallsign}
        preselectedId={connectorTarget}
        notify={pushToast}
        onLaunch={launchSquad}
        onJoin={joinByCode}
        onViewBeacon={viewBeacon}
      />
    );
  } else {
    content = (
      <HostScreen
        beacons={game.beacons}
        squads={game.squads}
        myBeacons={myBeacons}
        clock={clock}
        notify={pushToast}
        onHost={hostBeacon}
      />
    );
  }

  return (
    <div className="shell">
      <TopBar busy={demoBusy} offline={offline} onDemoUnlock={demoUnlock} />
      {offline && game !== null && (
        <p className="signal-lost">Signal lost. Showing the last known radar.</p>
      )}
      <main className="screen">{content}</main>
      <BottomNav active={tab} onChange={setTab} />
      <Toasts items={toasts} />
    </div>
  );
}
