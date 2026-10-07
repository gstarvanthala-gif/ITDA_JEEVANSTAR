import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
    <section className="auth-panel">
      <div className="panel-header">
        <p className="eyebrow">New account</p>
        <h2>Create your MicroGrow profile</h2>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Full name</span>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
        </label>

        <label>
          <span>Email</span>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </label>

        <label>
          <span>Password</span>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={8} />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={isSubmitting} className="primary-button">
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>
      </form>
    </section>
  );
}

export default RegisterPage;
