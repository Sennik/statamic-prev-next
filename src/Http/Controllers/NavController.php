<?php

namespace Sennik\PrevNext\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Sennik\PrevNext\PrevNextResolver;
use Statamic\Contracts\Entries\Entry;

class NavController extends Controller
{
    public function show($collection, $entry, PrevNextResolver $resolver): JsonResponse
    {
        // Statamic auto-binds {entry} to an Entry object via route binding.
        // Fallback to manual lookup if binding didn't happen.
        if (! $entry instanceof Entry) {
            $entry = \Statamic\Facades\Entry::find((string) $entry);
        }

        if (! $entry) {
            return response()->json(['error' => 'Entry not found'], 404);
        }

        return response()->json($resolver->resolve($entry));
    }
}
