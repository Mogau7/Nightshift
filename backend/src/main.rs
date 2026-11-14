use std::{
    net::SocketAddr,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

const MASKED: &str = "ENCRYPTED";
const MINUTE_MS: u64 = 60_000;
const HOUR_MS: u64 = 3_600_000;
const MIN_TARGET: u32 = 2;
const MAX_TARGET: u32 = 8;
const IMAGE_PRESETS: [&str; 4] = [
    "/images/venue-1.jpg",
    "/images/venue-2.jpg",
    "/images/venue-3.jpg",
    "/images/venue-4.jpg",
];
const CODE_ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

struct Secret {
    name: String,
    address: String,
    image_url: String,
    pin: String,
    lat: Option<f64>,
    lng: Option<f64>,
}

struct Beacon {
    id: u32,
    zone_hint: String,
    vibe: String,
    bounty: String,
    closes_at_ms: u64,
    angle_deg: u16,
    distance: u8,
    secret: Secret,
}

#[derive(Clone, Serialize)]
struct Squad {
    code: String,
    beacon_id: u32,
    leader: String,
    target_size: u32,
    members: Vec<String>,
    unlocked: bool,
    created_at_ms: u64,
}

struct AppState {
    beacons: Vec<Beacon>,
    squads: Vec<Squad>,
    next_beacon_id: u32,
}

type Shared = Arc<RwLock<AppState>>;

#[derive(Serialize)]
struct BeaconView {
    id: u32,
    zone_hint: String,
    vibe: String,
    bounty: String,
    closes_at_ms: u64,
    angle_deg: u16,
    distance: u8,
    unlocked: bool,
    secret_name: String,
    secret_address: String,
    image_url: String,
    entry_pin: String,
    lat: Option<f64>,
    lng: Option<f64>,
}

#[derive(Serialize)]
struct StateView {
    server_time_ms: u64,
    beacons: Vec<BeaconView>,
    squads: Vec<Squad>,
}

#[derive(Deserialize)]
struct NewBeacon {
    secret_name: String,
    secret_address: String,
    image_url: String,
    entry_pin: String,
    zone_hint: String,
    vibe: String,
    bounty: String,
    duration_minutes: u32,
    lat: Option<f64>,
    lng: Option<f64>,
}

#[derive(Deserialize)]
struct NewSquad {
    beacon_id: u32,
    leader: String,
    target_size: u32,
}

#[derive(Deserialize)]
struct JoinRequest {
    name: String,
}

#[derive(Debug)]
enum ApiError {
    BadRequest(String),
    NotFound(String),
    Conflict(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::BadRequest(message) => (StatusCode::BAD_REQUEST, message),
            ApiError::NotFound(message) => (StatusCode::NOT_FOUND, message),
            ApiError::Conflict(message) => (StatusCode::CONFLICT, message),
        };
        (status, Json(json!({ "error": message }))).into_response()
    }
}

fn bad(message: &str) -> ApiError {
    ApiError::BadRequest(message.to_string())
}

fn missing(message: &str) -> ApiError {
    ApiError::NotFound(message.to_string())
}

fn conflict(message: &str) -> ApiError {
    ApiError::Conflict(message.to_string())
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis() as u64)
        .unwrap_or(0)
}

fn fits(text: &str, min: usize, max: usize) -> bool {
    let length = text.chars().count();
    length >= min && length <= max
}

fn is_unlocked(state: &AppState, beacon_id: u32) -> bool {
    state
        .squads
        .iter()
        .any(|squad| squad.beacon_id == beacon_id && squad.unlocked)
}

