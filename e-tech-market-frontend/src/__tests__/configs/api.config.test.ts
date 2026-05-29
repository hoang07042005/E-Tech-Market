import { apiFetch, ApiRequestError, notifyGlobalError } from '../../configs/api.config';
import * as authStore from '../../features/store/auth.store';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('api.config', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    localStorage.clear();
    
    // Mock the auth store functions
    vi.spyOn(authStore, 'ensureAuthExpiryMigrated').mockImplementation(() => {});
    vi.spyOn(authStore, 'isAuthSessionExpired').mockImplementation(() => false);
    vi.spyOn(authStore, 'performAuthSessionExpiry').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('apiFetch', () => {
    it('should attach token to header when provided', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      await apiFetch('/test', { token: 'test-token' });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should throw Error if auth session is expired', async () => {
      vi.spyOn(authStore, 'isAuthSessionExpired').mockImplementation(() => true);

      await expect(apiFetch('/test', { token: 'test-token' })).rejects.toThrow(
        'Phiên đăng nhập đã hết hạn (24 giờ). Vui lòng đăng nhập lại.'
      );
      expect(authStore.performAuthSessionExpiry).toHaveBeenCalled();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('should call performAuthSessionExpiry on 401 with token in localStorage', async () => {
      localStorage.setItem('token', 'exists');
      
      const mockResponse = new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(apiFetch('/test')).rejects.toThrow(ApiRequestError);
      expect(authStore.performAuthSessionExpiry).toHaveBeenCalled();
    });

    it('should throw ApiRequestError on non-2xx response', async () => {
      (globalThis.fetch as any).mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ message: 'Server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })));

      await expect(apiFetch('/test')).rejects.toThrow(ApiRequestError);
      await expect(apiFetch('/test')).rejects.toThrow('Server error');
    });

    it('should not crash on non-JSON response (parseJsonSafe)', async () => {
      const mockResponse = new Response('just plain text', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await apiFetch('/test');
      expect(result).toEqual({}); // Returns empty object when not json
    });
  });

  describe('notifyGlobalError', () => {
    it('should dispatch global-error event with correct message', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      
      notifyGlobalError('Test error message');
      
      expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('global-error');
      expect(event.detail).toEqual({ message: 'Test error message' });
    });
  });
});
