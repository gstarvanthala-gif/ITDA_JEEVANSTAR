import { useCallback, useEffect, useState } from 'react';

import LoadingState from '../../components/LoadingState';
import ToastMessage from '../../components/ToastMessage';
import { demoBankApi, roundUpApi } from '../../services/api';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(date)
  );

function TransactionsPage() {
  const [bankAccount, setBankAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [roundUps, setRoundUps] = useState([]);
  const [roundUpHistory, setRoundUpHistory] = useState([]);
  const [roundUpSummary, setRoundUpSummary] = useState(null);
  const [roundUpView, setRoundUpView] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError('');

    try {
      const [bankResponse, transactionsResponse, roundUpsResponse, summaryResponse, historyResponse] =
        await Promise.all([
          demoBankApi.getBank(),
          demoBankApi.getTransactions(),
          roundUpApi.getAll(),
          roundUpApi.getSummary(),
          roundUpApi.getHistory(),
        ]);
      setBankAccount(bankResponse.data.bankAccount);
      setTransactions(transactionsResponse.data.transactions);
      setRoundUps(roundUpsResponse.data.roundUps);
      setRoundUpSummary(summaryResponse.data.summary);
      setRoundUpHistory(historyResponse.data.roundUps);
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load demo bank data.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      demoBankApi.getBank(),
      demoBankApi.getTransactions(),
      roundUpApi.getAll(),
      roundUpApi.getSummary(),
      roundUpApi.getHistory(),
    ])
      .then(([bankResponse, transactionsResponse, roundUpsResponse, summaryResponse, historyResponse]) => {
        if (!isMounted) return;
        setBankAccount(bankResponse.data.bankAccount);
        setTransactions(transactionsResponse.data.transactions);
        setRoundUps(roundUpsResponse.data.roundUps);
        setRoundUpSummary(summaryResponse.data.summary);
        setRoundUpHistory(historyResponse.data.roundUps);
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setError(requestError.response?.data?.message || 'Could not load demo bank data.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const runAction = async (action, successMessage) => {
    setWorking(true);
    setError('');
    setNotice('');

    try {
      const response = await action();
      const refreshed = await loadData();
      if (refreshed) {
        setNotice(typeof successMessage === 'function' ? successMessage(response) : successMessage);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The request could not be completed.');
    } finally {
      setWorking(false);
    }
  };

  const handleConnect = () =>
    runAction(() => demoBankApi.connectBank(), 'Demo bank connected.');

  const handleSync = () =>
    runAction(() => demoBankApi.syncTransactions(), 'Demo transactions synced.');

  const handleDisconnect = () =>
    runAction(() => demoBankApi.disconnectBank(bankAccount._id), 'Demo bank disconnected.');

  const handleCalculateRoundUps = () =>
    runAction(
      () => roundUpApi.calculate(),
      (response) => `Round-ups calculated from ${response.data.count} saved transactions.`
    );

  const handleInvestRoundUp = (roundUpId) =>
    runAction(() => roundUpApi.invest(roundUpId), 'Round-up added to virtual savings.');

  if (loading) {
    return <LoadingState label="Loading simulated transactions" />;
  }

  return (
    <section className="dashboard-page transactions-page">
      <header className="transactions-heading">
        <div>
          <p className="eyebrow">Simulated activity</p>
          <h2>Transactions</h2>
        </div>
        <span className="demo-badge">DEMO ONLY</span>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}
      <ToastMessage message={notice} onDismiss={() => setNotice('')} />

      <section className="bank-status" aria-label="Demo bank connection">
        <div>
          <p className="eyebrow">Demo bank</p>
          {bankAccount ? (
            <>
              <h3>{bankAccount.bankName}</h3>
              <p className="bank-account-number">{bankAccount.maskedAccountNumber}</p>
              <span className={`connection-status ${bankAccount.status}`}>
                {bankAccount.status}
              </span>
            </>
          ) : (
            <h3>No demo bank connected</h3>
          )}
        </div>
        <div className="bank-actions">
          {!bankAccount || bankAccount.status !== 'connected' ? (
            <button className="primary-button" type="button" onClick={handleConnect} disabled={working}>
              Connect demo bank
            </button>
          ) : (
            <>
              <button className="primary-button" type="button" onClick={handleSync} disabled={working}>
                Sync demo transactions
              </button>
              <button className="secondary-button" type="button" onClick={handleDisconnect} disabled={working}>
                Disconnect
              </button>
            </>
          )}
        </div>
      </section>

      <section className="transactions-section" aria-labelledby="transactions-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Fictional transaction feed</p>
            <h3 id="transactions-title">Recent activity</h3>
          </div>
          <span>{transactions.length} transactions</span>
        </div>

        {transactions.length === 0 ? (
          <p className="empty-state">
            {bankAccount?.status === 'connected'
              ? 'Sync the demo feed to add sample transactions.'
              : 'Connect the demo bank to view sample transactions.'}
          </p>
        ) : (
          <div className="transactions-table-wrap">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th scope="col">Merchant</th>
                  <th scope="col">Category</th>
                  <th scope="col">Date</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td>{transaction.merchant}</td>
                    <td className="capitalize">{transaction.category}</td>
                    <td>{formatDate(transaction.transactionDate)}</td>
                    <td>{currency.format(transaction.amount)}</td>
                    <td><span className="demo-badge">DEMO</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="roundups-section" aria-labelledby="roundups-title">
        <div className="roundups-heading">
          <div>
            <p className="eyebrow">Virtual savings</p>
            <h3 id="roundups-title">Round-ups</h3>
          </div>
          <button
            className="primary-button roundups-calculate-button"
            type="button"
            onClick={handleCalculateRoundUps}
            disabled={working || transactions.length === 0}
          >
            Calculate round-ups
          </button>
        </div>

        <div className="roundup-summary-grid">
          <div className="roundup-summary-item">
            <span>Available to invest</span>
            <strong>{currency.format(Number(roundUpSummary?.pendingAmount || 0))}</strong>
          </div>
          <div className="roundup-summary-item">
            <span>Invested virtually</span>
            <strong>{currency.format(Number(roundUpSummary?.investedAmount || 0))}</strong>
          </div>
          <div className="roundup-summary-item">
            <span>Calculated</span>
            <strong>{roundUpSummary?.totalCount ?? 0}</strong>
          </div>
        </div>

        <div className="roundups-toolbar">
          <div className="roundups-tabs" role="group" aria-label="Round-up view">
            <button
              type="button"
              className={roundUpView === 'pending' ? 'selected' : ''}
              aria-pressed={roundUpView === 'pending'}
              onClick={() => setRoundUpView('pending')}
            >
              Available
            </button>
            <button
              type="button"
              className={roundUpView === 'history' ? 'selected' : ''}
              aria-pressed={roundUpView === 'history'}
              onClick={() => setRoundUpView('history')}
            >
              History
            </button>
          </div>
          <span>
            {roundUpView === 'pending'
              ? `${roundUps.filter(({ status }) => status === 'pending').length} available`
              : `${roundUpHistory.length} completed`}
          </span>
        </div>

        {(() => {
          const visibleRoundUps = roundUpView === 'pending'
            ? roundUps.filter(({ status }) => status === 'pending')
            : roundUpHistory;

          if (visibleRoundUps.length === 0) {
            return (
              <p className="empty-state">
                {roundUpView === 'pending'
                  ? 'Calculate round-ups from your saved demo transactions to begin.'
                  : 'Invested and skipped round-ups will appear here.'}
              </p>
            );
          }

          return (
            <div className="transactions-table-wrap">
              <table className="transactions-table roundups-table">
                <thead>
                  <tr>
                    <th scope="col">Merchant</th>
                    <th scope="col">Purchase</th>
                    <th scope="col">Rounded to</th>
                    <th scope="col">Saved amount</th>
                    <th scope="col">Status</th>
                    {roundUpView === 'pending' && <th scope="col">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleRoundUps.map((roundUp) => (
                    <tr key={roundUp._id}>
                      <td>{roundUp.transactionId?.merchant || 'Transaction'}</td>
                      <td>{currency.format(Number(roundUp.originalAmount))}</td>
                      <td>{currency.format(Number(roundUp.roundedAmount))}</td>
                      <td>{currency.format(Number(roundUp.roundUpAmount))}</td>
                      <td><span className={`roundup-status ${roundUp.status}`}>{roundUp.status}</span></td>
                      {roundUpView === 'pending' && (
                        <td>
                          <button
                            className="invest-button"
                            type="button"
                            onClick={() => handleInvestRoundUp(roundUp._id)}
                            disabled={working}
                          >
                            Invest virtually
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </section>
    </section>
  );
}

export default TransactionsPage;