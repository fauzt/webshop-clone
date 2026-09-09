import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      // Matches the server's deliberately vague message — we don't
      // reveal here either whether the email exists.
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm px-4">
      <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-orange-900 underline">
          Register
        </Link>
      </p>
    </div>
  );
}
