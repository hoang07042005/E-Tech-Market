<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\MembershipRankResource;
use App\Models\MembershipRank;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MembershipRanksController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $ranks = MembershipRank::orderBy('min_spend', 'asc')->get();

        return response()->json(['data' => MembershipRankResource::collection($ranks)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rank_name' => 'required|string|max:255',
            'min_spend' => 'required|numeric|min:0',
            'point_multiplier' => 'required|numeric|min:1',
            'benefits' => 'nullable|string',
        ]);

        $rank = MembershipRank::create($data);

        return response()->json(['data' => new MembershipRankResource($rank)], 201);
    }

    public function update(Request $request, MembershipRank $membershipRank): JsonResponse
    {
        $data = $request->validate([
            'rank_name' => 'sometimes|string|max:255',
            'min_spend' => 'sometimes|numeric|min:0',
            'point_multiplier' => 'sometimes|numeric|min:1',
            'benefits' => 'nullable|string',
        ]);

        $membershipRank->update($data);

        return response()->json(['data' => new MembershipRankResource($membershipRank)]);
    }

    public function destroy(MembershipRank $membershipRank): JsonResponse
    {
        $rankName = $membershipRank->rank_name;

        // Check if any users have this rank
        $userCount = \App\Models\User::where('rank_id', $membershipRank->id)->count();

        if ($userCount > 0) {
            return response()->json([
                'message' => "Cannot delete rank '{$rankName}' because {$userCount} user(s) are using this rank. Please reassign users to another rank first."
            ], 422);
        }

        $membershipRank->delete();

        return response()->json(['message' => "Rank '{$rankName}' deleted successfully"]);
    }
}