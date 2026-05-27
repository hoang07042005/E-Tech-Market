<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;
use Illuminate\Auth\Events\Registered;
use Laravel\Sanctum\PersonalAccessToken;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'phone' => $data['phone'] ?? null,
            'address_line' => $data['address_line'] ?? null,
            'province' => $data['province'] ?? null,
            'district' => $data['district'] ?? null,
            'ward' => $data['ward'] ?? null,
            'is_active' => true,
        ]);
        
        // Gán quyền khách hàng mặc định
        $customerRole = Role::where('slug', 'customer')->first();
        if ($customerRole) {
            $user->roles()->attach($customerRole->id);
        }

        $expiresAt = Carbon::now()->addHours(24);
        $token = $user->createToken('auth_token', ['*'], $expiresAt)->plainTextToken;

        event(new Registered($user));

        $user->load('roles');
        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::where('email', $data['email'])->first();
        if (!$user || !Hash::check($data['password'], $user->password) || !$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Email hoặc mật khẩu không đúng.'],
            ]);
        }

        $expiresAt = Carbon::now()->addHours(24);
        $token = $user->createToken('auth_token', ['*'], $expiresAt)->plainTextToken;
        $user->load('roles');
        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(new UserResource($request->user()->load('roles')));
    }

    public function updateMe(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'address_line' => ['nullable', 'string'],
            'province' => ['nullable', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'],
            'ward' => ['nullable', 'string', 'max:100'],
        ]);

        // Only update provided keys.
        foreach (['name', 'email', 'phone', 'address_line', 'province', 'district', 'ward'] as $k) {
            if (array_key_exists($k, $data)) {
                $user->{$k} = $data[$k];
            }
        }
        $user->save();

        return response()->json(new UserResource($user->fresh()->load('roles')));
    }

    public function updateAvatar(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'file' => 'required|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);

        $path = $data['file']->store('avatars', 'public');
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');
        // Return an absolute URL so the frontend can render across origins.
        $user->avatar_url = URL::to($disk->url($path));
        $user->save();

        return response()->json(new UserResource($user->fresh()->load('roles')));
    }

    public function changePassword(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', \Illuminate\Validation\Rules\Password::min(8)->mixedCase()->numbers()->symbols()],
        ]);

        if (!Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Mật khẩu hiện tại không đúng.'],
            ]);
        }

        // Avoid setting the same password again.
        if (Hash::check($data['new_password'], $user->password)) {
            throw ValidationException::withMessages([
                'new_password' => ['Mật khẩu mới không được trùng mật khẩu hiện tại.'],
            ]);
        }

        $user->password = Hash::make($data['new_password']);
        $user->save();

        // Revoke all other tokens (keep current session logged in).
        /** @var PersonalAccessToken|null $current */
        $current = $user->currentAccessToken();
        if ($current) {
            $user->tokens()->where('id', '!=', $current->getKey())->delete();
        }

        return response()->json(['ok' => true]);
    }

    public function sessions(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        /** @var PersonalAccessToken|null $current */
        $current = $user->currentAccessToken();

        $rows = $user->tokens()
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'created_at', 'last_used_at'])
            ->map(function ($t) use ($current) {
                return [
                    'id' => (string) $t->getKey(),
                    'name' => (string) ($t->name ?? 'Thiết bị'),
                    'created_at' => optional($t->created_at)->toIso8601String(),
                    'last_used_at' => optional($t->last_used_at)->toIso8601String(),
                    'is_current' => $current ? ((int) $t->getKey() === (int) $current->getKey()) : false,
                ];
            })
            ->values();

        return response()->json(['data' => $rows]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }

    public function googleLogin(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'nullable|string',
            'access_token' => 'nullable|string',
        ]);

        $idToken = $request->input('token');
        $accessToken = $request->input('access_token');

        if (!$idToken && !$accessToken) {
            return response()->json(['message' => 'Thiếu mã xác thực Google.'], 400);
        }

        if ($accessToken) {
            // Verify with UserInfo endpoint for access_token
            $response = Http::get("https://www.googleapis.com/oauth2/v3/userinfo", [
                'access_token' => $accessToken
            ]);
        } else {
            // Verify with TokenInfo endpoint for id_token
            $response = Http::get("https://oauth2.googleapis.com/tokeninfo", [
                'id_token' => $idToken
            ]);
        }

        if ($response->failed()) {
            return response()->json(['message' => 'Xác thực Google thất bại hoặc mã đã hết hạn.'], 401);
        }

        $payload = $response->json();
        $email = $payload['email'] ?? null;
        $name = $payload['name'] ?? 'Google User';
        $avatar = $payload['picture'] ?? null;
        $googleId = $payload['sub'] ?? null;

        if (!$email) {
            return response()->json(['message' => 'Không thể lấy email từ Google.'], 401);
        }

        // Find or create user
        $user = User::where('email', $email)->first();

        if (!$user) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make(str()->random(24)),
                'avatar_url' => $avatar,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            // Assign default role
            $customerRole = Role::where('slug', 'customer')->first();
            if ($customerRole) {
                $user->roles()->attach($customerRole->id);
            }
        } else {
            // Cập nhật ảnh đại diện nếu user chưa có
            if (!$user->avatar_url && $avatar) {
                $user->avatar_url = $avatar;
                $user->save();
            }
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Tài khoản đã bị khóa.'], 403);
        }

        $expiresAt = Carbon::now()->addHours(24);
        $token = $user->createToken('auth_token', ['*'], $expiresAt)->plainTextToken;
        $user->load('roles');

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }
}

