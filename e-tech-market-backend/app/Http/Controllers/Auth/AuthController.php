<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
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
     * In production: only cookie (no token in body) to prevent XSS theft.
     * In dev: token in body for Bearer auth convenience.
     */
    private function createTokenResponse(User $user, int $minutes = 60 * 24): array
    {
        $expiresAt = Carbon::now()->addMinutes($minutes);
        $token = $user->createToken('auth', ['*'], $expiresAt)->plainTextToken;

        // Determine cookie settings based on environment
        $appUrl = config('app.url', '');
        $isHttps = str_starts_with($appUrl, 'https://');
        $isProduction = app()->isProduction();
        $secure = $isHttps || $isProduction;

        // SameSite: 'none' requires Secure (HTTPS) - else omit for dev
        // laravel default cookie sameSite is 'lax' which blocks cross-site POST
        $sameSite = $secure ? 'none' : null;

        $cookie = Cookie::make('sanctum_token', $token, $minutes, '/', null, $secure, true, false, $sameSite);

        // In production: only return token via httpOnly cookie (token not in body)
        // In dev: return token in body for Bearer auth convenience
        $tokenInBody = $isProduction ? null : $token;

        return [$tokenInBody, $cookie];
    }

    public function login(Request $r)
    {
        $r->validate([
            "email"=>"required|email",
            "password"=>"required|string"
        ]);

        $u = User::where("email",$r->email)->first();

        if(!$u || !Hash::check($r->password,$u->password))
            throw ValidationException::withMessages(["email"=>["Login failed"]]);

        if(!$u->is_active) {
            throw ValidationException::withMessages(["email"=>["Account is disabled"]]);
        }

        [$token, $cookie] = $this->createTokenResponse($u);
        $u->load('roles');

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
        ]);

        $u = User::create([
            "name"=>$r->name,
            "email"=>$r->email,
            "phone"=>$r->phone,
            "password"=>Hash::make($r->password),
            "is_active"=>true
        ]);

        // Assign default role 'customer' to the newly created user
        $customerRole = Role::firstOrCreate(['name' => 'customer', 'guard_name' => 'web']);
        $u->assignRole($customerRole);

        [$token, $cookie] = $this->createTokenResponse($u);
        $u->load('roles');

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

        $user->load('roles');
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
        $user->load('roles');

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
        $user->load('roles');

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
        ]);

        if(!Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(["current_password"=>["Current password incorrect"]]);
        }

        if(Hash::check($data['new_password'], $user->password)) {
            throw ValidationException::withMessages(["new_password"=>["New password cannot be same as current"]]);
        }

        $user->password = Hash::make($data['new_password']);
        $user->save();

        // Revoke other tokens but keep current
        $current = $user->currentAccessToken();
        $user->tokens()->where('id', '!=', $current?->id)->delete();

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

        // Soft delete - deactivate
        $user->is_active = false;
        $user->email = $user->email.'_deleted_'.$user->id.'_'.time();
        $user->phone = null;
        $user->avatar_url = null;
        $user->save();

        // Revoke all tokens
        $user->tokens()->delete();

        return response()->json(["message"=>"Account deleted"]);
    }
}
