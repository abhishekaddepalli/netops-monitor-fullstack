<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NotificationTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationTemplateController extends Controller
{
    public function index(): JsonResponse
    {
        $templates = NotificationTemplate::orderBy('channel_type')->orderBy('event_type')->get();
        return response()->json($templates);
    }

    public function show(NotificationTemplate $notification_template): JsonResponse
    {
        return response()->json($notification_template);
    }

    public function update(Request $request, NotificationTemplate $notification_template): JsonResponse
    {
        $data = $request->validate([
            'content' => 'required|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $notification_template->update($data);

        return response()->json($notification_template);
    }
}
