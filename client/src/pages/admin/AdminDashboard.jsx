import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingState from '../../components/LoadingState';
import ToastMessage from '../../components/ToastMessage';
import { adminApi, marketApi } from '../../services/api';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });

const views = {
  users: { title: 'Users', subtitle: 'Investor and account access overview' },
  advisors: { title: 'Advisors', subtitle: 'Advisor accounts and assignment status' },
  transactions: { title: 'Transactions', subtitle: 'Simulated activity across investor accounts' },
  kyc: { title: 'KYC review', subtitle: 'Review mock submissions only' },
  market: { title: 'Market data', subtitle: 'Manage simulated asset prices' },
  notifications: { title: 'Notifications', subtitle: 'System-wide notification delivery status' },
};

const filterOptions = {
  users: [
    ['all', 'All account states'],
    ['active', 'Active'],
    ['inactive', 'Inactive'],
  ],
  transactions: [
    ['all', 'All categories'],
    ['food', 'Food'],
    ['transport', 'Transport'],
    ['groceries', 'Groceries'],
    ['dining', 'Dining'],
    ['fuel', 'Fuel'],
    ['other', 'Other'],
  ],
  kyc: [
    ['all', 'All statuses'],
    ['pending', 'Pending'],
    ['verified', 'Verified'],
    ['rejected', 'Rejected'],
  ],
  market: [
    ['all', 'All asset classes'],
    ['equity', 'Equity'],
    ['gold', 'Gold'],
    ['debt', 'Debt'],
  ],
  notifications: [
    ['all', 'All notifications'],
    ['unread', 'Unread'],
    ['read', 'Read'],
  ],
};

const getSection = (pathname) => pathname.split('/')[2] || 'overview';
const displayDate = (value) => (value ? dateFormat.format(new Date(value)) : 'Not available');
const displayCurrency = (value) => currency.format(Number(String(value || 0)));
const personName = (person) => person?.name || person?.email || 'Unknown user';

