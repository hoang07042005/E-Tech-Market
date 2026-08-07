<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Http\Resources\MembershipRankResource;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function login(Request $r)
    {
        $r->validate([
            "email"=>"required|email",
            "password"=>"required|string"
        ], [
            "email.required" => "Vui lòng nhập email.",
            "email.email" => "Email không hợp lệ.",
            "password.required" => "Vui lòng nhập mật khẩu."
        ]);

        $result = $this->authService->login($r, $r->only(['email', 'password']), $r->input('otp'));

        if ($result['requires_2fa']) {
            return response()->json(['message' => $result['message'], 'requires_2fa' => true], 403);
        }

        $data = ['user' => new UserResource($result['user'])];
        if ($result['token'] !== null) {
            $data['token'] = $result['token'];
        }

        return response()->json($data)->withCookie($result['cookie']);
    }

    public function register(Request $r)
    {
        $r->validate([
            "name"=>"required|string|max:255",
            "email"=>"required|email|unique:users|max:255",
            "password"=>"required|string|min:8",
            "phone"=>"required|string|max:30",
            "address_line"=>"nullable|string",
            "province"=>"nullable|string|max:100",
            "district"=>"nullable|string|max:100",
            "ward"=>"nullable|string|max:100",
        ], [
            "email.unique" => "Email này đã được sử dụng.",
            "password.min" => "Mật khẩu phải có ít nhất 8 ký tự.",
            "name.required" => "Vui lòng nhập họ tên.",
            "email.required" => "Vui lòng nhập email.",
            "password.required" => "Vui lòng nhập mật khẩu.",
            "phone.required" => "Vui lòng nhập số điện thoại."
        ]);

        $result = $this->authService->register($r, $r->all());

        $data = ['user' => new UserResource($result['user'])];
        if ($result['token'] !== null) {
            $data['token'] = $result['token'];
        }

        return response()->json($data, 201)->withCookie($result['cookie']);
    }

    public function logout(Request $r)
    {
        $user = $r->user();
        if(!$user instanceof User) {
            return response()->json(["message"=>"Unauthorized"], 401);
        }

        $cookie = $this->authService->logout($r, $user);

        return response()->json(["message"=>"Logged out"])->withCookie($cookie);
    }

    public function me(Request $r)
    {
        $user = $r->user();
        if(!$user instanceof User) {
            return response()->json(["message"=>"Unauthorized"], 401);
        }

        $user->load(['roles', 'membershipRank']);
        return response()->json(["user"=>new UserResource($user)]);
    }

    public function updateMe(Request $r)
    {
        $user = $r->user();
        if(!$user instanceof User) {
            return response()->json(["message"=>"Unauthorized"], 401);
        }

        $data = $r->validate([
            "name"=>"nullable|string|max:255",
            "email"=>"nullable|email|max:255|unique:users,email,".$user->id,
            "phone"=>"nullable|string|max:30",
            "address_line"=>"nullable|string",
            "province"=>"nullable|string|max:100",
            "district"=>"nullable|string|max:100",
            "ward"=>"nullable|string|max:100"
        ]);

        $updatedUser = $this->authService->updateProfile($user, $data);

        return response()->json(["user"=>new UserResource($updatedUser)]);
    }

    public function updateAvatar(Request $r)
    {
        $user = $r->user();
        if(!$user instanceof User) {
            return response()->json(["message"=>"Unauthorized"], 401);
        }

        $data = $r->validate([
            "file"=>"required|image|mimes:jpeg,png,jpg,webp|max:4096"
        ]);

        $updatedUser = $this->authService->updateAvatar($user, $data['file']);

        return response()->json(["user"=>new UserResource($updatedUser)]);
    }

    public function changePassword(Request $r)
    {
        $user = $r->user();
        if(!$user instanceof User) {
            return response()->json(["message"=>"Unauthorized"], 401);
        }

        $data = $r->validate([
            "current_password"=>"required|string",
            "new_password"=>"required|string|min:8"
        ], [
            "new_password.min" => "Mật khẩu mới phải có ít nhất 8 ký tự.",
            "current_password.required" => "Vui lòng nhập mật khẩu hiện tại.",
            "new_password.required" => "Vui lòng nhập mật khẩu mới."
        ]);

        $this->authService->changePassword($user, $data['current_password'], $data['new_password']);

        return response()->json(["message"=>"Password changed"]);
    }

    public function sessions(Request $r)
    {
        $user = $r->user();
        if(!$user instanceof User) {
            return response()->json(["message"=>"Unauthorized"], 401);
        }

        $current = $user->currentAccessToken();
        $tokens = $user->tokens()->orderByDesc('created_at')->get(['id', 'name', 'created_at', 'last_used_at']);

        $data = $tokens->map(function($t) use ($current) {
            return [
                "id"=>$t->id,
                "name"=>$t->name,
                "created_at"=>$t->created_at?->toIso8601String(),
                "last_used_at"=>$t->last_used_at?->toIso8601String(),
                "is_current"=>$current && $current->id === $t->id
            ];
        });

        return response()->json(["data"=>$data]);
    }

    public function revokeSession(Request $r, $id)
    {
        $user = $r->user();
        if(!$user instanceof User) {
            return response()->json(["message"=>"Unauthorized"], 401);
        }

        $user->tokens()->where('id', $id)->delete();
        return response()->json(["message" => "Session revoked"]);
    }

    public function revokeAllSessions(Request $r)
    {
        $user = $r->user();
        if(!$user instanceof User) {
            return response()->json(["message"=>"Unauthorized"], 401);
        }

        $user->tokens()->delete();
        return response()->json(["message" => "All sessions revoked"]);
    }

    public function deleteAccount(Request $r)
    {
        $user = $r->user();
        if(!$user instanceof User) {
            return response()->json(["message"=>"Unauthorized"], 401);
        }

        $data = $r->validate([
            "password"=>"required|string"
        ]);

        $this->authService->deleteAccount($user, $data['password']);

        return response()->json(["message"=>"Account deleted"]);
    }

    public function googleLogin(Request $r)
    {
        $r->validate([
            'access_token' => 'required|string',
        ]);

        try {
            $result = $this->authService->googleLogin($r, $r->access_token);
        } catch (\Exception $e) {
            $code = $e->getMessage() === 'Không lấy được email từ Google.' ? 422 : ($e->getMessage() === 'Tài khoản đã bị vô hiệu hóa.' ? 403 : 401);
            if ($e->getMessage() === 'Không thể xác thực với Google.') $code = 500;
            return response()->json(['message' => $e->getMessage()], $code);
        }

        $data = ['user' => new UserResource($result['user'])];
        if ($result['token'] !== null) {
            $data['token'] = $result['token'];
        }

        return response()->json($data)->withCookie($result['cookie']);
    }

    public function loyalty(Request $r)
    {
        $user = $r->user();
        if(!$user instanceof User) {
            return response()->json(["message"=>"Unauthorized"], 401);
        }

        $user = User::with('membershipRank')->find($user->id);

        $nextRank = \App\Models\MembershipRank::query()
            ->where('min_spend', '>', $user->total_spent)
            ->orderBy('min_spend', 'asc')
            ->first();

        $pointHistory = \App\Models\PointHistory::query()
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'current_points' => $user->current_points,
            'total_spent' => $user->total_spent,
            'membership_rank' => $user->membershipRank ? new MembershipRankResource($user->membershipRank) : null,
            'next_rank' => $nextRank ? new MembershipRankResource($nextRank) : null,
            'point_history' => $pointHistory,
        ]);
    }

    public function validateLockedResetToken(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
        ]);

        try {
            $this->authService->validateLockedResetToken($request->email, $request->token);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 400);
        }

        return response()->json(['message' => 'Token hợp lệ.']);
    }

    public function resetLockedPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ], [
            'password.min' => 'Mật khẩu phải có ít nhất 8 ký tự.',
            'password.confirmed' => 'Xác nhận mật khẩu không khớp.',
        ]);

        try {
            $result = $this->authService->resetLockedPassword($request, $request->email, $request->token, $request->password);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 400);
        }

        $data = ['user' => new UserResource($result['user']), 'message' => 'Đặt lại mật khẩu thành công.'];
        if ($result['token'] !== null) {
            $data['token'] = $result['token'];
        }

        return response()->json($data)->withCookie($result['cookie']);
    }
}