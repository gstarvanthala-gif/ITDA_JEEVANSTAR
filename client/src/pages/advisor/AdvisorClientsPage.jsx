import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

import LoadingState from '../../components/LoadingState';
import { advisorApi } from '../../services/api';

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

function AdvisorClientsPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('all');
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
          setError(requestError.response?.data?.message || 'Could not load assigned clients.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <LoadingState label="Loading assigned clients" />;

  const filteredClients = clients.filter((client) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || client.name.toLowerCase().includes(query) || client.email.toLowerCase().includes(query);
    return matchesSearch && (kycFilter === 'all' || client.kycStatus === kycFilter);
  });

  return (
    <section className="dashboard-page advisor-clients-page">
      <header className="advisor-clients-heading">
        <div>
          <p className="eyebrow">Advisor workspace</p>
          <h2>Assigned clients</h2>
        </div>
        <span>{filteredClients.length} of {clients.length} clients</span>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}

      {clients.length === 0 ? (
        <p className="empty-state">No active investors are assigned to your account.</p>
      ) : (
        <>
          <div className="advisor-client-tools">
            <label className="advisor-search-field">
              <span className="sr-only">Search assigned clients</span>
              <Search size={17} aria-hidden="true" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" />
            </label>
            <label className="advisor-kyc-filter">
              <span>KYC status</span>
              <select value={kycFilter} onChange={(event) => setKycFilter(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="not_submitted">Not submitted</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>
          {filteredClients.length === 0 ? (
            <p className="empty-state">No assigned clients match this search and filter.</p>
          ) : <div className="advisor-client-list">
          {filteredClients.map((client) => (
            <Link className="advisor-client-row" to={`/advisor/clients/${client.id}`} key={client.id}>
              <div className="advisor-client-identity">
                <span className="advisor-avatar" aria-hidden="true">{client.name.slice(0, 1).toUpperCase()}</span>
                <span>
                  <strong>{client.name}</strong>
                  <small>{client.email}</small>
                </span>
              </div>
              <span className={`goal-status ${client.riskProfile?.profile || 'unassessed'}`}>
                {client.riskProfile ? PROFILE_LABELS[client.riskProfile.profile] : 'Not assessed'}
              </span>
              <span className={`kyc-status ${client.kycStatus}`}>{client.kycStatus}</span>
              <span className="advisor-client-value">{currency.format(Number(client.portfolio.currentValue))}</span>
              <span className="advisor-client-goals">{client.goals.length} goals</span>
              <span className="advisor-client-link">View details</span>
            </Link>
          ))}
          </div>}
        </>
      )}
    </section>
  );
}

export default AdvisorClientsPage;