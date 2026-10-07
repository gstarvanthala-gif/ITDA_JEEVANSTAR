import { useEffect } from 'react';

function ToastMessage({ message, onDismiss, variant = 'success' }) {
  useEffect(() => {
    if (!message || !onDismiss) return undefined;
    const timeoutId = window.setTimeout(onDismiss, 4500);
    return () => window.clearTimeout(timeoutId);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className={`toast-message ${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification">Dismiss</button>
    </div>
  );
}

export default ToastMessage;
