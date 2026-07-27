<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use PragmaRX\Google2FAQRCode\Google2FA;

class TwoFactorController extends Controller
{
    /**
     * Setup 2FA for the user (Generate Secret & QR code info)
     */
    public function setup(Request $request)
    {
        $user = $request->user();

        // If already enabled, return error
        if ($user->google2fa_enabled) {
            abort(400, 'Xác thực 2 bước (2FA) đã được bật từ trước.');
        }

        $google2fa = new Google2FA();
        
        // Generate new secret
        $secret = $google2fa->generateSecretKey();
        
        // Save to user (temporarily enabled=false until verified)
        $user->google2fa_secret = $secret;
        $user->save();

        // Tạo QR Code dưới dạng SVG string
        $svg = $google2fa->getQRCodeInline(
            config('app.name'),
            $user->email,
            $secret
        );
        
        $inlineUrl = 'data:image/svg+xml;base64,' . base64_encode($svg);

        return response()->json([
            'secret' => $secret,
            'qr_code_url' => $inlineUrl
        ]);
    }

    /**
     * Verify OTP and enable 2FA
     */
    public function verify(Request $request)
    {
        $request->validate([
            'otp' => 'required|string|size:6'
        ]);

        $user = $request->user();

        if ($user->google2fa_enabled) {
            abort(400, 'Xác thực 2 bước (2FA) đã được bật từ trước.');
        }

        if (!$user->google2fa_secret) {
            abort(400, 'Vui lòng thiết lập 2FA trước.');
        }

        $google2fa = new Google2FA();
        $valid = $google2fa->verifyKey($user->google2fa_secret, $request->otp);

        if ($valid) {
            $user->google2fa_enabled = true;
            $user->save();
            return response()->json(['message' => 'Xác thực 2 bước (2FA) đã được bật thành công.']);
        }

        abort(422, 'Mã OTP không hợp lệ.');
    }
    
    /**
     * Disable 2FA
     */
    public function disable(Request $request)
    {
        $request->validate([
            'password' => 'required|string'
        ]);
        
        $user = $request->user();
        
        if (!\Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
            abort(422, 'Mật khẩu không đúng.');
        }
        
        $user->google2fa_enabled = false;
        $user->google2fa_secret = null;
        $user->save();
        
        return response()->json(['message' => 'Xác thực 2 bước (2FA) đã bị tắt.']);
    }
}
