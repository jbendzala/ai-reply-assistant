package com.aireplyassistant.screencapture

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.IBinder
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException

class BubbleService : Service() {

  companion object {
    // Must match MainActivity.MEDIA_PROJECTION_REQUEST_CODE
    const val MEDIA_PROJECTION_REQUEST_CODE = 1001
    const val ACTION_SHOW_REPLIES = "com.aireplyassistant.screencapture.SHOW_REPLIES"
    const val EXTRA_REPLIES = "replies"
    private const val CHANNEL_ID = "bubble_service"
    private const val NOTIFICATION_ID = 1
  }

  private lateinit var windowManager: WindowManager
  private var bubbleView: BubbleView? = null
  private var overlayWindow: OverlayWindow? = null
  private var scanningOverlay: ScanningOverlay? = null
  private var mediaProjection: MediaProjection? = null
  private var virtualDisplay: VirtualDisplay? = null
  private var imageReader: ImageReader? = null

  private val capturedSegments = mutableListOf<String>()
  private var lastReplies: List<String>? = null
  private val captureHandler = android.os.Handler(android.os.Looper.getMainLooper())
  private var captureTimeoutRunnable: Runnable? = null
  // True when a bubble tap triggered the re-request so we grab a frame after grant.
  // False on the initial service-start request (just set up VD, wait for first tap).
  private var captureAfterGrant = false

