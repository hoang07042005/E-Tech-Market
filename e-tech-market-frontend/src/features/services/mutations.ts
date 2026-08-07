import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchWishlist,
  toggleWishlist,
  type WishlistItem,
} from "./wishlist.service";
import {
  addToCart as cartServiceAddToCart,
  updateCartQuantity as cartServiceUpdateCartQuantity,
  removeFromCart as cartServiceRemoveFromCart,
  clearCart as cartServiceClearCart,
} from "./cart.service";
import type { CartItem } from "./cart.service";
import { apiFetch } from "@/configs/api.config";
import { useGlobalToast } from "@/components/GlobalToastProvider";

export function useWishlistQuery(enabled: boolean, type: string = "product") {
  return useQuery({
    queryKey: ["wishlist", type, true],
    queryFn: () => fetchWishlist(type),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useWishlistMutation(type: string = "product") {
  const queryClient = useQueryClient();
  const { showToast } = useGlobalToast();

  return useMutation({
    mutationFn: async (id: number) => {
      return toggleWishlist(id, type);
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["wishlist", type] });

      // Snapshot the previous value
      const previousWishlist =
        queryClient.getQueryData<WishlistItem[]>(["wishlist", type, true]) ||
        [];

      const getColumnName = () => {
        if (type === "blog") return "blog_post_id";
        if (type === "video") return "video_id";
        if (type === "news") return "product_news_id";
        return "product_id";
      };
      const column = getColumnName();

      // Optimistically update to the new value
      const isLiked = previousWishlist.some((w) => (w as any)[column] === id);
      if (isLiked) {
        queryClient.setQueryData<WishlistItem[]>(
          ["wishlist", type, true],
          (old) => (old ? old.filter((w) => (w as any)[column] !== id) : []),
        );
        showToast({ type: "success", message: "Đã bỏ yêu thích" });
      } else {
        const relation =
          type === "blog"
            ? "blog_post"
            : type === "video"
              ? "video"
              : type === "news"
                ? "product_news"
                : "product";
        queryClient.setQueryData<WishlistItem[]>(
          ["wishlist", type, true],
          (old) => [
            ...(old || []),
            {
              [column]: id,
              [relation]: { id, title: "Đang tải...", name: "Đang tải..." }, // mock object so it isn't filtered out
              user_id: 0,
              id: Date.now(),
            } as unknown as WishlistItem,
          ],
        );
        showToast({ type: "success", message: "Đã thêm vào yêu thích" });
      }

      return { previousWishlist };
    },
    onError: (_err, _variables, context) => {
      // Rollback to the previous value if mutation fails
      if (context?.previousWishlist) {
        queryClient.setQueryData(
          ["wishlist", type, true],
          context.previousWishlist,
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync
      queryClient.invalidateQueries({ queryKey: ["wishlist", type] });
    },
  });
}

export function useCartMutation() {
  const { showToast } = useGlobalToast();

  const addMutation = useMutation({
    mutationFn: async ({
      item,
      qty,
    }: {
      item: Omit<CartItem, "key">;
      qty: number;
    }) => {
      // The cart.service.ts addToCart already updates localStorage optimistically and dispatches events.
      // But we will use the API call here and let the mutation handle the promise.
      const quantity = Math.max(1, Math.floor(qty || 1));
      return apiFetch("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: quantity,
          unit_price: item.price,
          from_flash_sale: item.from_flash_sale ?? false,
        }),
      });
    },
    onMutate: async ({ item, qty }) => {
      // Optimistic update using the existing service function
      cartServiceAddToCart(item, qty);
      showToast({ type: "success", message: "Đã thêm vào giỏ hàng" });
    },
    // We don't need a strict rollback here for cart because the UI relies on cart.service which handles localStorage.
    // If we wanted full rollback, we'd snapshot the cart state.
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      qty,
      productId,
      variantId,
    }: {
      key: string;
      qty: number;
      productId: number;
      variantId: number | null;
    }) => {
      const nextQty = Math.max(1, Math.floor(qty || 1));
      return apiFetch(`/api/cart/items/${productId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity: nextQty, variant_id: variantId }),
      });
    },
    onMutate: async ({ key, qty }) => {
      cartServiceUpdateCartQuantity(key, qty);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({
      productId,
      variantId,
    }: {
      key: string;
      productId: number;
      variantId: number | null;
    }) => {
      const qs = variantId ? `?variant_id=${variantId}` : "";
      return apiFetch(`/api/cart/items/${productId}${qs}`, {
        method: "DELETE",
      });
    },
    onMutate: async ({ key }) => {
      cartServiceRemoveFromCart(key);
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      // Clear both backend cart and localStorage
      await apiFetch("/api/cart", { method: "DELETE" });
      cartServiceClearCart();
    },
    onMutate: async () => {
      cartServiceClearCart();
    },
  });

  return {
    addToCart: addMutation.mutate,
    updateQuantity: updateMutation.mutate,
    removeFromCart: removeMutation.mutate,
    clearCart: clearMutation.mutate,
  };
}
