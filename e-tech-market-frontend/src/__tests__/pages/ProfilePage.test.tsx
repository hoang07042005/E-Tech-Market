import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfilePage from '@/features/pages/client/profile/ProfilePage';
import * as authService from '@/features/services/auth.service';
import { apiFetch } from '@/configs/api.config';

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

  it('renders profile data when fetchMe succeeds', async () => {
    const mockUser = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123456789',
    };
    (globalThis.fetch as any).mockImplementation((url: string) => {
      const mockHeaders = { get: (key: string) => key.toLowerCase() === 'content-type' ? 'application/json' : null };
      if (url.includes('/api/me')) return Promise.resolve({ json: () => Promise.resolve(mockUser), ok: true, status: 200, headers: mockHeaders });
      if (url.includes('/orders')) return Promise.resolve({ json: () => Promise.resolve({ data: [] }), ok: true, status: 200, headers: mockHeaders });
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    window.localStorage.setItem('user', JSON.stringify(mockUser));

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
