<?php

namespace App\Http\Controllers;

use App\Services\PublicEventPayloadService;
use Illuminate\Http\Request;

class PublicEventController extends Controller
{
    public function index(Request $request, PublicEventPayloadService $payloads)
    {
        return response()->json($payloads->payload($request));
    }
}
