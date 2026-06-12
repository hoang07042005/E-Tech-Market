<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Cookie as SymfonyCookie;
use Throwable;

class AuthController extends Controller
{
    private function authenticatedUser(Request $request): User
    {
        $user = $request->user();

        if (! $user instanceof User) {
            abort(401);
        }

        return $user;
    }

    /**
     * Set authentication token as httpOnly cookie (more secure than localStorage).
     */
    private function setAuthCookie(string $token, Carbon $expiresAt): SymfonyCookie
    {
        // Calculate minutes until expiration
        $minutes = (int) Carbon::now()->diffInMinutes($expiresAt);

        // Decide secure / sameSite based on environment or app URL scheme
        $appEnv = (string) Config::get('app.env', 'production');
        $appUrl = (string) Config::get('app.url', '');
        $isHttps = (strpos($appUrl, 'https://') === 0);

        if ($appEnv === 'production' || $isHttps) {
            $secure = true;
            $sameSite = 'none';
        } else {
            // Local development (HTTP): use lax to avoid SameSite=None+Secure issues
            $secure = false;
            $sameSite = 'lax';
        }

        return Cookie::make(
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

        Event::dispatch(new Registered($user));

        $user->load('roles');

        return Response::json([
            'user' => new UserResource($user),
            'token' => $token,
        ])->cookie($this->setAuthCookie($token, $expiresAt));
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email hoặc mật khẩu không đúng.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Tài khoản của bạn đã bị khóa.'],
            ]);
        }

        $expiresAt = Carbon::now()->addHours(24);
        $token = $user->createToken('auth_token', ['*'], $expiresAt)->plainTextToken;
        $user->load('roles');

        return Response::json([
            'user' => new UserResource($user),
            'token' => $token,
        ])->cookie($this->setAuthCookie($token, $expiresAt));
    }

    public function me(Request $request): JsonResponse
    {
        $user = $this->authenticatedUser($request);

        return Response::json(new UserResource($user->load('roles')));
    }

    public function updateMe(Request $request): JsonResponse
    {
        $user = $this->authenticatedUser($request);

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

        $user->refresh();

        return Response::json(new UserResource($user->load('roles')));
    }

    public function updateAvatar(Request $request): JsonResponse
    {
        $user = $this->authenticatedUser($request);

        $data = $request->validate([
            'file' => 'required|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);

        $file = $data['file'];
        if (! $file instanceof UploadedFile) {
            abort(422);
        }

        $path = $file->store('avatars', 'public');
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');
        // Return an absolute URL so the frontend can render across origins.
        $user->avatar_url = URL::to($disk->url($path));
        $user->save();

        $user->refresh();

        return Response::json(new UserResource($user->load('roles')));
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $this->authenticatedUser($request);

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', Password::min(8)->mixedCase()->numbers()->symbols()],
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

        return Response::json(['ok' => true]);
    }

    public function sessions(Request $request): JsonResponse
    {
        $user = $this->authenticatedUser($request);
        /** @var PersonalAccessToken|null $current */
        $current = $user->currentAccessToken();

        $rows = [];
        foreach ($user->tokens()->orderByDesc('created_at')->get(['id', 'name', 'created_at', 'last_used_at']) as $t) {
            /** @var PersonalAccessToken $t */
            if (! $t instanceof PersonalAccessToken) {
                continue;
            }

            $createdAt = $t->getAttribute('created_at');
            $lastUsedAt = $t->getAttribute('last_used_at');

            $rows[] = [
                'id' => (string) $t->getKey(),
                'name' => (string) ($t->getAttribute('name') ?? 'Thiết bị'),
                'created_at' => $createdAt instanceof Carbon ? $createdAt->toIso8601String() : null,
                'last_used_at' => $lastUsedAt instanceof Carbon ? $lastUsedAt->toIso8601String() : null,
                'is_current' => $current ? ((int) $t->getKey() === (int) $current->getKey()) : false,
            ];
        }

        return Response::json(['data' => $rows]);
    }

    public function logout(Request $request): JsonResponse
    {
        // currentAccessToken() returns a PersonalAccessToken instance; guard its type
        $user = $this->authenticatedUser($request);
        $curr = $user->currentAccessToken();
        if ($curr instanceof PersonalAccessToken) {
            $curr->delete();
        }

        return Response::json(['ok' => true])->withoutCookie('auth_token');
    }

    public function deleteAccount(Request $request): JsonResponse
    {
        $user = $this->authenticatedUser($request);

        $data = $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Mật khẩu không đúng.'],
            ]);
        }

        // Soft delete user (deactivate) - giữ lại data cho nghiệp vụ
        $user->is_active = false;
        $user->email = $user->email.'_deleted_'.$user->id.'_'.time();
        $user->phone = null;
        $user->avatar_url = null;
        $user->save();

        // Revoke all tokens
        $user->tokens()->delete();

        return Response::json(['ok' => true])->withoutCookie('auth_token');
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
            return Response::json(['message' => 'Thiếu mã xác thực Google.'], 400);
        }

        $clientIds = array_filter([
            Config::get('services.google.client_id'),
            Config::get('services.google.android_client_id'),
        ]);
        if (empty($clientIds)) {
            return Response::json(['message' => 'Google Client ID chưa được cấu hình.'], 500);
        }

        $payload = null;
        if ($idToken) {
            // Verify ID token using firebase/php-jwt with Google's public JWKS keys.
            // This securely checks: signature, expiration, issuer, and audience (aud) claim.
            try {
                $jwksUrl = 'https://www.googleapis.com/oauth2/v3/certs';
                $jwksJson = Http::get($jwksUrl)->json();
                $keys = JWK::parseKeySet($jwksJson, 'RS256');
                $decoded = JWT::decode($idToken, $keys);

                // Verify audience claim matches one of our client IDs
                $aud = is_array($decoded->aud) ? $decoded->aud : [$decoded->aud];
                $match = false;
                foreach ($clientIds as $id) {
                    if (in_array($id, $aud, true)) {
                        $match = true;
                        break;
                    }
                }
                if (! $match) {
                    return Response::json(['message' => 'Token audience không khớp với ứng dụng.'], 401);
                }

                // Verify issuer
                $validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
                if (! isset($decoded->iss) || ! in_array($decoded->iss, $validIssuers, true)) {
                    return Response::json(['message' => 'Token issuer không hợp lệ.'], 401);
                }

                $payload = [
                    'email' => $decoded->email ?? null,
                    'name' => $decoded->name ?? 'Google User',
                    'picture' => $decoded->picture ?? null,
                    'sub' => $decoded->sub ?? null,
                ];
            } catch (Throwable $e) {
                return Response::json(['message' => 'Xác thực Google thất bại hoặc mã đã hết hạn.'], 401);
            }
        } else {
            // Verify access_token via Google's tokeninfo endpoint (includes audience check)
            try {
                $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
                    'access_token' => $accessToken,
                ]);

                if ($response->failed()) {
                    return Response::json(['message' => 'Xác thực Access Token Google thất bại.'], 401);
                }

                $tokenInfo = $response->json();

                // SECURITY: Verify the token was issued for OUR application
                $tokenAud = $tokenInfo['aud'] ?? null;
                $match = false;
                if (is_array($tokenAud)) {
                    foreach ($tokenAud as $audItem) {
                        if (in_array($audItem, $clientIds, true)) {
                            $match = true;
                            break;
                        }
                    }
                } else {
                    if (in_array($tokenAud, $clientIds, true)) {
                        $match = true;
                    }
                }

                if (! $match) {
                    return Response::json(['message' => 'Access token không thuộc ứng dụng này.'], 401);
                }

                // Fetch user info using the validated access_token
                $userInfoResponse = Http::get('https://www.googleapis.com/oauth2/v3/userinfo', [
                    'access_token' => $accessToken,
                ]);

                if ($userInfoResponse->failed()) {
                    return Response::json(['message' => 'Không thể lấy thông tin người dùng từ Google.'], 401);
                }

                $userInfo = $userInfoResponse->json();
                $payload = [
                    'email' => $userInfo['email'] ?? null,
                    'name' => $userInfo['name'] ?? 'Google User',
                    'picture' => $userInfo['picture'] ?? null,
                    'sub' => $userInfo['sub'] ?? null,
                ];
            } catch (Throwable $e) {
                return Response::json(['message' => 'Xác thực Access Token Google thất bại.'], 401);
            }
        }

        $email = $payload['email'] ?? null;
        $name = $payload['name'];
        $avatar = $payload['picture'] ?? null;
        $googleId = $payload['sub'] ?? null;

        if (! $email) {
            return Response::json(['message' => 'Không thể lấy email từ Google.'], 401);
        }

        // Find or create user
        $user = User::where('email', $email)->first();

        if (! $user) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make(Str::random(24)),
                'avatar_url' => $avatar,
                'is_active' => true,
                'email_verified_at' => Carbon::now(),
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
            return Response::json(['message' => 'Tài khoản đã bị khóa.'], 403);
        }

        $expiresAt = Carbon::now()->addHours(24);
        $token = $user->createToken('auth_token', ['*'], $expiresAt)->plainTextToken;
        $user->load('roles');

        return Response::json([
            'user' => new UserResource($user),
            'token' => $token,
        ])->cookie($this->setAuthCookie($token, $expiresAt));
    }
}
