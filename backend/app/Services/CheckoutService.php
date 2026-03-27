<?php

namespace App\Services;

use App\Events\AdminDashboardUpdated;
use App\Events\CrmDashboardUpdated;
use App\Events\PublicEventsUpdated;
use App\Models\Event;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Stripe\StripeClient;

class CheckoutService
{
    public function __construct(
        protected PublicEventPayloadService $publicEvents,
        protected AdminDashboardPayloadService $adminDashboard,
        protected CrmDashboardPayloadService $crmDashboard,
    ) {
    }

    public function createPendingOrder(User $user, array $items): Order
    {
        if ($items === []) {
            throw ValidationException::withMessages([
                'items' => ['Add at least one ticket before starting checkout.'],
            ]);
        }

        $eventIds = collect($items)
            ->pluck('event_id')
            ->filter()
            ->unique()
            ->values();

        $events = Event::query()
            ->with(['country', 'stadium'])
            ->whereIn('id', $eventIds)
            ->get()
            ->keyBy('id');

        $normalizedItems = collect($items)->map(function (array $item) use ($events) {
            $event = $events->get($item['event_id'] ?? null);
            $quantity = (int) ($item['quantity'] ?? 0);

            if (! $event) {
                throw ValidationException::withMessages([
                    'items' => ['One of the selected events no longer exists.'],
                ]);
            }

            if ($quantity < 1) {
                throw ValidationException::withMessages([
                    'items' => ['Ticket quantity must be at least 1.'],
                ]);
            }

            if ($event->deleted_at !== null || $event->status !== Event::STATUS_ACTIVE) {
                throw ValidationException::withMessages([
                    'items' => ["{$event->title} is no longer available for booking."],
                ]);
            }

            if ($event->available_tickets < $quantity) {
                throw ValidationException::withMessages([
                    'items' => ["Only {$event->available_tickets} tickets are left for {$event->title}."],
                ]);
            }

            return [
                'event' => $event,
                'quantity' => $quantity,
                'subtotal_cents' => $event->price_cents * $quantity,
            ];
        });

        return DB::transaction(function () use ($user, $normalizedItems) {
            $order = Order::query()->create([
                'user_id' => $user->id,
                'amount_cents' => $normalizedItems->sum('subtotal_cents'),
                'currency' => config('services.stripe.currency', 'inr'),
                'status' => Order::STATUS_PENDING,
                'purchaser_name' => $user->name,
                'purchaser_email' => $user->email,
            ]);

            $normalizedItems->each(function (array $item) use ($order) {
                /** @var Event $event */
                $event = $item['event'];

                $order->items()->create([
                    'event_id' => $event->id,
                    'quantity' => $item['quantity'],
                    'unit_price_cents' => $event->price_cents,
                    'subtotal_cents' => $item['subtotal_cents'],
                    'event_title' => $event->title,
                    'event_date' => $event->event_date,
                    'start_time' => $this->formatOrderItemTime($event->start_time),
                    'stadium_name' => $event->stadium?->name,
                    'country_name' => $event->country?->name,
                ]);
            });

            return $order->load('items');
        });
    }

    public function createCheckoutSession(Order $order, User $user, string $successUrl, string $cancelUrl): array
    {
        $publishableKey = trim((string) config('services.stripe.publishable_key'));
        $secret = trim((string) config('services.stripe.secret'));

        if ($publishableKey === '' || $secret === '') {
            return $this->createDemoCheckoutSession($order, $successUrl);
        }

        if (! str_starts_with($publishableKey, 'pk_test_') || ! str_starts_with($secret, 'sk_test_')) {
            throw ValidationException::withMessages([
                'payment' => ['Only Stripe test mode keys are allowed for this project.'],
            ]);
        }

        $stripe = new StripeClient($secret);
        $session = $stripe->checkout->sessions->create([
            'mode' => 'payment',
            'customer_email' => $user->email,
            'client_reference_id' => (string) $order->id,
            'metadata' => [
                'order_id' => (string) $order->id,
                'portal' => 'venueflow',
            ],
            'success_url' => $successUrl.'?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $cancelUrl,
            'line_items' => $order->items->map(function (OrderItem $item) {
                return [
                    'quantity' => $item->quantity,
                    'price_data' => [
                        'currency' => config('services.stripe.currency', 'inr'),
                        'unit_amount' => $item->unit_price_cents,
                        'product_data' => [
                            'name' => $item->event_title,
                            'description' => trim("{$item->country_name} | {$item->stadium_name} | {$item->event_date?->format('d M Y')}"),
                        ],
                    ],
                ];
            })->all(),
        ]);

        $order->forceFill([
            'stripe_session_id' => $session->id,
            'payment_reference' => $session->payment_intent ?: 'checkout-session',
        ])->save();

        return [
            'session_id' => $session->id,
            'checkout_url' => $session->url,
            'mode' => 'stripe',
        ];
    }

