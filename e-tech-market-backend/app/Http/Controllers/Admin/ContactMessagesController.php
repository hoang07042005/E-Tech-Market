<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactMessagesController extends Controller
{
    public function __construct(private \App\Services\ContactMessageService $contactMessageService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $handled = $request->input('handled');
        $messages = $this->contactMessageService->getAdminMessages($handled, (int) $request->input('limit', 20));

        return response()->json($messages);
    }

    public function handle(Request $request, $id): JsonResponse
    {
        $contact_message = $this->contactMessageService->handleMessage($id, $request->user());

        return response()->json($contact_message);
    }

    public function destroy($id): JsonResponse
    {
        $this->contactMessageService->deleteMessage($id);

        return response()->json(['message' => 'Message deleted successfully']);
    }
}
