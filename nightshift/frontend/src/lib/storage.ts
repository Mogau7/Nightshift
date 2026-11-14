const CALLSIGN_KEY = 'nightshift.callsign';
const SQUADS_KEY = 'nightshift.squads';
const BEACONS_KEY = 'nightshift.beacons';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
  }
}

function readArray(key: string): unknown[] {
  const raw = read(key);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadCallsign(): string {
  return read(CALLSIGN_KEY) ?? '';
}

export function saveCallsign(value: string): void {
  write(CALLSIGN_KEY, value);
}

export function loadMySquads(): string[] {
  return readArray(SQUADS_KEY).filter((item): item is string => typeof item === 'string');
}

export function rememberSquad(code: string): void {
  const known = loadMySquads();
  if (!known.includes(code)) {
    write(SQUADS_KEY, JSON.stringify([...known, code]));
  }
}

export function loadMyBeacons(): number[] {
  return readArray(BEACONS_KEY).filter((item): item is number => typeof item === 'number');
}

export function rememberBeacon(id: number): void {
  const known = loadMyBeacons();
  if (!known.includes(id)) {
    write(BEACONS_KEY, JSON.stringify([...known, id]));
  }
}
