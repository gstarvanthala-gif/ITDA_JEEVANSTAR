import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';

import AuthStory from '../../components/AuthStory';
import { useAuth } from '../../hooks/useAuth';
import { getDefaultRoute } from '../../utils/roleUtils';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <section className="auth-layout login-layout">
      <AuthStory />
      <section className="auth-panel auth-card" aria-labelledby="login-heading">
        <div className="auth-card-brand">
          <span className="brand-mark" aria-hidden="true"><LockKeyhole size={19} /></span>
          <span>Secure demo access</span>
        </div>
        <div className="panel-header">
          <p className="eyebrow">Welcome back</p>
          <h2 id="login-heading">Welcome back</h2>
          <p className="auth-subtitle">Sign in to continue your investment journey.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email address</span>
            <span className="auth-input-wrap">
              <Mail className="auth-field-icon" size={18} aria-hidden="true" />
              <input type="email" name="email" autoComplete="username" value={formData.email} onChange={handleChange} required />
            </span>
          </label>

          <label>
            <span>Password</span>
            <span className="password-input-wrap auth-input-wrap">
              <LockKeyhole className="auth-field-icon" size={18} aria-hidden="true" />
              <input type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" value={formData.password} onChange={handleChange} required />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </span>
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button type="submit" disabled={isSubmitting} className="primary-button auth-submit-button">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="auth-card-footer">New to MicroGrow? <Link to="/register">Create an account</Link></p>
        <p className="auth-card-disclaimer">Demo platform only. Your activity is simulated.</p>
      </section>
    </section>
  );
}

export default LoginPage;
