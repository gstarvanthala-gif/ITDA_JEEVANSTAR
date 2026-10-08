import { useNavigate } from 'react-router-dom';
import { BadgeCheck, KeyRound, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';

const STATUS_LABELS = {
  not_submitted: 'Not submitted',
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Revision needed',
};

function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'member';
  const kycStatus = user?.kycStatus || 'not_submitted';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <section className="dashboard-page profile-page">
      <header className="workspace-page-heading">
        <div>
          <p className="eyebrow">Investor workspace</p>
          <h2>Profile</h2>
          <p>Account identity and access for your simulation workspace.</p>
        </div>
        <span className="demo-badge">SIMULATION ACCOUNT</span>
      </header>

      <div className="profile-workspace-grid">
        <section className="workspace-panel profile-identity-panel" aria-label="Account profile">
          <div className="profile-identity-heading">
            <span className="profile-avatar" aria-hidden="true">{(user?.name || user?.email || 'M').charAt(0).toUpperCase()}</span>
            <div><span className="profile-role-chip"><i />{role} account</span><h3>{user?.name || 'MicroGrow member'}</h3><p>{user?.email || 'Email not available'}</p></div>
          </div>
          <div className="profile-detail-list">
            <div><span><UserRound size={17} aria-hidden="true" />Account role</span><strong className="capitalize">{role}</strong></div>
            <div><span><Mail size={17} aria-hidden="true" />Email address</span><strong>{user?.email || 'Not available'}</strong></div>
            <div><span><BadgeCheck size={17} aria-hidden="true" />Account status</span><strong className="profile-active-status"><i />{user?.isActive === false ? 'Inactive' : 'Active'}</strong></div>
            {role === 'investor' && <div><span><ShieldCheck size={17} aria-hidden="true" />Demo KYC</span><strong className={`kyc-status-pill ${kycStatus}`}>{STATUS_LABELS[kycStatus] || kycStatus}</strong></div>}
          </div>
        </section>

        <section className="workspace-panel profile-security-panel" aria-labelledby="profile-security-title">
          <span className="profile-security-icon"><KeyRound size={19} aria-hidden="true" /></span>
          <p className="eyebrow">Access & security</p>
          <h3 id="profile-security-title">Your session is protected</h3>
          <p>MicroGrow uses a signed session for this demo workspace. Password changes and account recovery are not available in this simulation.</p>
          <div className="profile-security-status"><i /><span>Signed in on this browser</span></div>
          <button className="workspace-logout-action" type="button" onClick={handleLogout}><LogOut size={16} aria-hidden="true" />Log out</button>
        </section>
      </div>

      <p className="profile-disclaimer">MicroGrow is a fictional learning environment. Portfolio values and account activity are simulated. Do not enter real banking or identity information.</p>
    </section>
  );
}

export default ProfilePage;