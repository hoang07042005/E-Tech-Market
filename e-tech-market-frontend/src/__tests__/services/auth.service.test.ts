import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, register, me, logout } from '../../features/services/auth.service';
import { apiFetch } from '../../configs/api.config';

vi.mock('../../configs/api.config', () => ({
  apiFetch: vi.fn(),
}));

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should call apiFetch with correct endpoint and payload', async () => {
      const mockResponse = { user: { id: 1, name: 'Test' }, token: 'abc' };
      (apiFetch as any).mockResolvedValue(mockResponse);

      const payload = { email: 'test@example.com', password: 'password123' };
      const result = await login(payload);

      expect(apiFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('register', () => {
    it('should call apiFetch with correct endpoint and payload', async () => {
      const mockResponse = { user: { id: 2, name: 'New User' }, token: 'def' };
      (apiFetch as any).mockResolvedValue(mockResponse);

      const payload = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
        phone: '0123456789',
      };
      const result = await register(payload);

      expect(apiFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('me', () => {
    it('should call apiFetch to get current user', async () => {
      const mockUser = { id: 1, name: 'Current User' };
      (apiFetch as any).mockResolvedValue(mockUser);

      const result = await me();

      expect(apiFetch).toHaveBeenCalledWith('/api/me', { method: 'GET' });
      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('should call apiFetch with correct endpoint', async () => {
      (apiFetch as any).mockResolvedValue({});

      await logout();

      expect(apiFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
      });
    });
  });
});
