import { useEffect, useState } from 'react';

import LoadingState from '../../components/LoadingState';
import ToastMessage from '../../components/ToastMessage';
import { kycApi } from '../../services/api';

const STATUS_LABELS = {
  not_submitted: 'Not submitted',
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
};

const EMPTY_FORM = {
  fullName: '',
  demoDocumentType: 'DEMO-ID',
  demoDocumentNumber: '',
};

function KycPage() {
  const [kyc, setKyc] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    kycApi.getStatus()
      .then((response) => {
        if (active) setKyc(response.data.kyc);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Could not load your mock KYC status.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitKyc = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);

    try {
      const response = await kycApi.submit(form);
      setKyc({
        ...response.data.kyc,
        status: response.data.kyc.status,
      });
      setForm(EMPTY_FORM);
      setNotice('Your fictional demo KYC was submitted for review.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not submit your mock KYC.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading mock KYC status" />;

  const status = kyc?.status || 'not_submitted';
  const canSubmit = status === 'not_submitted' || status === 'rejected';
  const reviewComplete = status === 'verified' || status === 'rejected';

  return (
    <section className="dashboard-page kyc-page">
      <header className="portfolio-heading">
        <div>
          <p className="eyebrow">Fictional verification workflow</p>
          <h2>Mock KYC</h2>
        </div>
        <span className={`admin-status ${status}`}>{STATUS_LABELS[status] || status}</span>
      </header>

      <p className="kyc-demo-warning" role="note">
        Demo only. Use a made-up name and fictional demo code. Never enter real identity details or upload documents.
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <ToastMessage message={notice} onDismiss={() => setNotice('')} />

      {kyc?.submittedAt && (
        <section className="kyc-status-panel" aria-labelledby="kyc-status-heading">
          <div>
            <p className="eyebrow">Submission status</p>
            <h3 id="kyc-status-heading">{STATUS_LABELS[status] || status}</h3>
            <p>Submitted {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(kyc.submittedAt))}</p>
          </div>
          {status === 'rejected' && (
            <div className="kyc-review-note">
              <strong>Admin review note</strong>
              <p>{kyc.reviewNote || 'No review note was provided.'}</p>
              {kyc.reviewedAt && <small>Reviewed {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(kyc.reviewedAt))}</small>}
            </div>
          )}
          {status === 'verified' && kyc.reviewNote && (
            <div className="kyc-review-note">
              <strong>Admin review note</strong>
              <p>{kyc.reviewNote}</p>
            </div>
          )}
          <ol className="kyc-timeline" aria-label="Demo KYC review progress">
            <li className="complete">
              <span aria-hidden="true" />
              <div><strong>Demo record submitted</strong><small>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(kyc.submittedAt))}</small></div>
            </li>
            <li className={reviewComplete ? 'complete' : 'current'}>
              <span aria-hidden="true" />
              <div><strong>Admin review</strong><small>{status === 'pending' ? 'Awaiting review' : kyc.reviewedAt ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(kyc.reviewedAt)) : 'Review completed'}</small></div>
            </li>
            <li className={reviewComplete ? `complete ${status}` : ''}>
              <span aria-hidden="true" />
              <div><strong>{status === 'rejected' ? 'Revision requested' : status === 'verified' ? 'Verified' : 'Decision'}</strong><small>{reviewComplete ? 'Review outcome recorded' : 'Pending decision'}</small></div>
            </li>
          </ol>
        </section>
      )}

      {status === 'pending' && (
        <p className="empty-state">Your demo submission is awaiting admin review. The form is unavailable while a review is pending; duplicate submissions are disabled.</p>
      )}
      {status === 'verified' && (
        <p className="empty-state">Your fictional demo submission has been verified. No real identity verification took place.</p>
      )}

      {canSubmit && (
        <form className="kyc-form" onSubmit={submitKyc}>
          <h3>{status === 'rejected' ? 'Submit revised demo KYC' : 'Submit demo KYC'}</h3>
          <label>
            <span>Fictional demo name</span>
            <input
              name="fullName"
              type="text"
              maxLength={120}
              autoComplete="off"
              required
              value={form.fullName}
              onChange={updateField}
            />
          </label>
          <label>
            <span>Demo record type</span>
            <select name="demoDocumentType" value={form.demoDocumentType} onChange={updateField}>
              <option value="DEMO-ID">DEMO-ID</option>
              <option value="DEMO-BILL">DEMO-BILL</option>
              <option value="DEMO-UTILITY">DEMO-UTILITY</option>
              <option value="DEMO-PASSPORT">DEMO-PASSPORT</option>
            </select>
          </label>
          <label>
            <span>Fictional demo code</span>
            <input
              name="demoDocumentNumber"
              type="text"
              maxLength={80}
              autoComplete="off"
              placeholder="DEMO-ONLY-001"
              required
              value={form.demoDocumentNumber}
              onChange={updateField}
            />
          </label>
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : status === 'rejected' ? 'Submit revised KYC' : 'Submit for review'}
          </button>
        </form>
      )}
    </section>
  );
}

export default KycPage;