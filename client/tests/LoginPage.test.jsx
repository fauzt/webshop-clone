import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { LoginPage } from '../src/pages/LoginPage.jsx';
import { fakeUsers } from './mocks/handlers.js';

// Renders LoginPage inside a real router with a fake "/" destination, so
// tests can assert on navigation the same way a user would experience it —
// by seeing the home page's content appear — rather than mocking useNavigate.
function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>home page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  it('navigates to / after a successful login', async () => {
    const user = userEvent.setup();
    // Seed a user directly in the mock backend, since this test is about
    // the login form specifically, not registration.
    fakeUsers.set('reader@example.com', {
      id: '1',
      email: 'reader@example.com',
      role: 'USER',
      password: 'password123',
    });

    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'reader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
  });

  it('shows the server error and stays on the page for a wrong password', async () => {
    const user = userEvent.setup();
    fakeUsers.set('reader@example.com', {
      id: '1',
      email: 'reader@example.com',
      role: 'USER',
      password: 'password123',
    });

    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'reader@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    // Still on the login form — navigation must not have happened.
    expect(screen.queryByText('home page')).not.toBeInTheDocument();
  });

  it('disables the submit button while the request is in flight', async () => {
    const user = userEvent.setup();
    fakeUsers.set('reader@example.com', {
      id: '1',
      email: 'reader@example.com',
      role: 'USER',
      password: 'password123',
    });

    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'reader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');

    const button = screen.getByRole('button', { name: 'Log in' });
    await user.click(button);

    // Immediately after clicking, the button should reflect the pending
    // state (text changes to "Logging in…" and becomes disabled) before
    // navigation resolves.
    expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled();
  });
});