function AdminDashboard() {
  const location = useLocation();
  const section = getSection(location.pathname);
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [resolvedKey, setResolvedKey] = useState('');
  const [requestError, setRequestError] = useState({ key: '', message: '' });
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [marketDraft, setMarketDraft] = useState({
    symbol: '', name: '', assetType: 'equity', price: '', changePercent: '0',
  });
  const requestKey = `${section}:${page}:${search}:${filter}:${refresh}`;
  const loading = resolvedKey !== requestKey;
  const error = requestError.key === requestKey ? requestError.message : '';

  useEffect(() => {
    let active = true;

    if (section === 'overview') {
      adminApi.getOverview()
        .then((response) => { if (active) setSummary(response.data.summary); })
        .catch((requestError) => {
          if (active) setRequestError({
            key: requestKey,
            message: requestError.response?.data?.message || 'Could not load the admin dashboard.',
          });
        })
        .finally(() => { if (active) setResolvedKey(requestKey); });
    } else {
      const params = { page, search };
      if (filter !== 'all') {
        if (section === 'users') params.status = filter;
        if (section === 'transactions') params.category = filter;
        if (section === 'kyc') params.status = filter;
        if (section === 'market') params.assetType = filter;
        if (section === 'notifications') params.read = filter;
      }

      const requests = {
        users: adminApi.getUsers,
        advisors: adminApi.getAdvisors,
        transactions: adminApi.getTransactions,
        kyc: adminApi.getKycRecords,
        market: adminApi.getMarketData,
        notifications: adminApi.getNotifications,
      };
      const request = requests[section] || (() => Promise.reject(new Error('This admin section is not available.')));

      request(params)
        .then((response) => {
          if (!active) return;
          setItems(response.data.items || []);
          setPagination(response.data.pagination);
        })
        .catch((caughtError) => {
          if (active) setRequestError({
            key: requestKey,
            message: caughtError.response?.data?.message || caughtError.message || 'Could not load this admin view.',
          });
        })
        .finally(() => { if (active) setResolvedKey(requestKey); });
    }

    return () => { active = false; };
  }, [filter, page, requestKey, search, section]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const changeFilter = (event) => {
    setPage(1);
    setFilter(event.target.value);
  };

  const reviewKyc = (record, status) => setConfirmAction({ type: 'kyc', record, status });

  const submitMarketData = async (event) => {
    event.preventDefault();
    setActionError('');
    setNotice('');
    try {
      await marketApi.create({
        ...marketDraft,
        price: Number(marketDraft.price),
        changePercent: Number(marketDraft.changePercent),
      });
      setMarketDraft({ symbol: '', name: '', assetType: 'equity', price: '', changePercent: '0' });
      setNotice('Simulated market asset created.');
      setRefresh((current) => current + 1);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Could not create this market asset.');
    }
  };

  const removeMarketData = (item) => setConfirmAction({ type: 'market', item });

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const recordId = confirmAction.record?._id || confirmAction.item?._id;
    setBusyId(String(recordId));
    setActionError('');
    setNotice('');
    try {
      if (confirmAction.type === 'kyc') {
        await adminApi.reviewKyc(recordId, confirmAction.status);
        setNotice(`Mock KYC record ${confirmAction.status}.`);
      } else {
        await marketApi.remove(recordId);
        setNotice(`${confirmAction.item.symbol} removed from simulated market data.`);
      }
      setRefresh((current) => current + 1);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Could not complete this admin action.');
    } finally {
      setBusyId('');
      setConfirmAction(null);
    }
  };

  const renderRow = (item) => {
    if (section === 'users' || section === 'advisors') {
      return <>
        <td><strong>{item.name}</strong><small className="admin-cell-subtitle">{item.email}</small></td>
        {section === 'users' && <td className="capitalize">{item.role}</td>}
        <td><span className={`admin-status ${item.kycStatus}`}>{item.kycStatus}</span></td>
        <td><span className={`admin-status ${item.isActive ? 'active' : 'inactive'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>{displayDate(item.createdAt)}</td>
      </>;
    }

    if (section === 'transactions') {
      return <>
        <td><strong>{item.merchant}</strong><small className="admin-cell-subtitle">{displayDate(item.transactionDate)}</small></td>
        <td>{personName(item.userId)}</td>
        <td className="capitalize">{item.category}</td>
        <td>{displayCurrency(item.amount)}</td>
        <td><span className="demo-badge">DEMO</span></td>
      </>;
    }

    if (section === 'kyc') {
      return <>
        <td><strong>{item.fullName}</strong><small className="admin-cell-subtitle">{personName(item.userId)} · {item.userId?.email || ''}</small></td>
        <td>{item.demoDocumentType}</td>
        <td><span className={`admin-status ${item.status}`}>{item.status}</span></td>
        <td>{displayDate(item.submittedAt)}</td>
        <td>
          {item.status === 'pending' ? (
            <div className="admin-row-actions">
              <button type="button" className="admin-action-button approve" disabled={busyId === String(item._id)} onClick={() => reviewKyc(item, 'verified')}>Approve</button>
              <button type="button" className="admin-action-button reject" disabled={busyId === String(item._id)} onClick={() => reviewKyc(item, 'rejected')}>Reject</button>
            </div>
          ) : 'Reviewed'}
        </td>
      </>;
    }

    if (section === 'market') {
      return <>
        <td><strong>{item.name}</strong><small className="admin-cell-subtitle">{item.symbol}</small></td>
        <td className="capitalize">{item.assetType}</td>
        <td>{displayCurrency(item.price)}</td>
        <td>{Number(String(item.changePercent || 0)).toFixed(2)}%</td>
        <td><button type="button" className="admin-action-button reject" disabled={busyId === String(item._id)} onClick={() => removeMarketData(item)}>Delete</button></td>
      </>;
    }

    return <>
      <td><strong>{item.title}</strong><small className="admin-cell-subtitle">{item.message}</small></td>
      <td>{personName(item.userId)}</td>
      <td className="capitalize">{item.type.replaceAll('_', ' ')}</td>
      <td><span className={`admin-status ${item.isRead ? 'read' : 'unread'}`}>{item.isRead ? 'Read' : 'Unread'}</span></td>
      <td>{displayDate(item.createdAt)}</td>
    </>;
  };

  const getHeaders = () => {
    if (section === 'users') return ['Account', 'Role', 'KYC', 'Access', 'Created'];
    if (section === 'advisors') return ['Advisor', 'KYC', 'Access', 'Created'];
    if (section === 'transactions') return ['Transaction', 'Investor', 'Category', 'Amount', 'Source'];
    if (section === 'kyc') return ['Applicant', 'Demo type', 'Status', 'Submitted', 'Review'];
    if (section === 'market') return ['Asset', 'Class', 'Simulated price', 'Change', 'Action'];
    return ['Notification', 'Recipient', 'Type', 'Read state', 'Created'];
  };

  if (section === 'overview') {
    return (
      <section className="dashboard-page admin-page">
        <header className="admin-page-heading">
          <div><p className="eyebrow">MicroGrow control room</p><h2>Admin dashboard</h2><p>System-wide activity from the simulation database.</p></div>
          <span className="demo-badge">SIMULATION</span>
        </header>
        {error && <p className="form-error" role="alert">{error}</p>}
        {loading ? <LoadingState label="Loading system overview" /> : null}
        {!loading && summary && (
          <div className="admin-stats-grid">
            <StatCard label="Total Investors" value={summary.totalInvestors} to="/admin/users" />
            <StatCard label="Total Advisors" value={summary.totalAdvisors} to="/admin/advisors" />
            <StatCard label="Total Round-ups" value={summary.totalRoundUps} />
            <StatCard label="Virtual Portfolio Value" value={displayCurrency(summary.virtualPortfolioValue)} />
            <StatCard label="Pending KYC" value={summary.pendingKyc} to="/admin/kyc" />
            <StatCard label="Active Goals" value={summary.activeGoals} />
            <StatCard label="Unread Notifications" value={summary.unreadNotifications} to="/admin/notifications" />
          </div>
        )}
      </section>
    );
  }

  const view = views[section];
  if (!view) return <section className="dashboard-page"><p className="form-error">This admin section is not available.</p></section>;

  return (
    <section className="dashboard-page admin-page">
      <header className="admin-page-heading">
        <div><p className="eyebrow">MicroGrow administration</p><h2>{view.title}</h2><p>{view.subtitle}</p></div>
        <span className="admin-result-count">{pagination.total} records</span>
      </header>

      {section === 'market' && (
        <form className="admin-market-form" onSubmit={submitMarketData}>
          <h3>Add simulated asset</h3>
          <label>Symbol<input required maxLength="20" value={marketDraft.symbol} onChange={(event) => setMarketDraft({ ...marketDraft, symbol: event.target.value.toUpperCase() })} /></label>
          <label>Name<input required maxLength="80" value={marketDraft.name} onChange={(event) => setMarketDraft({ ...marketDraft, name: event.target.value })} /></label>
          <label>Class<select value={marketDraft.assetType} onChange={(event) => setMarketDraft({ ...marketDraft, assetType: event.target.value })}><option value="equity">Equity</option><option value="gold">Gold</option><option value="debt">Debt</option></select></label>
          <label>Price<input required type="number" min="0" step="0.01" value={marketDraft.price} onChange={(event) => setMarketDraft({ ...marketDraft, price: event.target.value })} /></label>
          <label>Change %<input required type="number" step="0.01" value={marketDraft.changePercent} onChange={(event) => setMarketDraft({ ...marketDraft, changePercent: event.target.value })} /></label>
          <button className="admin-submit-button" type="submit">Add asset</button>
        </form>
      )}

      <form className="admin-toolbar" onSubmit={submitSearch}>
        <label className="admin-search-field">Search<input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={section === 'transactions' ? 'Merchant or investor' : 'Name or keyword'} /></label>
        {filterOptions[section] && (
          <label className="admin-filter-field">Filter<select value={filter} onChange={changeFilter}>{filterOptions[section].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        )}
        <button className="admin-submit-button" type="submit">Search</button>
      </form>

      <ToastMessage message={notice} onDismiss={() => setNotice('')} />
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {loading ? <LoadingState label={`Loading ${view.title.toLowerCase()}`} /> : null}
      {!loading && !error && items.length === 0 && <p className="empty-state">No records match these search and filter settings.</p>}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="transactions-table-wrap admin-table-wrap">
            <table className="transactions-table admin-table">
              <thead><tr>{getHeaders().map((header) => <th key={header}>{header}</th>)}</tr></thead>
              <tbody>{items.map((item) => <tr key={String(item._id)}>{renderRow(item)}</tr>)}</tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <span>Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}</span>
            <div>
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>Previous</button>
              <span>Page {page} of {Math.max(1, pagination.totalPages)}</span>
              <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= pagination.totalPages || loading}>Next</button>
            </div>
          </div>
        </>
      )}
      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.type === 'kyc'
          ? `Confirm ${confirmAction.status === 'verified' ? 'approval' : 'rejection'}?`
          : 'Delete simulated asset?'}
        message={confirmAction?.type === 'kyc'
          ? 'This updates the mock KYC review status for this user.'
          : `The simulated asset ${confirmAction?.item?.symbol || ''} will be permanently removed.`}
        confirmLabel={confirmAction?.type === 'kyc' ? 'Confirm review' : 'Delete asset'}
        busy={Boolean(busyId)}
        onConfirm={runConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />
    </section>
  );
}

function StatCard({ label, value, to }) {
  const content = <><span>{label}</span><strong>{value}</strong>{to && <small>View records <span aria-hidden="true">→</span></small>}</>;
  return to ? <Link className="admin-stat-card" to={to}>{content}</Link> : <article className="admin-stat-card">{content}</article>;
}

export default AdminDashboard;
