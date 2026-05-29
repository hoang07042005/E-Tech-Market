<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ShippingZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Requests\Admin\StoreShippingZoneRequest;
use App\Http\Requests\Admin\UpdateShippingZoneRequest;

class ShippingZonesController extends Controller
{
    public function index(): JsonResponse
    {
        $zones = ShippingZone::query()
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get()
            ->map(static fn(ShippingZone $z) => [
                'id' => (int) $z->id,
                'name' => (string) $z->name,
                'eta' => $z->eta ? (string) $z->eta : null,
                'fee' => (float) ($z->fee ?? 0),
                'is_active' => (bool) $z->is_active,
            ])->values()->all();

        return response()->json($zones);
    }

    public function store(StoreShippingZoneRequest $request): JsonResponse
    {
        $data = $request->validated();

        $z = ShippingZone::query()->create([
            'name' => $data['name'],
            'eta' => $data['eta'] ?? null,
            'fee' => $data['fee'],
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);

        return response()->json([
            'id' => (int) $z->id,
            'name' => (string) $z->name,
            'eta' => $z->eta ? (string) $z->eta : null,
            'fee' => (float) ($z->fee ?? 0),
            'is_active' => (bool) $z->is_active,
        ], 201);
    }

    public function update(ShippingZone $zone, UpdateShippingZoneRequest $request): JsonResponse
    {
        $data = $request->validated();

        $zone->fill($data);
        $zone->save();

        return response()->json([
            'id' => (int) $zone->id,
            'name' => (string) $zone->name,
            'eta' => $zone->eta ? (string) $zone->eta : null,
            'fee' => (float) ($zone->fee ?? 0),
            'is_active' => (bool) $zone->is_active,
        ]);
    }

    public function destroy(ShippingZone $zone): JsonResponse
    {
        $zone->delete();
        return response()->json(['ok' => true]);
    }
}

