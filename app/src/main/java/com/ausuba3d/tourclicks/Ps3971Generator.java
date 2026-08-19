package com.ausuba3d.tourclicks;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.pdf.PdfDocument;
import android.util.Base64;
import android.util.Base64InputStream;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

final class Ps3971Generator {
    private static final float PAGE_W = 612f;
    private static final float PAGE_H = 792f;

    private Ps3971Generator() {}

    static byte[] build(Context context, String payloadJson) throws Exception {
        JSONObject data = new JSONObject(payloadJson == null ? "{}" : payloadJson);
        Bitmap template;
        try (InputStream raw = context.getAssets().open("ps-form-3971-template.b64");
             InputStream input = new Base64InputStream(raw, Base64.DEFAULT)) {
            template = BitmapFactory.decodeStream(input);
        }
        if (template == null) throw new IllegalStateException("PS Form 3971 template could not be decoded.");

        PdfDocument document = new PdfDocument();
        PdfDocument.PageInfo pageInfo = new PdfDocument.PageInfo.Builder(612, 792, 1).create();
        PdfDocument.Page page = document.startPage(pageInfo);
        Canvas canvas = page.getCanvas();
        Paint background = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        canvas.drawBitmap(template, null, new RectF(0, 0, PAGE_W, PAGE_H), background);
        template.recycle();

        Paint text = new Paint(Paint.ANTI_ALIAS_FLAG);
        text.setColor(android.graphics.Color.BLACK);
        text.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL));
        text.setTextSize(6.2f);
        Paint small = new Paint(text);
        small.setTextSize(5.8f);

        drawField(canvas, text, 22.5064f, 726.84f, value(data, "employeeName"));
        drawField(canvas, text, 227.82f, 723.84f, value(data, "employeeId"));
        drawField(canvas, small, 302.88f, 723.632f, value(data, "dateSubmitted"));
        drawField(canvas, text, 394.68f, 723.632f, value(data, "hoursRequested"));
        drawField(canvas, text, 22.5064f, 702.12f, value(data, "installation"));
        drawField(canvas, text, 232.859f, 702.224f, value(data, "nonScheduledDay"));
        drawField(canvas, text, 302.88f, 702.433f, value(data, "payLocation"));
        drawField(canvas, text, 346.163f, 702.224f, value(data, "daCode"));
        drawField(canvas, small, 393.599f, 702.344f, value(data, "fromDateTime"));
        drawField(canvas, text, 22.5064f, 677.16f, value(data, "timeOfRequest"));
        drawField(canvas, text, 128.52f, 677.16f, value(data, "scheduledReportingTime"));
        drawField(canvas, small, 231.599f, 678.24f, value(data, "contact"));
        drawField(canvas, small, 393.899f, 677.64f, value(data, "thruDateTime"));

        if (bool(data, "doNotCall")) check(canvas, 349.56f, 677.52f, 359.04f, 687f);
        if (bool(data, "late")) check(canvas, 22.68f, 603.96f, 34.56f, 615.84f);

        String charge = value(data, "charge");
        switch (charge) {
            case "annual": check(canvas, 22.68f, 655.56f, 34.56f, 667.44f); break;
            case "holiday": check(canvas, 22.68f, 644.64f, 34.56f, 656.52f); break;
            case "sick": check(canvas, 22.68f, 613.08f, 34.56f, 624.96f); break;
            case "lwop":
            case "union-lwop":
            case "military-lwop": check(canvas, 22.68f, 624f, 34.56f, 635.88f); break;
            default:
                check(canvas, 22.68f, 582.72f, 34.56f, 594.6f);
                String other = value(data, "otherType");
                if (other.isEmpty()) other = labelForCharge(charge);
                drawField(canvas, small, 53.76f, 581.656f, other);
                break;
        }

        drawWrapped(canvas, small, 23.5f, PAGE_H - 570.753f + 9.5f, 462f, 3, value(data, "remarks"));

        if (bool(data, "includeWork")) {
            drawField(canvas, small, 303.24f, 653.04f, value(data, "revisedScheduleDate"));
            drawField(canvas, text, 303.24f, 635.16f, value(data, "beginWork"));
            drawField(canvas, text, 303.24f, 617.16f, value(data, "lunchOut"));
            drawField(canvas, text, 395.16f, 617.16f, value(data, "lunchIn"));
            drawField(canvas, text, 303.24f, 599.28f, value(data, "endWork"));
            drawField(canvas, text, 303.24f, 581.28f, value(data, "totalHours"));
        }

        String reason = value(data, "reason");
        if ("own-illness".equals(reason)) check(canvas, 24.6f, 358.32f, 35.16f, 367.68f);
        if ("dependent-care".equals(reason)) check(canvas, 24.6f, 267.84f, 35.16f, 277.2f);

        String protection = value(data, "protection");
        if (protection.startsWith("fmla")) {
            String caseNumber = value(data, "fmlaCaseNumber");
            if (bool(data, "fmlaNewCondition") || caseNumber.isEmpty()) {
                check(canvas, 25.2f, 178.44f, 35.76f, 187.8f);
            } else {
                check(canvas, 24.6f, 156.24f, 35.16f, 165.6f);
                drawField(canvas, text, 27f, 141.72f, caseNumber);
            }
        }

        document.finishPage(page);
        ByteArrayOutputStream output = new ByteArrayOutputStream(900_000);
        document.writeTo(output);
        document.close();
        return output.toByteArray();
    }

    private static void drawField(Canvas canvas, Paint paint, float x, float rectBottom, String value) {
        if (value == null || value.trim().isEmpty()) return;
        canvas.drawText(trimToWidth(paint, value.trim(), 190f), x + 2f, PAGE_H - rectBottom - 2.3f, paint);
    }

    private static void drawWrapped(Canvas canvas, Paint paint, float x, float firstBaseline, float maxWidth, int maxLines, String value) {
        if (value == null || value.trim().isEmpty()) return;
        List<String> lines = wrap(paint, value.trim().replace('\n', ' '), maxWidth, maxLines);
        float y = firstBaseline;
        for (String line : lines) {
            canvas.drawText(line, x, y, paint);
            y += paint.getTextSize() + 1.5f;
        }
    }

    private static List<String> wrap(Paint paint, String value, float maxWidth, int maxLines) {
        List<String> result = new ArrayList<>();
        String[] words = value.split("\\s+");
        StringBuilder line = new StringBuilder();
        int index = 0;
        while (index < words.length && result.size() < maxLines) {
            String candidate = line.length() == 0 ? words[index] : line + " " + words[index];
            if (paint.measureText(candidate) <= maxWidth) {
                line.setLength(0); line.append(candidate); index++;
            } else if (line.length() > 0) {
                result.add(line.toString()); line.setLength(0);
            } else {
                result.add(trimToWidth(paint, words[index], maxWidth)); index++;
            }
        }
        if (line.length() > 0 && result.size() < maxLines) result.add(line.toString());
        if (index < words.length && !result.isEmpty()) {
            int last = result.size() - 1;
            result.set(last, trimToWidth(paint, result.get(last) + "...", maxWidth));
        }
        return result;
    }

    private static String trimToWidth(Paint paint, String value, float maxWidth) {
        if (paint.measureText(value) <= maxWidth) return value;
        String suffix = "...";
        int end = value.length();
        while (end > 1 && paint.measureText(value.substring(0, end) + suffix) > maxWidth) end--;
        return value.substring(0, Math.max(1, end)) + suffix;
    }

    private static void check(Canvas canvas, float x0, float y0, float x1, float y1) {
        float left = Math.min(x0, x1) + 1.7f;
        float right = Math.max(x0, x1) - 1.7f;
        float top = PAGE_H - Math.max(y0, y1) + 1.7f;
        float bottom = PAGE_H - Math.min(y0, y1) - 1.7f;
        Paint mark = new Paint(Paint.ANTI_ALIAS_FLAG);
        mark.setColor(android.graphics.Color.BLACK);
        mark.setStrokeWidth(1.35f);
        mark.setStyle(Paint.Style.STROKE);
        canvas.drawLine(left, top, right, bottom, mark);
        canvas.drawLine(left, bottom, right, top, mark);
    }

    private static String value(JSONObject data, String key) {
        String value = data.optString(key, "");
        return value == null ? "" : value;
    }

    private static boolean bool(JSONObject data, String key) {
        return data.optBoolean(key, false);
    }

    private static String labelForCharge(String charge) {
        if (charge == null) return "Other";
        switch (charge) {
            case "admin": return "Administrative";
            case "wounded-warrior": return "Wounded Warrior";
            case "military": return "Military";
            case "none": return "Other";
            default: return charge.replace('-', ' ');
        }
    }
}
