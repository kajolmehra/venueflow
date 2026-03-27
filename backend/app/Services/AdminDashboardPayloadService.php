<?php

namespace App\Services;

use App\Models\Event;

class AdminDashboardPayloadService
{
    public function payload(int $adminId): array
    {
        $events = Event::query()
            ->select([
                'id',
                'admin_id',
                'country_id',
                'stadium_id',
                'title',
                'description',
                'event_date',
                'start_time',
                'end_time',
                'price_cents',
                'total_tickets',
                'sold_tickets',
                'status',
                'deleted_at',
            ])
            ->withTrashed()
            ->where('admin_id', $adminId)
            ->with([
                'country:id,name',
                'stadium:id,name',
                'tickets:id,event_id,order_id,ticket_code,purchaser_name,purchaser_email,amount_cents,purchased_at',
                'tickets.order:id,payment_reference,paid_at',
            ])
            ->withCount('tickets')
            ->orderByDesc('event_date')
            ->orderByDesc('start_time')
            ->get();

        return [
            'summary' => [
                'total_events' => $events->count(),
                'live_events' => $events->where('status', Event::STATUS_ACTIVE)->whereNull('deleted_at')->count(),
                'stopped_events' => $events->where('status', Event::STATUS_STOPPED)->whereNull('deleted_at')->count(),
                'deleted_events' => $events->whereNotNull('deleted_at')->count(),
                'tickets_sold' => $events->sum('tickets_count'),
                'revenue_cents' => $events->sum(fn (Event $event) => $event->tickets->sum('amount_cents')),
            ],
            'events' => $events->map(fn (Event $event) => [
                'id' => $event->id,
                'title' => $event->title,
                'description' => $event->description,
                'country_id' => $event->country_id,
                'country' => $event->country?->name,
                'stadium_id' => $event->stadium_id,
                'stadium' => $event->stadium?->name,
                'event_date' => $event->event_date?->toDateString(),
                'start_time' => $event->start_time,
                'end_time' => $event->end_time,
                'price_cents' => $event->price_cents,
                'total_tickets' => $event->total_tickets,
                'sold_tickets' => $event->sold_tickets,
                'available_tickets' => $event->available_tickets,
                'status' => $event->deleted_at ? 'deleted' : $event->status,
                'revenue_cents' => $event->tickets->sum('amount_cents'),
                'buyers' => $event->tickets->map(fn ($ticket) => [
                    'ticket_code' => $ticket->ticket_code,
                    'buyer' => $ticket->purchaser_name,
                    'buyer_email' => $ticket->purchaser_email,
                    'amount_cents' => $ticket->amount_cents,
                    'payment_reference' => $ticket->order?->payment_reference,
                    'purchased_at' => $ticket->purchased_at?->toIso8601String(),
                ])->values(),
            ]),
        ];
    }
}
