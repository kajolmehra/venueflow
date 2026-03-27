<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Event extends Model
{
    use SoftDeletes;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_STOPPED = 'stopped';

    protected $fillable = [
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
    ];

    protected $casts = [
        'event_date' => 'date',
        'price_cents' => 'integer',
        'total_tickets' => 'integer',
        'sold_tickets' => 'integer',
    ];

    protected $appends = [
        'available_tickets',
        'is_sellable',
    ];

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function stadium(): BelongsTo
    {
        return $this->belongsTo(Stadium::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function scopeVisible(Builder $query): Builder
    {
        return $query->whereNull('deleted_at');
    }

    public function getAvailableTicketsAttribute(): int
    {
        return max(0, $this->total_tickets - $this->sold_tickets);
    }

    public function getIsSellableAttribute(): bool
    {
        return $this->status === self::STATUS_ACTIVE && $this->available_tickets > 0 && $this->deleted_at === null;
    }
}
