<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipping_zones', function (Blueprint $table) {
            $table->unique('name', 'shipping_zones_name_unique');
        });

        Schema::table('shipping_methods', function (Blueprint $table) {
            $table->unique('name', 'shipping_methods_name_unique');
        });
    }

    public function down(): void
    {
        Schema::table('shipping_zones', function (Blueprint $table) {
            $table->dropUnique('shipping_zones_name_unique');
        });

        Schema::table('shipping_methods', function (Blueprint $table) {
            $table->dropUnique('shipping_methods_name_unique');
        });
    }
};

