<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Require superuser privileges if pg_trgm is not installed, but usually it's fine.
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
        DB::statement('CREATE INDEX IF NOT EXISTS products_name_gin ON products USING gin (name gin_trgm_ops);');
        DB::statement('CREATE INDEX IF NOT EXISTS products_description_gin ON products USING gin (description gin_trgm_ops);');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS products_name_gin;');
        DB::statement('DROP INDEX IF EXISTS products_description_gin;');
    }
};
