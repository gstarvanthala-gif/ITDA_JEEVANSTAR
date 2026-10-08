import { ArrowUpRight, Coins, ShieldCheck, Sprout, Target, TrendingUp } from 'lucide-react';

const BENEFITS = [
  { icon: Coins, label: 'Simulated investing' },
  { icon: TrendingUp, label: 'Portfolio tracking' },
  { icon: Target, label: 'Goal planning' },
  { icon: ShieldCheck, label: 'Risk-based learning' },
];

function AuthStory({ variant = 'login' }) {
  const isRegister = variant === 'register';

  return (
    <aside className={`auth-story ${isRegister ? 'register-story' : 'login-story'}`}>
      <div className="auth-story-brand">
        <span className="auth-story-mark" aria-hidden="true"><Sprout size={22} strokeWidth={2.1} /></span>
        <span><strong>MicroGrow</strong><small>Investment simulator</small></span>
      </div>

      <div className="auth-story-copy">
        <p className="eyebrow">A clearer way to learn</p>
        <h2>{isRegister ? 'Start your investment journey.' : 'Smart investing for a brighter tomorrow.'}</h2>
        <p>
          {isRegister
            ? 'Create your account and take the first step towards a brighter financial future.'
            : 'Build wealth, achieve your goals, and grow with confidence in a safe virtual environment.'}
        </p>
      </div>

      <ul className="auth-benefits" aria-label="MicroGrow learning features">
        {BENEFITS.map(({ icon: Icon, label }) => (
          <li key={label}><Icon size={17} aria-hidden="true" /><span>{label}</span></li>
        ))}
      </ul>

      <div className={`auth-growth-visual ${isRegister ? 'growth-register' : 'growth-login'}`} aria-hidden="true">
        <div className="auth-growth-header"><span>Virtual portfolio</span><span>Demo values</span></div>
        <div className="auth-growth-chart">
          {[22, 31, 27, 43, 38, 55, 49, 68, 62, 82].map((height, index) => (
            <span key={index} style={{ height: `${height}%`, animationDelay: `${index * 32}ms` }} />
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 82 C12 75 12 80 22 66 S33 72 42 58 S53 61 61 46 S72 55 80 33 S91 40 100 16" />
          </svg>
          <ArrowUpRight className="auth-growth-arrow" size={19} />
        </div>
        <div className="auth-growth-footer"><span><i />Steady progress</span><strong>Learning mode</strong></div>
      </div>

      <p className="auth-demo-note">Fictional simulation only. No real trades, returns, or investment advice.</p>
    </aside>
  );
}

export default AuthStory;