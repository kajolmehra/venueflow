<?php

namespace App\Http\Controllers;

use App\Events\CrmDashboardUpdated;
use App\Events\PublicEventsUpdated;
use App\Models\Country;
use App\Models\Stadium;
use App\Models\User;
use App\Services\CrmDashboardPayloadService;
use App\Services\PublicEventPayloadService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CrmController extends Controller
{
    public function dashboard(CrmDashboardPayloadService $payloads)
    {
        return response()->json($payloads->payload());
    }

    public function storeCountry(
        Request $request,
        CrmDashboardPayloadService $crmDashboard,
        PublicEventPayloadService $publicEvents,
    )
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:countries,name'],
        ], [
            'name.required' => 'Enter a country name.',
            'name.unique' => 'This country already exists in the CRM list.',
        ]);

        $country = Country::query()->create($validated);

        $response = response()->json([
            'message' => 'Country added successfully.',
            'country' => $country,
        ], 201);

        $this->broadcastRealtimeUpdates($crmDashboard, $publicEvents);

        return $response;
    }

    public function destroyCountry(
        Country $country,
        CrmDashboardPayloadService $crmDashboard,
        PublicEventPayloadService $publicEvents,
    )
    {
        if ($country->stadiums()->exists() || $country->events()->exists()) {
            return response()->json([
                'message' => 'Remove linked stadiums and events before deleting this country.',
            ], 422);
        }

        $country->delete();

        $response = response()->json([
            'message' => 'Country removed successfully.',
        ]);

        $this->broadcastRealtimeUpdates($crmDashboard, $publicEvents);

        return $response;
    }

    public function storeStadium(
        Request $request,
        CrmDashboardPayloadService $crmDashboard,
        PublicEventPayloadService $publicEvents,
    )
    {
        $validated = $request->validate([
            'country_id' => ['required', 'exists:countries,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('stadiums')->where(fn ($query) => $query->where('country_id', $request->integer('country_id'))),
            ],
        ], [
            'country_id.required' => 'Select a country before adding a stadium.',
            'country_id.exists' => 'The selected country is no longer available.',
            'name.required' => 'Enter a stadium name.',
            'name.unique' => 'This stadium already exists for the selected country.',
        ]);

        $stadium = Stadium::query()->create($validated);

        $response = response()->json([
            'message' => 'Stadium added successfully.',
            'stadium' => $stadium->load('country:id,name'),
        ], 201);

        $this->broadcastRealtimeUpdates($crmDashboard, $publicEvents);

        return $response;
    }

    public function destroyStadium(
        Stadium $stadium,
        CrmDashboardPayloadService $crmDashboard,
        PublicEventPayloadService $publicEvents,
    )
    {
        if ($stadium->events()->exists()) {
            return response()->json([
                'message' => 'This stadium is already used by an event and cannot be removed.',
            ], 422);
        }

        $stadium->delete();

        $response = response()->json([
            'message' => 'Stadium removed successfully.',
        ]);

        $this->broadcastRealtimeUpdates($crmDashboard, $publicEvents);

        return $response;
    }

    protected function broadcastRealtimeUpdates(
        CrmDashboardPayloadService $crmDashboard,
        PublicEventPayloadService $publicEvents,
    ): void
    {
        event(new CrmDashboardUpdated($crmDashboard->payload()));
        event(new PublicEventsUpdated($publicEvents->payload()));
    }
}
