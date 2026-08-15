package com.ausuba3d.tourclicks;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.webkit.WebView;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.json.JSONObject;

public final class OcrBridge {
    private OcrBridge() {}

    public static void recognize(Activity activity, WebView webView, String requestId, String dataUrl) {
        if (activity == null || webView == null) return;
        new Thread(() -> {
            Bitmap bitmap = null;
            TextRecognizer recognizer = null;
            try {
                int comma = dataUrl == null ? -1 : dataUrl.indexOf(',');
                if (comma < 0) throw new IllegalArgumentException("Invalid screenshot data");
                byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
                bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                if (bitmap == null) throw new IllegalArgumentException("Screenshot could not be decoded");
                InputImage image = InputImage.fromBitmap(bitmap, 0);
                recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
                Bitmap finalBitmap = bitmap;
                TextRecognizer finalRecognizer = recognizer;
                recognizer.process(image)
                        .addOnSuccessListener(result -> sendResult(activity, webView, requestId, true, result.getText()))
                        .addOnFailureListener(error -> sendResult(
                                activity,
                                webView,
                                requestId,
                                false,
                                error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage()))
                        .addOnCompleteListener(task -> {
                            finalRecognizer.close();
                            if (!finalBitmap.isRecycled()) finalBitmap.recycle();
                        });
            } catch (Exception error) {
                if (recognizer != null) recognizer.close();
                if (bitmap != null && !bitmap.isRecycled()) bitmap.recycle();
                sendResult(
                        activity,
                        webView,
                        requestId,
                        false,
                        error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage());
            }
        }, "TourClicksOcr").start();
    }

    private static void sendResult(
            Activity activity,
            WebView webView,
            String requestId,
            boolean success,
            String payload) {
        String script = "window.janusOcrResult && window.janusOcrResult("
                + JSONObject.quote(requestId == null ? "" : requestId)
                + ","
                + (success ? "true" : "false")
                + ","
                + JSONObject.quote(payload == null ? "" : payload)
                + ")";
        activity.runOnUiThread(() -> {
            if (!activity.isFinishing() && !activity.isDestroyed()) {
                webView.evaluateJavascript(script, null);
            }
        });
    }
}
