<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationsController extends Controller
{
    public function __construct(private \App\Services\NotificationService $notificationService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 20);
        $status = (string) $request->query('status', 'all');

        $result = $this->notificationService->getUserNotifications($request->user(), $perPage, $status);

        return response()->json($result);
    }

    public function markRead(Notification $notification, Request $request): JsonResponse
    {
        try {
            $this->notificationService->markAsRead($notification, $request->user());
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            abort($e->getCode() ?: 403, $e->getMessage());
        }
    }

    public function markReadAll(Request $request): JsonResponse
    {
        $this->notificationService->markAllAsRead($request->user());
        return response()->json(['ok' => true]);
    }
}