  // Receives reply list from ScreenCaptureModule.sendRepliesToNative()
  private val showRepliesReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      val replies = intent.getStringArrayListExtra(EXTRA_REPLIES) ?: return
      showOverlayWithReplies(replies)
    }
  }

  // Receives MediaProjection consent result from MainActivity
  private val mediaProjectionResultReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      val resultCode = intent.getIntExtra("result_code", -1)
      @Suppress("DEPRECATION")
      val data = intent.getParcelableExtra<Intent>("data")
      // Android 10+ requires the foreground service type to include mediaProjection
      // before getMediaProjection() is called
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
        startForeground(
          NOTIFICATION_ID,
          buildNotification(),
          android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION,
        )
      }
      val shouldCapture = captureAfterGrant
      captureAfterGrant = false
      // Only show scanning overlay + grab frame when user tapped the bubble.
      // On initial service start we just set up the VirtualDisplay and wait.
      if (shouldCapture) showScanningOverlay()
      startCapture(resultCode, data, grabImmediately = shouldCapture)
    }
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, buildNotification(), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, buildNotification())
    }

    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    showBubble()

    // Request MediaProjection immediately so the VirtualDisplay is ready
    // before the user taps the bubble — subsequent taps capture with no dialog.
    captureAfterGrant = false
    requestMediaProjectionViaMainActivity()

    val lbm = LocalBroadcastManager.getInstance(this)
    lbm.registerReceiver(showRepliesReceiver, IntentFilter(ACTION_SHOW_REPLIES))
    lbm.registerReceiver(
      mediaProjectionResultReceiver,
      IntentFilter("com.aireplyassistant.screencapture.MEDIA_PROJECTION_RESULT"),
    )
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    super.onDestroy()
    val lbm = LocalBroadcastManager.getInstance(this)
    lbm.unregisterReceiver(showRepliesReceiver)
    lbm.unregisterReceiver(mediaProjectionResultReceiver)
    hideScanningOverlay()
    bubbleView?.let {
      it.cleanup()
      try { windowManager.removeView(it) } catch (_: Exception) {}
    }
    overlayWindow?.dismiss()
    stopCapture()
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    super.onTaskRemoved(rootIntent)
    stopSelf()
  }

  // ─── Bubble ──────────────────────────────────────────────────────────────

  private fun showBubble() {
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O)
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else
        @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
      PixelFormat.TRANSLUCENT,
    ).apply {
      x = 0
      y = 200
    }

    bubbleView = BubbleView(this, windowManager, params, { onBubbleTapped() }, { onBubbleDismissed() })
    windowManager.addView(bubbleView, params)
  }

  private fun onBubbleDismissed() {
    stopSelf()
  }

  private fun requestMediaProjectionViaMainActivity() {
    val pm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    // Resolve MainActivity dynamically so it works for both local debug and EAS builds
    // (applicationId can differ from the Kotlin source package between the two)
    val mainActivityClass = packageManager
      .getLaunchIntentForPackage(packageName)
      ?.component?.className
      ?: "$packageName.MainActivity"
    val intent = Intent("com.aireplyassistant.REQUEST_MEDIA_PROJECTION").apply {
      component = ComponentName(packageName, mainActivityClass)
      putExtra("media_projection_intent", pm.createScreenCaptureIntent())
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    startActivity(intent)
  }

  private fun onBubbleTapped() {
    if (virtualDisplay != null && imageReader != null) {
      // VirtualDisplay is already alive — capture immediately with no dialog
      capturedSegments.clear()
      lastReplies = null
      overlayWindow?.dismiss(notify = false)
      overlayWindow = null
      showScanningOverlay()
      scheduleCaptureTineout() // reset the 120-second keep-alive timer
      android.os.Handler(mainLooper).postDelayed({ grabFrame() }, 400)
    } else {
      // VirtualDisplay is dead (expired or first tap after denial) — re-request permission
      captureAfterGrant = true
      requestMediaProjectionViaMainActivity()
    }
  }

  // ─── Screen capture ───────────────────────────────────────────────────────

  private fun startCapture(resultCode: Int, data: Intent?, grabImmediately: Boolean = true) {
    if (data == null) {
      if (grabImmediately) {
        hideScanningOverlay()
        emitError("Screen recording permission denied")
      }
      // If this was the silent setup on service start, just do nothing —
      // the bubble is still visible and the user can tap to retry.
      return
    }
    val pm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    mediaProjection = pm.getMediaProjection(resultCode, data)

    // Android 14+ requires a callback registered before createVirtualDisplay()
    mediaProjection!!.registerCallback(object : MediaProjection.Callback() {
      override fun onStop() {
        virtualDisplay?.release()
        imageReader?.close()
        virtualDisplay = null
        imageReader = null
        mediaProjection = null
      }
    }, android.os.Handler(mainLooper))

    val metrics = DisplayMetrics()
    @Suppress("DEPRECATION")
    windowManager.defaultDisplay.getMetrics(metrics)

    imageReader = ImageReader.newInstance(
      metrics.widthPixels,
      metrics.heightPixels,
      PixelFormat.RGBA_8888,
      2,
    )

    virtualDisplay = mediaProjection!!.createVirtualDisplay(
      "ScreenCapture",
      metrics.widthPixels,
      metrics.heightPixels,
      metrics.densityDpi,
      DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
      imageReader!!.surface,
      null,
      null,
    )

    if (grabImmediately) {
      android.os.Handler(mainLooper).postDelayed({ grabFrame() }, 1200)
    } else {
      // VD is now warm and ready — start the keep-alive timer and wait for a tap
      scheduleCaptureTineout()
    }
  }

  private fun grabFrame() {
    val image: Image? = imageReader?.acquireLatestImage()
    if (image == null) {
      hideScanningOverlay()
      stopCapture()
      emitError("Failed to acquire screen image")
      return
    }

    // ML Kit only accepts JPEG or YUV_420_888 via fromMediaImage().
    // VirtualDisplay outputs RGBA_8888, so convert to Bitmap first.
    val width = image.width
    val height = image.height
    val plane = image.planes[0]
    val buffer = plane.buffer
    val rowStride = plane.rowStride
    val pixelStride = plane.pixelStride
    val bitmapWidth = rowStride / pixelStride

    val rawBitmap = android.graphics.Bitmap.createBitmap(
      bitmapWidth, height, android.graphics.Bitmap.Config.ARGB_8888,
    )
    rawBitmap.copyPixelsFromBuffer(buffer)
    image.close()

    // Crop away any row-alignment padding
    val bitmap = if (bitmapWidth != width) {
      val cropped = android.graphics.Bitmap.createBitmap(rawBitmap, 0, 0, width, height)
      rawBitmap.recycle()
      cropped
    } else {
      rawBitmap
    }

    val inputImage = InputImage.fromBitmap(bitmap, 0)
    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    recognizer.process(inputImage)
      .addOnSuccessListener { visionText ->
        bitmap.recycle()
        val structured = buildConversationText(visionText.textBlocks, width)
        if (structured.isNotEmpty()) {
          capturedSegments.add(0, structured)
          onTextExtracted(capturedSegments.joinToString("\n\n"))
          scheduleCaptureTineout()
        } else if (capturedSegments.isEmpty()) {
          hideScanningOverlay()
          stopCapture()
          emitError("No text found on screen")
        } else {
          // Additional scan found nothing new — re-show last replies
          hideScanningOverlay()
          lastReplies?.let { showOverlayWithReplies(it) }
        }
      }
      .addOnFailureListener { e ->
        bitmap.recycle()
        hideScanningOverlay()
        emitError(e.message ?: "OCR failed")
        stopCapture()
      }
  }

  // ─── Reply delivery ───────────────────────────────────────────────────────

  private fun onTextExtracted(text: String) {
    // Always show replies as a native overlay on whatever app is currently visible
    callSupabaseEdgeFunction(text)
  }

  private fun callSupabaseEdgeFunction(text: String) {
    val prefs = getSharedPreferences("BubbleServicePrefs", Context.MODE_PRIVATE)
    val url = prefs.getString("supabaseUrl", null)
    val key = prefs.getString("supabaseAnonKey", null)
    if (url.isNullOrEmpty() || key.isNullOrEmpty()) {
      android.os.Handler(mainLooper).post { hideScanningOverlay() }
      emitError("Supabase not configured — open the app fully before using the bubble")
      return
    }
    val tone = prefs.getString("tone", "casual") ?: "casual"
    val accessToken = prefs.getString("accessToken", null)
    val authToken = if (!accessToken.isNullOrBlank()) accessToken else key

    val json = JSONObject().apply {
      put("text", text)
      put("tone", tone)
    }.toString()

    val request = Request.Builder()
      .url("$url/functions/v1/generate-replies")
      .post(json.toRequestBody("application/json".toMediaType()))
      .addHeader("Authorization", "Bearer $authToken")
      .addHeader("Content-Type", "application/json")
      .build()

    OkHttpClient.Builder()
      .connectTimeout(45, java.util.concurrent.TimeUnit.SECONDS)
      .readTimeout(45, java.util.concurrent.TimeUnit.SECONDS)
      .writeTimeout(45, java.util.concurrent.TimeUnit.SECONDS)
      .build()
      .newCall(request).enqueue(object : Callback {
      override fun onFailure(call: Call, e: IOException) {
        Log.e("BubbleService", "Network error: ${e.message}")
        android.os.Handler(mainLooper).post { hideScanningOverlay() }
        emitError(e.message ?: "Network error")
      }

      override fun onResponse(call: Call, response: Response) {
        val code = response.code
        if (!response.isSuccessful) {
          Log.e("BubbleService", "Edge function error: $code")
          android.os.Handler(mainLooper).post { hideScanningOverlay() }
          emitError("Edge function error: $code")
          return
        }
        val body = response.body?.string()
        if (body == null) {
          android.os.Handler(mainLooper).post { hideScanningOverlay() }
          emitError("Empty response from server")
          return
        }
        val repliesArray = JSONObject(body).optJSONArray("replies")
        if (repliesArray == null) {
          android.os.Handler(mainLooper).post { hideScanningOverlay() }
          emitError("Invalid response format")
          return
        }
        val replies = ArrayList<String>()
        for (i in 0 until repliesArray.length()) {
          replies.add(repliesArray.getString(i))
        }
        android.os.Handler(mainLooper).post {
          hideScanningOverlay()
          showOverlayWithReplies(replies)
        }
      }
    })
  }

  // ─── Scanning overlay ────────────────────────────────────────────────────

  private fun showScanningOverlay() {
    if (scanningOverlay != null) return
    val overlay = ScanningOverlay(this)
    val metrics = resources.displayMetrics
    val p = WindowManager.LayoutParams(
      metrics.widthPixels,
      metrics.heightPixels,
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O)
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else
        @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
      android.graphics.PixelFormat.TRANSLUCENT,
    )
    windowManager.addView(overlay, p)
    scanningOverlay = overlay
  }

  private fun hideScanningOverlay() {
    scanningOverlay?.let {
      it.stop()
      try { windowManager.removeView(it) } catch (_: Exception) {}
      scanningOverlay = null
    }
  }

  private fun showOverlayWithReplies(replies: List<String>) {
    lastReplies = replies
    overlayWindow?.dismiss(notify = false)
    overlayWindow = OverlayWindow(
      context = this,
      windowManager = windowManager,
      replies = replies,
      onDismiss = {
        overlayWindow = null
        capturedSegments.clear()
        lastReplies = null
        // Keep VirtualDisplay alive so the next bubble tap captures instantly.
        // The 120-second timeout in scheduleCaptureTineout() will clean it up.
      },
      onScanMore = {
        overlayWindow = null
        showScanningOverlay()
        android.os.Handler(mainLooper).postDelayed({ grabFrame() }, 400)
      },
    )
    overlayWindow!!.show()
  }

  // ─── Conversation text extraction ─────────────────────────────────────────

  // Classify each ML Kit TextBlock as "Me", "Them", or unlabelled (system/timestamp)
  // by comparing its horizontal centre to the screen width.
  // Chat apps consistently right-align sent messages and left-align received ones.
  private fun buildConversationText(blocks: List<Text.TextBlock>, screenWidth: Int): String {
    data class Line(val y: Int, val text: String)
    val lines = mutableListOf<Line>()
    for (block in blocks) {
      val box = block.boundingBox ?: continue
      val blockText = block.text.trim()
      if (blockText.isEmpty()) continue
      val centerX = (box.left + box.right) / 2f
      val label = when {
        centerX < screenWidth * 0.42f -> "Them"
        centerX > screenWidth * 0.58f -> "Me"
        else -> null
      }
      val labeled = if (label != null) "$label: $blockText" else blockText
      lines.add(Line(box.top, labeled))
    }
    return lines.sortedBy { it.y }.joinToString("\n") { it.text }
  }

  // ─── Capture lifecycle ────────────────────────────────────────────────────

  private fun stopCapture() {
    captureTimeoutRunnable?.let { captureHandler.removeCallbacks(it) }
    captureTimeoutRunnable = null
    mediaProjection?.stop()
    virtualDisplay?.release()
    imageReader?.close()
    virtualDisplay = null
    imageReader = null
    mediaProjection = null
  }

  // Keep VirtualDisplay alive for 2 minutes so "Scan more" can grab additional frames.
  private fun scheduleCaptureTineout() {
    captureTimeoutRunnable?.let { captureHandler.removeCallbacks(it) }
    captureTimeoutRunnable = Runnable { stopCapture() }.also {
      captureHandler.postDelayed(it, 120_000L)
    }
  }

  private fun emitError(message: String) {
    val intent = Intent("com.aireplyassistant.screencapture.CAPTURE_ERROR").apply {
      putExtra("message", message)
    }
    LocalBroadcastManager.getInstance(this).sendBroadcast(intent)
  }

  // ─── Notification ─────────────────────────────────────────────────────────

  private fun createNotificationChannel() {
    val channel = NotificationChannel(
      CHANNEL_ID,
      "AI Reply Bubble",
      NotificationManager.IMPORTANCE_LOW,
    ).apply { description = "Floating bubble for AI reply suggestions" }
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.createNotificationChannel(channel)
  }

  private fun buildNotification(): Notification {
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("AI Reply Bubble")
      .setContentText("Tap the bubble to scan and get reply suggestions")
      .setSmallIcon(android.R.drawable.ic_menu_edit)
      .setOngoing(true)
      .build()
  }
}
