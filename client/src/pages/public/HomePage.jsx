import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronRight,
  Coins,
  ShieldCheck,
  Sprout,
  Target,
  TrendingUp,
} from 'lucide-react';

const chartBars = [28, 36, 31, 45, 41, 52, 46, 60, 55, 69, 64, 78, 72, 88];

function HomePage() {
  return (
    <div className="landing-home">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Small Savings. Smart Simulation. Bigger Goals.</p>
          <h2>Turn everyday spare change into a smarter{' '}<span className="headline-accent">virtual investing habit.</span></h2>
          <p className="lead">
            MicroGrow helps users simulate round-up savings, risk-based allocation, portfolio tracking,
            and goal planning in a safe demo environment built for learning and presentation.
          </p>
          <div className="cta-row">
            <Link to="/register" className="primary-button">
              Create account <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link to="/login" className="secondary-button">
              Sign in
            </Link>
          </div>
        </div>

        <div className="landing-visual">
          <section className="portfolio-preview-card" aria-label="Illustrative investment dashboard">
            <div className="preview-dashboard-layout">
              <div className="preview-primary-column">
                <div className="preview-topline">
                  <span className="preview-icon"><TrendingUp size={18} aria-hidden="true" /></span>
                  <span className="preview-demo-label">Virtual portfolio · demo</span>
                  <ArrowUpRight className="preview-open-icon" size={17} aria-hidden="true" />
                </div>
                <div className="preview-value-block">
                  <span>Simulated portfolio value</span>
                  <strong>₹12,480</strong>
                  <span className="preview-performance">+4.8% <span>illustrative growth</span></span>
                </div>
                <div className="preview-chart" role="img" aria-label="Illustrative portfolio bar and line chart; all values are simulated">
                  {chartBars.map((height, index) => (
                    <span key={index} style={{ height: `${height}%`, animationDelay: `${index * 28}ms` }} />
                  ))}
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 82 C10 74 12 79 19 68 S28 72 35 59 S45 65 52 48 S62 58 69 39 S78 46 85 28 S94 36 100 13" />
                  </svg>
                </div>
                <div className="preview-chart-labels"><span>Recent history</span><span>Demo values only</span></div>
              </div>

              <aside className="preview-side-rail" aria-label="Illustrative portfolio insights">
                <article className="preview-side-card preview-risk-card">
                  <div className="preview-risk-ring"><ChartNoAxesCombined size={16} aria-hidden="true" /></div>
                  <span><small>Risk profile</small><strong>Moderate</strong></span>
                </article>
                <article className="preview-side-card preview-goal-card">
                  <div className="preview-goal-heading"><Target size={14} aria-hidden="true" /><small>Goal progress</small></div>
                  <div className="preview-goal-value"><strong>68%</strong><span>Demo goal</span></div>
                  <span className="preview-goal-track" aria-label="Illustrative goal progress, 68 percent"><span /></span>
                </article>
                <div className="investment-illustration" role="img" aria-label="Illustrative plant growing from virtual coins beside a rising investment chart">
                  <div className="illustration-coin-stack"><span /><span /><span /></div>
                  <div className="illustration-plant"><Sprout size={50} strokeWidth={1.6} aria-hidden="true" /></div>
                  <div className="illustration-bars"><i /><i /><i /><i /></div>
                  <ArrowUpRight className="illustration-arrow" size={25} aria-hidden="true" />
                </div>
              </aside>
            </div>

            <section className="preview-recent-activity" aria-label="Illustrative recent activity">
              <div className="preview-activity-heading"><strong>Recent activity</strong><small>Demo transactions</small></div>
              <div className="preview-activity-row">
                <span className="activity-icon"><Coins size={14} aria-hidden="true" /></span>
                <strong>Round-up investment</strong><span>+₹25.60</span><small>Today</small>
              </div>
              <div className="preview-activity-row">
                <span className="activity-icon"><TrendingUp size={14} aria-hidden="true" /></span>
                <strong>Market gain</strong><span>+₹48.20</span><small>Yesterday</small>
              </div>
              <div className="preview-activity-row">
                <span className="activity-icon"><Activity size={14} aria-hidden="true" /></span>
                <strong>Portfolio rebalancing</strong><span>+₹120.00</span><small>2 days ago</small>
              </div>
            </section>
          </section>
        </div>
      </section>

      <section className="feature-grid" aria-label="MicroGrow features">
        <article className="feature-card">
          <span className="feature-icon"><Coins size={18} aria-hidden="true" /></span>
          <span className="feature-arrow"><ChevronRight size={15} aria-hidden="true" /></span>
          <strong>Round-up simulation</strong>
          <small>Automatically save spare change from sample transactions.</small>
        </article>
        <article className="feature-card">
          <span className="feature-icon"><ShieldCheck size={18} aria-hidden="true" /></span>
          <span className="feature-arrow"><ChevronRight size={15} aria-hidden="true" /></span>
          <strong>Risk profiles</strong>
          <small>Learn risk tolerance and explore sample allocations.</small>
        </article>
        <article className="feature-card">
          <span className="feature-icon"><TrendingUp size={18} aria-hidden="true" /></span>
          <span className="feature-arrow"><ChevronRight size={15} aria-hidden="true" /></span>
          <strong>Portfolio tracking</strong>
          <small>Follow simulated investments and virtual values.</small>
        </article>
        <article className="feature-card">
          <span className="feature-icon"><Target size={18} aria-hidden="true" /></span>
          <span className="feature-arrow"><ChevronRight size={15} aria-hidden="true" /></span>
          <strong>Goal planning</strong>
          <small>Set goals and track progress in your learning journey.</small>
        </article>
      </section>
    </div>
  );
}

export default HomePage;
