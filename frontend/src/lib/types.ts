export type Tab = 'radar' | 'connector' | 'host';

export type ToastKind = 'beacon' | 'unlock' | 'info' | 'error';

export interface ToastItem {
  id: number;
  text: string;
  kind: ToastKind;
}

export interface Beacon {
  id: number;
  zone_hint: string;
  vibe: string;
  bounty: string;
  closes_at_ms: number;
  angle_deg: number;
  distance: number;
  unlocked: boolean;
  secret_name: string;
  secret_address: string;
  image_url: string;
  entry_pin: string;
  lat: number | null;
  lng: number | null;
}

export interface Squad {
  code: string;
  beacon_id: number;
  leader: string;
  target_size: number;
  members: string[];
  unlocked: boolean;
  created_at_ms: number;
}

export interface GameState {
  server_time_ms: number;
  beacons: Beacon[];
  squads: Squad[];
}

export interface NewBeaconInput {
  secret_name: string;
  secret_address: string;
  image_url: string;
  entry_pin: string;
  zone_hint: string;
  vibe: string;
  bounty: string;
  duration_minutes: number;
  lat: number | null;
  lng: number | null;
}

export type Notify = (text: string, kind: ToastKind) => void;
