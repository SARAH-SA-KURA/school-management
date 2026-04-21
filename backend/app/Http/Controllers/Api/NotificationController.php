<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->take(50)
            ->get();

        return $this->success($notifications);
    }

    public function unreadCount(Request $request)
    {
        $count = $request->user()
            ->notifications()
            ->whereNull('read_at')
            ->count();

        return $this->success(['count' => $count]);
    }

    public function markAsRead(Request $request, Notification $notification)
    {
        if ($notification->user_id !== $request->user()->id) {
            return $this->error('Forbidden', 403);
        }

        $notification->read_at = now();
        $notification->save();

        return $this->success($notification, 'Notification marquée comme lue');
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()
            ->notifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $this->success(null, 'Toutes les notifications marquées comme lues');
    }
}
