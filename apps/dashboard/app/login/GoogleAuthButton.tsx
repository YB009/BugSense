'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function GoogleAuthButton({
  clientId,
  label,
}: {
  clientId: string;
  label: 'signin_with' | 'signup_with';
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clientId || !buttonRef.current) {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity="true"]',
    );

    const initialize = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) {
        return;
      }

      buttonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setError('');

          const response = await fetch('/auth/google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ credential }),
          });

          if (!response.ok) {
            setError('Google sign-in failed.');
            return;
          }

          router.push('/dashboard');
          router.refresh();
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: label,
        width: 320,
      });
    };

    if (existingScript) {
      existingScript.addEventListener('load', initialize, { once: true });
      initialize();
      return () => {
        existingScript.removeEventListener('load', initialize);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.addEventListener('load', initialize, { once: true });
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', initialize);
    };
  }, [label, router]);

  if (!clientId) {
    return null;
  }

  return (
    <div className="social-auth">
      <div className="google-button-shell" ref={buttonRef} />
      <div className="status-note">{error}</div>
    </div>
  );
}
