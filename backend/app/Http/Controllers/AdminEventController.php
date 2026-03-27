<?php

namespace App\Http\Controllers;

use App\Events\AdminDashboardUpdated;
use App\Events\CrmDashboardUpdated;
use App\Events\PublicEventsUpdated;
use App\Models\Country;
use App\Models\Event;
use App\Models\Stadium;
use App\Services\AdminDashboardPayloadService;
use App\Services\CrmDashboardPayloadService;
use App\Services\PublicEventPayloadService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AdminEventController extends Controller
{
    public function dashboard(Request $request, AdminDashboardPayloadService $payloads)
    {
        return response()->json($payloads->payload($request->user()->id));
    }

    public function lookups()
    {
        $countries = Country::query()
            ->with(['stadiums' => fn ($query) => $query->orderBy('name')])
            ->orderBy('name')
            ->get();

        return response()->json([
            'countries' => $countries->map(fn (Country $country) => [
                'id' => $country->id,
                'name' => $country->name,
                'stadiums' => $country->stadiums->map(fn (Stadium $stadium) => [
                    'id' => $stadium->id,
                    'name' => $stadium->name,
                ]),
            ]),
        ]);
    }

    public function store(
        Request $request,
        PublicEventPayloadService $publicEvents,
        AdminDashboardPayloadService $adminDashboard,
        CrmDashboardPayloadService $crmDashboard,
    )
    {
        $validated = $this->validatedEvent($request);
        $this->ensureStadiumMatchesCountry($validated['country_id'], $validated['stadium_id']);

        $event = Event::query()->create([
            'admin_id' => $request->user()->id,
            'country_id' => $validated['country_id'],
            'stadium_id' => $validated['stadium_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'event_date' => $validated['event_date'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'price_cents' => (int) round(((float) $validated['price']) * 100),
            'total_tickets' => $validated['total_tickets'],
            'status' => Event::STATUS_ACTIVE,
        ]);

        $response = response()->json([
            'message' => 'Event created successfully.',
            'event' => $this->eventPayload($event->load(['country', 'stadium'])->loadCount('tickets')),
        ], 201);

        $this->broadcastRealtimeUpdates($request->user()->id, $publicEvents, $adminDashboard, $crmDashboard);

        return $response;
    }

    public function update(
        Request $request,
        Event $event,
        PublicEventPayloadService $publicEvents,
        AdminDashboardPayloadService $adminDashboard,
        CrmDashboardPayloadService $crmDashboard,
    )
    {
        $this->ownedEvent($request, $event);
        $validated = $this->validatedEvent($request);
        $this->ensureStadiumMatchesCountry($validated['country_id'], $validated['stadium_id']);

        if ($validated['total_tickets'] < $event->sold_tickets) {
            throw ValidationException::withMessages([
                'total_tickets' => ['Total tickets cannot be lower than tickets already sold.'],
            ]);
        }

        $event->update([
            'country_id' => $validated['country_id'],
            'stadium_id' => $validated['stadium_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'event_date' => $validated['event_date'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'price_cents' => (int) round(((float) $validated['price']) * 100),
            'total_tickets' => $validated['total_tickets'],
        ]);

        $response = response()->json([
            'message' => 'Event updated successfully.',
            'event' => $this->eventPayload($event->fresh(['country', 'stadium'])->loadCount('tickets')),
        ]);

        $this->broadcastRealtimeUpdates($request->user()->id, $publicEvents, $adminDashboard, $crmDashboard);

        return $response;
    }

    public function stop(
        Request $request,
        Event $event,
        PublicEventPayloadService $publicEvents,
        AdminDashboardPayloadService $adminDashboard,
        CrmDashboardPayloadService $crmDashboard,
    )
    {
        $this->ownedEvent($request, $event);

        $event->update([
            'status' => Event::STATUS_STOPPED,
        ]);

        $response = response()->json([
            'message' => 'Event ticket sales have been stopped.',
        ]);

        $this->broadcastRealtimeUpdates($request->user()->id, $publicEvents, $adminDashboard, $crmDashboard);

        return $response;
    }

    public function destroy(
        Request $request,
        Event $event,
        PublicEventPayloadService $publicEvents,
        AdminDashboardPayloadService $adminDashboard,
        CrmDashboardPayloadService $crmDashboard,
    )
    {
        $this->ownedEvent($request, $event);
        $event->delete();

        $response = response()->json([
            'message' => 'Event deleted successfully.',
        ]);

        $this->broadcastRealtimeUpdates($request->user()->id, $publicEvents, $adminDashboard, $crmDashboard);

        return $response;
    }

    protected function broadcastRealtimeUpdates(
        int $adminId,
        PublicEventPayloadService $publicEvents,
        AdminDashboardPayloadService $adminDashboard,
        CrmDashboardPayloadService $crmDashboard,
    ): void
    {
        event(new PublicEventsUpdated($publicEvents->payload()));
        event(new AdminDashboardUpdated($adminId, $adminDashboard->payload($adminId)));
        event(new CrmDashboardUpdated($crmDashboard->payload()));
    }

    protected function eventPayload(Event $event): array
    {
        return [
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
            'revenue_cents' => $event->relationLoaded('tickets') ? $event->tickets->sum('amount_cents') : $event->price_cents * $event->sold_tickets,
            'buyers' => $event->relationLoaded('tickets')
                ? $event->tickets->map(fn ($ticket) => [
                    'ticket_code' => $ticket->ticket_code,
                    'buyer' => $ticket->purchaser_name,
                    'buyer_email' => $ticket->purchaser_email,
                    'amount_cents' => $ticket->amount_cents,
                    'payment_reference' => $ticket->order?->payment_reference,
                    'purchased_at' => $ticket->purchased_at?->toIso8601String(),
                ])->values()
                : [],
        ];
    }

    protected function validatedEvent(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'country_id' => ['required', 'exists:countries,id'],
            'stadium_id' => ['required', 'exists:stadiums,id'],
            'event_date' => ['required', 'date'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'price' => ['required', 'numeric', 'min:1'],
            'total_tickets' => ['required', 'integer', 'min:1'],
        ]);
    }

    protected function ensureStadiumMatchesCountry(int $countryId, int $stadiumId): void
    {
        $isValid = Stadium::query()
            ->whereKey($stadiumId)
            ->where('country_id', $countryId)
            ->exists();

        if (! $isValid) {
            throw ValidationException::withMessages([
                'stadium_id' => ['Choose a stadium that belongs to the selected country.'],
            ]);
        }
    }

    protected function ownedEvent(Request $request, Event $event): void
    {
        if ($event->admin_id !== $request->user()->id || $event->deleted_at !== null) {
            abort(404);
        }
    }
}
