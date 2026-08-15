package com.ausuba3d.tourclicks;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONException;
import org.json.JSONObject;

public final class NativeTimer {
    private static final String PREFS = "tourclicks_native_timers";
    private static final String CHANNEL_ID = "tourclicks_active_timers";
    private static final int TOUR_NOTIFICATION = 4101;
    private static final int LUNCH_NOTIFICATION = 4102;

    private NativeTimer() {}

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Active TourClicks timers",
                NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Persistent tour and lunch timer status.");
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static String key(String kind, String field) {
        return "timer_" + normalizeKind(kind) + "_" + field;
    }

    private static String normalizeKind(String kind) {
        return "lunch".equalsIgnoreCase(kind) ? "lunch" : "tour";
    }

    private static boolean active(Context context, String kind) {
        return prefs(context).getBoolean(key(kind, "active"), false);
    }

    private static long startedAt(Context context, String kind) {
        return prefs(context).getLong(key(kind, "started_at"), 0L);
    }

    private static long accumulated(Context context, String kind) {
        return Math.max(0L, prefs(context).getLong(key(kind, "accumulated"), 0L));
    }

    public static long elapsed(Context context, String kind) {
        long total = accumulated(context, kind);
        if (active(context, kind)) {
            long start = startedAt(context, kind);
            if (start > 0L) total += Math.max(0L, System.currentTimeMillis() - start);
        }
        return total;
    }

    public static synchronized String applyAction(Context context, String kind, String action) {
        String safeKind = normalizeKind(kind);
        String safeAction = action == null ? "" : action.toLowerCase();
        SharedPreferences preferences = prefs(context);
        boolean isActive = active(context, safeKind);
        long total = elapsed(context, safeKind);
        SharedPreferences.Editor editor = preferences.edit();
        if ("start".equals(safeAction) || "resume".equals(safeAction)) {
            if (!isActive) {
                editor.putBoolean(key(safeKind, "active"), true);
                editor.putLong(key(safeKind, "started_at"), System.currentTimeMillis());
            }
        } else if ("stop".equals(safeAction) || "pause".equals(safeAction)) {
            editor.putBoolean(key(safeKind, "active"), false);
            editor.putLong(key(safeKind, "started_at"), 0L);
            editor.putLong(key(safeKind, "accumulated"), total);
        } else if ("reset".equals(safeAction)) {
            editor.putBoolean(key(safeKind, "active"), false);
            editor.putLong(key(safeKind, "started_at"), 0L);
            editor.putLong(key(safeKind, "accumulated"), 0L);
        }
        editor.apply();
        refresh(context, safeKind);
        return getStateJson(context);
    }

    public static synchronized String importState(Context context, String json) {
        if (json == null || json.trim().isEmpty()) return getStateJson(context);
        try {
            JSONObject root = new JSONObject(json);
            importTimer(context, "tour", root.optJSONObject("tour"));
            importTimer(context, "lunch", root.optJSONObject("lunch"));
            refreshAll(context);
        } catch (JSONException ignored) {
            // Invalid web state must never destroy the last valid native timer state.
        }
        return getStateJson(context);
    }

    private static void importTimer(Context context, String kind, JSONObject source) {
        if (source == null) return;
        boolean currentHasData = active(context, kind) || accumulated(context, kind) > 0L;
        if (currentHasData) return;
        boolean incomingActive = source.optBoolean("active", false);
        long incomingStarted = Math.max(0L, source.optLong("startedAt", 0L));
        long incomingAccumulated = Math.max(0L, source.optLong("accumulatedMs", 0L));
        prefs(context).edit()
                .putBoolean(key(kind, "active"), incomingActive)
                .putLong(key(kind, "started_at"), incomingStarted)
                .putLong(key(kind, "accumulated"), incomingAccumulated)
                .apply();
    }

    public static String getStateJson(Context context) {
        try {
            JSONObject root = new JSONObject();
            root.put("tour", timerJson(context, "tour"));
            root.put("lunch", timerJson(context, "lunch"));
            return root.toString();
        } catch (JSONException error) {
            return "{\"tour\":{},\"lunch\":{}}";
        }
    }

    private static JSONObject timerJson(Context context, String kind) throws JSONException {
        JSONObject timer = new JSONObject();
        timer.put("active", active(context, kind));
        timer.put("startedAt", startedAt(context, kind));
        timer.put("accumulatedMs", accumulated(context, kind));
        timer.put("elapsedMs", elapsed(context, kind));
        return timer;
    }

    public static void refreshAll(Context context) {
        ensureChannel(context);
        refresh(context, "tour");
        refresh(context, "lunch");
    }

    public static void refresh(Context context, String kind) {
        ensureChannel(context);
        String safeKind = normalizeKind(kind);
        boolean isActive = active(context, safeKind);
        long total = elapsed(context, safeKind);
        int id = "lunch".equals(safeKind) ? LUNCH_NOTIFICATION : TOUR_NOTIFICATION;
        if (!isActive && total <= 0L) {
            NotificationManagerCompat.from(context).cancel(id);
            return;
        }

        Intent openIntent = new Intent(context, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPending = PendingIntent.getActivity(
                context,
                id,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String action = isActive ? "pause" : "start";
        String actionLabel = isActive ? "Pause" : "Resume";
        PendingIntent actionPending = actionPendingIntent(context, safeKind, action, id + 100);
        PendingIntent resetPending = actionPendingIntent(context, safeKind, "reset", id + 200);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_timer_notification)
                .setContentTitle("lunch".equals(safeKind) ? "TourClicks lunch timer" : "TourClicks tour timer")
                .setContentText(isActive ? "Running • tap to open TourClicks" : formatElapsed(total) + " • paused")
                .setContentIntent(openPending)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setOngoing(isActive)
                .setAutoCancel(false)
                .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
                .addAction(0, actionLabel, actionPending)
                .addAction(0, "Reset", resetPending);
        if (isActive) {
            builder.setWhen(System.currentTimeMillis() - total)
                    .setUsesChronometer(true)
                    .setShowWhen(true);
        } else {
            builder.setShowWhen(false);
        }
        try {
            NotificationManagerCompat.from(context).notify(id, builder.build());
        } catch (SecurityException ignored) {
            // Android 13+ may withhold notification permission. Timer state is still retained.
        }
    }

    private static PendingIntent actionPendingIntent(Context context, String kind, String action, int requestCode) {
        Intent intent = new Intent(context, TimerActionReceiver.class)
                .setAction("com.ausuba3d.tourclicks.TIMER_ACTION")
                .putExtra("kind", kind)
                .putExtra("action", action);
        return PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static String formatElapsed(long milliseconds) {
        long seconds = Math.max(0L, milliseconds / 1000L);
        long hours = seconds / 3600L;
        long minutes = (seconds % 3600L) / 60L;
        long remaining = seconds % 60L;
        return String.format(java.util.Locale.US, "%02d:%02d:%02d", hours, minutes, remaining);
    }
}
