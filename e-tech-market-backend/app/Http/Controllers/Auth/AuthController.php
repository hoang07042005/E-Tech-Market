<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /**
     * Set authentication token as httpOnly cookie (more secure than localStorage).
     */
    private function setAuthCookie(string $token, Carbon $expiresAt): \Symfony\Component\HttpFoundation\Cookie
    {
        // Calculate minutes until expiration
        $minutes = (int) now()->diffInMinutes($expiresAt);

        // Decide secure / sameSite based on environment or app URL scheme
        $appEnv = config('app.env', 'production');
        $appUrl = config('app.url', '');
        $isHttps = (strpos($appUrl, 'https://') === 0);

        if ($appEnv === 'production' || $isHttps) {
            $secure = true;
            $sameSite = 'none';
        } else {
            // Local development (HTTP): use lax to avoid SameSite=None+Secure issues
            $secure = false;
            $sameSite = 'lax';
        }

        return cookie(
            'auth_token',   // name
            $token,         // value
            $minutes,       // minutes until expiration
            '/',            // path
            null,           // domain
            $secure,        // secure
            true,           // httpOnly
            false,          // raw
            $sameSite       // sameSite
        );
    }

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
            'user' => new UserResource($user),
            'token' => $token,
        ])->cookie($this->setAuthCookie($token, $expiresAt));
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password) || ! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Email hoặc mật khẩu không đúng.'],
            ]);
        }

        $expiresAt = Carbon::now()->addHours(24);
        $token = $user->createToken('auth_token', ['*'], $expiresAt)->plainTextToken;
        $user->load('roles');

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ])->cookie($this->setAuthCookie($token, $expiresAt));
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

        if (! Hash::check($data['current_password'], $user->password)) {
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

        $rows = [];
        foreach ($user->tokens()->orderByDesc('created_at')->get(['id', 'name', 'created_at', 'last_used_at']) as $t) {
            $rows[] = [
                'id' => (string) $t->getKey(),
                'name' => (string) ($t->name ?? 'Thiết bị'),
                'created_at' => optional($t->created_at)->toIso8601String(),
                'last_used_at' => optional($t->last_used_at)->toIso8601String(),
                'is_current' => $current ? ((int) $t->getKey() === (int) $current->getKey()) : false,
            ];
        }

        return response()->json(['data' => $rows]);
    }

    public function logout(Request $request): JsonResponse
    {
        // currentAccessToken() returns a PersonalAccessToken instance; guard its type
        $curr = $request->user()->currentAccessToken();
        if ($curr instanceof PersonalAccessToken) {
            $curr->delete();
        }

        return response()->json(['ok' => true])->withoutCookie('auth_token');
    }

    public function googleLogin(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'nullable|string',
            'access_token' => 'nullable|string',
        ]);

        $idToken = $request->input('token');
        $accessToken = $request->input('access_token');

        if (! $idToken && ! $accessToken) {
            return response()->json(['message' => 'Thiếu mã xác thực Google.'], 400);
        }

        $clientId = config('services.google.client_id');
        if (! $clientId) {
            return response()->json(['message' => 'Google Client ID chưa được cấu hình.'], 500);
        }

        $payload = null;
        if ($idToken) {
            // Verify ID token using firebase/php-jwt with Google's public JWKS keys.
            // This securely checks: signature, expiration, issuer, and audience (aud) claim.
            try {
                $jwksUrl = 'https://www.googleapis.com/oauth2/v3/certs';
                $jwksJson = Http::get($jwksUrl)->json();
                $keys = \Firebase\JWT\JWK::parseKeySet($jwksJson, 'RS256');
                $decoded = \Firebase\JWT\JWT::decode($idToken, $keys);

                // Verify audience claim matches our client ID
                $aud = is_array($decoded->aud) ? $decoded->aud : [$decoded->aud];
                if (! in_array($clientId, $aud, true)) {
                    return response()->json(['message' => 'Token audience không khớp với ứng dụng.'], 401);
                }

                // Verify issuer
                $validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
                if (! isset($decoded->iss) || ! in_array($decoded->iss, $validIssuers, true)) {
                    return response()->json(['message' => 'Token issuer không hợp lệ.'], 401);
                }

                $payload = [
                    'email' => $decoded->email ?? null,
                    'name' => $decoded->name ?? 'Google User',
                    'picture' => $decoded->picture ?? null,
                    'sub' => $decoded->sub ?? null,
                ];
            } catch (\Exception $e) {
                return response()->json(['message' => 'Xác thực Google thất bại hoặc mã đã hết hạn.'], 401);
            }
        } else {
            // Verify access_token via Google's tokeninfo endpoint (includes audience check)
            try {
                $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
                    'access_token' => $accessToken,
                ]);

                if ($response->failed()) {
                    return response()->json(['message' => 'Xác thực Access Token Google thất bại.'], 401);
                }

                $tokenInfo = $response->json();

                // SECURITY: Verify the token was issued for OUR application
                $tokenAud = $tokenInfo['aud'] ?? null;
                if ($tokenAud !== $clientId) {
                    return response()->json(['message' => 'Access token không thuộc ứng dụng này.'], 401);
                }

                // Fetch user info using the validated access_token
                $userInfoResponse = Http::get('https://www.googleapis.com/oauth2/v3/userinfo', [
                    'access_token' => $accessToken,
                ]);

                if ($userInfoResponse->failed()) {
                    return response()->json(['message' => 'Không thể lấy thông tin người dùng từ Google.'], 401);
                }

                $userInfo = $userInfoResponse->json();
                $payload = [
                    'email' => $userInfo['email'] ?? null,
                    'name' => $userInfo['name'] ?? 'Google User',
                    'picture' => $userInfo['picture'] ?? null,
                    'sub' => $userInfo['sub'] ?? null,
                ];
            } catch (\Exception $e) {
                return response()->json(['message' => 'Xác thực Access Token Google thất bại.'], 401);
            }
        }

        $email = $payload['email'] ?? null;
        $name = $payload['name'];
        $avatar = $payload['picture'] ?? null;
        $googleId = $payload['sub'] ?? null;

        if (! $email) {
            return response()->json(['message' => 'Không thể lấy email từ Google.'], 401);
        }

        // Find or create user
        $user = User::where('email', $email)->first();

        if (! $user) {
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
            if (! $user->avatar_url && $avatar) {
                $user->avatar_url = $avatar;
                $user->save();
            }
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'Tài khoản đã bị khóa.'], 403);
        }

        $expiresAt = Carbon::now()->addHours(24);
        $token = $user->createToken('auth_token', ['*'], $expiresAt)->plainTextToken;
        $user->load('roles');

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ])->cookie($this->setAuthCookie($token, $expiresAt));
    }
}
