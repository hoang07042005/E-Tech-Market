<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\JsonResponse;

class RolesController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::query()
            ->orderBy('id')
            ->get(['id', 'name', 'slug', 'description']);

        return response()->json($roles);
    }
}
