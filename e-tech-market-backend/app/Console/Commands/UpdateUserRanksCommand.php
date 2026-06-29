<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class UpdateUserRanksCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'loyalty:update-ranks';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Evaluate and update user membership tiers based on annual spending';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting loyalty rank evaluation...');

        $ranks = \App\Models\MembershipRank::orderBy('min_spend', 'desc')->get();

        $users = \App\Models\User::all();
        $count = 0;

        foreach ($users as $user) {
            // Calculate total spent from ALL orders except cancelled (regardless of payment status)
            // This includes: pending, pending_payment, confirmed, delivering, delivered, completed
            $totalSpent = \App\Models\Order::where('user_id', $user->id)
                ->where('status', '!=', 'cancelled')
                ->sum('total_amount');

            $user->total_spent = $totalSpent;

            // If user has no rank, assign default rank (1 = Bronze/Đồng)
            if (!$user->rank_id) {
                $user->rank_id = 1;
            }

            $newRank = $ranks->firstWhere('min_spend', '<=', $totalSpent);

            if ($newRank && $newRank->id !== $user->rank_id) {
                $user->rank_id = $newRank->id;
            }

            $user->save();
            $count++;
        }

        $this->info("Completed! Evaluated {$count} users.");
    }
}
