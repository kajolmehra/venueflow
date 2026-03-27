<?php

use App\Http\Controllers\AdminEventController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\CrmController;
use App\Http\Controllers\PublicEventController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/realtime/config', function () {
    return response()->json([
        'key' => config('broadcasting.connections.reverb.key'),
        'host' => config('broadcasting.connections.reverb.options.host') ?: request()->getHost(),
        'port' => config('broadcasting.connections.reverb.options.port', 8080),
        'scheme' => config('broadcasting.connections.reverb.options.scheme', 'http'),
    ]);
});

Route::get('/events', [PublicEventController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::middleware('role:super_admin')->prefix('crm')->group(function () {
        Route::get('/dashboard', [CrmController::class, 'dashboard']);
        Route::post('/countries', [CrmController::class, 'storeCountry']);
        Route::delete('/countries/{country}', [CrmController::class, 'destroyCountry']);
        Route::post('/stadiums', [CrmController::class, 'storeStadium']);
        Route::delete('/stadiums/{stadium}', [CrmController::class, 'destroyStadium']);
    });

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminEventController::class, 'dashboard']);
        Route::get('/lookups', [AdminEventController::class, 'lookups']);
        Route::post('/events', [AdminEventController::class, 'store']);
        Route::put('/events/{event}', [AdminEventController::class, 'update']);
        Route::post('/events/{event}/stop', [AdminEventController::class, 'stop']);
        Route::delete('/events/{event}', [AdminEventController::class, 'destroy']);
    });

    Route::middleware('role:user')->group(function () {
        Route::post('/checkout/session', [CheckoutController::class, 'createSession']);
        Route::get('/checkout/success', [CheckoutController::class, 'success']);
    });
});
