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
            abort(400, '2FA is already enabled.');
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
            abort(400, '2FA is already enabled.');
        }

        if (!$user->google2fa_secret) {
            abort(400, 'Please setup 2FA first.');
        }

        $google2fa = new Google2FA();
        $valid = $google2fa->verifyKey($user->google2fa_secret, $request->otp);

        if ($valid) {
            $user->google2fa_enabled = true;
            $user->save();
            return response()->json(['message' => '2FA has been successfully enabled.']);
        }

        abort(422, 'Invalid OTP code.');
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
            abort(422, 'Incorrect password.');
        }
        
        $user->google2fa_enabled = false;
        $user->google2fa_secret = null;
        $user->save();
        
        return response()->json(['message' => '2FA has been disabled.']);
    }
}
