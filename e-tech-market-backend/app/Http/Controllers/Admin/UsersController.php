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
}
