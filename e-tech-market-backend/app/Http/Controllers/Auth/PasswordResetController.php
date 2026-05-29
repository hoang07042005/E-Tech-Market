<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\PasswordResetLinkNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    public function forgot(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        /** @var User|null $user */
        $user = User::where('email', $data['email'])->first();

        // Always respond OK to avoid user enumeration.
        if (! $user) {
            return response()->json(['ok' => true]);
        }

        $token = Password::broker()->createToken($user);
        $user->notify(new PasswordResetLinkNotification(
            token: $token,
            email: (string) $user->email,
        ));

        return response()->json(['ok' => true]);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', \Illuminate\Validation\Rules\Password::min(8)->mixedCase()->numbers()->symbols(), 'confirmed'],
        ]);

        $status = Password::broker()->reset(
            [
                'email' => $data['email'],
                'token' => $data['token'],
                'password' => $data['password'],
                'password_confirmation' => $data['password_confirmation'] ?? $data['password'],
            ],
            function (User $user, string $password) {
                $user->password = Hash::make($password);
                $user->setRememberToken(str()->random(60));
                $user->save();

                // Revoke all tokens after password change (force relogin).
                $user->tokens()->delete();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
