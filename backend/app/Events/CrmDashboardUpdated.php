<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CrmDashboardUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(public array $payload)
    {
    }

    public function broadcastAs(): string
    {
        return 'crm-dashboard.synced';
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('crm.dashboard');
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
