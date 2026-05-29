<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactMessagesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $handled = $request->input('handled');

        $query = ContactMessage::query()->with('handledBy');

        if ($handled === 'yes') {
            $query->whereNotNull('handled_at');
        } elseif ($handled === 'no') {
            $query->whereNull('handled_at');
        }

        $messages = $query->orderBy('created_at', 'desc')->paginate((int) $request->input('limit', 20));

        return response()->json($messages);
    }

    public function handle(Request $request, $id): JsonResponse
    {
        $contact_message = ContactMessage::findOrFail($id);
        $contact_message->update([
            'handled_at' => now(),
            'handled_by_user_id' => $request->user()->id,
        ]);

        return response()->json($contact_message);
    }

    public function destroy($id): JsonResponse
    {
        $contact_message = ContactMessage::findOrFail($id);
        $contact_message->delete();

        return response()->json(['message' => 'Message deleted successfully']);
    }
}
