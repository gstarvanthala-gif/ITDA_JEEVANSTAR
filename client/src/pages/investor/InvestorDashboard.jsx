function InvestorDashboard() {
  return (
    <div className="dashboard-page">
      <h2>Investor dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <span>Round-ups</span>
          <strong>₹12</strong>
        </div>
        <div className="stat-card">
          <span>Portfolio value</span>
          <strong>₹4,200</strong>
        </div>
        <div className="stat-card">
          <span>Goals</span>
          <strong>2 active</strong>
        </div>
      </div>
    </div>
  );
}

export default InvestorDashboard;
