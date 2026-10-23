<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;

class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Success JSON response
     *
     * @param mixed $data
     */
    protected function successResponse($data = null, string $message = 'Success', int $code = 200): JsonResponse
    {
        $response = [
            'success' => true,
            'message' => $message,
        ];

        if ($data !== null) {
            $response['data'] = $data;
        }

        return response()->json($response, $code);
    }

    /**
     * Error JSON response
     *
     * @param mixed $errors
     */
    protected function errorResponse(string $message, int $code = 400, $errors = null): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $code);
    }

    /**
     * Not found JSON response
     */
    protected function notFoundResponse(string $message = 'Không tìm thấy dữ liệu.'): JsonResponse
    {
        return $this->errorResponse($message, 404);
    }

    /**
     * Validation error JSON response
     *
     * @param array<string, mixed> $errors
     */
    protected function validationErrorResponse(array $errors, string $message = 'Lỗi xác thực dữ liệu.'): JsonResponse
    {
        return $this->errorResponse($message, 422, $errors);
    }

    /**
     * Forbidden JSON response
     */
    protected function forbiddenResponse(string $message = 'Access denied'): JsonResponse
    {
        return $this->errorResponse($message, 403);
    }

    /**
     * Unauthorized JSON response
     */
    protected function unauthorizedResponse(string $message = 'Unauthenticated'): JsonResponse
    {
        return $this->errorResponse($message, 401);
    }

    /**
     * Server error JSON response
     */
    protected function serverErrorResponse(string $message = 'Lỗi máy chủ.'): JsonResponse
    {
        return $this->errorResponse($message, 500);
    }
}