fn view_beacon(beacon: &Beacon, unlocked: bool) -> BeaconView {
    let reveal = |value: &str| {
        if unlocked {
            value.to_string()
        } else {
            MASKED.to_string()
        }
    };
    BeaconView {
        id: beacon.id,
        zone_hint: beacon.zone_hint.clone(),
        vibe: beacon.vibe.clone(),
        bounty: beacon.bounty.clone(),
        closes_at_ms: beacon.closes_at_ms,
        angle_deg: beacon.angle_deg,
        distance: beacon.distance,
        unlocked,
        secret_name: reveal(&beacon.secret.name),
        secret_address: reveal(&beacon.secret.address),
        image_url: reveal(&beacon.secret.image_url),
        entry_pin: reveal(&beacon.secret.pin),
        lat: if unlocked { beacon.secret.lat } else { None },
        lng: if unlocked { beacon.secret.lng } else { None },
    }
}

fn fresh_code(squads: &[Squad]) -> String {
    let mut rng = rand::thread_rng();
    loop {
        let code: String = (0..6)
            .map(|_| CODE_ALPHABET[rng.gen_range(0..CODE_ALPHABET.len())] as char)
            .collect();
        if !squads.iter().any(|squad| squad.code == code) {
            return code;
        }
    }
}

fn add_beacon(state: &mut AppState, request: NewBeacon, now: u64) -> Result<u32, ApiError> {
    let name = request.secret_name.trim().to_string();
    let address = request.secret_address.trim().to_string();
    let zone_hint = request.zone_hint.trim().to_string();
    let vibe = request.vibe.trim().to_string();
    let bounty = request.bounty.trim().to_string();
    let pin = request.entry_pin.trim().to_string();

    if !fits(&name, 2, 60) {
        return Err(bad("Venue name must be 2 to 60 characters."));
    }
    if !fits(&address, 5, 120) {
        return Err(bad("Street address must be 5 to 120 characters."));
    }
    if !fits(&zone_hint, 3, 40) {
        return Err(bad("The zone hint must be 3 to 40 characters."));
    }
    if !fits(&vibe, 2, 24) {
        return Err(bad("The vibe tag must be 2 to 24 characters."));
    }
    if !fits(&bounty, 2, 48) {
        return Err(bad("The bounty must be 2 to 48 characters."));
    }
    if pin.len() != 4 || !pin.chars().all(|c| c.is_ascii_digit()) {
        return Err(bad("The entry PIN must be exactly 4 digits."));
    }
    if !IMAGE_PRESETS.contains(&request.image_url.as_str()) {
        return Err(bad("Pick one of the venue photo presets."));
    }
    if request.duration_minutes < 15 || request.duration_minutes > 480 {
        return Err(bad("A beacon can stay lit for 15 to 480 minutes."));
    }
    let (lat, lng) = match (request.lat, request.lng) {
        (None, None) => (None, None),
        (Some(la), Some(ln))
            if (-90.0..=90.0).contains(&la) && (-180.0..=180.0).contains(&ln) =>
        {
            (Some(la), Some(ln))
        }
        _ => return Err(bad("A map pin needs a valid latitude and longitude.")),
    };

    let mut rng = rand::thread_rng();
    let id = state.next_beacon_id;
    state.next_beacon_id += 1;
    state.beacons.push(Beacon {
        id,
        zone_hint,
        vibe,
        bounty,
        closes_at_ms: now + u64::from(request.duration_minutes) * MINUTE_MS,
        angle_deg: rng.gen_range(0..360),
        distance: rng.gen_range(24..=88),
        secret: Secret {
            name,
            address,
            image_url: request.image_url,
            pin,
            lat,
            lng,
        },
    });
    Ok(id)
}

