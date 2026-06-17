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
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });

        // Custom rendering for ValidationException
        $this->renderable(function (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        });

        // Custom rendering for AuthenticationException
        $this->renderable(function (AuthenticationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
            ], 401);
        });

        // Custom rendering for AccessDeniedHttpException
        $this->renderable(function (AccessDeniedHttpException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied',
            ], 403);
        });

        // Custom rendering for NotFoundHttpException
        $this->renderable(function (NotFoundHttpException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Resource not found',
            ], 404);
        });
    }

    /**
     * Prepare a JSON response for the given exception.
     */
    protected function prepareJsonResponse($request, Throwable $e)
    {
        $status = $this->isHttpException($e) ? $e->getStatusCode() : 500;

        return response()->json([
            'success' => false,
            'message' => app()->environment('production')
                ? 'Server error occurred'
                : $this->getMessage($e),
            'debug' => !app()->environment('production') ? [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ] : null,
        ], $status);
    }

    /**
     * Get the message from the exception.
     */
    private function getMessage(Throwable $e): string
    {
        $message = $e->getMessage();

        if (empty($message)) {
            return 'No error message available';
        }

        return $message;
    }
}