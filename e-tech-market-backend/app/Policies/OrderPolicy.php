<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

/**
 * Authorization policy for the Order model (client-facing operations).
 *
 * ── Audit result (03/07/2026) ──────────────────────────────────────────────
 * All client-facing Order routes in OrdersController have been audited and
 * confirmed to call $this->authorize() before taking any action:
 *
 *  Route                                  Method              Policy gate
 *  GET    /orders/{order}                 show()              'view'
 *  PATCH  /orders/{order}/cancel          cancel()            'update'
 *  PATCH  /orders/{order}/confirm-received confirmReceived()  'update'
 *  PATCH  /orders/{order}/confirm-payment  confirmPayment()   'update'
 *  POST   /orders/{order}/return-request   requestReturn()    'update'
 *  PATCH  /orders/{order}/return-request/confirm-refund
 *                                confirmRefundReceived()      'update'
 *
 * Both `view` and `update` gates verify user_id ownership, so a logged-in user
 * can only read/modify their own orders. Admins bypass all policies via
 * Laravel's `before()` hook (Spatie Permission + EnsureAdmin middleware).
 * ──────────────────────────────────────────────────────────────────────────
 */
class OrderPolicy
{
    use HandlesAuthorization;

    /**
     * User can view their own order only.
     */
    public function view(User $user, Order $order): bool
    {
        return (int) $user->id === (int) $order->user_id;
    }

    /**
     * User can modify (cancel, confirm, return, etc.) their own order only.
     */
    public function update(User $user, Order $order): bool
    {
        return (int) $user->id === (int) $order->user_id;
    }
}
