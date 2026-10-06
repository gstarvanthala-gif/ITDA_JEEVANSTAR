import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <section className="hero-section">
      <div className="hero-copy">
        <p className="eyebrow">Small Savings. Smart Simulation. Bigger Goals.</p>
        <h2>Turn everyday spare change into a smarter virtual investing habit.</h2>
        <p className="lead">
          MicroGrow helps users simulate round-up savings, risk-based allocation, portfolio tracking,
          and goal planning in a safe demo environment built for learning and presentation.
        </p>
        <div className="cta-row">
          <Link to="/register" className="primary-button">
            Create account
          </Link>
          <Link to="/login" className="secondary-button">
            Sign in
          </Link>
        </div>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <span>₹47 → ₹50</span>
          <strong>Round-up simulation</strong>
        </div>
        <div className="feature-card">
          <span>3 levels</span>
          <strong>Risk profiles</strong>
        </div>
        <div className="feature-card">
          <span>Virtual</span>
          <strong>Portfolio tracking</strong>
        </div>
        <div className="feature-card">
          <span>Goals</span>
          <strong>Milestone planning</strong>
        </div>
      </div>
    </section>
  );
}

export default HomePage;
