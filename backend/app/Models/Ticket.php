<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ticket extends Model
{
    protected $fillable = [
        'order_id',
        'event_id',
        'user_id',
        'ticket_code',
        'purchaser_name',
        'purchaser_email',
        'amount_cents',
        'payment_reference',
        'purchased_at',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'purchased_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
