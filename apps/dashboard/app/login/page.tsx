import { redirect } from 'next/navigation';
import { LoginForm } from './LoginForm';
import { GoogleAuthButton } from './GoogleAuthButton';
import { getAuthenticatedUser, getDashboardGoogleClientId } from '../../lib/auth';
import { Badge } from '../components/ui/Badge';
import { ThemeToggle } from '../components/theme/ThemeToggle';
import { BugSenseLogo } from '../components/ui/Logo';
import Link from 'next/link';

export default async function LoginPage() {
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
                Welcome back
              </h1>
            </div>
          </div>
          <Badge className="w-fit" variant="info">
            Dashboard Access
          </Badge>
          <p className="muted">
            Sign in to view your scoped projects, live errors, and grouped issues.
          </p>
          <LoginForm />
          {googleClientId ? (
            <>
              <div className="auth-divider">
                <span>or</span>
              </div>
              <GoogleAuthButton clientId={googleClientId} label="signin_with" />
              <div className="button-row">
                <Link className="ghost-button" href="/signup">
                  Create account
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
