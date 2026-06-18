import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWishlist, toggleWishlist, type WishlistItem } from '../../features/services/wishlist.service';
import { apiFetch } from '../../configs/api.config';

vi.mock('../../configs/api.config', () => ({
  apiFetch: vi.fn(),
}));

describe('wishlist.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchWishlist', () => {
    it('should return a list of wishlist items', async () => {
      const mockData: WishlistItem[] = [
        { id: 1, user_id: 1, product_id: 101, product: null },
        { id: 2, user_id: 1, product_id: 102, product: null },
      ];
      (apiFetch as any).mockResolvedValue(mockData);

      const result = await fetchWishlist();

      expect(apiFetch).toHaveBeenCalledWith('/wishlist');
      expect(result).toEqual(mockData);
    });

    it('should throw an error if apiFetch fails', async () => {
      (apiFetch as any).mockRejectedValue(new Error('Unauthorized'));

      await expect(fetchWishlist()).rejects.toThrow('Unauthorized');
    });
  });

  describe('toggleWishlist', () => {
    it('should return "added" when product is added to wishlist', async () => {
      (apiFetch as any).mockResolvedValue({ status: 'added' });

      const result = await toggleWishlist(101);

      expect(apiFetch).toHaveBeenCalledWith('/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ product_id: 101 }),
      });
      expect(result).toBe('added');
    });

    it('should return "removed" when product is removed from wishlist', async () => {
      (apiFetch as any).mockResolvedValue({ status: 'removed' });

      const result = await toggleWishlist(101);

      expect(apiFetch).toHaveBeenCalledWith('/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ product_id: 101 }),
      });
      expect(result).toBe('removed');
    });
  });
});
