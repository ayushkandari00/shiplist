import { useAuth } from '../context/AuthContext';

export default function LandingPage({ onGetStarted }) {
  const { user } = useAuth();

  if (user) return null;

  return (
    <div className="landing-page">
      <nav className="nav">
        <div className="nav-brand">
          <h1 className="brand-logo">🚀 Shiplist</h1>
        </div>
        <div className="nav-end">
          <button className="nav-login" onClick={() => onGetStarted()}>
            Get Started
          </button>
        </div>
      </nav>

      <main className="landing-content">
        <section className="hero">
          <h1>What should we ship next?</h1>
          <p className="hero-subtitle">
            A public feature request and roadmap portal. Vote on ideas, leave feedback, and stay in the loop.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => onGetStarted()}>
            Get Started Now
          </button>
        </section>

        <section className="features">
          <div className="feature-card">
            <div className="feature-icon">🗳️</div>
            <h3>Vote on Features</h3>
            <p>Upvote the features you want most. See what the community loves.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Leave Feedback</h3>
            <p>Share ideas, ask questions, and discuss with the team and community.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🛣️</div>
            <h3>Public Roadmap</h3>
            <p>See what's planned, in progress, and shipped. Full transparency.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Real-time Updates</h3>
            <p>Get instant notifications when features you voted for progress.</p>
          </div>
        </section>

        <section className="cta">
          <h2>Ready to share your ideas?</h2>
          <button className="btn btn-primary btn-lg" onClick={() => onGetStarted()}>
            Join Now
          </button>
        </section>
      </main>
    </div>
  );
}