<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Success JSON response
     */
    protected function successResponse($data = null, string $message = 'Success', int $code = 200)
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
     */
    protected function errorResponse(string $message, int $code = 400, $errors = null)
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
    protected function notFoundResponse(string $message = 'Resource not found')
    {
        return $this->errorResponse($message, 404);
    }

    /**
     * Validation error JSON response
     */
    protected function validationErrorResponse(array $errors, string $message = 'Validation failed')
    {
        return $this->errorResponse($message, 422, $errors);
    }

    /**
     * Forbidden JSON response
     */
    protected function forbiddenResponse(string $message = 'Access denied')
    {
        return $this->errorResponse($message, 403);
    }

    /**
     * Unauthorized JSON response
     */
    protected function unauthorizedResponse(string $message = 'Unauthenticated')
    {
        return $this->errorResponse($message, 401);
    }

    /**
     * Server error JSON response
     */
    protected function serverErrorResponse(string $message = 'Server error')
    {
        return $this->errorResponse($message, 500);
    }
}