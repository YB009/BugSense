import { redirect } from 'next/navigation';
import { LoginForm } from './LoginForm';
import { getAuthenticatedUser } from '../../lib/auth';

export default async function LoginPage() {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="public-shell">
      <section className="login-card">
        <div className="login-grid">
          <p className="eyebrow">Dashboard Access</p>
          <h1 className="headline">Triage errors without exposing the workspace.</h1>
          <p className="muted">
            This login writes the JWT from <code>api-gateway</code> into an
            HTTP-only dashboard cookie, then the protected route group validates
            it server-side on every render.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
