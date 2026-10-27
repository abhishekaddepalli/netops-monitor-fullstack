<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CmsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        // Ensure home page always exists
        $home = CmsPage::firstOrCreate(
            ['slug' => 'home'],
            [
                'title' => 'Home Landing Page',
                'meta_title' => 'NetOps Monitor — Real-Time Infrastructure & Network Monitoring',
                'meta_description' => 'Enterprise uptime, API, server, SNMP, and network topology monitoring platform.',
                'is_published' => true,
                'blocks' => CmsPage::getDefaultBlocks('home'),
            ]
        );

        $pages = CmsPage::orderBy('id', 'asc')->get();

        return response()->json($pages);
    }

    public function show(Request $request, $id): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $page = is_numeric($id) ? CmsPage::findOrFail($id) : CmsPage::where('slug', $id)->firstOrFail();

        return response()->json($page);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:100|unique:cms_pages,slug',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:1000',
            'is_published' => 'nullable|boolean',
            'blocks' => 'nullable|array',
        ]);

        $slug = !empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['title']);
        
        $blocks = $validated['blocks'] ?? CmsPage::getDefaultBlocks($slug);

        $page = CmsPage::create([
            'title' => $validated['title'],
            'slug' => $slug,
            'meta_title' => $validated['meta_title'] ?? $validated['title'],
            'meta_description' => $validated['meta_description'] ?? null,
            'is_published' => $validated['is_published'] ?? true,
            'blocks' => $blocks,
        ]);

        return response()->json($page, 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $page = is_numeric($id) ? CmsPage::findOrFail($id) : CmsPage::where('slug', $id)->firstOrFail();

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:100|unique:cms_pages,slug,' . $page->id,
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:1000',
            'is_published' => 'sometimes|boolean',
            'blocks' => 'sometimes|array',
        ]);

        if (isset($validated['slug']) && $page->slug === 'home') {
            unset($validated['slug']); // Protect home slug from accidental renaming
        }

        $page->update($validated);

        return response()->json($page);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $page = is_numeric($id) ? CmsPage::findOrFail($id) : CmsPage::where('slug', $id)->firstOrFail();

        if ($page->slug === 'home') {
            return response()->json(['message' => 'The Home Landing Page cannot be deleted.'], 400);
        }

        $page->delete();

        return response()->json(['message' => 'Page deleted successfully.']);
    }

    public function resetDefault(Request $request, $id): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $page = is_numeric($id) ? CmsPage::findOrFail($id) : CmsPage::where('slug', $id)->firstOrFail();
        $page->blocks = CmsPage::getDefaultBlocks($page->slug);
        $page->save();

        return response()->json([
            'message' => 'Page blocks reset to default.',
            'page' => $page,
        ]);
    }
}
