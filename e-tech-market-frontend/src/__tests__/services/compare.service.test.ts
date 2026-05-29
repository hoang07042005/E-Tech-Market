import {
  getCompareList,
  addToCompare,
  removeFromCompare,
  clearCompare,
  type CompareProduct
} from '../../features/services/compare.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const STORAGE_KEY = 'etech_compare_list';

describe('compare.service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockProduct1: CompareProduct = {
    id: 1,
    name: 'Product 1',
    slug: 'product-1',
    image_url: 'img1.png',
    price: 1000,
  };

  const mockProduct2: CompareProduct = {
    id: 2,
    name: 'Product 2',
    slug: 'product-2',
    image_url: 'img2.png',
    price: 2000,
  };

  const mockProduct3: CompareProduct = {
    id: 3,
    name: 'Product 3',
    slug: 'product-3',
    image_url: 'img3.png',
    price: 3000,
  };

  const mockProduct4: CompareProduct = {
    id: 4,
    name: 'Product 4',
    slug: 'product-4',
    image_url: 'img4.png',
    price: 4000,
  };

  describe('getCompareList', () => {
    it('should return empty array when no data in localStorage', () => {
      expect(getCompareList()).toEqual([]);
    });

    it('should return parsed list when data is valid JSON', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([mockProduct1]));
      expect(getCompareList()).toEqual([mockProduct1]);
    });

    it('should return empty array when localStorage data is invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-json-{');
      expect(getCompareList()).toEqual([]);
    });
  });

  describe('addToCompare', () => {
    it('should add product successfully if under limit and not duplicated', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
      const result = addToCompare(mockProduct1);

      expect(result).toEqual({ success: true });
      expect(getCompareList()).toEqual([mockProduct1]);
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      expect(dispatchEventSpy.mock.calls[0][0].type).toBe('compare-change');
    });

    it('should refuse to add duplicated product by id', () => {
      addToCompare(mockProduct1);
      const result = addToCompare(mockProduct1);

      expect(result).toEqual({ success: false, message: 'Sản phẩm đã có trong danh sách so sánh.' });
      expect(getCompareList()).toEqual([mockProduct1]);
    });

    it('should limit to maximum 3 products', () => {
      addToCompare(mockProduct1);
      addToCompare(mockProduct2);
      addToCompare(mockProduct3);

      const result = addToCompare(mockProduct4);

      expect(result).toEqual({ success: false, message: 'Bạn chỉ có thể so sánh tối đa 3 sản phẩm.' });
      expect(getCompareList()).toHaveLength(3);
    });
  });

  describe('removeFromCompare', () => {
    it('should remove product by id', () => {
      addToCompare(mockProduct1);
      addToCompare(mockProduct2);

      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
      removeFromCompare(mockProduct1.id);

      expect(getCompareList()).toEqual([mockProduct2]);
      expect(dispatchEventSpy).toHaveBeenCalled();
    });

    it('should do nothing if product id is not in the list', () => {
      addToCompare(mockProduct1);

      removeFromCompare(999);

      expect(getCompareList()).toEqual([mockProduct1]);
    });
  });

  describe('clearCompare', () => {
    it('should clear the entire compare list', () => {
      addToCompare(mockProduct1);
      addToCompare(mockProduct2);

      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
      clearCompare();

      expect(getCompareList()).toEqual([]);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(dispatchEventSpy).toHaveBeenCalled();
    });
  });
});
