<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AdminDashboardUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public int $adminId,
        public array $payload,
    ) {
    }

    public function broadcastAs(): string
    {
        return 'admin-dashboard.synced';
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("admin.dashboard.{$this->adminId}");
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
