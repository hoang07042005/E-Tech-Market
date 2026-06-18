import { renderWithProviders as render } from '../../__tests__/utils/test-utils';
import { screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../../components/ErrorBoundary';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Safe Component</div>;
};

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    // Suppress console.error in tests to avoid noisy output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Child Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Test Child Content')).toBeInTheDocument();
  });

  it('should render error fallback UI when a child throws an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Check for error UI elements
    expect(screen.getByText('Đã xảy ra sự cố')).toBeInTheDocument();
    expect(screen.getByText('Ứng dụng vừa gặp lỗi không mong muốn trong khi kết xuất. Chúng tôi xin lỗi vì sự bất tiện này.')).toBeInTheDocument();
    expect(screen.getByText('Error: Test error')).toBeInTheDocument();
  });

  it('should render action buttons when an error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Về trang chủ')).toBeInTheDocument();
    expect(screen.getByText('Tải lại trang')).toBeInTheDocument();
  });

  it('should catch error in componentDidCatch', () => {
    const errorSpy = vi.spyOn(console, 'error');
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(errorSpy).toHaveBeenCalled();
    const hasUncaughtErrorLog = errorSpy.mock.calls.some((callArgs: any[]) => callArgs[0] === 'Uncaught error:');
    expect(hasUncaughtErrorLog).toBe(true);
  });

  it('should navigate to home on "Về trang chủ" click', () => {
    // Mock window.location
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' } as any;

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const homeButton = screen.getByText('Về trang chủ');
    fireEvent.click(homeButton);

    expect(window.location.href).toBe('/');

    // Restore window.location
    window.location = originalLocation as any;
  });

  it('should reload on "Tải lại trang" click', () => {
    // Mock window.location.reload
    const originalLocation = window.location;
    const reloadMock = vi.fn();
    delete (window as any).location;
    window.location = { ...originalLocation, reload: reloadMock } as any;

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByText('Tải lại trang');
    fireEvent.click(reloadButton);

    expect(reloadMock).toHaveBeenCalledTimes(1);

    // Restore window.location
    window.location = originalLocation as any;
  });
});
