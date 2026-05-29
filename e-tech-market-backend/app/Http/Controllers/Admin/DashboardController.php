<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly AdminDashboardService $dashboardService,
    ) {}

    public function stats(Request $request): JsonResponse
    {
        $range = (string) $request->query('range', 'month');
        $startDateParam = $request->query('start_date');
        $endDateParam = $request->query('end_date');
        $resolution = $request->get('resolution', 'day');

        $statsData = $this->dashboardService->getStats($range, $startDateParam, $endDateParam, $resolution);

        return response()->json($statsData);
    }
}
