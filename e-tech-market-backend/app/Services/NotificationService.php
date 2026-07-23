<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    /**
     * Lấy danh sách thông báo của user
     */
    public function getUserNotifications(User $user, int $perPage = 20, string $status = 'all')
    {
        if ($perPage < 5) {
            $perPage = 5;
        }
        if ($perPage > 50) {
            $perPage = 50;
        }

        $q = Notification::query()->where('user_id', $user->id);
        
        if ($status === 'unread') {
            $q->whereNull('read_at');
        } elseif ($status === 'read') {
            $q->whereNotNull('read_at');
        }

        $rows = $q->orderByDesc('created_at')->paginate($perPage);

        $unread = (int) Notification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        $readCount = (int) Notification::query()
            ->where('user_id', $user->id)
            ->whereNotNull('read_at')
            ->count();

        return [
            'data' => $rows->items(),
            'pagination' => [
                'current_page' => $rows->currentPage(),
                'per_page' => $rows->perPage(),
                'total' => $rows->total(),
                'last_page' => $rows->lastPage(),
            ],
            'unread' => $unread,
            'read_count' => $readCount,
        ];
    }

    /**
     * Đánh dấu 1 thông báo đã đọc
     */
    public function markAsRead(Notification $notification, User $user): void
    {
        if ((int) $notification->user_id !== (int) $user->id) {
            throw new \Exception('Forbidden', 403);
        }

        if ($notification->read_at === null) {
            $notification->read_at = now();
            $notification->save();
        }
    }

    /**
     * Đánh dấu tất cả thông báo đã đọc
     */
    public function markAllAsRead(User $user): void
    {
        Notification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }
}
