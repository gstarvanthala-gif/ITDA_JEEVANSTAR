import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import LoadingState from '../../components/LoadingState';
import { advisorApi } from '../../services/api';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

function AdvisorDashboard() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    advisorApi.getClients()
      .then((response) => {
        if (isMounted) setClients(response.data.clients);
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Could not load the advisor overview.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const virtualPortfolioValue = clients.reduce(
    (total, client) => total + Number(client.portfolio.currentValue),
    0
  );
  const assessedClients = clients.filter((client) => client.riskProfile).length;

  return (
    <div className="dashboard-page">
      <h2>Advisor dashboard</h2>
      <p className="portfolio-disclaimer">Client balances and performance are simulated values.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="stats-grid">
        <div className="stat-card">
          <span>Assigned clients</span>
          <strong>{loading ? '...' : clients.length}</strong>
        </div>
        <div className="stat-card">
          <span>Total simulated portfolio value</span>
          <strong>{loading ? '...' : currency.format(virtualPortfolioValue)}</strong>
        </div>
        <div className="stat-card">
          <span>Risk assessments</span>
          <strong>{loading ? '...' : `${assessedClients} / ${clients.length}`}</strong>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading assigned clients" />
      ) : clients.length === 0 ? (
        <p className="empty-state">No active investors are assigned to your account.</p>
      ) : (
        <section className="advisor-dashboard-list">
          <div className="portfolio-section-heading">
            <div>
              <p className="eyebrow">Your assignment</p>
              <h3>Clients</h3>
            </div>
            <Link to="/advisor/clients">View all</Link>
          </div>
          <div className="advisor-dashboard-clients">
            {clients.slice(0, 5).map((client) => (
              <Link to={`/advisor/clients/${client.id}`} key={client.id}>
                <span>{client.name}</span>
                <strong>{currency.format(Number(client.portfolio.currentValue))}</strong>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default AdvisorDashboard;
