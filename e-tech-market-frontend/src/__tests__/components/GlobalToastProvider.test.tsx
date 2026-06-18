import { renderWithProviders as render } from '../../__tests__/utils/test-utils';
import { screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GlobalToastProvider, useGlobalToast } from '../../components/GlobalToastProvider';

const TestComponent = () => {
  const { showToast } = useGlobalToast();
  return (
    <div>
      <button onClick={() => showToast({ type: 'success', message: 'Success message' })}>
        Show Success
      </button>
      <button onClick={() => showToast({ type: 'error', message: 'Error message' })}>
        Show Error
      </button>
    </div>
  );
};

describe('GlobalToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders children correctly', () => {
    render(
      <GlobalToastProvider>
        <div>Child Content</div>
      </GlobalToastProvider>
    );
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('shows and hides toast when triggered manually', () => {
    render(
      <GlobalToastProvider>
        <TestComponent />
      </GlobalToastProvider>
    );

    act(() => {
      screen.getByText('Show Success').click();
    });

    expect(screen.getByText('Success message')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('catches global-error event and shows error toast', () => {
    render(
      <GlobalToastProvider>
        <TestComponent />
      </GlobalToastProvider>
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent('global-error', {
          detail: { message: 'Network disconnected' },
        })
      );
    });

    expect(screen.getByText('Network disconnected')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Network disconnected')).not.toBeInTheDocument();
  });

  it('catches global-error event and shows default message if none provided', () => {
    render(
      <GlobalToastProvider>
        <TestComponent />
      </GlobalToastProvider>
    );

    act(() => {
      window.dispatchEvent(new Event('global-error'));
    });

    expect(screen.getByText('Đã xảy ra lỗi không xác định.')).toBeInTheDocument();
  });
});
