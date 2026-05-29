import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CheckoutPage from '../../features/pages/client/checkout/CheckoutPage';
import { apiFetch } from '../../configs/api.config';
import * as cartService from '../../features/services/cart.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../configs/api.config', () => ({
  apiFetch: vi.fn(),
}));

describe('CheckoutPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Mock default cart with 1 item
    vi.spyOn(cartService, 'getCart').mockReturnValue({
      items: [
        {
          key: 'item1',
          product_id: 1,
          variant_id: null,
          name: 'Test Product',
          slug: 'test-product',
          image_url: 'test.jpg',
          price: 100000,
          quantity: 2,
          variant_label: null,
        }
      ]
    });
    vi.spyOn(cartService, 'cartCount').mockReturnValue(2);
    vi.spyOn(cartService, 'cartTotal').mockReturnValue(200000);
    vi.spyOn(cartService, 'clearCart').mockImplementation(() => {});

    // Mock initial API calls for payments, shipping, coupons
    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/store/payments')) {
        return Promise.resolve({
          cod: { enabled: true },
          vnpay: { enabled: true },
          momo: { enabled: true }
        });
      }
      if (url.includes('/api/store/shipping')) {
        return Promise.resolve({
          policy: { free_shipping_min: 0, apply_global: false },
          methods: [{ id: 1, name: 'Standard', base_fee: 15000, is_active: true }],
          zones: [{ id: 1, name: 'Zone 1', fee: 5000, is_active: true }]
        });
      }
      if (url.includes('/api/coupons')) {
        return Promise.resolve([]);
      }
      return Promise.resolve({});
    });
  });

  const renderCheckout = () => {
    return render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/products" element={<div>Products Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('COD checkout flow: submits valid order, clears cart, and shows order code', async () => {
    // User is logged in
    localStorage.setItem('token', 'fake-token');

    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/store/payments')) return Promise.resolve({ cod: { enabled: true }, vnpay: { enabled: true }, momo: { enabled: true } });
      if (url.includes('/api/store/shipping')) return Promise.resolve({ policy: { free_shipping_min: 0, apply_global: false }, methods: [], zones: [] });
      if (url.includes('/api/coupons')) return Promise.resolve([]);
      if (url.includes('/orders/from-items')) {
        return Promise.resolve({ id: 123, order_code: 'OD-TEST-COD' });
      }
      return Promise.resolve({});
    });

    renderCheckout();

    // Fill form
    fireEvent.change(await screen.findByPlaceholderText('Nguyễn Văn A'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText('0901234567'), { target: { value: '0987654321' } });
    fireEvent.change(screen.getByPlaceholderText('Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành…'), { target: { value: '123 Test St' } });

    // Select COD
    const codButton = screen.getByRole('button', { name: /Thanh toán khi nhận/i });
    fireEvent.click(codButton);

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Xác nhận đặt hàng/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/orders/from-items',
        expect.objectContaining({
          method: 'POST',
          token: 'fake-token',
          body: expect.stringContaining('"payment_method":"cod"')
        })
      );
    });

    expect(cartService.clearCart).toHaveBeenCalled();
    expect(await screen.findByText('Đặt hàng thành công')).toBeInTheDocument();
    expect(screen.getByText('OD-TEST-COD')).toBeInTheDocument();
  });

  it('shows validation error if required fields are missing', async () => {
    renderCheckout();
    
    // Wait for initial render to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Xác nhận đặt hàng/i })).toBeInTheDocument();
    });

    // Clear name field
    const nameInput = await screen.findByPlaceholderText('Nguyễn Văn A');
    fireEvent.change(nameInput, { target: { value: '' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Xác nhận đặt hàng/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Vui lòng nhập họ và tên.')).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalledWith('/orders/from-items', expect.anything());
  });

  it('MoMo / VNPAY redirect flow: API returns payment_url and redirects', async () => {
    localStorage.setItem('token', 'fake-token');

    // Mock location.href
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, href: '' } as any;

    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/store/payments')) return Promise.resolve({ cod: { enabled: true }, vnpay: { enabled: true }, momo: { enabled: true } });
      if (url.includes('/api/store/shipping')) return Promise.resolve({ policy: { free_shipping_min: 0, apply_global: false }, methods: [], zones: [] });
      if (url.includes('/api/coupons')) return Promise.resolve([]);
      if (url.includes('/orders/from-items')) {
        return Promise.resolve({ id: 999, order_code: 'OD-VNPAY-TEST' });
      }
      if (url.includes('/payments/vnpay/999/create')) {
        return Promise.resolve({ pay_url: 'https://sandbox.vnpayment.vn/test' });
      }
      return Promise.resolve({});
    });

    renderCheckout();

    // Fill form
    fireEvent.change(await screen.findByPlaceholderText('Nguyễn Văn A'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText('0901234567'), { target: { value: '0987654321' } });
    fireEvent.change(screen.getByPlaceholderText('Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành…'), { target: { value: '123 Test St' } });

    // Select VNPAY
    const vnpayButton = screen.getByRole('button', { name: /VNPAY/i });
    fireEvent.click(vnpayButton);

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Xác nhận đặt hàng/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(localStorage.getItem('pending_payment')).toContain('OD-VNPAY-TEST');
      expect(window.location.href).toBe('https://sandbox.vnpayment.vn/test');
    });

    // Restore location
    window.location = originalLocation as any;
  });

  it('Payment callback page handles return from gateway success', async () => {
    // Mock the URL search params for gateway return
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    window.location = { 
      ...originalLocation, 
      search: '?gateway=vnpay&success=1&order_code=OD-SUCCESS' 
    } as any;

    localStorage.setItem('pending_payment', '{"order_id":1,"order_code":"OD-SUCCESS"}');

    renderCheckout();

    await waitFor(() => {
      expect(localStorage.getItem('pending_payment')).toBeNull();
      expect(cartService.clearCart).toHaveBeenCalled();
      expect(screen.getByText('OD-SUCCESS')).toBeInTheDocument();
      expect(screen.getByText('Đặt hàng thành công')).toBeInTheDocument();
    });

    window.location = originalLocation as any;
  });

  it('Payment callback page handles return from gateway failure', async () => {
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    window.location = { 
      ...originalLocation, 
      search: '?gateway=vnpay&success=0&order_code=OD-FAIL' 
    } as any;

    renderCheckout();

    await waitFor(() => {
      expect(screen.getByText(/Thanh toán thất bại/i)).toBeInTheDocument();
      expect(cartService.clearCart).not.toHaveBeenCalled(); // cart should not be cleared on fail
    });

    window.location = originalLocation as any;
  });
});
