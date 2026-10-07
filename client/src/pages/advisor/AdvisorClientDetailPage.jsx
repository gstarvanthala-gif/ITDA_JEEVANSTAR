import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import LoadingState from '../../components/LoadingState';
import { advisorApi } from '../../services/api';

const PortfolioPerformanceChart = lazy(() => import('../investor/PortfolioPerformanceChart.jsx'));

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const PROFILE_LABELS = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  aggressive: 'Aggressive',
};

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));

function AdvisorClientDetailPage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    advisorApi.getClient(id)
      .then((response) => {
        if (isMounted) setClient(response.data.client);
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.response?.data?.message || 'Could not load this client.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) return <LoadingState label="Loading assigned client details" />;
  if (error) {
    return (
      <div className="dashboard-page">
        <p className="form-error" role="alert">{error}</p>
        <Link to="/advisor/clients">Back to clients</Link>
      </div>
    );
  }
  if (!client) return null;

  const profitLoss = Number(client.portfolio.totalProfitLoss);

  return (
    <section className="dashboard-page advisor-client-detail">
      <Link className="advisor-back-link" to="/advisor/clients">← Assigned clients</Link>

      <header className="advisor-detail-heading">
        <div>
          <p className="eyebrow">Assigned investor</p>
          <h2>{client.name}</h2>
          <p>{client.email}</p>
        </div>
        <span className="demo-badge">READ ONLY</span>
      </header>

      <div className="advisor-summary-grid">
        <article className="advisor-summary-card">
          <span>Risk profile</span>
          <strong>{client.riskProfile ? PROFILE_LABELS[client.riskProfile.profile] : 'Not assessed'}</strong>
          {client.riskProfile && <small>Server score {client.riskProfile.score} / 100</small>}
        </article>
        <article className="advisor-summary-card">
          <span>KYC status</span>
          <strong className={`kyc-status ${client.kycStatus}`}>{client.kycStatus}</strong>
        </article>
        <article className="advisor-summary-card">
          <span>Invested virtually</span>
          <strong>{currency.format(Number(client.portfolio.totalInvested))}</strong>
        </article>
        <article className="advisor-summary-card">
          <span>Current simulated value</span>
          <strong>{currency.format(Number(client.portfolio.currentValue))}</strong>
        </article>
        <article className="advisor-summary-card">
          <span>Simulated profit / loss</span>
          <strong className={profitLoss >= 0 ? 'pnl-positive' : 'pnl-negative'}>
            {profitLoss > 0 ? '+' : ''}{currency.format(profitLoss)}
          </strong>
        </article>
      </div>

      <section className="portfolio-section" aria-labelledby="client-performance-title">
        <div className="portfolio-section-heading">
          <div>
            <p className="eyebrow">DEMO price series</p>
            <h3 id="client-performance-title">Simulated performance</h3>
          </div>
          <span>{client.performance.history.length} daily snapshots</span>
        </div>
        {client.performance.history.length === 0 ? (
          <p className="empty-state">No virtual allocation history is available yet.</p>
        ) : (
          <Suspense fallback={<LoadingState label="Preparing simulated performance chart" />}>
            <PortfolioPerformanceChart history={client.performance.history} />
          </Suspense>
        )}
      </section>

      <section className="portfolio-section" aria-labelledby="client-goals-title">
        <div className="portfolio-section-heading">
          <div>
            <p className="eyebrow">Virtual savings plans</p>
            <h3 id="client-goals-title">Goals</h3>
          </div>
          <span>{client.goals.length} goals</span>
        </div>
        {client.goals.length === 0 ? (
          <p className="empty-state">This investor has no goals yet.</p>
        ) : (
          <div className="advisor-goals-list">
            {client.goals.map((goal) => (
              <article className="advisor-goal-row" key={goal.id}>
                <div>
                  <strong>{goal.name}</strong>
                  <small>Target {formatDate(goal.targetDate)}</small>
                </div>
                <div className="advisor-goal-progress">
                  <span>{currency.format(Number(goal.currentAmount))} / {currency.format(Number(goal.targetAmount))}</span>
                  <div
                    className="goal-progress-track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={goal.progress}
                    aria-label={`${goal.name} progress`}
                  >
                    <span style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>
                <span className={`goal-status ${goal.status}`}>{goal.status}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default AdvisorClientDetailPage;