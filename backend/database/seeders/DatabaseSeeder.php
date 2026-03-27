<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\Event;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Stadium;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        DB::transaction(function () {
            Ticket::query()->delete();
            OrderItem::query()->delete();
            Order::query()->delete();
            Event::query()->withTrashed()->forceDelete();
            Stadium::query()->delete();
            Country::query()->delete();
            User::query()->whereIn('role', [User::ROLE_SUPER_ADMIN, User::ROLE_ADMIN, User::ROLE_USER])->delete();

            User::query()->create([
                'name' => 'VenueFlow CRM',
                'email' => 'crm@venueflow.test',
                'password' => 'Password123!',
                'role' => User::ROLE_SUPER_ADMIN,
            ]);

            $admin = User::query()->create([
                'name' => 'Aarav Mehta',
                'email' => 'organizer@venueflow.test',
                'password' => 'Password123!',
                'role' => User::ROLE_ADMIN,
            ]);

            $buyer = User::query()->create([
                'name' => 'Naina Kapoor',
                'email' => 'booker@venueflow.test',
                'password' => 'Password123!',
                'role' => User::ROLE_USER,
            ]);

            $india = Country::query()->create(['name' => 'India']);
            $uk = Country::query()->create(['name' => 'United Kingdom']);

            $saltLake = Stadium::query()->create([
                'country_id' => $india->id,
                'name' => 'Salt Lake Stadium',
            ]);

            $wankhede = Stadium::query()->create([
                'country_id' => $india->id,
                'name' => 'Wankhede Pavilion',
            ]);

            $wembley = Stadium::query()->create([
                'country_id' => $uk->id,
                'name' => 'Wembley Arena',
            ]);

            $musicNight = Event::query()->create([
                'admin_id' => $admin->id,
                'country_id' => $india->id,
                'stadium_id' => $saltLake->id,
                'title' => 'Monsoon Music Night',
                'description' => 'An open-air live show with indie bands, late-evening lights, and standing passes.',
                'event_date' => Carbon::now()->addDays(7)->toDateString(),
                'start_time' => '18:30',
                'end_time' => '22:00',
                'price_cents' => 149900,
                'total_tickets' => 220,
                'sold_tickets' => 2,
                'status' => Event::STATUS_ACTIVE,
            ]);

            Event::query()->create([
                'admin_id' => $admin->id,
                'country_id' => $uk->id,
                'stadium_id' => $wembley->id,
                'title' => 'Design Leadership Summit',
                'description' => 'A one-day conference for product and design leads focused on systems, craft, and hiring.',
                'event_date' => Carbon::now()->addDays(12)->toDateString(),
                'start_time' => '10:00',
                'end_time' => '17:00',
                'price_cents' => 259900,
                'total_tickets' => 140,
                'sold_tickets' => 0,
                'status' => Event::STATUS_ACTIVE,
            ]);

            Event::query()->create([
                'admin_id' => $admin->id,
                'country_id' => $india->id,
                'stadium_id' => $wankhede->id,
                'title' => 'Founders Fireside Evening',
                'description' => 'A smaller networking and talk format with startup founders and investors.',
                'event_date' => Carbon::now()->addDays(16)->toDateString(),
                'start_time' => '19:00',
                'end_time' => '21:30',
                'price_cents' => 189900,
                'total_tickets' => 90,
                'sold_tickets' => 0,
                'status' => Event::STATUS_ACTIVE,
            ]);

            $order = Order::query()->create([
                'user_id' => $buyer->id,
                'stripe_session_id' => 'seed_paid_session',
                'stripe_payment_intent_id' => 'seed_pi_001',
                'amount_cents' => 299800,
                'currency' => 'inr',
                'status' => Order::STATUS_PAID,
                'purchaser_name' => $buyer->name,
                'purchaser_email' => $buyer->email,
                'payment_reference' => 'seed-demo-payment',
                'payment_payload' => ['seeded' => true],
                'paid_at' => Carbon::now()->subDay(),
            ]);

            $orderItem = OrderItem::query()->create([
                'order_id' => $order->id,
                'event_id' => $musicNight->id,
                'quantity' => 2,
                'unit_price_cents' => 149900,
                'subtotal_cents' => 299800,
                'event_title' => $musicNight->title,
                'event_date' => $musicNight->event_date,
                'start_time' => $musicNight->start_time,
                'stadium_name' => $saltLake->name,
                'country_name' => $india->name,
            ]);

            Ticket::query()->create([
                'order_id' => $order->id,
                'event_id' => $musicNight->id,
                'user_id' => $buyer->id,
                'ticket_code' => 'VF-'.$musicNight->id.'-'.Str::upper(Str::random(8)),
                'purchaser_name' => $buyer->name,
                'purchaser_email' => $buyer->email,
                'amount_cents' => $orderItem->unit_price_cents,
                'payment_reference' => $order->payment_reference,
                'purchased_at' => Carbon::now()->subDay(),
            ]);

            Ticket::query()->create([
                'order_id' => $order->id,
                'event_id' => $musicNight->id,
                'user_id' => $buyer->id,
                'ticket_code' => 'VF-'.$musicNight->id.'-'.Str::upper(Str::random(8)),
                'purchaser_name' => $buyer->name,
                'purchaser_email' => $buyer->email,
                'amount_cents' => $orderItem->unit_price_cents,
                'payment_reference' => $order->payment_reference,
                'purchased_at' => Carbon::now()->subDay(),
            ]);
        });
    }
}
