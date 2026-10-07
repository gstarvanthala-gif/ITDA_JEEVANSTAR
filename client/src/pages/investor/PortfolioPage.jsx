import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import LoadingState from '../../components/LoadingState';
import { portfolioApi } from '../../services/api';

const PortfolioPerformanceChart = lazy(() => import('./PortfolioPerformanceChart.jsx'));

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(date));

const formatCurrency = (value) => currency.format(Number(value || 0));

const ASSET_LABELS = {
  equity: 'Equity',
  gold: 'Gold',
  debt: 'Debt',
};

function PortfolioPage() {
  const [summary, setSummary] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [history, setHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      portfolioApi.getSummary(),
      portfolioApi.getHoldings(),
      portfolioApi.getHistory(),
      portfolioApi.getTransactions(),
    ])
      .then(([summaryResponse, holdingsResponse, historyResponse, transactionsResponse]) => {
        if (!isMounted) return;
        setSummary(summaryResponse.data.summary);
        setHoldings(holdingsResponse.data.holdings);
        setHistory(historyResponse.data.history);
        setTransactions(transactionsResponse.data.transactions);
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setError(requestError.response?.data?.message || 'Could not load the simulated portfolio.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <LoadingState label="Loading simulated portfolio" />;
  }

  if (error) {
    return <div className="dashboard-page"><p className="form-error" role="alert">{error}</p></div>;
  }

  const profitLoss = Number(summary?.totalProfitLoss || 0);

  return (
    <section className="dashboard-page portfolio-page">
      <header className="portfolio-heading">
        <div>
          <p className="eyebrow">Investor overview</p>
          <h2>Portfolio</h2>
        </div>
        <span className="demo-badge">SIMULATED VALUES</span>
      </header>

      <p className="portfolio-disclaimer">
        All values and price movements are deterministic simulations, not market quotes or investment returns.
      </p>

      <div className="portfolio-metrics">
        <article className="portfolio-metric">
          <span>Total invested virtually</span>
          <strong>{formatCurrency(summary?.totalInvested)}</strong>
        </article>
        <article className="portfolio-metric featured">
          <span>Current simulated value</span>
          <strong>{formatCurrency(summary?.currentValue)}</strong>
        </article>
        <article className="portfolio-metric">
          <span>Simulated profit / loss</span>
          <strong className={profitLoss >= 0 ? 'pnl-positive' : 'pnl-negative'}>
            {profitLoss > 0 ? '+' : ''}{formatCurrency(profitLoss)}
          </strong>
        </article>
      </div>

      {holdings.length === 0 ? (
        <section className="portfolio-empty">
          <p className="eyebrow">No virtual holdings yet</p>
          <h3>Start with an eligible round-up</h3>
          <p>Complete a risk assessment, calculate your allocation, then allocate a saved round-up virtually.</p>
          <Link className="primary-button" to="/investor/allocation">View allocation</Link>
        </section>
      ) : (
        <>
          <section className="portfolio-section" aria-labelledby="portfolio-history-title">
            <div className="portfolio-section-heading">
              <div>
                <p className="eyebrow">DEMO price series</p>
                <h3 id="portfolio-history-title">Value history</h3>
              </div>
              <span>{history.length ? `${history.length} daily snapshots` : 'No history yet'}</span>
            </div>
            {history.length === 0 ? (
              <p className="empty-state">History snapshots will appear after virtual allocations are recorded.</p>
            ) : (
              <Suspense fallback={<LoadingState label="Preparing simulated portfolio chart" />}>
                <PortfolioPerformanceChart history={history} />
              </Suspense>
            )}
          </section>

          <section className="portfolio-section" aria-labelledby="holdings-title">
            <div className="portfolio-section-heading">
              <div>
                <p className="eyebrow">Current mix</p>
                <h3 id="holdings-title">Holdings</h3>
              </div>
            </div>
            <div className="transactions-table-wrap">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th scope="col">Asset</th>
                    <th scope="col">Allocation</th>
                    <th scope="col">Units</th>
                    <th scope="col">Average price</th>
                    <th scope="col">Simulated price</th>
                    <th scope="col">Current value</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr key={holding.assetType}>
                      <td><span className={`asset-marker ${holding.assetType}`} />{ASSET_LABELS[holding.assetType]}</td>
                      <td>{Number(holding.allocationPercent).toFixed(2)}%</td>
                      <td>{Number(holding.units).toFixed(6)}</td>
                      <td>{formatCurrency(holding.averagePrice)}</td>
                      <td>{formatCurrency(holding.currentPrice)}</td>
                      <td>{formatCurrency(holding.currentValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="allocation-legend">
              {holdings.map((holding) => (
                <span key={holding.assetType}>
                  <i className={`asset-marker ${holding.assetType}`} />
                  {ASSET_LABELS[holding.assetType]} {Number(holding.allocationPercent).toFixed(2)}%
                </span>
              ))}
            </div>
          </section>

          <section className="portfolio-section" aria-labelledby="portfolio-transactions-title">
            <div className="portfolio-section-heading">
              <div>
                <p className="eyebrow">Virtual allocations</p>
                <h3 id="portfolio-transactions-title">Recent activity</h3>
              </div>
              <span>{transactions.length} executions</span>
            </div>
            {transactions.length === 0 ? (
              <p className="empty-state">Executed round-ups will appear here.</p>
            ) : (
              <div className="transactions-table-wrap">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th scope="col">Transaction</th>
                      <th scope="col">Amount allocated</th>
                      <th scope="col">Risk profile</th>
                      <th scope="col">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction._id}>
                        <td>{transaction.transactionId?.merchant || 'Transaction'}</td>
                        <td>{formatCurrency(transaction.roundUpAmount)}</td>
                        <td className="capitalize">{transaction.allocationExecution.riskLevel}</td>
                        <td>{formatDate(transaction.allocationExecution.executedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

export default PortfolioPage;