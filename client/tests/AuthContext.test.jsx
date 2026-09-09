import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../src/context/AuthContext.jsx';
import { sessionState } from './mocks/handlers.js';

// A minimal component that exposes auth state/actions as clickable buttons,
// so tests can exercise useAuth() without needing a full page component.
function AuthProbe() {
  const { user, isLoading, login, register, logout } = useAuth();

  if (isLoading) return <p>loading</p>;

  return (
    <div>
      <p>{user ? `logged in as ${user.email}` : 'logged out'}</p>
      <button onClick={() => login('reader@example.com', 'password123')}>login</button>
      <button onClick={() => register('reader@example.com', 'password123')}>register</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>
  );
}

describe('AuthProvider — session restore on load', () => {
  it('shows logged-out state when there is no valid refresh token', async () => {
    renderWithAuth();

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('logged out')).toBeInTheDocument());
  });

  it('restores the session automatically when a valid refresh token exists', async () => {
    // Simulates "the httpOnly cookie is still valid from a previous visit" —
    // this is exactly the scenario restoreSession() in AuthContext exists for.
    sessionState.hasValidRefreshToken = true;
    sessionState.currentUser = { id: '1', email: 'returning@example.com', role: 'USER' };

    renderWithAuth();

    await waitFor(() =>
      expect(screen.getByText('logged in as returning@example.com')).toBeInTheDocument()
    );
  });
});

describe('AuthProvider — register', () => {
  it('logs the user in immediately after a successful registration', async () => {
    const user = userEvent.setup();
    renderWithAuth();
    await waitFor(() => expect(screen.getByText('logged out')).toBeInTheDocument());

    await user.click(screen.getByText('register'));

    await waitFor(() =>
      expect(screen.getByText('logged in as reader@example.com')).toBeInTheDocument()
    );
  });
});

describe('AuthProvider — login', () => {
  it('logs in a previously registered user after logging out', async () => {
    const user = userEvent.setup();
    renderWithAuth();
    await waitFor(() => expect(screen.getByText('logged out')).toBeInTheDocument());

    // Register creates the account and logs in as a side effect — log out
    // again so we can test the login() path specifically, against a user
    // that now genuinely exists in the mock backend.
    await user.click(screen.getByText('register'));
    await waitFor(() =>
      expect(screen.getByText('logged in as reader@example.com')).toBeInTheDocument()
    );
    await user.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByText('logged out')).toBeInTheDocument());

    await user.click(screen.getByText('login'));
    await waitFor(() =>
      expect(screen.getByText('logged in as reader@example.com')).toBeInTheDocument()
    );
  });
});

describe('AuthProvider — logout', () => {
  it('clears the user and revokes the session on the server', async () => {
    const user = userEvent.setup();
    renderWithAuth();
    await waitFor(() => expect(screen.getByText('logged out')).toBeInTheDocument());

    await user.click(screen.getByText('register'));
    await waitFor(() =>
      expect(screen.getByText('logged in as reader@example.com')).toBeInTheDocument()
    );

    await user.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByText('logged out')).toBeInTheDocument());

    // The mock server's session state should now reflect no valid refresh
    // token — proving logout() actually told the server to revoke it,
    // not just cleared local React state.
    expect(sessionState.hasValidRefreshToken).toBe(false);
  });
});
