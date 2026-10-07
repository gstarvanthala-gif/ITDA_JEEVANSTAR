import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { getDefaultRoute } from '../../utils/roleUtils';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await login(formData);
      const nextPath = getDefaultRoute(response.data.user.role);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-panel">
      <div className="panel-header">
        <p className="eyebrow">Welcome back</p>
        <h2>Login to MicroGrow</h2>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Email</span>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </label>

        <label>
          <span>Password</span>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={isSubmitting} className="primary-button">
          {isSubmitting ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </section>
  );
}

export default LoginPage;