fn open_squad(state: &mut AppState, request: NewSquad, now: u64) -> Result<Squad, ApiError> {
    let leader = request.leader.trim().to_string();
    if !fits(&leader, 2, 24) {
        return Err(bad("Your callsign must be 2 to 24 characters."));
    }
    if request.target_size < MIN_TARGET || request.target_size > MAX_TARGET {
        return Err(bad("A squad needs between 2 and 8 people."));
    }
    let beacon_is_live = state
        .beacons
        .iter()
        .any(|beacon| beacon.id == request.beacon_id && beacon.closes_at_ms > now);
    if !beacon_is_live {
        return Err(missing("That beacon is not on the radar any more."));
    }

    let squad = Squad {
        code: fresh_code(&state.squads),
        beacon_id: request.beacon_id,
        leader: leader.clone(),
        target_size: request.target_size,
        members: vec![leader],
        unlocked: false,
        created_at_ms: now,
    };
    state.squads.push(squad.clone());
    Ok(squad)
}

fn join_squad(state: &mut AppState, code: &str, name: &str) -> Result<Squad, ApiError> {
    let name = name.trim().to_string();
    if !fits(&name, 2, 24) {
        return Err(bad("Your callsign must be 2 to 24 characters."));
    }
    let code = code.trim().to_uppercase();
    let squad = state
        .squads
        .iter_mut()
        .find(|squad| squad.code == code)
        .ok_or_else(|| missing("No squad uses that code."))?;

    if squad.unlocked || squad.members.len() as u32 >= squad.target_size {
        return Err(conflict("This squad is already full."));
    }
    if squad
        .members
        .iter()
        .any(|member| member.to_lowercase() == name.to_lowercase())
    {
        return Err(conflict("That callsign is already in this squad."));
    }

    squad.members.push(name);
    if squad.members.len() as u32 >= squad.target_size {
        squad.unlocked = true;
    }
    Ok(squad.clone())
}

fn force_unlock(state: &mut AppState, beacon_id: u32, now: u64) -> Result<Squad, ApiError> {
    if !state.beacons.iter().any(|beacon| beacon.id == beacon_id) {
        return Err(missing("No beacon with that id."));
    }

    let has_squad = state.squads.iter().any(|squad| squad.beacon_id == beacon_id);
    if has_squad {
        for squad in state
            .squads
            .iter_mut()
            .filter(|squad| squad.beacon_id == beacon_id)
        {
            squad.unlocked = true;
        }
    } else {
        let code = fresh_code(&state.squads);
        state.squads.push(Squad {
            code,
            beacon_id,
            leader: "Demo Owl".to_string(),
            target_size: 3,
            members: vec![
                "Demo Owl".to_string(),
                "Night Crew".to_string(),
                "Street Scout".to_string(),
            ],
            unlocked: true,
            created_at_ms: now,
        });
    }

    state
        .squads
        .iter()
        .find(|squad| squad.beacon_id == beacon_id)
        .cloned()
        .ok_or_else(|| missing("No beacon with that id."))
}

fn seed_state() -> AppState {
    let now = now_ms();
    let beacons = vec![
        Beacon {
            id: 1,
            zone_hint: "Braamfontein, 600 m north-east".to_string(),
            vibe: "Late roast".to_string(),
            bounty: "Free flat white + R50 off".to_string(),
            closes_at_ms: now + 12 * HOUR_MS,
            angle_deg: 48,
            distance: 58,
            secret: Secret {
                name: "Ember & Ash Roastery".to_string(),
                address: "28 Juta Street, Braamfontein, Johannesburg".to_string(),
                image_url: "/images/venue-1.jpg".to_string(),
                pin: "4271".to_string(),
                lat: Some(-26.1936),
                lng: Some(28.0337),
            },
        },
        Beacon {
            id: 2,
            zone_hint: "Newtown, 1.2 km south-west".to_string(),
            vibe: "Vinyl + vermouth".to_string(),
            bounty: "Two-for-one on every pour".to_string(),
            closes_at_ms: now + 8 * HOUR_MS,
            angle_deg: 212,
            distance: 74,
            secret: Secret {
                name: "The Back Room Records".to_string(),
                address: "13 Henry Nxumalo Street, Newtown, Johannesburg".to_string(),
                image_url: "/images/venue-2.jpg".to_string(),
                pin: "8093".to_string(),
                lat: Some(-26.2026),
                lng: Some(28.0338),
            },
        },
    ];
    AppState {
        beacons,
        squads: Vec::new(),
        next_beacon_id: 3,
    }
}

