function LoadingState({ label = 'Loading content' }) {
  return (
    <section className="loading-state" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="loading-state-heading">
        <span className="skeleton-line short" />
        <span className="skeleton-line title" />
      </div>
      <div className="loading-state-metrics" aria-hidden="true">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
      <span className="skeleton-block loading-state-content" aria-hidden="true" />
    </section>
  );
}

export default LoadingState;