    public function fulfillOrder(string $sessionId): Order
    {
        $session = $this->resolveSessionPayload($sessionId);
        $orderId = (int) ($session['order_id'] ?? 0);

        return DB::transaction(function () use ($orderId, $session, $sessionId) {
            /** @var Order $order */
            $order = Order::query()
                ->with('items')
                ->lockForUpdate()
                ->findOrFail($orderId);

            if ($order->status === Order::STATUS_PAID) {
                return $order->load(['items', 'tickets', 'user']);
            }

            $events = Event::query()
                ->withTrashed()
                ->whereIn('id', $order->items->pluck('event_id')->filter())
                ->get()
                ->keyBy('id');

            foreach ($order->items as $item) {
                /** @var Event|null $event */
                $event = $events->get($item->event_id);

                if (! $event || $event->deleted_at !== null || $event->status !== Event::STATUS_ACTIVE) {
                    $this->markFailedOrder($order, "The event {$item->event_title} is no longer bookable.");
                }

                if ($event->available_tickets < $item->quantity) {
                    $this->markFailedOrder($order, "Not enough seats are left for {$item->event_title}.");
                }
            }

            foreach ($order->items as $item) {
                /** @var Event $event */
                $event = $events->get($item->event_id);
                $event->increment('sold_tickets', $item->quantity);

                for ($count = 1; $count <= $item->quantity; $count++) {
                    Ticket::query()->create([
                        'order_id' => $order->id,
                        'event_id' => $event->id,
                        'user_id' => $order->user_id,
                        'ticket_code' => $this->ticketCode($event->id),
                        'purchaser_name' => $order->purchaser_name,
                        'purchaser_email' => $order->purchaser_email,
                        'amount_cents' => $item->unit_price_cents,
                        'payment_reference' => $session['payment_reference'],
                        'purchased_at' => Carbon::parse($session['paid_at']),
                    ]);
                }
            }

            $order->forceFill([
                'status' => Order::STATUS_PAID,
                'stripe_session_id' => $sessionId,
                'stripe_payment_intent_id' => $session['payment_intent'],
                'payment_reference' => $session['payment_reference'],
                'payment_payload' => $session,
                'paid_at' => Carbon::parse($session['paid_at']),
            ])->save();

            $order = $order->load(['items', 'tickets.event', 'user']);

            $this->broadcastRealtimeUpdates($events->keys()->map(fn ($id) => (int) $id)->all());

            return $order;
        });
    }

    protected function resolveSessionPayload(string $sessionId): array
    {
        $order = Order::query()->where('stripe_session_id', $sessionId)->firstOrFail();

        if (($order->payment_payload['mode'] ?? null) === 'demo' || str_starts_with($sessionId, 'demo_')) {
            return [
                'order_id' => $order->id,
                'paid_at' => $order->payment_payload['paid_at'] ?? now()->toIso8601String(),
                'payment_intent' => '',
                'payment_reference' => $order->payment_reference ?: $sessionId,
                'status' => 'paid',
            ];
        }

        $secret = trim((string) config('services.stripe.secret'));
        $stripe = new StripeClient($secret);
        $session = $stripe->checkout->sessions->retrieve($sessionId);

        if (($session->payment_status ?? null) !== 'paid') {
            throw ValidationException::withMessages([
                'payment' => ['Stripe has not marked this checkout session as paid yet.'],
            ]);
        }

        return [
            'order_id' => (int) ($session->metadata->order_id ?? $order->id),
            'paid_at' => now()->toIso8601String(),
            'payment_intent' => (string) ($session->payment_intent ?? ''),
            'payment_reference' => (string) ($session->payment_intent ?? $session->id),
            'status' => 'paid',
        ];
    }

    protected function ticketCode(int $eventId): string
    {
        return 'VF-'.$eventId.'-'.Str::upper(Str::random(8));
    }

    protected function markFailedOrder(Order $order, string $message): never
    {
        $order->forceFill([
            'status' => Order::STATUS_FAILED,
            'payment_payload' => [
                'reason' => $message,
            ],
        ])->save();

        throw ValidationException::withMessages([
            'payment' => [$message],
        ]);
    }

    protected function createDemoCheckoutSession(Order $order, string $successUrl): array
    {
        $sessionId = 'demo_'.Str::lower(Str::random(24));
        $paidAt = now()->toIso8601String();
        $paymentReference = 'demo-payment-'.$order->id;

        $order->forceFill([
            'stripe_session_id' => $sessionId,
            'payment_reference' => $paymentReference,
            'payment_payload' => [
                'mode' => 'demo',
                'paid_at' => $paidAt,
            ],
        ])->save();

        return [
            'session_id' => $sessionId,
            'checkout_url' => $successUrl.'?session_id='.$sessionId,
            'mode' => 'demo',
        ];
    }

    protected function formatOrderItemTime(mixed $value): string
    {
        $time = trim((string) $value);

        if ($time === '') {
            return '';
        }

        return substr($time, 0, 5);
    }

    protected function broadcastRealtimeUpdates(array $eventIds): void
    {
        $adminIds = Event::query()
            ->whereIn('id', $eventIds)
            ->pluck('admin_id')
            ->filter()
            ->unique()
            ->map(fn ($id) => (int) $id)
            ->all();

        event(new PublicEventsUpdated($this->publicEvents->payload()));
        event(new CrmDashboardUpdated($this->crmDashboard->payload()));

        foreach ($adminIds as $adminId) {
            event(new AdminDashboardUpdated($adminId, $this->adminDashboard->payload($adminId)));
        }
    }
}
