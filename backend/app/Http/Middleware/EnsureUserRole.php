<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Authentication is required.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if ($roles !== [] && ! in_array($user->role, $roles, true)) {
            return response()->json([
                'message' => 'You do not have permission to access this area.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
