import { redirect } from 'next/navigation';
import { GoogleAuthButton } from '../login/GoogleAuthButton';
import {
  getAuthenticatedUser,
  getDashboardGoogleClientId,
} from '../../lib/auth';

export default async function SignupPage() {
  const user = await getAuthenticatedUser();
  const googleClientId = getDashboardGoogleClientId();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="public-shell">
      <section className="login-card">
        <div className="login-grid">
          <p className="eyebrow">Create Workspace Access</p>
          <h1 className="headline">Create a Bugsense dashboard session with Google.</h1>
          <p className="muted">
            Google sign-up exchanges your verified Google identity for the same
            HTTP-only dashboard cookie used by the protected workspace.
          </p>
          {googleClientId ? (
            <GoogleAuthButton clientId={googleClientId} label="signup_with" />
          ) : (
            <p className="status-note">
              Google sign-up is not configured for this environment.
            </p>
          )}
          <div className="button-row">
            <a className="ghost-button" href="/login">
              Back to sign in
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
