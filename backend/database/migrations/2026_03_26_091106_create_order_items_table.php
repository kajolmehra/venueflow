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
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('event_id')->nullable();
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('unit_price_cents');
            $table->unsignedInteger('subtotal_cents');
            $table->string('event_title');
            $table->date('event_date');
            $table->string('start_time', 5);
            $table->string('stadium_name');
            $table->string('country_name');
            $table->timestamps();

            $table->index('event_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
