<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactMessagesController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'min:6', 'max:50'],
            'subject' => ['nullable', 'string', 'max:255'],
            'message' => ['required', 'string', 'min:5', 'max:10000'],
        ]);

        $row = ContactMessage::create([
            'name' => trim((string) $data['name']),
            'email' => trim((string) $data['email']),
            'phone' => trim((string) $data['phone']),
            'subject' => isset($data['subject']) && $data['subject'] !== null ? trim((string) $data['subject']) : null,
            'message' => trim((string) $data['message']),
            'handled_at' => null,
            'handled_by_user_id' => null,
        ]);

        // Notify all admins
        $adminUsers = User::query()
            ->whereHas('roles', function ($r) {
                $r->where('slug', '=', 'admin');
            })
            ->select(['id'])
            ->get();

        foreach ($adminUsers as $au) {
            Notification::create([
                'user_id' => (int) $au->id,
                'type' => 'contact_message',
                'title' => 'Liên hệ mới',
                'body' => $row->name.' • '.($row->subject ?: 'Liên hệ').' • '.mb_substr($row->message, 0, 140),
                'data' => [
                    'contact_message_id' => (int) $row->id,
                    'email' => (string) $row->email,
                    'phone' => (string) $row->phone,
                ],
                'read_at' => null,
            ]);
        }

        return response()->json(['ok' => true, 'id' => (int) $row->id], 201);
    }
}
