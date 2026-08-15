package com.ausuba3d.tourclicks;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class TimerActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        NativeTimer.applyAction(
                context.getApplicationContext(),
                intent.getStringExtra("kind"),
                intent.getStringExtra("action"));
    }
}
