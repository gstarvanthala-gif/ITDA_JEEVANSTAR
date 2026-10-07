import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingState from '../../components/LoadingState';
import ToastMessage from '../../components/ToastMessage';
import { goalsApi } from '../../services/api';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const emptyForm = {
  name: '',
  targetAmount: '',
  currentAmount: 0,
  targetDate: '',
  status: 'active',
};

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(date)
  );

function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [busyGoalId, setBusyGoalId] = useState('');
  const [confirmGoal, setConfirmGoal] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: emptyForm });

  useEffect(() => {
    let isMounted = true;

    goalsApi.getAll()
      .then((response) => {
        if (!isMounted) return;
        const loadedGoals = response.data.goals;
        setGoals(loadedGoals);
        if (loadedGoals.length === 0) setFormOpen(true);
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setError(requestError.response?.data?.message || 'Could not load your goals.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshGoals = async () => {
    const response = await goalsApi.getAll();
    setGoals(response.data.goals);
  };

  const onSubmit = async (formData) => {
    setError('');
    setNotice('');

    const payload = {
      ...formData,
      targetAmount: String(formData.targetAmount),
      currentAmount: String(formData.currentAmount),
    };

    try {
      if (editingGoalId) {
        await goalsApi.update(editingGoalId, payload);
        setNotice('Goal updated.');
      } else {
        await goalsApi.create(payload);
        setNotice('Goal created.');
      }

      await refreshGoals();
      reset(emptyForm);
      setEditingGoalId(null);
      setFormOpen(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save this goal.');
    }
  };

  const startEditing = (goal) => {
    setEditingGoalId(goal.id);
    reset({
      name: goal.name,
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount),
      targetDate: new Date(goal.targetDate).toISOString().slice(0, 10),
      status: goal.status,
    });
    setError('');
    setNotice('');
    setFormOpen(true);
  };

  const cancelEditing = () => {
    reset(emptyForm);
    setEditingGoalId(null);
    setFormOpen(false);
    setError('');
  };

  const archiveGoal = async (goal) => {
    const nextStatus = goal.status === 'archived' ? 'active' : 'archived';
    setBusyGoalId(goal.id);
    setError('');
    setNotice('');

    try {
      await goalsApi.update(goal.id, { status: nextStatus });
      await refreshGoals();
      setNotice(nextStatus === 'archived' ? 'Goal archived.' : 'Goal restored.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update goal status.');
    } finally {
      setBusyGoalId('');
    }
  };

  const deleteGoal = async () => {
    if (!confirmGoal) return;
    const goal = confirmGoal;

    setBusyGoalId(goal.id);
    setError('');
    setNotice('');

    try {
      await goalsApi.remove(goal.id);
      await refreshGoals();
      setNotice('Goal deleted.');
      setConfirmGoal(null);
      if (editingGoalId === goal.id) cancelEditing();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not delete this goal.');
    } finally {
      setBusyGoalId('');
    }
  };

  if (loading) {
    return <LoadingState label="Loading savings goals" />;
  }

  return (
    <section className="dashboard-page goals-page">
      <header className="goals-heading">
        <div>
          <p className="eyebrow">Virtual savings</p>
          <h2>Goals</h2>
        </div>
        <button
          className="primary-button goals-new-button"
          type="button"
          onClick={() => {
            if (formOpen && editingGoalId) cancelEditing();
            else {
              reset(emptyForm);
              setEditingGoalId(null);
              setFormOpen((open) => !open);
            }
          }}
        >
          {formOpen && !editingGoalId ? 'Close form' : 'New goal'}
        </button>
      </header>

      <p className="goals-disclaimer">Goal balances are simulated and are not real savings balances.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <ToastMessage message={notice} onDismiss={() => setNotice('')} />

      {formOpen && (
        <section className="goal-form-section" aria-labelledby="goal-form-title">
          <div className="goal-form-heading">
            <h3 id="goal-form-title">{editingGoalId ? 'Edit goal' : 'Create goal'}</h3>
            {editingGoalId && <button className="text-button" type="button" onClick={cancelEditing}>Cancel</button>}
          </div>
          <form className="goal-form" onSubmit={handleSubmit(onSubmit)}>
            <label>
              <span>Name</span>
              <input
                type="text"
                maxLength={80}
                {...register('name', { required: 'Enter a goal name.', maxLength: 80 })}
              />
              {errors.name && <small className="goal-field-error">{errors.name.message}</small>}
            </label>
            <label>
              <span>Target amount (₹)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                {...register('targetAmount', {
                  required: 'Enter a target amount.',
                  valueAsNumber: true,
                  min: { value: 0.01, message: 'Target must be greater than zero.' },
                  validate: (value) => value >= Number(getValues('currentAmount')) || 'Target cannot be below current amount.',
                })}
              />
              {errors.targetAmount && <small className="goal-field-error">{errors.targetAmount.message}</small>}
            </label>
            <label>
              <span>Current amount (₹)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                {...register('currentAmount', {
                  required: 'Enter the current amount.',
                  valueAsNumber: true,
                  min: { value: 0, message: 'Current amount cannot be negative.' },
                  validate: (value) => value <= Number(getValues('targetAmount')) || 'Current amount cannot exceed target.',
                })}
              />
              {errors.currentAmount && <small className="goal-field-error">{errors.currentAmount.message}</small>}
            </label>
            <label>
              <span>Target date</span>
              <input type="date" {...register('targetDate', { required: 'Choose a target date.' })} />
              {errors.targetDate && <small className="goal-field-error">{errors.targetDate.message}</small>}
            </label>
            <label>
              <span>Status</span>
              <select {...register('status', { required: true })}>
                <option value="active">Active</option>
                <option value="completed" disabled>Completed (reached target)</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <button className="primary-button goal-save-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingGoalId ? 'Save changes' : 'Create goal'}
            </button>
          </form>
        </section>
      )}

      {goals.length === 0 ? (
        <p className="empty-state">Your goals will appear here after you create one.</p>
      ) : (
        <div className="goals-grid">
          {goals.map((goal) => (
            <article className="goal-card" key={goal.id}>
              <div className="goal-card-heading">
                <div>
                  <p className="eyebrow">Target date · {formatDate(goal.targetDate)}</p>
                  <h3>{goal.name}</h3>
                </div>
                <span className={`goal-status ${goal.status}`}>{goal.status}</span>
              </div>

              <div className="goal-amounts">
                <strong>{currency.format(Number(goal.currentAmount))}</strong>
                <span>of {currency.format(Number(goal.targetAmount))}</span>
              </div>

              <div
                className="goal-progress-track"
                role="progressbar"
                aria-label={`${goal.name} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={goal.progress}
              >
                <span style={{ width: `${goal.progress}%` }} />
              </div>
              <div className="goal-progress-label"><span>Progress</span><strong>{goal.progress}%</strong></div>

              <div className="goal-card-actions">
                <button className="text-button" type="button" onClick={() => startEditing(goal)} disabled={Boolean(busyGoalId)}>
                  Edit
                </button>
                <button className="text-button" type="button" onClick={() => archiveGoal(goal)} disabled={busyGoalId === goal.id}>
                  {busyGoalId === goal.id ? 'Updating...' : goal.status === 'archived' ? 'Restore' : 'Archive'}
                </button>
                <button className="text-button destructive" type="button" onClick={() => setConfirmGoal(goal)} disabled={busyGoalId === goal.id}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(confirmGoal)}
        title="Delete this goal?"
        message={confirmGoal ? `“${confirmGoal.name}” will be permanently removed. This action cannot be undone.` : ''}
        confirmLabel="Delete goal"
        busy={Boolean(busyGoalId)}
        onConfirm={deleteGoal}
        onCancel={() => setConfirmGoal(null)}
      />
    </section>
  );
}

export default GoalsPage;