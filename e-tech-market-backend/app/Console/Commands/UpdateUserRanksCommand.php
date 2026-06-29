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
        $oneYearAgo = now()->subYear();

        $users = \App\Models\User::all();
        $count = 0;

        foreach ($users as $user) {
            // Calculate total spent in the last 365 days
            $annualSpent = \App\Models\Order::where('user_id', $user->id)
                ->where('payment_status', 'paid')
                ->where('status', 'delivered')
                ->where('created_at', '>=', $oneYearAgo)
                ->sum('total_amount');

            $user->total_spent = $annualSpent;
            
            $newRank = $ranks->firstWhere('min_spend', '<=', $annualSpent);
            
            if ($newRank && $newRank->id !== $user->rank_id) {
                $user->rank_id = $newRank->id;
            }
            
            $user->save();
            $count++;
        }

        $this->info("Completed! Evaluated {$count} users.");
    }
}
