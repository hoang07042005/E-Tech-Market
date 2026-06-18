import { renderWithProviders as render } from '../utils/test-utils';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfilePage from '@/features/pages/client/profile/ProfilePage';
import * as authService from '@/features/services/auth.service';
import { apiFetch } from '@/configs/api.config';
import { useAuthStore } from '@/features/store/useAuthStore';

vi.mock('@/configs/api.config', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('@/features/services/auth.service', () => ({
  me: vi.fn(),
  logout: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  };
});

describe('ProfilePage Component', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Mock network error'));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('redirects to login if fetchMe fails', async () => {
    (authService.me as any).mockRejectedValue(new Error('Unauthorized'));
    (apiFetch as any).mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it.skip('renders profile data when fetchMe succeeds', async () => {
    const mockUser = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123456789',
    };
    (authService.me as any).mockResolvedValue(mockUser);
    
    vi.mocked(apiFetch).mockImplementation((url: string) => {
      if (url.includes('/orders')) return Promise.resolve({ data: [] });
      return Promise.resolve({});
    });

    window.localStorage.setItem('user', JSON.stringify(mockUser));
    useAuthStore.setState({ userStr: JSON.stringify(mockUser) });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
