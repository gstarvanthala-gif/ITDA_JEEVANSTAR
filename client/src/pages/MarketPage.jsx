import { useEffect, useState } from 'react';

import LoadingState from '../components/LoadingState';
import { marketApi } from '../services/api';

const formatPrice = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value));

function MarketPage() {
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    marketApi.getAll()
      .then((response) => {
        if (!isMounted) return;
        setMarketData(response.data.marketData);
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Could not load market data.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="dashboard-page">
      <header className="portfolio-heading">
        <div>
          <p className="eyebrow">DEMO simulation</p>
          <h2>Market Data</h2>
        </div>
        <span>Source: simulation</span>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}

      {loading ? (
        <LoadingState label="Loading simulated market data" />
      ) : marketData.length === 0 ? (
        <p className="empty-state">No simulated market assets are available yet.</p>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Name</th>
                <th>Asset</th>
                <th>Price</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {marketData.map((item) => (
                <tr key={item._id}>
                  <td>{item.symbol}</td>
                  <td>{item.name}</td>
                  <td>{item.assetType}</td>
                  <td>{formatPrice(item.price)}</td>
                  <td className={Number(item.changePercent) >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                    {Number(item.changePercent) >= 0 ? '+' : ''}{Number(item.changePercent).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default MarketPage;
