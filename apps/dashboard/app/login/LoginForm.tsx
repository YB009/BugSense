'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { loginAction, type LoginActionState } from './actions';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form className="form-grid" action={formAction}>
      <div className="field">
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <Input
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
        <Input
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
    <Button loading={pending} size="lg" type="submit">
      {pending ? 'Signing in...' : 'Sign in'}
    </Button>
  );
}
