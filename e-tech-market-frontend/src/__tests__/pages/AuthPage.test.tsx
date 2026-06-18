import { renderWithProviders as render } from '../utils/test-utils';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthPage from '../../features/pages/client/auth/AuthPage';
import * as authService from '../../features/services/auth.service';

vi.mock('../../features/services/auth.service', () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock('../../features/pages/client/auth/GoogleLoginButton', () => ({
  GoogleLoginButton: () => <button>Google Login Mock</button>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  };
});

describe('AuthPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Login Mode', () => {
    it('disables submit button when fields are empty', () => {
      render(
        <MemoryRouter>
          <AuthPage initialMode="login" />
        </MemoryRouter>
      );

      const submitButton = screen.getByText('ĐĂNG NHẬP');
      expect(submitButton).toBeDisabled();
    });

    it('submits successfully, sets token, and redirects', async () => {
      const mockUser = { name: 'Test', email: 'test@example.com' };
      (authService.login as any).mockResolvedValue({ user: mockUser, token: 'fake-token' });

      render(
        <MemoryRouter>
          <AuthPage initialMode="login" />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('Địa chỉ email của bạn'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });

      const submitButton = screen.getByText('ĐĂNG NHẬP');
      expect(submitButton).not.toBeDisabled();
      
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
        expect(localStorage.getItem('user')).toBe('{"name":"Test","email":"test@example.com"}');
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('shows error message on failure', async () => {
      (authService.login as any).mockRejectedValue(new Error('Sai thông tin'));

      render(
        <MemoryRouter>
          <AuthPage initialMode="login" />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('Địa chỉ email của bạn'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong-pass' } });

      fireEvent.click(screen.getByText('ĐĂNG NHẬP'));

      await waitFor(() => {
        expect(screen.getByText('Sai thông tin')).toBeInTheDocument();
      });
    });
  });

  describe('Register Mode', () => {
    it('disables submit button if passwords do not match', () => {
      render(
        <MemoryRouter>
          <AuthPage initialMode="register" />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('Nguyễn Văn A'), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByPlaceholderText('ban@vidu.com'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('0901234567'), { target: { value: '0123456789' } });
      
      const passwords = screen.getAllByPlaceholderText('••••••••');
      fireEvent.change(passwords[0], { target: { value: 'pass123' } });
      fireEvent.change(passwords[1], { target: { value: 'pass456' } });

      expect(screen.getByText('TẠO TÀI KHOẢN')).toBeDisabled();
    });

    it('disables submit button if not agreed to terms', () => {
      render(
        <MemoryRouter>
          <AuthPage initialMode="register" />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('Nguyễn Văn A'), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByPlaceholderText('ban@vidu.com'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('0901234567'), { target: { value: '0123456789' } });
      
      const passwords = screen.getAllByPlaceholderText('••••••••');
      fireEvent.change(passwords[0], { target: { value: 'pass123' } });
      fireEvent.change(passwords[1], { target: { value: 'pass123' } });

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox); // uncheck

      expect(screen.getByText('TẠO TÀI KHOẢN')).toBeDisabled();
    });
  });
});
