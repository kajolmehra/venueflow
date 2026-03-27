<?php

namespace App\Services;

use App\Models\Country;
use App\Models\Event;
use App\Models\Stadium;
use Illuminate\Http\Request;

class PublicEventPayloadService
{
    public function payload(?Request $request = null): array
    {
        $request ??= request();

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
            ->with(['country:id,name', 'stadium:id,name', 'admin:id,name'])
            ->visible()
            ->where('status', Event::STATUS_ACTIVE)
            ->when($request->filled('country_id'), fn ($query) => $query->where('country_id', $request->integer('country_id')))
            ->when($request->filled('stadium_id'), fn ($query) => $query->where('stadium_id', $request->integer('stadium_id')))
            ->when($request->filled('date'), fn ($query) => $query->whereDate('event_date', (string) $request->string('date')))
            ->when($request->filled('time'), fn ($query) => $query
                ->where('start_time', '<=', (string) $request->string('time'))
                ->where('end_time', '>=', (string) $request->string('time')))
            ->orderBy('event_date')
            ->orderBy('start_time')
            ->get();

        return [
            'events' => $events->map(fn (Event $event) => [
                'id' => $event->id,
                'title' => $event->title,
                'description' => $event->description,
                'country' => $event->country?->name,
                'stadium' => $event->stadium?->name,
                'organizer' => $event->admin?->name,
                'event_date' => $event->event_date?->toDateString(),
                'start_time' => $event->start_time,
                'end_time' => $event->end_time,
                'price_cents' => $event->price_cents,
                'total_tickets' => $event->total_tickets,
                'sold_tickets' => $event->sold_tickets,
                'available_tickets' => $event->available_tickets,
                'is_sellable' => $event->is_sellable,
            ]),
            'filters' => [
                'countries' => Country::query()->orderBy('name')->get(['id', 'name']),
                'stadiums' => Stadium::query()->orderBy('name')->get(['id', 'name', 'country_id']),
            ],
            'server_time' => now()->toIso8601String(),
        ];
    }
}
