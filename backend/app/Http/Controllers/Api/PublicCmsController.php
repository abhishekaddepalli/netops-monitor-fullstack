<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CmsPage;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicCmsController extends Controller
{
    /**
     * Public endpoint to fetch published CMS page by slug.
     */
    public function getPage(Request $request, string $slug = 'home'): JsonResponse
    {
        $page = CmsPage::where('slug', $slug)->first();

        if (! $page && $slug === 'home') {
            $page = CmsPage::create([
                'slug' => 'home',
                'title' => 'Home Landing Page',
                'meta_title' => 'NetOps Monitor — Real-Time Infrastructure & Network Monitoring',
                'meta_description' => 'Enterprise uptime, API, server, SNMP, and network topology monitoring platform.',
                'is_published' => true,
                'blocks' => CmsPage::getDefaultBlocks('home'),
            ]);
        }

        if (! $page || (! $page->is_published && ! $request->user()?->isSuperAdmin())) {
            return response()->json(['message' => 'Page not found.'], 404);
        }

        // Fetch live active & public plans so pricing tables are guaranteed in-sync
        $plans = Plan::where('is_public', true)
            ->where('is_active', true)
            ->orderBy('price_inr_monthly', 'asc')
            ->get();

        return response()->json([
            'page' => $page,
            'plans' => $plans,
        ]);
    }
}
