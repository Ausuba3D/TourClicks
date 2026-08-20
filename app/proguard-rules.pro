# TourClicks WebView bridge. JavaScript calls these methods by their literal names.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep the bridge owner and native timer/OCR entry points stable under R8.
-keep class com.ausuba3d.tourclicks.MainActivity$AndroidBridge { *; }
-keep class com.ausuba3d.tourclicks.OcrBridge { *; }
-keep class com.ausuba3d.tourclicks.NativeTimer { *; }
-keep class com.ausuba3d.tourclicks.TimerActionReceiver { *; }
-keep class com.ausuba3d.tourclicks.TimerBootReceiver { *; }
