<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Http\Resources\MembershipRankResource;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    /**
     * Create a new token for the user and set as httpOnly cookie.
     * In production (web): only cookie (no token in body) to prevent XSS theft.
     * In dev (web): token in body for Bearer auth convenience.
     * Mobile app (Flutter, no cookie jar): ALWAYS gets the token in body,
     * regardless of environment — it has no way to read the httpOnly cookie,
     * so hiding the token there would silently break login/refresh on prod.
     */
    private function createTokenResponse(Request $r, User $user, int $minutes = 60 * 24): array
    {
        $expiresAt = Carbon::now()->addMinutes($minutes);
        $tokenName = substr($r->userAgent() ?? 'Unknown Device', 0, 255);
        
        $isMobileClient = $r->header('X-Client-Platform') === 'mobile';
        if ($isMobileClient) {
            $tokenName = 'E-Tech App • ' . $tokenName;
        }

        $token = $user->createToken($tokenName, ['*'], $expiresAt)->plainTextToken;

        // Determine cookie settings based on environment
        $appUrl = config('app.url', '');
        $isHttps = str_starts_with($appUrl, 'https://');
        $isProduction = app()->isProduction();
        $secure = $isHttps || $isProduction;

        // SameSite: 'none' requires Secure (HTTPS) - else omit for dev
        // laravel default cookie sameSite is 'lax' which blocks cross-site POST
        $sameSite = $secure ? 'none' : null;

        $cookie = Cookie::make('sanctum_token', $token, $minutes, '/', null, $secure, true, false, $sameSite);

        // Mobile client (Flutter) can't use the cookie at all -> always give it the token.
        $isMobileClient = $r->header('X-Client-Platform') === 'mobile';

        // In production (web only): only return token via httpOnly cookie (token not in body)
        // In dev (web) or mobile (any env): return token in body for Bearer auth
        $tokenInBody = ($secure && !$isMobileClient) ? null : $token;

        return [$tokenInBody, $cookie];
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

        $u = User::where("email",$r->email)->first();

        if(!$u) {
            throw ValidationException::withMessages(["email"=>["Sai mật khẩu hoặc email không tồn tại."]]);
        }
        if(!Hash::check($r->password,$u->password)) {
            throw ValidationException::withMessages(["email"=>["Sai mật khẩu hoặc email không tồn tại."]]);
        }

        if(!$u->is_active) {
            throw ValidationException::withMessages(["email"=>["Tài khoản của bạn đã bị vô hiệu hóa."]]);
        }

        if ($u->google2fa_enabled) {
            if (!$r->filled('otp')) {
                return response()->json(['message' => '2FA authentication required.', 'requires_2fa' => true], 403);
            }
            $google2fa = new \PragmaRX\Google2FAQRCode\Google2FA();
            if (!$google2fa->verifyKey($u->google2fa_secret, $r->otp)) {
                throw ValidationException::withMessages(["otp" => ["Mã 2FA không chính xác."]]);
            }
        }

        if ($r->hasSession()) {
            $r->session()->regenerate();
            \Illuminate\Support\Facades\Auth::guard('web')->login($u);
        }

        [$token, $cookie] = $this->createTokenResponse($r, $u);
        $u->load(['roles', 'membershipRank']);

        // In production: token ONLY in httpOnly cookie (not in body) - prevents XSS theft
        // In dev: token in body for Bearer auth convenience
        $data = ['user' => new UserResource($u)];
        if ($token !== null) {
            $data['token'] = $token;
        }

        return response()->json($data)->withCookie($cookie);
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

        $u = User::create([
            "name"=>$r->name,
            "email"=>$r->email,
            "phone"=>$r->phone,
            "password"=>Hash::make($r->password),
            "is_active"=>true,
            "rank_id"=>1,
            "total_spent"=>0
        ]);

        // Assign default role 'customer' to the newly created user
        $customerRole = Role::firstOrCreate(['name' => 'customer', 'guard_name' => 'web']);
        $u->assignRole($customerRole);

        if ($r->hasSession()) {
            $r->session()->regenerate();
            \Illuminate\Support\Facades\Auth::guard('web')->login($u);
        }

        [$token, $cookie] = $this->createTokenResponse($r, $u);
        $u->load(['roles', 'membershipRank']);

        // In production: token ONLY in httpOnly cookie (not in body) - prevents XSS theft
        // In dev: token in body for Bearer auth convenience
        $data = ['user' => new UserResource($u)];
        if ($token !== null) {
            $data['token'] = $token;
        }

        return response()->json($data, 201)->withCookie($cookie);
    }

    public function logout(Request $r)
    {
        $user = $r->user();
        if($user instanceof User) {
            $current = $user->currentAccessToken();
            if($current instanceof PersonalAccessToken) {
                $current->delete();
            }
        }

        if ($r->hasSession()) {
            \Illuminate\Support\Facades\Auth::guard('web')->logout();
            $r->session()->invalidate();
            $r->session()->regenerateToken();
        }

        // Clear the cookie
        $cookie = Cookie::forget('sanctum_token');

        return response()->json(["message"=>"Logged out"])->withCookie($cookie);
    }

    public function me(Request $r)
    {
        $user = $r->user();
        \Illuminate\Support\Facades\Log::debug("[me] User: " . ($user ? $user->email : 'null'));
        \Illuminate\Support\Facades\Log::debug("[me] Token: " . ($r->bearerToken() ? $r->bearerToken() : 'null'));
        \Illuminate\Support\Facades\Log::debug("[me] Cookie: " . ($r->cookie('sanctum_token') ? 'present' : 'null'));

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

        $user->fill(array_filter($data))->save();
        $user->load(['roles', 'membershipRank']);

        return response()->json(["user"=>new UserResource($user)]);
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

        $path = $data['file']->store('avatars', 'public');
        $user->avatar_url = asset('storage/'.$path);
        $user->save();
        $user->load(['roles', 'membershipRank']);

        return response()->json(["user"=>new UserResource($user)]);
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

        if(!Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(["current_password"=>["Mật khẩu hiện tại không đúng."]]);
        }

        if(Hash::check($data['new_password'], $user->password)) {
            throw ValidationException::withMessages(["new_password"=>["Mật khẩu mới không được trùng với mật khẩu hiện tại."]]);
        }

        $user->password = Hash::make($data['new_password']);
        $user->save();

        // Revoke other tokens but keep current
        $current = $user->currentAccessToken();
        $user->tokens()->where('id', '!=', $current instanceof PersonalAccessToken ? $current->id : 0)->delete();

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

        if(!Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(["password"=>["Password incorrect"]]);
        }

        // Delete user's orders and related data
        \Illuminate\Support\Facades\DB::table('orders')->where('user_id', $user->id)->delete();
        \Illuminate\Support\Facades\DB::table('reviews')->where('user_id', $user->id)->delete();
        \Illuminate\Support\Facades\DB::table('wishlists')->where('user_id', $user->id)->delete();
        \Illuminate\Support\Facades\DB::table('carts')->where('user_id', $user->id)->delete();
        \Illuminate\Support\Facades\DB::table('point_history')->where('user_id', $user->id)->delete();

        // Soft delete - deactivate
        $user->is_active = false;
        $user->email = $user->email.'_deleted_'.$user->id.'_'.time();
        $user->phone = null;
        $user->avatar_url = null;
        $user->save();

        // Revoke all tokens
        $user->tokens()->delete();
        $user->delete();

        return response()->json(["message"=>"Account deleted"]);
    }

    public function googleLogin(Request $r)
    {
        $r->validate([
            'access_token' => 'required|string',
        ]);

        // Gọi Google API để lấy thông tin user từ access_token
        try {
            $googleResponse = \Illuminate\Support\Facades\Http::withToken($r->access_token)
                ->get('https://www.googleapis.com/oauth2/v3/userinfo');

            if (!$googleResponse->successful()) {
                return response()->json([
                    'message' => 'Google token không hợp lệ hoặc đã hết hạn.',
                ], 401);
            }

            $googleUser = $googleResponse->json();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('[googleLogin] Google API error: ' . $e->getMessage());
            return response()->json(['message' => 'Không thể xác thực với Google.'], 500);
        }

        $email = $googleUser['email'] ?? null;
        $name  = $googleUser['name'] ?? ($googleUser['given_name'] ?? 'Google User');
        $googleId = $googleUser['sub'] ?? null;
        $avatarUrl = $googleUser['picture'] ?? null;

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['message' => 'Không lấy được email từ Google.'], 422);
        }

        // Tìm hoặc tạo user theo email
        $user = User::where('email', $email)->first();

        if ($user) {
            // Cập nhật google_id và avatar nếu chưa có
            if (!$user->is_active) {
                return response()->json(['message' => 'Tài khoản đã bị vô hiệu hóa.'], 403);
            }
            $dirty = false;
            if (!$user->google_id && $googleId) {
                $user->google_id = $googleId;
                $dirty = true;
            }
            if (!$user->avatar_url && $avatarUrl) {
                $user->avatar_url = $avatarUrl;
                $dirty = true;
            }
            if ($dirty) {
                $user->save();
            }
        } else {
            // Tạo user mới từ Google
            $user = User::create([
                'name'         => $name,
                'email'        => $email,
                'password'     => Hash::make(\Illuminate\Support\Str::random(32)),
                'google_id'    => $googleId,
                'avatar_url'   => $avatarUrl,
                'is_active'    => true,
                'rank_id'      => 1,
                'total_spent'  => 0,
            ]);

            $customerRole = Role::firstOrCreate(['name' => 'customer', 'guard_name' => 'web']);
            $user->assignRole($customerRole);
        }

        if ($r->hasSession()) {
            $r->session()->regenerate();
            \Illuminate\Support\Facades\Auth::guard('web')->login($user);
        }

        [$token, $cookie] = $this->createTokenResponse($r, $user);

        \Illuminate\Support\Facades\Log::debug('[googleLogin] token generated', [
            'email' => $email ?? null,
            'google_id' => $googleId ?? null,
            'token_present' => $token !== null,
            'cookie_name' => $cookie->getName(),
            'cookie_secure' => $cookie->isSecure(),
        ]);

        $user->load(['roles', 'membershipRank']);

        $data = ['user' => new UserResource($user)];
        if ($token !== null) {
            $data['token'] = $token;
        }

        return response()->json($data)->withCookie($cookie);
    }

    public function loyalty(Request $r)
    {
        $user = $r->user();
        if(!$user instanceof User) {
            return response()->json(["message"=>"Unauthorized"], 401);
        }

        // Refresh user data to get latest rank and total_spent
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
}