<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ShippingMethod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShippingMethodsController extends Controller
{
    public function index(): JsonResponse
    {
        $methods = ShippingMethod::query()
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'base_fee', 'estimated_days_min', 'estimated_days_max', 'is_active'])
            ->map(static fn(ShippingMethod $m) => [
                'id' => (int) $m->id,
                'name' => (string) $m->name,
                'description' => $m->description ? (string) $m->description : null,
                'base_fee' => (float) ($m->base_fee ?? 0),
                'estimated_days_min' => $m->estimated_days_min !== null ? (int) $m->estimated_days_min : null,
                'estimated_days_max' => $m->estimated_days_max !== null ? (int) $m->estimated_days_max : null,
                'is_active' => (bool) $m->is_active,
            ])->values()->all();

        return response()->json($methods);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'base_fee' => ['required', 'numeric', 'min:0'],
            'estimated_days_min' => ['nullable', 'integer', 'min:0'],
            'estimated_days_max' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $m = ShippingMethod::query()->create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'base_fee' => $data['base_fee'],
            'estimated_days_min' => $data['estimated_days_min'] ?? null,
            'estimated_days_max' => $data['estimated_days_max'] ?? null,
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);

        return response()->json([
            'id' => (int) $m->id,
            'name' => (string) $m->name,
            'description' => $m->description ? (string) $m->description : null,
            'base_fee' => (float) ($m->base_fee ?? 0),
            'estimated_days_min' => $m->estimated_days_min !== null ? (int) $m->estimated_days_min : null,
            'estimated_days_max' => $m->estimated_days_max !== null ? (int) $m->estimated_days_max : null,
            'is_active' => (bool) $m->is_active,
        ], 201);
    }

    public function update(ShippingMethod $method, Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'base_fee' => ['nullable', 'numeric', 'min:0'],
            'estimated_days_min' => ['nullable', 'integer', 'min:0'],
            'estimated_days_max' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $method->fill($data);
        $method->save();

        return response()->json([
            'id' => (int) $method->id,
            'name' => (string) $method->name,
            'description' => $method->description ? (string) $method->description : null,
            'base_fee' => (float) ($method->base_fee ?? 0),
            'estimated_days_min' => $method->estimated_days_min !== null ? (int) $method->estimated_days_min : null,
            'estimated_days_max' => $method->estimated_days_max !== null ? (int) $method->estimated_days_max : null,
            'is_active' => (bool) $method->is_active,
        ]);
    }

    public function destroy(ShippingMethod $method): JsonResponse
    {
        $method->delete();
        return response()->json(['ok' => true]);
    }
}

