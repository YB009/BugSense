import { redirect } from 'next/navigation';
import { GoogleAuthButton } from '../login/GoogleAuthButton';
import {
  getAuthenticatedUser,
  getDashboardGoogleClientId,
} from '../../lib/auth';
import { Badge } from '../components/ui/Badge';
import { ThemeToggle } from '../components/theme/ThemeToggle';
import { SignupForm } from './SignupForm';
import { BugSenseLogo } from '../components/ui/Logo';
import Link from 'next/link';

export default async function SignupPage() {
  const user = await getAuthenticatedUser();
  const googleClientId = getDashboardGoogleClientId();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="public-shell">
      <div className="public-theme-toggle">
        <ThemeToggle />
      </div>
      <section className="login-card">
        <div className="login-grid">
          <div className="mb-2 flex flex-col items-center gap-4 text-center">
            <BugSenseLogo className="text-foreground" size={56} />
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-muted-foreground">
                BugSense
              </p>
              <h1 className="text-balance text-4xl font-semibold leading-none tracking-tight text-foreground sm:text-5xl">
                Create an account
              </h1>
            </div>
          </div>
          <Badge className="w-fit" variant="success">
            Create Workspace Access
          </Badge>
          <p className="muted">
            Create a personal workspace, get your first project provisioned automatically, and start routing errors into your own scoped dashboard.
          </p>
          <SignupForm />
          {googleClientId ? (
            <div className="auth-divider">
              <span>or sign up with Google</span>
            </div>
          ) : null}
          {googleClientId ? (
            <GoogleAuthButton clientId={googleClientId} label="signup_with" />
          ) : (
            <p className="status-note">
              Google sign-up is not configured for this environment.
            </p>
          )}
          <div className="button-row">
            <Link className="ghost-button" href="/login">
              Back to sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
