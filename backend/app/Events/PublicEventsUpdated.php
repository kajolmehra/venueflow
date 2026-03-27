<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PublicEventsUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(public array $payload)
    {
    }

    public function broadcastAs(): string
    {
        return 'public-events.synced';
    }

    public function broadcastOn(): Channel
    {
        return new Channel('events.public');
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
