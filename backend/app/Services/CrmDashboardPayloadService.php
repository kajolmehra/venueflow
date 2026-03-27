<?php

namespace App\Services;

use App\Models\Country;
use App\Models\Event;
use App\Models\Order;
use App\Models\Stadium;
use App\Models\Ticket;
use App\Models\User;

class CrmDashboardPayloadService
{
    public function payload(): array
    {
        $admins = User::query()
            ->where('role', User::ROLE_ADMIN)
            ->withCount('events')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        $events = Event::query()
            ->select([
                'id',
                'admin_id',
                'country_id',
                'stadium_id',
                'title',
                'event_date',
                'start_time',
                'end_time',
                'status',
                'deleted_at',
            ])
            ->withTrashed()
            ->with([
                'admin:id,name,email',
                'country:id,name',
                'stadium:id,name',
                'tickets:id,event_id,amount_cents',
            ])
            ->withCount('tickets')
            ->orderBy('event_date')
            ->orderBy('start_time')
            ->get();

        $paidOrders = Order::query()
            ->where('status', Order::STATUS_PAID)
            ->with([
                'user:id,name,email',
                'items:id,order_id,event_id,quantity,subtotal_cents,event_title',
                'items.event:id,admin_id',
            ])
            ->latest('paid_at')
            ->get([
                'id',
                'user_id',
                'amount_cents',
                'currency',
                'purchaser_email',
                'payment_reference',
                'paid_at',
            ]);

        $tickets = Ticket::query()
            ->with([
                'event:id,title,event_date,start_time,admin_id',
                'user:id,name,email',
            ])
            ->latest('purchased_at')
            ->get([
                'id',
                'event_id',
                'user_id',
                'ticket_code',
                'purchaser_name',
                'purchaser_email',
                'amount_cents',
                'payment_reference',
                'purchased_at',
            ]);

        return [
            'summary' => [
                'countries' => Country::query()->count(),
                'stadiums' => Stadium::query()->count(),
                'registered_admins' => $admins->count(),
                'events' => $events->count(),
                'tickets_sold' => $tickets->count(),
                'revenue_cents' => $tickets->sum('amount_cents'),
            ],
            'countries' => Country::query()->withCount(['stadiums', 'events'])->orderBy('name')->get(),
            'stadiums' => Stadium::query()->with('country:id,name')->withCount('events')->orderBy('name')->get(),
            'admins' => $admins->map(fn (User $admin) => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'events_posted' => $admin->events_count,
            ]),
            'events' => $events->map(fn (Event $event) => [
                'id' => $event->id,
                'admin_id' => $event->admin_id,
                'title' => $event->title,
                'status' => $event->deleted_at ? 'deleted' : $event->status,
                'organizer' => $event->admin?->name,
                'country' => $event->country?->name,
                'stadium' => $event->stadium?->name,
                'event_date' => $event->event_date?->toDateString(),
                'start_time' => $event->start_time,
                'end_time' => $event->end_time,
                'tickets_sold' => $event->tickets_count,
                'revenue_cents' => $event->tickets->sum('amount_cents'),
            ]),
            'purchases' => $paidOrders->map(fn (Order $order) => [
                'id' => $order->id,
                'buyer' => $order->user?->name,
                'buyer_email' => $order->purchaser_email,
                'amount_cents' => $order->amount_cents,
                'currency' => strtoupper($order->currency),
                'payment_reference' => $order->payment_reference,
                'paid_at' => $order->paid_at?->toIso8601String(),
                'items' => $order->items->map(fn ($item) => [
                    'event_id' => $item->event_id,
                    'admin_id' => $item->event?->admin_id,
                    'event_title' => $item->event_title,
                    'quantity' => $item->quantity,
                    'subtotal_cents' => $item->subtotal_cents,
                ]),
            ]),
            'tickets' => $tickets->map(fn (Ticket $ticket) => [
                'id' => $ticket->id,
                'event_id' => $ticket->event_id,
                'admin_id' => $ticket->event?->admin_id,
                'ticket_code' => $ticket->ticket_code,
                'event_title' => $ticket->event?->title,
                'buyer' => $ticket->purchaser_name,
                'buyer_email' => $ticket->purchaser_email,
                'amount_cents' => $ticket->amount_cents,
                'payment_reference' => $ticket->payment_reference,
                'purchased_at' => $ticket->purchased_at?->toIso8601String(),
            ]),
        ];
    }
}
