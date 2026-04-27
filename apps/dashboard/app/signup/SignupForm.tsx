'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { signupAction, type SignupActionState } from './actions';

const initialState: SignupActionState = {};

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, initialState);

  return (
    <form className="form-grid" action={formAction}>
      <div className="field">
        <label className="field-label" htmlFor="signup-email">
          Email
        </label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="signup-password">
          Password
        </label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="signup-confirm-password">
          Confirm password
        </label>
        <Input
          id="signup-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
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
      {pending ? 'Creating workspace...' : 'Create workspace'}
    </Button>
  );
}
