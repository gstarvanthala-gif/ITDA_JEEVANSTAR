import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import LoadingState from '../../components/LoadingState';
import ToastMessage from '../../components/ToastMessage';
import { riskApi } from '../../services/api';

const PROFILE_LABELS = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  aggressive: 'Aggressive',
};

function RiskAssessmentPage() {
  const [questions, setQuestions] = useState([]);
  const [riskProfile, setRiskProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    let isMounted = true;

    Promise.all([riskApi.getQuestions(), riskApi.getProfile()])
      .then(([questionsResponse, profileResponse]) => {
        if (!isMounted) return;
        setQuestions(questionsResponse.data.questions);
        setRiskProfile(profileResponse.data.riskProfile);
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setError(requestError.response?.data?.message || 'Could not load the risk assessment.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const onSubmit = async (answers) => {
    setError('');
    setNotice('');

    try {
      const response = await riskApi.submit(answers);
      setRiskProfile(response.data.riskProfile);
      setNotice('Your assessment has been saved. The profile was calculated by MicroGrow.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not submit your answers.');
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setError('');
    setNotice('');

    try {
      const response = await riskApi.recalculate();
      setRiskProfile(response.data.riskProfile);
      setNotice('Your profile was recalculated from your saved answers.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not recalculate your profile.');
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading risk assessment" />;
  }

  return (
    <section className="dashboard-page risk-page">
      <header className="risk-heading">
        <div>
          <p className="eyebrow">Investor profile</p>
          <h2>Risk assessment</h2>
        </div>
        <span className="demo-badge">SIMULATION</span>
      </header>

      <p className="risk-disclaimer">
        This educational assessment classifies simulated risk preferences; it is not financial advice.
      </p>

      {error && <p className="form-error" role="alert">{error}</p>}
      <ToastMessage message={notice} onDismiss={() => setNotice('')} />

      {riskProfile && (
        <section className="risk-result" aria-labelledby="risk-result-title">
          <div>
            <p className="eyebrow">Current simulated profile</p>
            <h3 id="risk-result-title" className={`risk-profile-name ${riskProfile.profile}`}>
              {PROFILE_LABELS[riskProfile.profile]}
            </h3>
            <p className="risk-result-caption">Server-calculated score: {riskProfile.score} / 100</p>
          </div>
          <button
            className="secondary-button risk-recalculate-button"
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating || isSubmitting}
          >
            {recalculating ? 'Recalculating...' : 'Recalculate saved answers'}
          </button>
        </section>
      )}

      <form className="risk-form" onSubmit={handleSubmit(onSubmit)}>
        {questions.map((question, index) => (
          <fieldset className="risk-question" key={question.id}>
            <legend>
              <span className="risk-question-number">{String(index + 1).padStart(2, '0')}</span>
              {question.prompt}
            </legend>
            <div className="risk-options">
              {question.options.map((option) => (
                <label className="risk-option" key={option.id}>
                  <input
                    type="radio"
                    value={option.id}
                    {...register(question.id, { required: 'Select one answer.' })}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {errors[question.id] && (
              <p className="risk-field-error" role="alert">{errors[question.id].message}</p>
            )}
          </fieldset>
        ))}

        <button
          className="primary-button risk-submit-button"
          type="submit"
          disabled={isSubmitting || recalculating || questions.length === 0}
        >
          {isSubmitting ? 'Calculating profile...' : 'Submit assessment'}
        </button>
      </form>
    </section>
  );
}

export default RiskAssessmentPage;