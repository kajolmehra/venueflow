<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('admin.dashboard.{adminId}', function (User $user, int $adminId) {
    return $user->role === User::ROLE_ADMIN && $user->id === $adminId;
});

Broadcast::channel('crm.dashboard', function (User $user) {
    return $user->role === User::ROLE_SUPER_ADMIN;
});
