<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class Disable2FACommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:disable-2fa {email} {--all}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Disable 2FA for a specific user or all users';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if ($this->option('all')) {
            return $this->disableAllUsers();
        }

        $email = $this->argument('email');
        
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email '{$email}' not found.");
            return self::FAILURE;
        }

        $user->update([
            'google2fa_enabled' => false,
            'google2fa_secret' => null,
        ]);

        $this->info("✅ 2FA disabled for user: {$user->name} ({$user->email})");
        return self::SUCCESS;
    }

    private function disableAllUsers(): int
    {
        if (!$this->confirm('⚠️  This will disable 2FA for ALL users. Continue?')) {
            $this->info('Cancelled.');
            return self::FAILURE;
        }

        $count = User::query()->update([
            'google2fa_enabled' => false,
            'google2fa_secret' => null,
        ]);

        $this->info("✅ 2FA disabled for {$count} users.");
        return self::SUCCESS;
    }
}