async fn get_state(State(shared): State<Shared>) -> Json<StateView> {
    let state = shared.read().await;
    let now = now_ms();
    let beacons = state
        .beacons
        .iter()
        .filter(|beacon| beacon.closes_at_ms > now)
        .map(|beacon| view_beacon(beacon, is_unlocked(&state, beacon.id)))
        .collect();
    Json(StateView {
        server_time_ms: now,
        beacons,
        squads: state.squads.clone(),
    })
}

async fn create_beacon(
    State(shared): State<Shared>,
    Json(request): Json<NewBeacon>,
) -> Result<Json<BeaconView>, ApiError> {
    let mut state = shared.write().await;
    let id = add_beacon(&mut state, request, now_ms())?;
    let beacon = state
        .beacons
        .iter()
        .find(|beacon| beacon.id == id)
        .ok_or_else(|| missing("The beacon could not be found."))?;
    Ok(Json(view_beacon(beacon, false)))
}

async fn create_squad(
    State(shared): State<Shared>,
    Json(request): Json<NewSquad>,
) -> Result<Json<Squad>, ApiError> {
    let mut state = shared.write().await;
    let squad = open_squad(&mut state, request, now_ms())?;
    Ok(Json(squad))
}

async fn join_by_code(
    State(shared): State<Shared>,
    Path(code): Path<String>,
    Json(request): Json<JoinRequest>,
) -> Result<Json<Squad>, ApiError> {
    let mut state = shared.write().await;
    let squad = join_squad(&mut state, &code, &request.name)?;
    Ok(Json(squad))
}

async fn fast_forward(
    State(shared): State<Shared>,
    Path(beacon_id): Path<u32>,
) -> Result<Json<Squad>, ApiError> {
    let mut state = shared.write().await;
    let squad = force_unlock(&mut state, beacon_id, now_ms())?;
    Ok(Json(squad))
}

