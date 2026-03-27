<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class Country extends Model
{
    protected $fillable = [
        'name',
    ];

    public function stadiums(): HasMany
    {
        return $this->hasMany(Stadium::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }
}
