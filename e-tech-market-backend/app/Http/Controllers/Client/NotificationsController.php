<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = (int) $request->query('per_page', 20);
        if ($perPage < 5) $perPage = 5;
        if ($perPage > 50) $perPage = 50;

        $unreadOnly = (string) $request->query('unread', '') !== '' &&
            in_array(strtolower((string) $request->query('unread')), ['1', 'true', 'yes'], true);

        $q = Notification::query()
            ->where('user_id', $user->id);
        if ($unreadOnly) {
            $q->whereNull('read_at');
        }

        $rows = $q->orderByDesc('created_at')->paginate($perPage);

        $unread = (int) Notification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'data' => $rows->items(),
            'pagination' => [
                'current_page' => $rows->currentPage(),
                'per_page' => $rows->perPage(),
                'total' => $rows->total(),
                'last_page' => $rows->lastPage(),
            ],
            'unread' => $unread,
        ]);
    }

    public function markRead(Notification $notification, Request $request): JsonResponse
    {
        $user = $request->user();
        if ((int) $notification->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($notification->read_at === null) {
            $notification->read_at = now();
            $notification->save();
        }

        return response()->json(['ok' => true]);
    }

    public function markReadAll(Request $request): JsonResponse
    {
        $user = $request->user();
        Notification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }
}

