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
    public function __construct(private \App\Services\UserService $userService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $paginator = $this->userService->getAdminUsers($request, (int) $request->query('per_page', 20));

        $collection = $paginator->getCollection()->map(function (User $item) {
            return (new UserResource($item))->resolve();
        });
        $paginator->setCollection($collection);

        return response()->json($paginator);
    }

    /**
     * Cập nhật is_active và/hoặc đồng bộ vai trò (role_ids).
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        try {
            $updatedUser = $this->userService->updateUser($user, $request->validated(), $request->user());
            return response()->json((new UserResource($updatedUser))->resolve());
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 422;
            abort($code, $e->getMessage());
        }
    }

    /**
     * Xóa mềm tài khoản.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        try {
            $this->userService->deleteUser($user, $request->user());
            return response()->json(['message' => 'Đã xóa tài khoản.']);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 422;
            abort($code, $e->getMessage());
        }
    }

    /**
     * Khóa tài khoản.
     */
    public function lock(Request $request, User $user): JsonResponse
    {
        try {
            $this->userService->lockUser($user, $request->user());
            
            \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\AccountLockedEmail($user->name));
            
            return response()->json(['message' => 'Đã khóa tài khoản thành công.']);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 422;
            abort($code, $e->getMessage());
        }
    }

    /**
     * Mở khóa và gửi link đặt lại mật khẩu.
     */
    public function unlock(Request $request, User $user): JsonResponse
    {
        try {
            $token = $this->userService->unlockUserAndCreateResetToken($user);
            
            // Build front-end reset URL
            $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
            $resetUrl = $frontendUrl . '/reset-password?token=' . $token . '&email=' . urlencode($user->email) . '&type=locked';
            
            \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\AccountUnlockedEmail($resetUrl, $user->name));
            
            return response()->json(['message' => 'Đã mở khóa tài khoản và gửi email thiết lập lại mật khẩu.']);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 422;
            abort($code, $e->getMessage());
        }
    }
}
