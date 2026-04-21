<?php

namespace App\Services;

use App\Models\Notification;

class NotificationService
{
    public static function dispatch(int $userId, string $type, string $title, string $message, ?string $actionUrl = null, array $meta = []): ?Notification
    {
        if (!$userId) return null;

        return Notification::create([
            'user_id'    => $userId,
            'type'       => $type,
            'title'      => $title,
            'message'    => $message,
            'action_url' => $actionUrl,
            'meta'       => $meta,
        ]);
    }

    public static function dispatchMany(array $userIds, string $type, string $title, string $message, ?string $actionUrl = null, array $meta = []): int
    {
        $count = 0;
        foreach (array_unique(array_filter($userIds)) as $uid) {
            self::dispatch($uid, $type, $title, $message, $actionUrl, $meta);
            $count++;
        }
        return $count;
    }
}
