<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE inventory ALTER COLUMN reorder_level SET DEFAULT 10');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE inventory ALTER COLUMN reorder_level SET DEFAULT 0');
    }
};
