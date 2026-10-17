import { useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 100;
const POLL_TIMEOUT_MS = 3000;

// Google Identity Services loads asynchronously (see the script tag in
// index.html), so window.google may not exist yet when this mounts. This
// polls briefly for it rather than failing outright: if it never shows up
// (slow network, blocked script), this just renders nothing and the
// password form on LoginPage keeps working regardless.
export function GoogleSignInButton({ onCredential }) {
  const containerRef = useRef(null);
  // Kept in a ref (not a useEffect dependency) so a fresh onCredential
  // reference on every LoginPage render, e.g. from typing in the password
  // fields, doesn't re-run GIS initialization. Updated via its own effect,
  // not assigned directly during render, which React refs should never do.
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  });

  const [status, setStatus] = useState('waiting'); // 'waiting' | 'ready' | 'unavailable'

  useEffect(() => {
    let cancelled = false;
    let elapsed = 0;
    let timeoutId;

    function tryInit() {
      if (cancelled) return;

      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: (response) => onCredentialRef.current(response.credential),
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
        });
        setStatus('ready');
        return;
      }

      elapsed += POLL_INTERVAL_MS;
      if (elapsed >= POLL_TIMEOUT_MS) {
        setStatus('unavailable');
        return;
      }
      timeoutId = setTimeout(tryInit, POLL_INTERVAL_MS);
    }

    tryInit();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  if (status === 'unavailable') return null;
  return <div ref={containerRef} data-testid="google-signin-button" />;
}
