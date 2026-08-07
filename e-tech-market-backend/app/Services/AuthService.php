<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Str;

class AuthService
{
    /**
     * Create a new token for the user and set as httpOnly cookie.
     */
    public function createTokenAndCookie(Request $r, User $user, int $minutes = 60 * 24): array
    {
        $expiresAt = Carbon::now()->addMinutes($minutes);
        $tokenName = substr($r->userAgent() ?? 'Unknown Device', 0, 255);
        
        $isMobileClient = $r->header('X-Client-Platform') === 'mobile';
        if ($isMobileClient) {
            $tokenName = 'E-Tech App • ' . $tokenName;
        }

        $token = $user->createToken($tokenName, ['*'], $expiresAt)->plainTextToken;

        $appUrl = config('app.url', '');
        $isHttps = str_starts_with($appUrl, 'https://');
        $isProduction = app()->isProduction();
        $secure = $isHttps || $isProduction;

        $sameSite = $secure ? 'none' : null;

        $cookie = Cookie::make('sanctum_token', $token, $minutes, '/', null, $secure, true, false, $sameSite);

        $tokenInBody = ($secure && !$isMobileClient) ? null : $token;

        return [$tokenInBody, $cookie];
    }

    public function login(Request $r, array $credentials, ?string $otp)
    {
        $u = User::where("email", $credentials['email'])->first();

        if(!$u) {
            throw ValidationException::withMessages(["email"=>["Sai mật khẩu hoặc email không tồn tại."]]);
        }

        if ($u->is_locked || is_null($u->password)) {
            throw ValidationException::withMessages(["email"=>["Tài khoản của bạn đang trong trạng thái yêu cầu đặt lại mật khẩu. Vui lòng kiểm tra email để nhận liên kết thiết lập mật khẩu mới."]]);
        }

        if(!Hash::check($credentials['password'], $u->password)) {
            throw ValidationException::withMessages(["email"=>["Sai mật khẩu hoặc email không tồn tại."]]);
        }

        if(!$u->is_active) {
            throw ValidationException::withMessages(["email"=>["Tài khoản của bạn đã bị vô hiệu hóa."]]);
        }

        if ($u->google2fa_enabled) {
            if (empty($otp)) {
                return ['requires_2fa' => true, 'message' => '2FA authentication required.'];
            }
            $google2fa = new \PragmaRX\Google2FAQRCode\Google2FA();
            if (!$google2fa->verifyKey($u->google2fa_secret, $otp)) {
                throw ValidationException::withMessages(["otp" => ["Mã 2FA không chính xác."]]);
            }
        }

        if ($r->hasSession()) {
            $r->session()->regenerate();
            \Illuminate\Support\Facades\Auth::guard('web')->login($u);
        }

        $u->load(['roles', 'membershipRank']);
        [$token, $cookie] = $this->createTokenAndCookie($r, $u);

        return [
            'user' => $u,
            'token' => $token,
            'cookie' => $cookie,
            'requires_2fa' => false
        ];
    }

    public function register(Request $r, array $data)
    {
        $u = User::create([
            "name" => $data['name'],
            "email" => $data['email'],
            "phone" => $data['phone'],
            "password" => Hash::make($data['password']),
            "is_active" => true,
            "rank_id" => 1,
            "total_spent" => 0
        ]);

        $customerRole = Role::firstOrCreate(['name' => 'customer', 'guard_name' => 'web']);
        $u->assignRole($customerRole);

        if ($r->hasSession()) {
            $r->session()->regenerate();
            \Illuminate\Support\Facades\Auth::guard('web')->login($u);
        }

        $u->load(['roles', 'membershipRank']);
        [$token, $cookie] = $this->createTokenAndCookie($r, $u);

        return [
            'user' => $u,
            'token' => $token,
            'cookie' => $cookie
        ];
    }

    public function logout(Request $r, User $user)
    {
        $current = $user->currentAccessToken();
        if($current instanceof PersonalAccessToken) {
            $current->delete();
        }

        if ($r->hasSession()) {
            \Illuminate\Support\Facades\Auth::guard('web')->logout();
            $r->session()->invalidate();
            $r->session()->regenerateToken();
        }

        return Cookie::forget('sanctum_token');
    }

    public function updateProfile(User $user, array $data): User
    {
        $user->fill(array_filter($data))->save();
        $user->load(['roles', 'membershipRank']);
        return $user;
    }

    public function updateAvatar(User $user, $file): User
    {
        $path = $file->store('avatars', 'public');
        $user->avatar_url = asset('storage/'.$path);
        $user->save();
        $user->load(['roles', 'membershipRank']);
        return $user;
    }

    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if(!Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages(["current_password"=>["Mật khẩu hiện tại không đúng."]]);
        }

