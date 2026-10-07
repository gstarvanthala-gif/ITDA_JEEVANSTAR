import { useCallback, useEffect, useState } from 'react';

import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingState from '../../components/LoadingState';
import ToastMessage from '../../components/ToastMessage';
import { allocationApi, riskApi, roundUpApi } from '../../services/api';

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

const percentTotal = (allocation) =>
  allocation.equityPercent + allocation.goldPercent + allocation.debtPercent;

function AllocationPage() {
  const [riskProfile, setRiskProfile] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [roundUps, setRoundUps] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const loadData = useCallback(async () => {
    setError('');

    try {
      const [riskResponse, allocationResponse, roundUpsResponse, historyResponse] = await Promise.all([
        riskApi.getProfile(),
        allocationApi.get(),
        roundUpApi.getAll(),
        allocationApi.getHistory(),
      ]);
      setRiskProfile(riskResponse.data.riskProfile);
      setAllocation(allocationResponse.data.allocation);
      setRoundUps(roundUpsResponse.data.roundUps);
      setHistory(historyResponse.data.history);
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load allocation data.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      riskApi.getProfile(),
      allocationApi.get(),
      roundUpApi.getAll(),
      allocationApi.getHistory(),
    ])
      .then(([riskResponse, allocationResponse, roundUpsResponse, historyResponse]) => {
        if (!isMounted) return;
        setRiskProfile(riskResponse.data.riskProfile);
        setAllocation(allocationResponse.data.allocation);
        setRoundUps(roundUpsResponse.data.roundUps);
        setHistory(historyResponse.data.history);
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setError(requestError.response?.data?.message || 'Could not load allocation data.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const runAction = async (actionName, action, successMessage) => {
    setWorking(actionName);
    setError('');
    setNotice('');

    try {
      await action();
      if (await loadData()) setNotice(successMessage);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The request could not be completed.');
    } finally {
      setWorking('');
    }
  };

  const handleReset = async () => {
    await runAction('reset', () => allocationApi.reset(), 'Allocation reset. Execution history was preserved.');
    setConfirmReset(false);
  };

  const eligibleRoundUps = roundUps.filter((roundUp) =>
    !roundUp.allocationExecution &&
    roundUp.status !== 'skipped' &&
    Number(roundUp.roundUpAmount) > 0
  );

  if (loading) {
    return <LoadingState label="Loading virtual allocation" />;
  }

  return (
    <section className="dashboard-page allocation-page">
      <header className="allocation-heading">
        <div>
          <p className="eyebrow">Simulation only</p>
          <h2>Auto-invest allocation</h2>
        </div>
        <span className="demo-badge">VIRTUAL</span>
      </header>

      <p className="allocation-disclaimer">
        Percentages are derived from your saved risk profile. No real assets are purchased.
      </p>

      {error && <p className="form-error" role="alert">{error}</p>}
      <ToastMessage message={notice} onDismiss={() => setNotice('')} />

      <section className="allocation-profile" aria-labelledby="allocation-profile-title">
        <div>
          <p className="eyebrow">Risk profile</p>
          <h3 id="allocation-profile-title">
            {riskProfile ? PROFILE_LABELS[riskProfile.profile] : 'Assessment required'}
          </h3>
          {riskProfile && <p>Server score: {riskProfile.score} / 100</p>}
        </div>
        <div className="allocation-actions">
          <button
            className="primary-button allocation-action-button"
            type="button"
            onClick={() => runAction('calculate', allocationApi.calculate, 'Allocation calculated from your saved risk profile.')}
            disabled={!riskProfile || Boolean(working)}
          >
            {working === 'calculate' ? 'Calculating...' : allocation ? 'Recalculate' : 'Calculate allocation'}
          </button>
          {allocation && (
            <>
              <button
                className="secondary-button allocation-action-button"
                type="button"
                onClick={() => runAction('update', allocationApi.update, 'Allocation refreshed from your saved risk profile.')}
                disabled={!riskProfile || Boolean(working)}
              >
                Update
              </button>
              <button
                className="secondary-button allocation-action-button"
                type="button"
                onClick={() => setConfirmReset(true)}
                disabled={Boolean(working)}
              >
                Reset
              </button>
            </>
          )}
        </div>
      </section>

      {!riskProfile && (
        <p className="empty-state">
          Complete the risk assessment before calculating an allocation.
        </p>
      )}

      {allocation && (
        <section className="allocation-breakdown" aria-label="Saved asset allocation">
          <div className="allocation-total-row">
            <h3>Saved allocation</h3>
            <strong>Total {percentTotal(allocation)}%</strong>
          </div>
          <div className="allocation-bars">
            <div className="allocation-item equity">
              <div><span>Equity</span><strong>{allocation.equityPercent}%</strong></div>
              <div className="allocation-track"><span style={{ width: `${allocation.equityPercent}%` }} /></div>
            </div>
            <div className="allocation-item gold">
              <div><span>Gold</span><strong>{allocation.goldPercent}%</strong></div>
              <div className="allocation-track"><span style={{ width: `${allocation.goldPercent}%` }} /></div>
            </div>
            <div className="allocation-item debt">
              <div><span>Debt</span><strong>{allocation.debtPercent}%</strong></div>
              <div className="allocation-track"><span style={{ width: `${allocation.debtPercent}%` }} /></div>
            </div>
          </div>
        </section>
      )}

      <section className="allocation-breakdown" aria-labelledby="eligible-roundups-title">
        <div className="allocation-total-row">
          <div>
            <p className="eyebrow">Virtual execution</p>
            <h3 id="eligible-roundups-title">Round-ups ready to allocate</h3>
          </div>
          <span>{eligibleRoundUps.length} available</span>
        </div>

        {!allocation ? (
          <p className="empty-state">Calculate an allocation to enable virtual execution.</p>
        ) : eligibleRoundUps.length === 0 ? (
          <p className="empty-state">No unallocated round-ups are available.</p>
        ) : (
          <div className="transactions-table-wrap">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th scope="col">Merchant</th>
                  <th scope="col">Round-up</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {eligibleRoundUps.map((roundUp) => (
                  <tr key={roundUp._id}>
                    <td>{roundUp.transactionId?.merchant || 'Transaction'}</td>
                    <td>{currency.format(Number(roundUp.roundUpAmount))}</td>
                    <td><span className={`roundup-status ${roundUp.status}`}>{roundUp.status}</span></td>
                    <td>
                      <button
                        className="invest-button"
                        type="button"
                        onClick={() => runAction(
                          roundUp._id,
                          () => allocationApi.execute(roundUp._id),
                          'Round-up allocated virtually.'
                        )}
                        disabled={Boolean(working)}
                      >
                        {working === roundUp._id ? 'Allocating...' : 'Allocate virtually'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="allocation-breakdown" aria-labelledby="allocation-history-title">
        <div className="allocation-total-row">
          <h3 id="allocation-history-title">Execution history</h3>
          <span>{history.length} records</span>
        </div>
        {history.length === 0 ? (
          <p className="empty-state">Virtual allocation executions will appear here.</p>
        ) : (
          <div className="transactions-table-wrap">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th scope="col">Merchant</th>
                  <th scope="col">Risk profile</th>
                  <th scope="col">Equity</th>
                  <th scope="col">Gold</th>
                  <th scope="col">Debt</th>
                  <th scope="col">Executed</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item._id}>
                    <td>{item.transactionId?.merchant || 'Transaction'}</td>
                    <td className="capitalize">{item.allocationExecution.riskLevel}</td>
                    <td>{currency.format(Number(item.allocationExecution.equityAmount))}</td>
                    <td>{currency.format(Number(item.allocationExecution.goldAmount))}</td>
                    <td>{currency.format(Number(item.allocationExecution.debtAmount))}</td>
                    <td>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(item.allocationExecution.executedAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ConfirmDialog
        open={confirmReset}
        title="Reset saved allocation?"
        message="Your current allocation will be cleared. Existing virtual execution history will be preserved."
        confirmLabel="Reset allocation"
        busy={working === 'reset'}
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </section>
  );
}

export default AllocationPage;