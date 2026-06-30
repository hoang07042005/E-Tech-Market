<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e)
    {
        // Nếu là request gọi từ API, chuẩn hóa toàn bộ response lỗi về dạng JSON
        if ($request->is('api/*') || $request->wantsJson()) {
            
            // Lỗi Validation
            if ($e instanceof \Illuminate\Validation\ValidationException) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Dữ liệu không hợp lệ.',
                    'errors' => $e->errors()
                ], 422);
            }

            // Lỗi Authentication (chưa đăng nhập)
            if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Bạn chưa đăng nhập hoặc phiên đã hết hạn.',
                ], 401);
            }

            // Lỗi 403 Forbidden
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Bạn không có quyền thực hiện hành động này.',
                ], 403);
            }

            // Lỗi Không tìm thấy tài nguyên (ModelNotFound, RouteNotFound)
            if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException || 
                $e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Không tìm thấy dữ liệu yêu cầu.',
                ], 404);
            }

            // Các lỗi mặc định khác của HTTP (405, 429...)
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpException) {
                return response()->json([
                    'status' => 'error',
                    'message' => $e->getMessage() ?: 'Lỗi HTTP từ máy chủ.',
                ], $e->getStatusCode());
            }

            // Lỗi Server 500 (chỉ hiển thị chi tiết ở môi trường local)
            $statusCode = 500;
            return response()->json([
                'status' => 'error',
                'message' => config('app.debug') ? $e->getMessage() : 'Đã có lỗi nghiêm trọng xảy ra từ phía máy chủ.',
                'exception' => config('app.debug') ? class_basename($e) : null,
                'file' => config('app.debug') ? $e->getFile() : null,
                'line' => config('app.debug') ? $e->getLine() : null,
            ], $statusCode);
        }

        return parent::render($request, $e);
    }

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }
}