        if(Hash::check($newPassword, $user->password)) {
            throw ValidationException::withMessages(["new_password"=>["Mật khẩu mới không được trùng với mật khẩu hiện tại."]]);
        }

        $user->password = Hash::make($newPassword);
        $user->save();

        $current = $user->currentAccessToken();
        $user->tokens()->where('id', '!=', $current instanceof PersonalAccessToken ? $current->id : 0)->delete();
    }

    public function deleteAccount(User $user, string $password): void
    {
        if(!Hash::check($password, $user->password)) {
            throw ValidationException::withMessages(["password"=>["Password incorrect"]]);
        }

        \Illuminate\Support\Facades\DB::table('orders')->where('user_id', $user->id)->delete();
        \Illuminate\Support\Facades\DB::table('reviews')->where('user_id', $user->id)->delete();
        \Illuminate\Support\Facades\DB::table('wishlists')->where('user_id', $user->id)->delete();
        \Illuminate\Support\Facades\DB::table('carts')->where('user_id', $user->id)->delete();
        \Illuminate\Support\Facades\DB::table('point_history')->where('user_id', $user->id)->delete();

        $user->is_active = false;
        $user->email = $user->email.'_deleted_'.$user->id.'_'.time();
        $user->phone = null;
        $user->avatar_url = null;
        $user->save();

        $user->tokens()->delete();
        $user->delete();
    }

    public function googleLogin(Request $r, string $accessToken)
    {
        try {
            $googleResponse = \Illuminate\Support\Facades\Http::withToken($accessToken)
                ->get('https://www.googleapis.com/oauth2/v3/userinfo');

            if (!$googleResponse->successful()) {
                throw new \Exception('Google token không hợp lệ hoặc đã hết hạn.');
            }

            $googleUser = $googleResponse->json();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('[googleLogin] Google API error: ' . $e->getMessage());
            throw new \Exception('Không thể xác thực với Google.');
        }

        $email = $googleUser['email'] ?? null;
        $name  = $googleUser['name'] ?? ($googleUser['given_name'] ?? 'Google User');
        $googleId = $googleUser['sub'] ?? null;
        $avatarUrl = $googleUser['picture'] ?? null;

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \Exception('Không lấy được email từ Google.');
        }

        $user = User::where('email', $email)->first();

        if ($user) {
            if (!$user->is_active) {
                throw new \Exception('Tài khoản đã bị vô hiệu hóa.');
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
            $user = User::create([
                'name'         => $name,
                'email'        => $email,
                'password'     => Hash::make(Str::random(32)),
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

        [$token, $cookie] = $this->createTokenAndCookie($r, $user);
        $user->load(['roles', 'membershipRank']);

        return [
            'user' => $user,
            'token' => $token,
            'cookie' => $cookie
        ];
    }

    public function validateLockedResetToken(string $email, string $token): void
    {
        $user = User::where('email', $email)->first();

        if (!$user || $user->reset_token !== hash('sha256', $token)) {
            throw new \Exception('Liên kết không hợp lệ.', 400);
        }

        if (Carbon::now()->isAfter($user->reset_token_expires_at)) {
            throw new \Exception('Liên kết đặt lại mật khẩu đã hết hạn (quá 15 phút). Vui lòng gửi lại yêu cầu hỗ trợ.', 400);
        }
    }

    public function resetLockedPassword(Request $r, string $email, string $token, string $password)
    {
        $user = User::where('email', $email)->first();

        if (!$user || $user->reset_token !== hash('sha256', $token)) {
            throw new \Exception('Liên kết không hợp lệ.', 400);
        }

        if (Carbon::now()->isAfter($user->reset_token_expires_at)) {
            throw new \Exception('Liên kết đặt lại mật khẩu đã hết hạn (quá 15 phút). Vui lòng gửi lại yêu cầu hỗ trợ.', 400);
        }

        $user->password = Hash::make($password);
        $user->reset_token = null;
        $user->reset_token_expires_at = null;
        $user->is_locked = false; 
        $user->save();

        if ($r->hasSession()) {
            $r->session()->regenerate();
            \Illuminate\Support\Facades\Auth::guard('web')->login($user);
        }

        [$authToken, $cookie] = $this->createTokenAndCookie($r, $user);
        $user->load(['roles', 'membershipRank']);

        return [
            'user' => $user,
            'token' => $authToken,
            'cookie' => $cookie
        ];
    }
}
