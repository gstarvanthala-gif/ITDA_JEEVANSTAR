function AdminDashboard() {
  return (
    <div className="dashboard-page">
      <h2>Admin dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <span>Investors</span>
          <strong>142</strong>
        </div>
        <div className="stat-card">
          <span>Advisors</span>
          <strong>12</strong>
        </div>
        <div className="stat-card">
          <span>Pending KYC</span>
          <strong>18</strong>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
