<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NotificationTemplate;
use App\Services\Alerts\NotificationTemplateDefaults;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationTemplateController extends Controller
{
    /**
     * List all templates (including defaults for any combinations not yet in database).
     */
    public function index(): JsonResponse
    {
        $existing = NotificationTemplate::all()->keyBy(function ($item) {
            return $item->channel_type . ':' . $item->event_type;
        });

        $channels = NotificationTemplateDefaults::getChannels();
        $events = NotificationTemplateDefaults::getEvents();
        $allDefaults = NotificationTemplateDefaults::getAll();

        $result = [];

        foreach ($channels as $channel) {
            foreach (array_keys($events) as $event) {
                $key = $channel . ':' . $event;
                if (isset($existing[$key])) {
                    $result[] = $existing[$key];
                } else {
                    $defaultContent = $allDefaults[$channel][$event] ?? "[$event] {{monitor.name}}";
                    $result[] = [
                        'id' => null,
                        'channel_type' => $channel,
                        'event_type' => $event,
                        'content' => $defaultContent,
                        'is_active' => true,
                        'is_default' => true,
                    ];
                }
            }
        }

        return response()->json($result);
    }

    public function show(NotificationTemplate $notification_template): JsonResponse
    {
        return response()->json($notification_template);
    }

    /**
     * Update an existing template by ID.
     */
    public function update(Request $request, NotificationTemplate $notification_template): JsonResponse
    {
        $data = $request->validate([
            'content' => 'required|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $notification_template->update($data);

        return response()->json($notification_template);
    }

    /**
     * Upsert a template by channel_type and event_type.
     */
    public function upsert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'channel_type' => 'required|string',
            'event_type' => 'required|string',
            'content' => 'required|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $template = NotificationTemplate::updateOrCreate(
            [
                'channel_type' => $data['channel_type'],
                'event_type' => $data['event_type'],
            ],
            [
                'content' => $data['content'],
                'is_active' => $data['is_active'] ?? true,
            ]
        );

        return response()->json($template);
    }

    /**
     * Reset a template to its recommended default design.
     */
    public function resetDefault(Request $request): JsonResponse
    {
        $request->validate([
            'channel_type' => 'required|string',
            'event_type' => 'required|string',
        ]);

        $defaultContent = NotificationTemplateDefaults::getDefault(
            $request->channel_type,
            $request->event_type
        );

        $template = NotificationTemplate::updateOrCreate(
            [
                'channel_type' => $request->channel_type,
                'event_type' => $request->event_type,
            ],
            [
                'content' => $defaultContent,
                'is_active' => true,
            ]
        );

        return response()->json($template);
    }
}