#[tokio::main]
async fn main() {
    let shared: Shared = Arc::new(RwLock::new(seed_state()));

    let app = Router::new()
        .route("/api/state", get(get_state))
        .route("/api/beacons", post(create_beacon))
        .route("/api/squads", post(create_squad))
        .route("/api/squads/:code/join", post(join_by_code))
        .route("/api/demo/fast-forward/:beacon_id", post(fast_forward))
        .layer(CorsLayer::permissive())
        .with_state(shared);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(3001);
    let address = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(address)
        .await
        .expect("could not bind the radar port");

    println!("NightShift radar online at http://{address}");
    axum::serve(listener, app)
        .await
        .expect("the radar server stopped unexpectedly");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn beacon_request() -> NewBeacon {
        NewBeacon {
            secret_name: "Moth & Flame".to_string(),
            secret_address: "5 Fox Lane, Maboneng, Johannesburg".to_string(),
            image_url: "/images/venue-3.jpg".to_string(),
            entry_pin: "1234".to_string(),
            zone_hint: "Maboneng, 400 m east".to_string(),
            vibe: "Supper club".to_string(),
            bounty: "Free dessert".to_string(),
            duration_minutes: 90,
            lat: None,
            lng: None,
        }
    }

    #[test]
    fn locked_beacons_hide_every_secret() {
        let state = seed_state();
        let view = view_beacon(&state.beacons[0], false);
        assert_eq!(view.secret_name, MASKED);
        assert_eq!(view.secret_address, MASKED);
        assert_eq!(view.image_url, MASKED);
        assert_eq!(view.entry_pin, MASKED);
        assert!(view.lat.is_none() && view.lng.is_none());
    }

    #[test]
    fn a_full_squad_unlocks_the_door() {
        let mut state = seed_state();
        let squad = open_squad(
            &mut state,
            NewSquad { beacon_id: 1, leader: "Thandi".to_string(), target_size: 3 },
            now_ms(),
        )
        .unwrap();
        assert!(!squad.unlocked);

        let half = join_squad(&mut state, &squad.code, "Sipho").unwrap();
        assert!(!half.unlocked);
        let full = join_squad(&mut state, &squad.code.to_lowercase(), "Lerato").unwrap();
        assert!(full.unlocked);
        assert!(is_unlocked(&state, 1));
        assert!(!is_unlocked(&state, 2));
        assert_eq!(view_beacon(&state.beacons[0], true).entry_pin, "4271");
    }

    #[test]
    fn joining_is_policed() {
        let mut state = seed_state();
        let squad = open_squad(
            &mut state,
            NewSquad { beacon_id: 2, leader: "Mpho".to_string(), target_size: 2 },
            now_ms(),
        )
        .unwrap();
        assert!(matches!(join_squad(&mut state, &squad.code, "mpho"), Err(ApiError::Conflict(_))));
        assert!(matches!(join_squad(&mut state, "NOPE99", "Zed"), Err(ApiError::NotFound(_))));
        assert!(matches!(join_squad(&mut state, &squad.code, "Z"), Err(ApiError::BadRequest(_))));
        join_squad(&mut state, &squad.code, "Zed").unwrap();
        assert!(matches!(join_squad(&mut state, &squad.code, "Late"), Err(ApiError::Conflict(_))));
    }

    #[test]
    fn beacon_requests_are_validated() {
        let mut state = seed_state();
        let id = add_beacon(&mut state, beacon_request(), now_ms()).unwrap();
        assert_eq!(id, 3);

        let mut short_pin = beacon_request();
        short_pin.entry_pin = "12a4".to_string();
        assert!(add_beacon(&mut state, short_pin, now_ms()).is_err());

        let mut wild_photo = beacon_request();
        wild_photo.image_url = "https://example.com/x.jpg".to_string();
        assert!(add_beacon(&mut state, wild_photo, now_ms()).is_err());

        let mut half_pin = beacon_request();
        half_pin.lat = Some(-26.2);
        assert!(add_beacon(&mut state, half_pin, now_ms()).is_err());

        let mut forever = beacon_request();
        forever.duration_minutes = 9999;
        assert!(add_beacon(&mut state, forever, now_ms()).is_err());
    }

    #[test]
    fn squads_need_a_live_beacon_and_a_sane_size() {
        let mut state = seed_state();
        let tiny = NewSquad { beacon_id: 1, leader: "Solo".to_string(), target_size: 1 };
        assert!(open_squad(&mut state, tiny, now_ms()).is_err());
        let ghost = NewSquad { beacon_id: 99, leader: "Solo".to_string(), target_size: 3 };
        assert!(matches!(open_squad(&mut state, ghost, now_ms()), Err(ApiError::NotFound(_))));
        let expired = NewSquad { beacon_id: 1, leader: "Late".to_string(), target_size: 3 };
        assert!(open_squad(&mut state, expired, now_ms() + 24 * HOUR_MS).is_err());
    }

    #[test]
    fn fast_forward_opens_a_beacon_with_or_without_a_squad() {
        let mut state = seed_state();
        let demo = force_unlock(&mut state, 2, now_ms()).unwrap();
        assert!(demo.unlocked && demo.members.len() == 3);

        let squad = open_squad(
            &mut state,
            NewSquad { beacon_id: 1, leader: "Kabelo".to_string(), target_size: 5 },
            now_ms(),
        )
        .unwrap();
        let forced = force_unlock(&mut state, 1, now_ms()).unwrap();
        assert_eq!(forced.code, squad.code);
        assert!(forced.unlocked);
        assert!(matches!(force_unlock(&mut state, 77, now_ms()), Err(ApiError::NotFound(_))));
    }
}
