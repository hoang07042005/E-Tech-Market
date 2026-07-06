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
    public function update(\Illuminate\Http\Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $role->update($validated);

        return response()->json($role);
    }
}
