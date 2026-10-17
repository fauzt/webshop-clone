import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import { GoogleSignInButton } from '../src/components/GoogleSignInButton';

describe('GoogleSignInButton', () => {
  afterEach(() => {
    delete window.google;
  });

  it('calls initialize and renderButton once window.google is available', async () => {
    window.google = {
      accounts: {
        id: {
          initialize: vi.fn(),
          renderButton: vi.fn(),
        },
      },
    };

    render(<GoogleSignInButton onCredential={() => {}} />);

    expect(await screen.findByTestId('google-signin-button')).toBeInTheDocument();
    expect(window.google.accounts.id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ callback: expect.any(Function) })
    );
    expect(window.google.accounts.id.renderButton).toHaveBeenCalled();
  });

  it('renders nothing if window.google never becomes available', async () => {
    vi.useFakeTimers();
    try {
      render(<GoogleSignInButton onCredential={() => {}} />);

      // The component's poll loop updates state from inside chained
      // setTimeout callbacks; act() ensures each of those updates is
      // flushed to the DOM before the assertion below runs.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      expect(screen.queryByTestId('google-signin-button')).not.toBeInTheDocument();
    } finally {
      // In a try/finally so a failed assertion above can't leak fake
      // timers into whichever test runs next.
      vi.useRealTimers();
    }
  });

  it('calls onCredential with the raw credential string when GIS invokes its callback', async () => {
    let capturedCallback;
    window.google = {
      accounts: {
        id: {
          initialize: vi.fn(({ callback }) => {
            capturedCallback = callback;
          }),
          renderButton: vi.fn(),
        },
      },
    };
    const onCredential = vi.fn();

    render(<GoogleSignInButton onCredential={onCredential} />);
    await screen.findByTestId('google-signin-button');

    capturedCallback({ credential: 'abc' });

    expect(onCredential).toHaveBeenCalledWith('abc');
  });
});
