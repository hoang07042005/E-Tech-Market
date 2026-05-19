<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_product_specs');

        Schema::table('product_specs', function (Blueprint $table) {
            if (! Schema::hasColumn('product_specs', 'product_variant_id')) {
                $table->foreignId('product_variant_id')
                    ->nullable()
                    ->after('product_id')
                    ->constrained('product_variants')
                    ->nullOnDelete();
            }
        });

        DB::statement(
            'CREATE UNIQUE INDEX IF NOT EXISTS uq_product_specs_variant_scope ON product_specs '
            .'(product_id, spec_group, spec_key, (COALESCE(product_variant_id, (-1)::bigint)))'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_product_specs_variant_scope');

        Schema::table('product_specs', function (Blueprint $table) {
            if (Schema::hasColumn('product_specs', 'product_variant_id')) {
                $table->dropForeign(['product_variant_id']);
                $table->dropColumn('product_variant_id');
            }
        });

        DB::statement(
            'CREATE UNIQUE INDEX IF NOT EXISTS uq_product_specs '
            .'ON product_specs (product_id, spec_group, spec_key, sort_order)'
        );
    }
};
