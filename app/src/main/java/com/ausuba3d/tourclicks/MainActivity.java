package com.ausuba3d.tourclicks;

import android.app.Activity;
import android.Manifest;
import android.print.PrintManager;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.core.app.ActivityCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 7003;
    private static final int CREATE_DOCUMENT_REQUEST = 7004;
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private byte[] pendingExportBytes;
    private String pendingExportName;
    private String pendingExportMime;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        NativeTimer.ensureChannel(this);

        getWindow().setStatusBarColor(Color.rgb(24, 29, 77));
        getWindow().setNavigationBarColor(Color.WHITE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        FrameLayout root = new FrameLayout(this);
root.setLayoutParams(new FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT));

webView = new WebView(this);
FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT);
root.addView(webView, webParams);

ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
    Insets bars = windowInsets.getInsets(
            WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
    FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) webView.getLayoutParams();
    params.leftMargin = bars.left;
    params.topMargin = bars.top;
    params.rightMargin = bars.right;
    params.bottomMargin = bars.bottom;
    webView.setLayoutParams(params);
    return WindowInsetsCompat.CONSUMED;
});
webView.setBackgroundColor(Color.rgb(246, 247, 251));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(true);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("file".equalsIgnoreCase(scheme) || "data".equalsIgnoreCase(scheme) || "blob".equalsIgnoreCase(scheme)) {
                    return false;
                }
                openExternal(uri);
                return true;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                String scheme = uri.getScheme();
                if ("file".equalsIgnoreCase(scheme) || "data".equalsIgnoreCase(scheme) || "blob".equalsIgnoreCase(scheme)) {
                    return false;
                }
                openExternal(uri);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                Intent intent;
                try {
                    intent = params.createIntent();
                } catch (Exception ignored) {
                    intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException error) {
                    filePathCallback = null;
                    showToast("No compatible file picker was found.");
                    return false;
                }
            }
        });

        setContentView(root);
        ViewCompat.requestApplyInsets(root);
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException error) {
            showToast("No app is available to open this link.");
        }
    }

    private void startCreateDocument(String name, String mime, byte[] bytes) {
        pendingExportName = sanitizeFileName(name);
        pendingExportMime = mime == null || mime.trim().isEmpty() ? "application/octet-stream" : mime;
        pendingExportBytes = bytes;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(pendingExportMime);
        intent.putExtra(Intent.EXTRA_TITLE, pendingExportName);
        try {
            startActivityForResult(intent, CREATE_DOCUMENT_REQUEST);
        } catch (ActivityNotFoundException error) {
            pendingExportBytes = null;
            showToast("No compatible save location picker was found.");
        }
    }

    private Uri saveImageToGallery(String requestedName, String dataUrl) throws Exception {
        byte[] bytes = decodeDataUrl(dataUrl);
        String mime = dataUrlMime(dataUrl);
        String name = sanitizeFileName(requestedName);
        ContentResolver resolver = getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, name);
        values.put(MediaStore.Images.Media.MIME_TYPE, mime);
        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/TourClicks");
        values.put(MediaStore.Images.Media.IS_PENDING, 1);
        Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (uri == null) throw new IllegalStateException("Could not create image");
        try (OutputStream output = resolver.openOutputStream(uri, "w")) {
            if (output == null) throw new IllegalStateException("No output stream");
            output.write(bytes);
            output.flush();
        } catch (Exception error) {
            resolver.delete(uri, null, null);
            throw error;
        }
        ContentValues done = new ContentValues();
        done.put(MediaStore.Images.Media.IS_PENDING, 0);
        resolver.update(uri, done, null, null);
        return uri;
    }


    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 7005) NativeTimer.refreshAll(this);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (filePathCallback == null) return;
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    result = new Uri[count];
                    for (int i = 0; i < count; i++) result[i] = data.getClipData().getItemAt(i).getUri();
                } else if (data.getData() != null) result = new Uri[]{data.getData()};
            }
            filePathCallback.onReceiveValue(result);
            filePathCallback = null;
            return;
        }
        if (requestCode == CREATE_DOCUMENT_REQUEST) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null && pendingExportBytes != null) {
                Uri uri = data.getData();
                try (OutputStream output = getContentResolver().openOutputStream(uri, "wt")) {
                    if (output == null) throw new IllegalStateException("No output stream");
                    output.write(pendingExportBytes);
                    output.flush();
                    showToast("Saved " + pendingExportName);
                } catch (Exception error) {
                    showToast("TourClicks could not save that file.");
                }
            }
            pendingExportBytes = null;
            pendingExportName = null;
            pendingExportMime = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        webView.evaluateJavascript("window.janusHandleBack ? window.janusHandleBack() : false", value -> {
            if ("true".equals(value)) return;
            if (webView.canGoBack()) webView.goBack(); else MainActivity.super.onBackPressed();
        });
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidBridge");
            webView.destroy();
        }
        super.onDestroy();
    }

    private void showToast(final String message) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_LONG).show());
    }

    private static byte[] decodeDataUrl(String dataUrl) {
        int comma = dataUrl == null ? -1 : dataUrl.indexOf(',');
        if (comma < 0) throw new IllegalArgumentException("Invalid image data");
        return Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
    }

    private static String dataUrlMime(String dataUrl) {
        if (dataUrl != null && dataUrl.startsWith("data:")) {
            int semicolon = dataUrl.indexOf(';');
            if (semicolon > 5) return dataUrl.substring(5, semicolon);
        }
        return "image/jpeg";
    }

    private static String sanitizeFileName(String name) {
        String fallback = "tourclicks-export.txt";
        if (name == null || name.trim().isEmpty()) return fallback;
        String cleaned = name.replaceAll("[\\\\/:*?\"<>|]", "-").trim();
        return cleaned.isEmpty() ? fallback : cleaned;
    }

    public final class AndroidBridge {
        @JavascriptInterface
        public void saveTextFile(String requestedName, String requestedMime, String text) {
            byte[] bytes = text == null ? new byte[0] : text.getBytes(StandardCharsets.UTF_8);
            runOnUiThread(() -> startCreateDocument(requestedName, requestedMime, bytes));
        }

        @JavascriptInterface
        public void printPage(String title) {
            runOnUiThread(() -> {
                PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(title == null ? "TourClicks Report" : title);
                printManager.print("TourClicks Report", adapter, new PrintAttributes.Builder().build());
            });
        }

        @JavascriptInterface
        public void saveImage(String requestedName, String dataUrl) {
            new Thread(() -> {
                try {
                    saveImageToGallery(requestedName, dataUrl);
                    showToast("Image saved to Pictures/TourClicks.");
                } catch (Exception error) {
                    showToast("TourClicks could not save the image.");
                }
            }).start();
        }

        @JavascriptInterface
        public void shareImage(String requestedName, String dataUrl) {
            new Thread(() -> {
                try {
                    Uri uri = saveImageToGallery(requestedName, dataUrl);
                    runOnUiThread(() -> {
                        Intent share = new Intent(Intent.ACTION_SEND);
                        share.setType(dataUrlMime(dataUrl));
                        share.putExtra(Intent.EXTRA_STREAM, uri);
                        share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(Intent.createChooser(share, "Share TourClicks attachment"));
                    });
                } catch (Exception error) {
                    showToast("TourClicks could not share the image.");
                }
            }).start();
        }

        @JavascriptInterface
        public void openImage(String requestedName, String dataUrl) {
            new Thread(() -> {
                try {
                    Uri uri = saveImageToGallery(requestedName, dataUrl);
                    runOnUiThread(() -> {
                        Intent view = new Intent(Intent.ACTION_VIEW);
                        view.setDataAndType(uri, dataUrlMime(dataUrl));
                        view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        try {
                            startActivity(view);
                        } catch (ActivityNotFoundException error) {
                            showToast("No image viewer is available.");
                        }
                    });
                } catch (Exception error) {
                    showToast("TourClicks could not open the image externally.");
                }
            }).start();
        }



        @JavascriptInterface
        public void recognizeText(String requestId, String dataUrl) {
            OcrBridge.recognize(MainActivity.this, webView, requestId, dataUrl);
        }

        @JavascriptInterface
        public String getTimerState() {
            return NativeTimer.getStateJson(MainActivity.this);
        }

        @JavascriptInterface
        public String timerAction(String kind, String action) {
            return NativeTimer.applyAction(MainActivity.this, kind, action);
        }

        @JavascriptInterface
        public String syncTimerState(String json) {
            return NativeTimer.importState(MainActivity.this, json);
        }

        @JavascriptInterface
        public void requestTimerNotificationPermission() {
            runOnUiThread(() -> {
                NativeTimer.ensureChannel(MainActivity.this);
                if (Build.VERSION.SDK_INT >= 33
                        && ActivityCompat.checkSelfPermission(MainActivity.this, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[]{Manifest.permission.POST_NOTIFICATIONS},
                            7005);
                } else {
                    NativeTimer.refreshAll(MainActivity.this);
                }
            });
        }

        @JavascriptInterface
        public void openExternal(String url) {
            if (url == null || url.trim().isEmpty()) return;
            runOnUiThread(() -> MainActivity.this.openExternal(Uri.parse(url)));
        }
    }
}
