<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;

class UserService
{
    /**
     * Lấy danh sách người dùng cho Admin, hỗ trợ tìm kiếm và lọc theo role
     */
    public function getAdminUsers(Request $request, int $perPage = 20)
    {
        $query = User::query()->with('roles')->orderByDesc('created_at');

        $roleType = $request->query('role_type');
        if ($roleType === 'customer') {
            $query->whereHas('roles', function ($q) {
                $q->where('slug', 'customer');
            });
        } elseif ($roleType === 'admin') {
            $query->whereHas('roles', function ($q) {
                $q->where('slug', '!=', 'customer');
            });
        }

        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $escaped = addcslashes($search, '%_\\');
            $like = '%'.$escaped.'%';
            $query->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('phone', 'like', $like);
            });
        }

        return $query->paginate(max(5, min(100, $perPage)));
    }

    /**
     * Cập nhật thông tin User (is_active, role_ids, rank_id, points)
     */
    public function updateUser(User $user, array $data, User $currentUser): User
    {
        if (! array_key_exists('is_active', $data) && ! array_key_exists('role_ids', $data) && ! array_key_exists('rank_id', $data) && ! array_key_exists('current_points', $data) && ! array_key_exists('total_spent', $data)) {
            throw new \Exception('Gửi ít nhất một trường: is_active, role_ids, rank_id, current_points hoặc total_spent.', 422);
        }

        if ($currentUser->id === $user->id) {
            if (array_key_exists('is_active', $data)) {
                throw new \Exception('Không thể thay đổi trạng thái chính tài khoản đang đăng nhập.', 422);
            }
            if (array_key_exists('role_ids', $data)) {
                throw new \Exception('Không thể thay đổi vai trò chính tài khoản đang đăng nhập.', 422);
            }
        }

        if (array_key_exists('role_ids', $data)) {
            $targetHasAdmin = $user->roles()->where('slug', 'admin')->exists();
            if ($targetHasAdmin) {
                throw new \Exception('Không thể thay đổi vai trò của tài khoản quản trị viên.', 422);
            }

            /** @var list<int|string> $ids */
            $ids = $data['role_ids'];
            $uniqueIds = array_values(array_unique(array_map('intval', $ids)));
            $user->roles()->sync($uniqueIds);
        }

        if (array_key_exists('is_active', $data)) {
            $user->update(['is_active' => $data['is_active']]);
        }

        // Loyalty fields: rank_id, current_points, total_spent
        $loyaltyData = [];
        if (array_key_exists('rank_id', $data)) {
            $rankId = $data['rank_id'];
            $loyaltyData['rank_id'] = $rankId !== null ? (int) $rankId : null;
        }
        if (array_key_exists('current_points', $data)) {
            $loyaltyData['current_points'] = max(0, (int) $data['current_points']);
        }
        if (array_key_exists('total_spent', $data)) {
            $loyaltyData['total_spent'] = max(0, (int) $data['total_spent']);
        }

        if (!empty($loyaltyData)) {
            $user->update($loyaltyData);
        }

        return $user->fresh()->load('roles');
    }

    /**
     * Xóa mềm User
     */
    public function deleteUser(User $user, User $currentUser): void
    {
        if ($currentUser->id === $user->id) {
            throw new \Exception('Không thể xóa chính tài khoản đang đăng nhập.', 422);
        }

        $user->delete();
    }
}
