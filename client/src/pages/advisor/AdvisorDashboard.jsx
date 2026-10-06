function AdvisorDashboard() {
  return (
    <div className="dashboard-page">
      <h2>Advisor dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <span>Assigned clients</span>
          <strong>6</strong>
        </div>
        <div className="stat-card">
          <span>Portfolio health</span>
          <strong>Stable</strong>
        </div>
        <div className="stat-card">
          <span>Unread messages</span>
          <strong>3</strong>
        </div>
      </div>
    </div>
  );
}

export default AdvisorDashboard;
