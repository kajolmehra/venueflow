<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\CheckoutService;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    public function createSession(Request $request, CheckoutService $checkoutService)
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.event_id' => ['required', 'integer', 'exists:events,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'success_url' => ['required', 'url'],
            'cancel_url' => ['required', 'url'],
        ]);

        $order = $checkoutService->createPendingOrder($request->user(), $validated['items']);
        $session = $checkoutService->createCheckoutSession($order, $request->user(), $validated['success_url'], $validated['cancel_url']);

        return response()->json([
            'message' => 'Checkout session created.',
            'checkout' => $session,
            'order' => $this->orderPayload($order->fresh('items')),
        ], 201);
    }

    public function success(Request $request, CheckoutService $checkoutService)
    {
        $validated = $request->validate([
            'session_id' => ['required', 'string'],
        ]);

        $order = $checkoutService->fulfillOrder($validated['session_id']);

        return response()->json([
            'message' => 'Payment confirmed and tickets issued.',
            'order' => $this->orderPayload($order),
        ]);
    }

    protected function orderPayload(Order $order): array
    {
        return [
            'id' => $order->id,
            'status' => $order->status,
            'amount_cents' => $order->amount_cents,
            'currency' => strtoupper($order->currency),
            'payment_reference' => $order->payment_reference,
            'paid_at' => $order->paid_at?->toIso8601String(),
            'items' => $order->items->map(fn ($item) => [
                'event_title' => $item->event_title,
                'quantity' => $item->quantity,
                'unit_price_cents' => $item->unit_price_cents,
                'subtotal_cents' => $item->subtotal_cents,
                'event_date' => $item->event_date?->toDateString(),
                'start_time' => $item->start_time,
                'stadium_name' => $item->stadium_name,
                'country_name' => $item->country_name,
            ]),
            'tickets' => $order->relationLoaded('tickets')
                ? $order->tickets->map(fn ($ticket) => [
                    'ticket_code' => $ticket->ticket_code,
                    'event_title' => $ticket->event?->title,
                    'buyer' => $ticket->purchaser_name,
                    'buyer_email' => $ticket->purchaser_email,
                ])
                : [],
        ];
    }
}
