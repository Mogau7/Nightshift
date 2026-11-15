import type { Beacon, GameState, NewBeaconInput, Squad } from './types';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function readErrorMessage(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const value = (body as { error: unknown }).error;
    if (typeof value === 'string') {
      return value;
    }
  }
  return 'Something went wrong. Try again.';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError('Cannot reach the radar. Is the backend running?', 0);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(readErrorMessage(body), response.status);
  }
  return body as T;
}

function postJson<T>(path: string, payload?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

export function fetchState(): Promise<GameState> {
  return request<GameState>('/api/state');
}

export function createBeacon(input: NewBeaconInput): Promise<Beacon> {
  return postJson<Beacon>('/api/beacons', input);
}

export function createSquad(beaconId: number, leader: string, targetSize: number): Promise<Squad> {
  return postJson<Squad>('/api/squads', {
    beacon_id: beaconId,
    leader,
    target_size: targetSize,
  });
}

export function joinSquad(code: string, name: string): Promise<Squad> {
  return postJson<Squad>(`/api/squads/${encodeURIComponent(code)}/join`, { name });
}

export function fastForward(beaconId: number): Promise<Squad> {
  return postJson<Squad>(`/api/demo/fast-forward/${beaconId}`);
}
