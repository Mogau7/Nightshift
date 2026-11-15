# NightShift

A street radar for doors that only open after hours. A host seals a closed venue behind a beacon, a connector raises a squad around it, and the door reveals itself when the squad is full.

All state lives in memory inside the Rust server. There is no database, no external service and no API key.

## Run it

Two terminals.

```
cd backend
cargo run
```
The radar comes online at http://localhost:3001.

```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. On a phone on the same Wi-Fi, open the "Network" address Vite prints.

Checks:
```
cd backend && cargo test
cd frontend && npm run build
```

### Starting from empty folders instead

```
mkdir nightshift && cd nightshift
cargo new backend --name nightshift-backend
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install && npm install -D tailwindcss@3.4.17 postcss autoprefixer
```
Then replace the generated files with the ones in this project and delete `src/App.css` and `src/assets`.

## API

Sealing is enforced by the server: secrets are not sent to any client until a squad for that beacon is unlocked. It is access control, not encryption at rest, and anyone can read the state once a squad unlocks.

## Maps

Unlocked cards open Google Maps and Apple Maps. If the host dropped a pin with "Drop pin at my location", both apps open on those exact coordinates. Otherwise they search by venue name and address.
