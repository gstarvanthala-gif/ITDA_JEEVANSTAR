import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Coins,
  ExternalLink,
  MessageCircle,
  Receipt,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import LoadingState from '../../components/LoadingState';
import { useAuth } from '../../hooks/useAuth';
import {
  demoBankApi,
  goalsApi,
  kycApi,
  allocationApi,
  marketApi,
  notificationApi,
  portfolioApi,
  roundUpApi,
  riskApi,
} from '../../services/api';

const PortfolioPerformanceChart = lazy(() => import('./PortfolioPerformanceChart.jsx'));

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const fullDateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const kycLabels = { not_submitted: 'Not submitted', pending: 'In review', verified: 'Verified', rejected: 'Revision needed' };
const chartRanges = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
];

const referenceId = (value) => (typeof value === 'string' ? value : value?._id || value?.id || '');

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

function InvestorDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartRange, setChartRange] = useState('1M');

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      roundUpApi.getSummary(),
      portfolioApi.getSummary(),
      goalsApi.getAll(),
      portfolioApi.getHistory(),
      demoBankApi.getTransactions(),
      kycApi.getStatus(),
      notificationApi.getAll(),
      roundUpApi.getAll(),
      marketApi.getAll(),
      riskApi.getProfile(),
      allocationApi.get(),
    ])
      .then(([roundUpResponse, portfolioResponse, goalsResponse, historyResponse, transactionsResponse, kycResponse, notificationResponse, roundUpListResponse, marketResponse, riskResponse, allocationResponse]) => {
        if (!isMounted) return;
        setOverview({
          roundUps: roundUpResponse.data.summary,
          roundUpItems: roundUpListResponse.data.roundUps || [],
          portfolio: portfolioResponse.data.summary,
          goals: goalsResponse.data.goals || [],
          history: historyResponse.data.history || [],
          transactions: transactionsResponse.data.transactions || [],
          kyc: kycResponse.data.kyc,
          notifications: notificationResponse.data.notifications || [],
          unreadCount: notificationResponse.data.unreadCount || 0,
          market: marketResponse.data.marketData || [],
          riskProfile: riskResponse.data.riskProfile,
          allocation: allocationResponse.data.allocation,
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
  const portfolio = overview.portfolio;
  const profitLoss = Number(portfolio.totalProfitLoss || 0);
  const profitLossPercent = Number(portfolio.profitLossPercent || 0);
  const kycStatus = overview.kyc?.status || 'not_submitted';
  const firstName = user?.name?.split(' ')[0] || 'investor';
  const orderedHistory = [...overview.history].sort((left, right) => new Date(left.date) - new Date(right.date));
  const latestSnapshot = orderedHistory.at(-1);
  const previousSnapshot = orderedHistory.at(-2);
  const dailyChange = previousSnapshot
    ? Number(latestSnapshot.portfolioValue) - Number(previousSnapshot.portfolioValue)
    : null;
  const dailyChangePercent = previousSnapshot && Number(previousSnapshot.portfolioValue) !== 0
    ? (dailyChange / Number(previousSnapshot.portfolioValue)) * 100
    : null;
  const selectedRange = chartRanges.find((range) => range.label === chartRange) || chartRanges[2];
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - selectedRange.days);
  const rangeHistory = orderedHistory.filter((item) => new Date(item.date) >= rangeStart);
  const chartHistory = rangeHistory.length ? rangeHistory : orderedHistory.slice(-1);
  const today = new Date();
  const monthlyRoundUps = overview.roundUpItems.filter((roundUp) => {
    const createdAt = new Date(roundUp.createdAt);
    return createdAt.getFullYear() === today.getFullYear() && createdAt.getMonth() === today.getMonth();
  });
  const monthlyRoundUpAmount = monthlyRoundUps.reduce((total, roundUp) => total + Number(roundUp.roundUpAmount), 0);
  const roundUpByTransaction = new Map(overview.roundUpItems.map((roundUp) => [referenceId(roundUp.transactionId), roundUp]));
  const visibleGoals = overview.goals.filter((goal) => goal.status !== 'archived').slice(0, 3);
  const visibleMarket = overview.market.slice(0, 3);

  return (
    <div className="dashboard-page investor-overview">
      <header className="investor-hero">
        <div className="investor-hero-copy">
          <p className="eyebrow">Investor workspace <span className="hero-live-dot" /> Simulation active</p>
          <h1>{getGreeting()}, {firstName} <span aria-hidden="true">👋</span></h1>
          <p>Your virtual portfolio is growing with MicroGrow.</p>
          <div className="hero-actions">
            <Link to="/investor/portfolio" className="workspace-primary-action">View portfolio <ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link to="/investor/transactions" className="workspace-secondary-action">Explore round-ups</Link>
          </div>
        </div>
        <div className="hero-value-card" aria-label="Current simulated portfolio value">
          <div className="hero-value-heading"><span>Portfolio value</span><span className="simulation-chip"><i /> DEMO</span></div>
          <strong>{currency.format(Number(portfolio.currentValue || 0))}</strong>
          <div className={`hero-value-change ${profitLoss >= 0 ? 'positive' : 'negative'}`}>
            {profitLoss >= 0 ? <TrendingUp size={15} aria-hidden="true" /> : <TrendingDown size={15} aria-hidden="true" />}
            <span>{profitLoss >= 0 ? '+' : ''}{currency.format(profitLoss)} total simulated return</span>
          </div>
          <p>Fictional values only. No real assets are held.</p>
        </div>
      </header>

      <div className="overview-metrics investor-metrics">
        <MetricCard icon={Wallet} label="Total portfolio value" value={currency.format(Number(portfolio.currentValue || 0))} detail="Simulated account value" tone="teal" />
        <MetricCard
          icon={dailyChange === null ? CalendarDays : dailyChange >= 0 ? TrendingUp : TrendingDown}
          label="Today's change"
          value={dailyChange === null ? 'Not enough history' : `${dailyChange > 0 ? '+' : ''}${currency.format(dailyChange)}`}
          detail={dailyChangePercent === null ? 'Available after daily snapshots' : `${dailyChangePercent > 0 ? '+' : ''}${dailyChangePercent.toFixed(2)}% vs. prior snapshot`}
          tone={dailyChange === null || dailyChange >= 0 ? 'blue' : 'orange'}
        />
        <MetricCard icon={CircleDollarSign} label="Total invested" value={currency.format(Number(portfolio.totalInvested || 0))} detail="Virtual allocations" tone="violet" />
        <MetricCard
          icon={profitLoss >= 0 ? TrendingUp : TrendingDown}
          label="Total returns"
          value={`${profitLoss > 0 ? '+' : ''}${currency.format(profitLoss)}`}
          detail={`${profitLossPercent > 0 ? '+' : ''}${profitLossPercent.toFixed(2)}% simulated`}
          tone={profitLoss >= 0 ? 'emerald' : 'orange'}
        />
      </div>

      <div className="investor-dashboard-grid">
        <section className="workspace-panel portfolio-panel" aria-labelledby="portfolio-performance-title">
          <div className="workspace-panel-heading">
            <div>
              <p className="eyebrow">Portfolio performance</p>
              <h2 id="portfolio-performance-title">Investment overview</h2>
            </div>
            <Link to="/investor/portfolio" className="workspace-text-link">View portfolio <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className="portfolio-chart-toolbar">
            <div className="chart-current-value">
              <strong>{currency.format(Number(portfolio.currentValue || 0))}</strong>
              <span className={profitLoss >= 0 ? 'positive-text' : 'negative-text'}>
                {profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}% total return
              </span>
            </div>
            <div className="chart-range-control" role="group" aria-label="Portfolio chart time range">
              {chartRanges.map((range) => (
                <button
                  key={range.label}
                  type="button"
                  className={chartRange === range.label ? 'selected' : ''}
                  aria-pressed={chartRange === range.label}
                  onClick={() => setChartRange(range.label)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          {chartHistory.length ? (
            <Suspense fallback={<LoadingState label="Preparing simulated performance chart" />}>
              <PortfolioPerformanceChart history={chartHistory} />
            </Suspense>
          ) : (
            <div className="workspace-empty-chart">
              <TrendingUp size={24} aria-hidden="true" />
              <strong>Performance history starts with your first allocation</strong>
              <span>Once virtual holdings exist, daily simulated snapshots will appear here.</span>
              <Link to="/investor/allocation" className="workspace-text-link">Open allocation <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
          )}
          {orderedHistory.length > 0 && selectedRange.days > 30 && (
            <p className="workspace-data-note">Showing available demo history. This workspace currently stores up to 30 days of snapshots.</p>
          )}
          <p className="workspace-disclaimer">Simulated values only. They are not real savings, market quotes, or investment returns.</p>
        </section>

        <section className="workspace-panel roundup-highlight" aria-labelledby="roundup-highlight-title">
          <div className="roundup-highlight-topline">
            <span className="roundup-icon"><Coins size={20} aria-hidden="true" /></span>
            <span className="simulation-chip"><i /> ROUND-UP SIMULATION</span>
          </div>
          <p className="eyebrow">Small change, simulated progress</p>
          <h2 id="roundup-highlight-title">Your spare change is building your future.</h2>
          <p className="roundup-highlight-copy">Sample purchases are rounded up and tracked in your virtual savings activity.</p>
          <div className="roundup-highlight-stats">
            <div><span>Total round-ups</span><strong>{overview.roundUps.totalCount}</strong></div>
            <div><span>This month</span><strong>{monthlyRoundUps.length} <small>{currency.format(monthlyRoundUpAmount)}</small></strong></div>
            <div><span>Marked invested virtually</span><strong>{currency.format(Number(overview.roundUps.investedAmount || 0))}</strong></div>
          </div>
          <Link to="/investor/transactions#roundups" className="roundup-highlight-link">Review round-ups <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      </div>

      <section className="workspace-section quick-actions-section" aria-labelledby="quick-actions-title">
        <div className="workspace-section-heading">
          <div><p className="eyebrow">Your next step</p><h2 id="quick-actions-title">Quick actions</h2></div>
        </div>
        <div className="workspace-quick-actions">
          <QuickAction icon={Wallet} title="Connect demo bank" detail="Use the sample transaction feed" to="/investor/transactions" tone="teal" />
          <QuickAction icon={BriefcaseBusiness} title="View portfolio" detail="Review simulated holdings" to="/investor/portfolio" tone="blue" />
          <QuickAction icon={TrendingUp} title="Start investment" detail="Calculate a virtual allocation" to="/investor/allocation" tone="violet" />
          <QuickAction icon={Target} title="Set a goal" detail="Create a simulated savings goal" to="/investor/goals" tone="orange" />
          <QuickAction icon={CircleDollarSign} title="View market" detail="Explore simulated asset prices" to="/investor/market" tone="emerald" />
          <QuickAction icon={MessageCircle} title="Talk to advisor" detail="Open your assigned conversation" to="/investor/messages" tone="cyan" />
        </div>
      </section>

      <div className="investor-dashboard-grid investor-dashboard-lower-grid">
        <section className="workspace-panel goals-panel" aria-labelledby="goals-overview-title">
          <div className="workspace-panel-heading">
            <div><p className="eyebrow">Your plan</p><h2 id="goals-overview-title">Savings goals</h2></div>
            <Link to="/investor/goals" className="workspace-text-link">All goals <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </div>
          {visibleGoals.length ? (
            <div className="dashboard-goals-list">
              {visibleGoals.map((goal) => (
                <article className="dashboard-goal" key={goal.id}>
                  <div className="dashboard-goal-heading">
                    <span className="goal-icon"><Target size={17} aria-hidden="true" /></span>
                    <div><strong>{goal.name}</strong><small>Target {fullDateFormat.format(new Date(goal.targetDate))}</small></div>
                    <span className={`goal-status-pill ${goal.status}`}>{goal.status}</span>
                  </div>
                  <div className="dashboard-goal-values">
                    <strong>{currency.format(Number(goal.currentAmount))}</strong>
                    <span>of {currency.format(Number(goal.targetAmount))}</span>
                    <b>{Number(goal.progress).toFixed(0)}%</b>
                  </div>
                  <div className="workspace-progress-track" role="progressbar" aria-label={`${goal.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={goal.progress}>
                    <span style={{ width: `${goal.progress}%` }} />
                  </div>
                </article>
              ))}
              {activeGoals > visibleGoals.length && <p className="workspace-data-note">Showing 3 of {activeGoals} active goals.</p>}
            </div>
          ) : (
            <EmptyPanel icon={Target} title="No goals yet" detail="Set a virtual target and track its progress here." to="/investor/goals" linkLabel="Create a goal" />
          )}
        </section>

        <section className="workspace-panel risk-allocation-panel" aria-labelledby="risk-allocation-title">
          <div className="workspace-panel-heading">
            <div><p className="eyebrow">Personalized simulation</p><h2 id="risk-allocation-title">Risk & allocation</h2></div>
          </div>
          <div className="risk-profile-summary">
            <span className="risk-summary-icon"><ShieldCheck size={19} aria-hidden="true" /></span>
            <div><span>Risk profile</span><strong>{overview.riskProfile?.profile || 'Not assessed'}</strong></div>
            {overview.riskProfile ? <span className="risk-score">{overview.riskProfile.score}<small>/100</small></span> : <Link to="/investor/risk" className="workspace-mini-link">Start</Link>}
          </div>
          {overview.allocation ? (
            <div className="allocation-summary" aria-label="Current simulated allocation">
              {[
                { label: 'Equity', percent: overview.allocation.equityPercent, color: 'equity' },
                { label: 'Gold', percent: overview.allocation.goldPercent, color: 'gold' },
                { label: 'Debt', percent: overview.allocation.debtPercent, color: 'debt' },
              ].map((item) => (
                <div className="allocation-summary-row" key={item.label}>
                  <span><i className={`allocation-dot ${item.color}`} />{item.label}</span>
                  <div className="workspace-progress-track"><span className={item.color} style={{ width: `${item.percent}%` }} /></div>
                  <strong>{item.percent}%</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="workspace-empty-inline">Your allocation appears after completing the risk profile.</p>
          )}
          <Link to={overview.allocation ? '/investor/allocation' : '/investor/risk'} className="workspace-panel-footer-link">
            {overview.allocation ? 'Review allocation' : 'Complete risk profile'} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </div>

      <section className="workspace-section market-overview-section" aria-labelledby="market-overview-title">
        <div className="workspace-section-heading">
          <div><p className="eyebrow">Market overview</p><h2 id="market-overview-title">Simulated assets</h2></div>
          <Link to="/investor/market" className="workspace-text-link">View market <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
        {visibleMarket.length ? (
          <div className="market-card-grid">
            {visibleMarket.map((asset) => {
              const change = Number(asset.changePercent);
              return (
                <article className="market-summary-card" key={asset._id}>
                  <div className="market-summary-topline"><span className={`market-asset-icon ${asset.assetType}`}>{asset.symbol.slice(0, 1)}</span><span className="simulation-chip"><i /> SIMULATED</span></div>
                  <span className="market-summary-type">{asset.assetType}</span>
                  <strong>{asset.name}</strong>
                  <div className="market-summary-values"><b>{currency.format(Number(asset.price))}</b><span className={change >= 0 ? 'positive-text' : 'negative-text'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span></div>
                  <Link to="/investor/market" className="market-details-link">View details <ExternalLink size={13} aria-hidden="true" /></Link>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="workspace-empty-inline">No simulated market assets are available.</p>
        )}
      </section>

      <div className="investor-dashboard-grid activity-support-grid">
        <section className="workspace-panel transactions-overview-panel" aria-labelledby="recent-transactions-title">
          <div className="workspace-panel-heading">
            <div><p className="eyebrow">Latest activity</p><h2 id="recent-transactions-title">Recent transactions</h2></div>
            <Link to="/investor/transactions" className="workspace-text-link">All activity <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </div>
          {overview.transactions.length ? (
            <div className="dashboard-table-wrap">
              <table className="dashboard-transactions-table">
                <thead><tr><th scope="col">Date</th><th scope="col">Description</th><th scope="col">Type</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
                <tbody>
                  {overview.transactions.slice(0, 5).map((transaction) => {
                    const roundUp = roundUpByTransaction.get(String(transaction._id));
                    return (
                      <tr key={transaction._id}>
                        <td data-label="Date">{dateFormat.format(new Date(transaction.transactionDate))}</td>
                        <td data-label="Description"><span className="transaction-description"><i><Receipt size={15} aria-hidden="true" /></i><strong>{transaction.merchant}</strong></span></td>
                        <td data-label="Type"><span className="transaction-type-pill">{transaction.category}</span></td>
                        <td data-label="Amount" className="transaction-amount">{currency.format(Number(transaction.amount))}</td>
                        <td data-label="Status"><span className={`transaction-status-pill ${roundUp?.status || 'synced'}`}>{roundUp?.status === 'invested' ? 'Invested virtually' : roundUp?.status === 'pending' ? 'Round-up pending' : 'Demo synced'}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel icon={Receipt} title="No transactions yet" detail="Connect the demo bank to load sample activity." to="/investor/transactions" linkLabel="Open transactions" />
          )}
        </section>

        <section className="workspace-panel support-panel" aria-labelledby="advisor-support-title">
          <span className="support-icon"><MessageCircle size={21} aria-hidden="true" /></span>
          <p className="eyebrow">Account support</p>
          <h2 id="advisor-support-title">Need help with your investment journey?</h2>
          <p>{user?.advisorId ? 'Your assigned advisor can help you review your simulation.' : 'No advisor is assigned to this simulation account yet.'}</p>
          <div className="support-actions">
            <Link to="/investor/messages" className="workspace-primary-action">Chat with advisor <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link to="/investor/messages" className="workspace-secondary-action">View messages</Link>
          </div>
          <div className="support-kyc-row"><BadgeCheck size={16} aria-hidden="true" /><span>Demo KYC</span><strong className={`kyc-status-pill ${kycStatus}`}>{kycLabels[kycStatus] || kycStatus}</strong><Link to="/investor/kyc" aria-label="Open demo KYC"><ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        </section>

        <section className="workspace-panel dashboard-notifications-panel" aria-labelledby="dashboard-notifications-title">
          <div className="workspace-panel-heading">
            <div><p className="eyebrow">Account updates</p><h2 id="dashboard-notifications-title">Notifications</h2></div>
            <span className="unread-count-pill"><Bell size={14} aria-hidden="true" />{overview.unreadCount} unread</span>
          </div>
          {overview.notifications.length ? (
            <div className="dashboard-notification-list">
              {overview.notifications.slice(0, 3).map((notification) => (
                <article className={`dashboard-notification ${notification.isRead ? '' : 'unread'}`} key={notification._id}>
                  <span className={`notification-type-icon ${notification.type}`}><Bell size={15} aria-hidden="true" /></span>
                  <div><strong>{notification.title}</strong><p>{notification.message}</p><time dateTime={notification.createdAt}>{fullDateFormat.format(new Date(notification.createdAt))}</time></div>
                  {!notification.isRead && <span className="notification-new-mark">New</span>}
                </article>
              ))}
            </div>
          ) : (
            <p className="workspace-empty-inline">You’re all caught up.</p>
          )}
          <button className="workspace-panel-footer-link" type="button" onClick={() => window.dispatchEvent(new CustomEvent('microgrow:open-notifications'))}>
            Open notification center <ArrowRight size={15} aria-hidden="true" />
          </button>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone = '' }) {
  return (
    <article className={`overview-metric ${tone}`}>
      <span className="metric-icon"><Icon size={19} aria-hidden="true" /></span>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function QuickAction({ icon: Icon, title, detail, to, tone }) {
  return (
    <Link className={`workspace-quick-action ${tone}`} to={to}>
      <span className="quick-action-icon"><Icon size={19} aria-hidden="true" /></span>
      <span className="quick-action-copy"><strong>{title}</strong><small>{detail}</small></span>
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

function EmptyPanel({ icon: Icon, title, detail, to, linkLabel }) {
  return (
    <div className="workspace-empty-panel">
      <span><Icon size={20} aria-hidden="true" /></span>
      <strong>{title}</strong>
      <p>{detail}</p>
      <Link to={to} className="workspace-text-link">{linkLabel} <ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
  );
}

export default InvestorDashboard;
