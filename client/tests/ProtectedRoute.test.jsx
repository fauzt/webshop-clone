import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { ProtectedRoute } from '../src/components/ProtectedRoute.jsx';
import { sessionState } from './mocks/handlers.js';

function renderProtected({ requireRole } = {}) {
  return render(
    <MemoryRouter initialEntries={['/secret']}>
      <AuthProvider>
        <Routes>
          <Route
            path="/secret"
            element={
              <ProtectedRoute requireRole={requireRole}>
                <p>secret content</p>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/" element={<p>home page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows a loading state before the session-restore check resolves', () => {
    renderProtected();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('redirects to /login when there is no logged-in user', async () => {
    renderProtected();
    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
  });

  it('renders the protected content for a logged-in user', async () => {
    sessionState.hasValidRefreshToken = true;
    sessionState.currentUser = { id: '1', email: 'reader@example.com', role: 'USER' };

    renderProtected();

    await waitFor(() => expect(screen.getByText('secret content')).toBeInTheDocument());
  });

  it('redirects to / when the user is logged in but lacks the required role', async () => {
    sessionState.hasValidRefreshToken = true;
    sessionState.currentUser = { id: '1', email: 'reader@example.com', role: 'USER' };

    renderProtected({ requireRole: 'ADMIN' });

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
  });

  it('renders the protected content when the user has the required role', async () => {
    sessionState.hasValidRefreshToken = true;
    sessionState.currentUser = { id: '1', email: 'admin@example.com', role: 'ADMIN' };

    renderProtected({ requireRole: 'ADMIN' });

    await waitFor(() => expect(screen.getByText('secret content')).toBeInTheDocument());
  });
});
