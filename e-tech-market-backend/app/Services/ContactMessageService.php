<?php

namespace App\Services;

use App\Models\ContactMessage;
use App\Models\Notification;
use App\Models\User;

class ContactMessageService
{
    /**
     * Lấy danh sách Contact Message cho Admin
     */
    public function getAdminMessages(?string $handled, int $limit = 20)
    {
        $query = ContactMessage::query()->with('handledBy');

        if ($handled === 'yes') {
            $query->whereNotNull('handled_at');
        } elseif ($handled === 'no') {
            $query->whereNull('handled_at');
        }

        return $query->orderBy('created_at', 'desc')->paginate($limit);
    }

    /**
     * Đánh dấu tin nhắn đã được xử lý
     */
    public function handleMessage(int $id, User $user): ContactMessage
    {
        $contactMessage = ContactMessage::findOrFail($id);
        $contactMessage->update([
            'handled_at' => now(),
            'handled_by_user_id' => $user->id,
        ]);

        return $contactMessage;
    }

    /**
     * Xóa tin nhắn
     */
    public function deleteMessage(int $id): void
    {
        $contactMessage = ContactMessage::findOrFail($id);
        $contactMessage->delete();
    }

    /**
     * Tạo tin nhắn mới từ Client và thông báo cho Admin
     */
    public function createMessage(array $data): ContactMessage
    {
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

        return $row;
    }
}
