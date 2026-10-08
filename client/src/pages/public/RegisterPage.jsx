import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';

import AuthStory from '../../components/AuthStory';
import { useAuth } from '../../hooks/useAuth';
import { getDefaultRoute } from '../../utils/roleUtils';

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
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
      const response = await register(formData);
      const nextPath = getDefaultRoute(response.data.user.role);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-layout register-layout">
      <AuthStory variant="register" />
      <section className="auth-panel auth-card" aria-labelledby="register-heading">
        <div className="auth-card-brand">
          <span className="brand-mark" aria-hidden="true"><UserRound size={19} /></span>
          <span>Start your demo profile</span>
        </div>
        <div className="panel-header">
          <p className="eyebrow">New account</p>
          <h2 id="register-heading">Create your account</h2>
          <p className="auth-subtitle">A few details to begin your virtual investing journey.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Full name</span>
            <span className="auth-input-wrap">
              <UserRound className="auth-field-icon" size={18} aria-hidden="true" />
              <input type="text" name="name" autoComplete="name" value={formData.name} onChange={handleChange} required />
            </span>
          </label>

          <label>
            <span>Email address</span>
            <span className="auth-input-wrap">
              <AtSign className="auth-field-icon" size={18} aria-hidden="true" />
              <input type="email" name="email" autoComplete="email" value={formData.email} onChange={handleChange} required />
            </span>
          </label>

          <label>
            <span>Password <small className="auth-field-hint">At least 8 characters</small></span>
            <span className="password-input-wrap auth-input-wrap">
              <LockKeyhole className="auth-field-icon" size={18} aria-hidden="true" />
              <input type={showPassword ? 'text' : 'password'} name="password" autoComplete="new-password" value={formData.password} onChange={handleChange} required minLength={8} />
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
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-card-footer">Already have an account? <Link to="/login">Sign in</Link></p>
        <p className="auth-card-disclaimer">Demo profile only. Do not enter sensitive identity or financial details.</p>
      </section>
    </section>
  );
}

export default RegisterPage;
