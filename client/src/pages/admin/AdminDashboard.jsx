import { Fragment, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CircleDollarSign,
  Receipt,
  ShieldCheck,
  Users,
} from 'lucide-react';

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
  const [userRole, setUserRole] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [advisorOptions, setAdvisorOptions] = useState([]);
  const [assignmentDrafts, setAssignmentDrafts] = useState({});
  const [expandedUserId, setExpandedUserId] = useState('');
  const [userDetails, setUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [resolvedKey, setResolvedKey] = useState('');
  const [requestError, setRequestError] = useState({ key: '', message: '' });
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [busyId, setBusyId] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [marketDraft, setMarketDraft] = useState({
    id: '', symbol: '', name: '', assetType: 'equity', price: '', changePercent: '0',
  });
  const [notificationDraft, setNotificationDraft] = useState({
    audience: 'all-users', title: '', message: '', type: 'portfolio_updated',
  });
  const requestKey = `${section}:${page}:${search}:${filter}:${userRole}:${assignmentFilter}:${dateFrom}:${dateTo}:${refresh}`;
  const loading = resolvedKey !== requestKey;
  const error = requestError.key === requestKey ? requestError.message : '';

  useEffect(() => {
    let active = true;

    if (section === 'overview') {
      adminApi.getOverview()
        .then((response) => {
          if (active) setSummary(response.data.summary);
        })
        .catch((caughtError) => {
          if (active) {
            setRequestError({
              key: requestKey,
              message: caughtError.response?.data?.message || 'Could not load the admin dashboard.',
            });
          }
        })
        .finally(() => {
          if (active) setResolvedKey(requestKey);
        });

      return () => { active = false; };
    }

    const params = { page, search };
    if (filter !== 'all') {
      if (section === 'users') params.status = filter;
      if (section === 'transactions') params.category = filter;
      if (section === 'kyc') params.status = filter;
      if (section === 'market') params.assetType = filter;
      if (section === 'notifications') params.read = filter;
    }
    if (section === 'users') {
      if (userRole !== 'all') params.role = userRole;
      if (assignmentFilter !== 'all') params.assignment = assignmentFilter;
    }
    if (section === 'transactions') {
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
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

    if (section === 'users') {
      adminApi.getAdvisors({ page: 1, limit: 50, status: 'active' })
        .then((response) => { if (active) setAdvisorOptions(response.data.items || []); })
        .catch(() => { if (active) setAdvisorOptions([]); });
    }

    request(params)
      .then((response) => {
        if (!active) return;
        setItems(response.data.items || []);
        setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
      })
      .catch((caughtError) => {
        if (active) {
          setRequestError({
            key: requestKey,
            message: caughtError.response?.data?.message || caughtError.message || 'Could not load this admin view.',
          });
        }
      })
      .finally(() => { if (active) setResolvedKey(requestKey); });

    return () => { active = false; };
  }, [assignmentFilter, dateFrom, dateTo, filter, page, requestKey, search, section, userRole]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const changeFilter = (event) => {
    setPage(1);
    setFilter(event.target.value);
  };

  const reviewKyc = (record, status) => {
    setReviewNote('');
    setActionError('');
    setConfirmAction({ type: 'kyc', record, status });
  };

  const toggleUserStatus = async (user) => {
    try {
      setBusyId(String(user._id));
      setActionError('');
      setNotice('');
      await adminApi.setUserStatus(user._id, !user.isActive);
      setNotice(`${user.name || 'User'} ${user.isActive ? 'deactivated' : 'activated'}.`);
      setRefresh((current) => current + 1);
    } catch (caughtError) {
      setActionError(caughtError.response?.data?.message || 'Could not update user status.');
    } finally {
      setBusyId('');
    }
  };

  const saveAdvisorAssignment = async (investor) => {
    const advisorId = assignmentDrafts[investor._id] ?? investor.advisorId?._id ?? '';
    try {
      setBusyId(String(investor._id));
      setActionError('');
      setNotice('');
      if (advisorId) {
        await adminApi.assignAdvisor(investor._id, advisorId);
      } else {
        await adminApi.removeAdvisor(investor._id);
      }
      setNotice(advisorId ? 'Advisor assignment updated.' : 'Advisor assignment removed.');
      setRefresh((current) => current + 1);
    } catch (caughtError) {
      setActionError(caughtError.response?.data?.message || 'Could not save this advisor assignment.');
    } finally {
      setBusyId('');
    }
  };

  const toggleUserDetails = async (user) => {
    if (expandedUserId === user._id) {
      setExpandedUserId('');
      setUserDetails(null);
      setDetailsError('');
      return;
    }

    setExpandedUserId(user._id);
    setDetailsLoading(true);
    setDetailsError('');
    try {
      const response = await adminApi.getUserDetails(user._id);
      setUserDetails(response.data.data);
    } catch (caughtError) {
      setDetailsError(caughtError.response?.data?.message || 'Could not load user details.');
      setUserDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const submitMarketData = async (event) => {
    event.preventDefault();
    setActionError('');
    setNotice('');
    try {
      const payload = {
        symbol: marketDraft.symbol,
        name: marketDraft.name,
        assetType: marketDraft.assetType,
        price: Number(marketDraft.price),
        changePercent: Number(marketDraft.changePercent),
      };

      if (marketDraft.id) {
        await marketApi.update(marketDraft.id, payload);
        setNotice('Simulated market asset updated.');
      } else {
        await marketApi.create(payload);
        setNotice('Simulated market asset created.');
      }

      setMarketDraft({ id: '', symbol: '', name: '', assetType: 'equity', price: '', changePercent: '0' });
      setRefresh((current) => current + 1);
    } catch (caughtError) {
      setActionError(caughtError.response?.data?.message || 'Could not save this market asset.');
    }
  };

  const removeMarketData = (item) => setConfirmAction({ type: 'market', item });

  const removeNotification = (item) => setConfirmAction({ type: 'notification', item });

  const submitNotification = async (event) => {
    event.preventDefault();
    setActionError('');
    setNotice('');
    try {
      await adminApi.createNotification({
        audience: notificationDraft.audience,
        title: notificationDraft.title,
        message: notificationDraft.message,
        type: notificationDraft.type,
      });
      setNotice('Platform notification created.');
      setNotificationDraft({ audience: 'all-users', title: '', message: '', type: 'portfolio_updated' });
      setRefresh((current) => current + 1);
    } catch (caughtError) {
      setActionError(caughtError.response?.data?.message || 'Could not create this platform notification.');
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'kyc' && !reviewNote.trim()) {
      setActionError('Enter a review note before submitting this mock KYC decision.');
      return;
    }
    const recordId = confirmAction.record?._id || confirmAction.item?._id;
    setBusyId(String(recordId));
    setActionError('');
    setNotice('');
    try {
      if (confirmAction.type === 'kyc') {
        await adminApi.reviewKyc(recordId, confirmAction.status, reviewNote.trim());
        setNotice(`Mock KYC record ${confirmAction.status}.`);
      } else if (confirmAction.type === 'market') {
        await marketApi.remove(recordId);
        setNotice(`${confirmAction.item.symbol} removed from simulated market data.`);
      } else {
        await adminApi.deleteNotification(recordId);
        setNotice('Platform notification deleted.');
      }
      setRefresh((current) => current + 1);
    } catch (caughtError) {
      setActionError(caughtError.response?.data?.message || 'Could not complete this admin action.');
    } finally {
      setBusyId('');
      setConfirmAction(null);
    }
  };

  const renderRow = (item) => {
    if (section === 'users') {
      const selectedAdvisorId = assignmentDrafts[item._id] ?? item.advisorId?._id ?? '';
      const currentAdvisorMissing = item.advisorId && !advisorOptions.some((advisor) => advisor._id === item.advisorId._id);
      return (
        <>
          <td><strong>{item.name}</strong><small className="admin-cell-subtitle">{item.email}</small></td>
          <td className="capitalize">{item.role}</td>
          <td><span className={`admin-status ${item.kycStatus}`}>{item.kycStatus}</span></td>
          <td><span className={`admin-status ${item.isActive ? 'active' : 'inactive'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
          <td>
            {item.role === 'investor' ? (
              <div className="admin-row-actions admin-assignment-control">
                <select
                  className="admin-inline-select"
                  aria-label={`Advisor for ${item.name}`}
                  value={selectedAdvisorId}
                  onChange={(event) => setAssignmentDrafts({ ...assignmentDrafts, [item._id]: event.target.value })}
                >
                  <option value="">Unassigned</option>
                  {currentAdvisorMissing && <option value={item.advisorId._id}>{item.advisorId.name} (inactive)</option>}
                  {advisorOptions.map((advisor) => <option key={advisor._id} value={advisor._id}>{advisor.name}</option>)}
                </select>
                <button type="button" className="admin-action-button approve" disabled={busyId === String(item._id)} onClick={() => saveAdvisorAssignment(item)}>Save</button>
              </div>
            ) : item.advisorId?.name || 'Not applicable'}
          </td>
          <td>{displayDate(item.createdAt)}</td>
          <td>
            <div className="admin-row-actions">
              <button type="button" className="admin-action-button" onClick={() => toggleUserDetails(item)}>{expandedUserId === item._id ? 'Hide details' : 'View details'}</button>
              <button type="button" className="admin-action-button approve" disabled={busyId === String(item._id)} onClick={() => toggleUserStatus(item)}>{item.isActive ? 'Deactivate' : 'Activate'}</button>
            </div>
          </td>
        </>
      );
    }

    if (section === 'advisors') {
      return (
        <>
          <td><strong>{item.name}</strong><small className="admin-cell-subtitle">{item.email}</small></td>
          <td><span className={`admin-status ${item.kycStatus}`}>{item.kycStatus}</span></td>
          <td><span className={`admin-status ${item.isActive ? 'active' : 'inactive'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
          <td>{item.assignedInvestorCount || 0}</td>
          <td>{displayDate(item.createdAt)}</td>
        </>
      );
    }

    if (section === 'transactions') {
      return (
        <>
          <td><strong>{item.merchant}</strong><small className="admin-cell-subtitle">{displayDate(item.transactionDate)}</small></td>
          <td>{personName(item.userId)}</td>
          <td className="capitalize">{item.category}</td>
          <td>{displayCurrency(item.amount)}</td>
          <td><span className="demo-badge">DEMO</span></td>
        </>
      );
    }

    if (section === 'kyc') {
      return (
        <>
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
        </>
      );
    }

    if (section === 'market') {
      return (
        <>
          <td><strong>{item.name}</strong><small className="admin-cell-subtitle">{item.symbol}</small></td>
          <td className="capitalize">{item.assetType}</td>
          <td>{displayCurrency(item.price)}</td>
          <td>{Number(String(item.changePercent || 0)).toFixed(2)}%</td>
          <td>{item.source}</td>
          <td>{displayDate(item.updatedAt)}</td>
          <td>
            <div className="admin-row-actions">
              <button type="button" className="admin-action-button approve" onClick={() => setMarketDraft({ id: item._id, symbol: item.symbol, name: item.name, assetType: item.assetType, price: String(item.price), changePercent: String(item.changePercent) })}>Edit</button>
              <button type="button" className="admin-action-button reject" disabled={busyId === String(item._id)} onClick={() => removeMarketData(item)}>Delete</button>
            </div>
          </td>
        </>
      );
    }

    if (section === 'notifications') {
      return (
        <>
          <td><strong>{item.title}</strong><small className="admin-cell-subtitle">{item.message}</small></td>
          <td>{personName(item.userId)}</td>
          <td className="capitalize">{item.type.replaceAll('_', ' ')}</td>
          <td><span className={`admin-status ${item.isRead ? 'read' : 'unread'}`}>{item.isRead ? 'Read' : 'Unread'}</span></td>
          <td>{displayDate(item.createdAt)}</td>
          <td>{item.metadata?.createdBy === 'admin'
            ? <button type="button" className="admin-action-button reject" onClick={() => removeNotification(item)}>Delete</button>
            : 'Managed by user workflow'}</td>
        </>
      );
    }

    return null;
  };

  const getHeaders = () => {
    if (section === 'users') return ['Account', 'Role', 'KYC', 'Access', 'Advisor', 'Created', 'Action'];
    if (section === 'advisors') return ['Advisor', 'KYC', 'Access', 'Assigned investors', 'Created'];
    if (section === 'transactions') return ['Transaction', 'Investor', 'Category', 'Amount', 'Source'];
    if (section === 'kyc') return ['Applicant', 'Demo type', 'Status', 'Submitted', 'Review'];
    if (section === 'market') return ['Asset', 'Class', 'Simulated price', 'Change %', 'Source', 'Updated', 'Action'];
    if (section === 'notifications') return ['Notification', 'Recipient', 'Type', 'Status', 'Created', 'Action'];
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
          <>
            <div className="admin-stats-grid">
              <StatCard label="Total Users" value={summary.totalUsers} to="/admin/users" />
              <StatCard label="Total Investors" value={summary.totalInvestors} to="/admin/users" />
              <StatCard label="Total Advisors" value={summary.totalAdvisors} to="/admin/advisors" />
              <StatCard label="Total Transactions" value={summary.totalTransactions} to="/admin/transactions" />
              <StatCard label="Virtual Portfolio Value" value={displayCurrency(summary.virtualPortfolioValue)} />
              <StatCard label="Pending KYC" value={summary.pendingKyc} to="/admin/kyc" />
              <StatCard label="Verified KYC" value={summary.verifiedKyc} />
              <StatCard label="Active Advisors" value={summary.activeAdvisors} />
              <StatCard label="Simulated Assets" value={summary.simulatedAssets} to="/admin/market" />
              <StatCard label="Recent Transactions" value={summary.recentTransactions?.length || 0} />
              <StatCard label="Unread Notifications" value={summary.unreadNotifications} to="/admin/notifications" />
            </div>
            <div className="admin-recent-grid">
              <section className="admin-recent-panel" aria-labelledby="admin-recent-transactions-title">
                <div className="panel-title-row">
                  <div><p className="eyebrow">Platform activity</p><h3 id="admin-recent-transactions-title">Recent transactions</h3></div>
                  <Link to="/admin/transactions" className="subtle-link">View all <ArrowUpRight size={15} aria-hidden="true" /></Link>
                </div>
                {summary.recentTransactions?.length ? (
                  <div className="admin-recent-list">
                    {summary.recentTransactions.slice(0, 5).map((transaction) => (
                      <div className="admin-recent-row" key={transaction._id}>
                        <span className="overview-icon"><Receipt size={17} aria-hidden="true" /></span>
                        <span><strong>{transaction.merchant}</strong><small>{personName(transaction.userId)} · {transaction.category}</small></span>
                        <strong className="admin-recent-amount">{displayCurrency(transaction.amount)}</strong>
                      </div>
                    ))}
                  </div>
                ) : <p className="empty-state">No simulated transactions have been recorded.</p>}
              </section>
              <section className="admin-recent-panel" aria-labelledby="admin-recent-notifications-title">
                <div className="panel-title-row">
                  <div><p className="eyebrow">System messages</p><h3 id="admin-recent-notifications-title">Recent notifications</h3></div>
                  <Link to="/admin/notifications" className="subtle-link">Manage <ArrowUpRight size={15} aria-hidden="true" /></Link>
                </div>
                {summary.recentNotifications?.length ? (
                  <div className="admin-recent-list">
                    {summary.recentNotifications.slice(0, 4).map((notification) => (
                      <article className="admin-recent-notification" key={notification._id}>
                        <div><strong>{notification.title}</strong><span className={`admin-status ${notification.isRead ? 'read' : 'unread'}`}>{notification.isRead ? 'Read' : 'Unread'}</span></div>
                        <p>{notification.message}</p>
                        <small>{personName(notification.userId)} · {displayDate(notification.createdAt)}</small>
                      </article>
                    ))}
                  </div>
                ) : <p className="empty-state">No recent notifications.</p>}
              </section>
            </div>
          </>
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
          <h3>{marketDraft.id ? 'Edit simulated asset' : 'Add simulated asset'}</h3>
          <label>Symbol<input required maxLength="20" value={marketDraft.symbol} onChange={(event) => setMarketDraft({ ...marketDraft, symbol: event.target.value.toUpperCase() })} /></label>
          <label>Name<input required maxLength="80" value={marketDraft.name} onChange={(event) => setMarketDraft({ ...marketDraft, name: event.target.value })} /></label>
          <label>Class<select value={marketDraft.assetType} onChange={(event) => setMarketDraft({ ...marketDraft, assetType: event.target.value })}><option value="equity">Equity</option><option value="gold">Gold</option><option value="debt">Debt</option></select></label>
          <label>Price<input required type="number" min="0" step="0.01" value={marketDraft.price} onChange={(event) => setMarketDraft({ ...marketDraft, price: event.target.value })} /></label>
          <label>Change %<input required type="number" step="0.01" value={marketDraft.changePercent} onChange={(event) => setMarketDraft({ ...marketDraft, changePercent: event.target.value })} /></label>
          <div className="admin-row-actions">
            <button className="admin-submit-button" type="submit">{marketDraft.id ? 'Update asset' : 'Add asset'}</button>
            {marketDraft.id && <button type="button" className="admin-action-button reject" onClick={() => setMarketDraft({ id: '', symbol: '', name: '', assetType: 'equity', price: '', changePercent: '0' })}>Clear</button>}
          </div>
        </form>
      )}

      {section === 'notifications' && (
        <form className="admin-market-form" onSubmit={submitNotification}>
          <h3>Create platform notification</h3>
          <label>Audience<select value={notificationDraft.audience} onChange={(event) => setNotificationDraft({ ...notificationDraft, audience: event.target.value })}><option value="all-users">All users</option><option value="all-investors">All investors</option><option value="all-advisors">All advisors</option></select></label>
          <label>Title<input required value={notificationDraft.title} onChange={(event) => setNotificationDraft({ ...notificationDraft, title: event.target.value })} /></label>
          <label>Message<textarea required rows="3" value={notificationDraft.message} onChange={(event) => setNotificationDraft({ ...notificationDraft, message: event.target.value })} /></label>
          <label>Type<select value={notificationDraft.type} onChange={(event) => setNotificationDraft({ ...notificationDraft, type: event.target.value })}><option value="portfolio_updated">Portfolio updated</option><option value="goal_completed">Goal completed</option><option value="roundup_invested">Round-up invested</option><option value="kyc_verified">KYC verified</option><option value="advisor_message">Advisor message</option></select></label>
          <button className="admin-submit-button" type="submit">Create notification</button>
        </form>
      )}

      <form className="admin-toolbar" onSubmit={submitSearch}>
        <label className="admin-search-field">Search<input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={section === 'transactions' ? 'Merchant, user name or email' : 'Name or keyword'} /></label>
        {filterOptions[section] && (
          <label className="admin-filter-field">Filter<select value={filter} onChange={changeFilter}>{filterOptions[section].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        )}
        {section === 'users' && (
          <>
            <label className="admin-filter-field">Role<select value={userRole} onChange={(event) => { setPage(1); setUserRole(event.target.value); if (event.target.value !== 'all' && event.target.value !== 'investor') setAssignmentFilter('all'); }}><option value="all">All roles</option><option value="investor">Investors</option><option value="advisor">Advisors</option><option value="admin">Admins</option></select></label>
            <label className="admin-filter-field">Advisor assignment<select value={assignmentFilter} disabled={userRole !== 'all' && userRole !== 'investor'} onChange={(event) => { setPage(1); setAssignmentFilter(event.target.value); }}><option value="all">All investors</option><option value="assigned">Assigned</option><option value="unassigned">Unassigned</option></select></label>
          </>
        )}
        {section === 'transactions' && (
          <>
            <label className="admin-date-field">From<input type="date" value={dateFrom} onChange={(event) => { setPage(1); setDateFrom(event.target.value); }} /></label>
            <label className="admin-date-field">To<input type="date" value={dateTo} onChange={(event) => { setPage(1); setDateTo(event.target.value); }} /></label>
          </>
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
              <tbody>{items.map((item) => (
                <Fragment key={String(item._id)}>
                  <tr>{renderRow(item)}</tr>
                  {section === 'users' && expandedUserId === item._id && (
                    <tr className="admin-details-row">
                      <td colSpan={getHeaders().length}>
                        {detailsLoading && <LoadingState label="Loading user details" />}
                        {detailsError && <p className="form-error" role="alert">{detailsError}</p>}
                        {userDetails?.user?._id === item._id && (
                          <dl className="admin-user-details">
                            <div><dt>Email</dt><dd>{userDetails.user.email}</dd></div>
                            <div><dt>Account created</dt><dd>{displayDate(userDetails.user.createdAt)}</dd></div>
                            <div><dt>Advisor</dt><dd>{userDetails.user.advisorId?.name || 'Unassigned'}</dd></div>
                            <div><dt>Simulated transactions</dt><dd>{userDetails.activity.transactionCount}</dd></div>
                            <div><dt>Unread notifications</dt><dd>{userDetails.activity.unreadNotifications}</dd></div>
                            <div><dt>Portfolio value</dt><dd>{userDetails.activity.portfolio ? displayCurrency(userDetails.activity.portfolio.currentValue) : 'No portfolio yet'}</dd></div>
                          </dl>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}</tbody>
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
          : confirmAction?.type === 'market' ? 'Delete simulated asset?' : 'Delete platform notification?'}
        message={confirmAction?.type === 'kyc'
          ? 'This updates the mock KYC review status for this user.'
          : confirmAction?.type === 'market'
            ? `The simulated asset ${confirmAction?.item?.symbol || ''} will be permanently removed.`
            : 'This removes the admin-created notification from recipient inboxes.'}
        children={confirmAction?.type === 'kyc' && (
          <>
            <dl className="kyc-review-identity">
              <div><dt>Fictional name</dt><dd>{confirmAction.record.fullName}</dd></div>
              <div><dt>Investor account</dt><dd>{personName(confirmAction.record.userId)} · {confirmAction.record.userId?.email || 'Email unavailable'}</dd></div>
              <div><dt>Demo record</dt><dd>{confirmAction.record.demoDocumentType} · {confirmAction.record.demoDocumentNumber}</dd></div>
            </dl>
            <label className="confirm-dialog-field">
              <span>Fictional review note</span>
              <textarea
                required
                maxLength={500}
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder="Explain this mock review decision."
              />
            </label>
          </>
        )}
        confirmLabel={confirmAction?.type === 'kyc' ? 'Confirm review' : 'Confirm delete'}
        busy={Boolean(busyId)}
        onConfirm={runConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />
    </section>
  );
}

function StatCard({ label, value, to }) {
  const icons = {
    'Total Users': Users,
    'Total Investors': Users,
    'Total Advisors': BriefcaseBusiness,
    'Total Transactions': Receipt,
    'Virtual Portfolio Value': CircleDollarSign,
    'Pending KYC': ShieldCheck,
    'Verified KYC': ShieldCheck,
    'Active Advisors': BriefcaseBusiness,
    'Simulated Assets': BarChart3,
    'Recent Transactions': Activity,
    'Unread Notifications': Bell,
  };
  const Icon = icons[label] || Activity;
  const content = <>
    <span className="admin-stat-card-head"><span className="admin-stat-icon"><Icon size={18} aria-hidden="true" /></span><span>{label}</span></span>
    <strong>{value}</strong>
    {to && <small>View records <ArrowUpRight size={14} aria-hidden="true" /></small>}
  </>;
  return to ? <Link className="admin-stat-card" to={to}>{content}</Link> : <article className="admin-stat-card">{content}</article>;
}

export default AdminDashboard;
