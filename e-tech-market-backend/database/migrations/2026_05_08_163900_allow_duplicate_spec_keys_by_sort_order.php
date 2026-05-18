<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_product_specs_variant_scope');

        DB::statement(
            'CREATE UNIQUE INDEX uq_product_specs_variant_scope ON product_specs '
            .'(product_id, spec_group, spec_key, (COALESCE(product_variant_id, (-1)::bigint)), sort_order)'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_product_specs_variant_scope');

        DB::statement(
            'CREATE UNIQUE INDEX uq_product_specs_variant_scope ON product_specs '
            .'(product_id, spec_group, spec_key, (COALESCE(product_variant_id, (-1)::bigint)))'
        );
    }
};

