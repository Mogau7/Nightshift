interface LandingStats {
  beacons: number;
  squads: number;
  opened: number;
}

interface LandingProps {
  stats: LandingStats;
  onEnter: () => void;
}

const steps = [
  {
    role: 'Host',
    title: 'Seals the door',
    text: 'A closed café, studio or shop lights a beacon for the quiet hours. Name, address, photo and PIN stay locked away.',
  },
  {
    role: 'Connector',
    title: 'Reads the radar',
    text: 'You spot the blip, see only a rough zone and a bounty, and raise a squad with a burner link.',
  },
  {
    role: 'Night Owl',
    title: 'Breaks the seal',
    text: 'Join with a tap. When the last seat fills, the door reveals itself: place, photo, address and entry PIN.',
  },
];

export default function Landing({ stats, onEnter }: LandingProps) {
  return (
    <div className="landing">
      <div className="landing-glow" aria-hidden="true" />

      <header className="landing-top">
        <span className="brand-word">NIGHTSHIFT</span>
        <span className="live-chip">
          <span className="live-dot" aria-hidden="true" />
          Radar live
        </span>
      </header>

      <section className="hero">
        <div className="horizon" aria-hidden="true">
          <div className="horizon-ring" />
          <div className="horizon-core" />
          <div className="horizon-line" />
        </div>

        <p className="eyebrow eyebrow-center">After-hours street protocol</p>
        <h1 className="mega">
          <span>Night</span>
          <span>Shift</span>
        </h1>
        <p className="hero-lede">Closed doors. Open for the ones who know.</p>

        <button type="button" className="btn-enter" onClick={onEnter}>
          <span className="btn-enter-label">Enter the grid</span>
          <span className="btn-enter-scan" aria-hidden="true" />
        </button>
        <a className="btn-text" href="#protocol">
          How the protocol works
        </a>
      </section>

      <section id="protocol" className="protocol">
        <p className="eyebrow">Three sides, one loop</p>
        <ol className="steps">
          {steps.map((step, index) => (
            <li key={step.role} className="step">
              <span className="step-index">0{index + 1}</span>
              <div>
                <p className="step-role">{step.role}</p>
                <h2 className="step-title">{step.title}</h2>
                <p className="step-text">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="stats" aria-label="Live numbers">
        <div className="stat">
          <span className="stat-number">{stats.beacons}</span>
          <span className="stat-label">Beacons lit</span>
        </div>
        <div className="stat">
          <span className="stat-number">{stats.squads}</span>
          <span className="stat-label">Squads forming</span>
        </div>
        <div className="stat">
          <span className="stat-number">{stats.opened}</span>
          <span className="stat-label">Doors opened</span>
        </div>
      </section>

      <section className="landing-end">
        <h2 className="landing-end-title">The street is awake.</h2>
        <p className="landing-end-text">Your crew only needs one burner link.</p>
        <button type="button" className="btn-notch" onClick={onEnter}>
          Open the radar
        </button>
      </section>
    </div>
  );
}
