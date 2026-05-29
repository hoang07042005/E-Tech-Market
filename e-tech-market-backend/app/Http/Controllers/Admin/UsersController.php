<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\Admin\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UsersController extends Controller
{
    public function index(Request $request): JsonResponse
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

        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(5, min(100, $perPage));

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn ($item) => (new UserResource($item))->resolve());

        return response()->json($paginator);
    }

    /**
     * Cập nhật is_active và/hoặc đồng bộ vai trò (role_ids).
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();

        if (! array_key_exists('is_active', $data) && ! array_key_exists('role_ids', $data)) {
            return response()->json(
                ['message' => 'Gửi ít nhất một trường: is_active hoặc role_ids.'],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        if ($request->user()->id === $user->id) {
            if (array_key_exists('is_active', $data)) {
                return response()->json(
                    ['message' => 'Không thể thay đổi trạng thái chính tài khoản đang đăng nhập.'],
                    Response::HTTP_UNPROCESSABLE_ENTITY,
                );
            }
            if (array_key_exists('role_ids', $data)) {
                return response()->json(
                    ['message' => 'Không thể thay đổi vai trò chính tài khoản đang đăng nhập.'],
                    Response::HTTP_UNPROCESSABLE_ENTITY,
                );
            }
        }

        if (array_key_exists('role_ids', $data)) {
            $targetHasAdmin = $user->roles()->where('slug', 'admin')->exists();
            if ($targetHasAdmin) {
                return response()->json(
                    ['message' => 'Không thể thay đổi vai trò của tài khoản quản trị viên.'],
                    Response::HTTP_UNPROCESSABLE_ENTITY,
                );
            }

            /** @var list<int|string> $ids */
            $ids = $data['role_ids'];
            $uniqueIds = array_values(array_unique(array_map('intval', $ids)));
            $user->roles()->sync($uniqueIds);
        }

        if (array_key_exists('is_active', $data)) {
            $user->update(['is_active' => $data['is_active']]);
        }

        return response()->json((new UserResource($user))->resolve()->fresh()->load('roles'));
    }

    /**
     * Xóa mềm tài khoản.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->id === $user->id) {
            return response()->json(
                ['message' => 'Không thể xóa chính tài khoản đang đăng nhập.'],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        $user->delete();

        return response()->json(['message' => 'Đã xóa tài khoản.']);
    }
}
