'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAction, type LoginActionState } from './actions';

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <form className="form-grid" action={formAction}>
      <div className="field">
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input
          className="field-input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="admin@bugsense.dev"
          required
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <input
          className="field-input"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="change-me"
          required
        />
      </div>
      <div className="button-row">
        <SubmitButton />
      </div>
      <div className="status-note">{state.error ?? ''}</div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="primary-button" type="submit" disabled={pending}>
      {pending ? 'Signing in...' : 'Sign in'}
    </button>
  );
}
