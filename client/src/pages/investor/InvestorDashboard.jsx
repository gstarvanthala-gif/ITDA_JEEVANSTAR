import { useEffect, useState } from 'react';

import LoadingState from '../../components/LoadingState';
import { goalsApi, portfolioApi, roundUpApi } from '../../services/api';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

function InvestorDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      roundUpApi.getSummary(),
      portfolioApi.getSummary(),
      goalsApi.getAll(),
    ])
      .then(([roundUpResponse, portfolioResponse, goalsResponse]) => {
        if (!isMounted) return;
        setOverview({
          roundUps: roundUpResponse.data.summary,
          portfolio: portfolioResponse.data.summary,
          goals: goalsResponse.data.goals,
        });
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.response?.data?.message || 'Could not load your investor overview.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <LoadingState label="Loading investor dashboard" />;

  if (error) {
    return <div className="dashboard-page"><p className="form-error" role="alert">{error}</p></div>;
  }

  const activeGoals = overview.goals.filter((goal) => goal.status === 'active').length;

  return (
    <div className="dashboard-page">
      <header className="portfolio-heading">
        <div>
          <p className="eyebrow">Your simulation overview</p>
          <h2>Investor dashboard</h2>
        </div>
        <span className="demo-badge">VIRTUAL VALUES</span>
      </header>
      <p className="portfolio-disclaimer">Balances and round-ups are simulated and do not represent real savings or investments.</p>
      <div className="stats-grid">
        <div className="stat-card">
          <span>Round-ups available</span>
          <strong>{currency.format(Number(overview.roundUps.pendingAmount || 0))}</strong>
        </div>
        <div className="stat-card">
          <span>Portfolio value</span>
          <strong>{currency.format(Number(overview.portfolio.currentValue || 0))}</strong>
        </div>
        <div className="stat-card">
          <span>Active goals</span>
          <strong>{activeGoals}</strong>
        </div>
      </div>
    </div>
  );
}

export default InvestorDashboard;
