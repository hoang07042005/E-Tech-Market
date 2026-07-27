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
        ], [
            'email.required' => 'Vui lòng nhập email.',
            'email.email' => 'Email không hợp lệ.',
        ]);

        /** @var User|null $user */
        $user = User::where('email', $data['email'])->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Không tìm thấy email.'],
            ]);
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
        ], [
            'email.required' => 'Vui lòng nhập email.',
            'email.email' => 'Email không hợp lệ.',
            'password.required' => 'Vui lòng nhập mật khẩu.',
            'password.confirmed' => 'Mật khẩu không trùng khớp.',
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
            $msg = $status === Password::INVALID_USER ? 'Không tìm thấy email.' : 'Token không hợp lệ hoặc đã hết hạn.';
            throw ValidationException::withMessages([
                'email' => [$msg],
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
