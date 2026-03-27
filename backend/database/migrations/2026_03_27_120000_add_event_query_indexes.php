<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->index(['admin_id', 'deleted_at', 'event_date', 'start_time'], 'events_admin_deleted_date_time_idx');
            $table->index(['status', 'deleted_at', 'event_date', 'start_time'], 'events_status_deleted_date_time_idx');
            $table->index(['stadium_id', 'event_date', 'start_time', 'end_time'], 'events_stadium_date_time_idx');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex('events_admin_deleted_date_time_idx');
            $table->dropIndex('events_status_deleted_date_time_idx');
            $table->dropIndex('events_stadium_date_time_idx');
        });
    }
};
