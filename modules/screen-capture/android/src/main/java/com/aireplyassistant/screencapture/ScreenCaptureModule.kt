package com.aireplyassistant.screencapture

import android.app.ActivityManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ScreenCaptureModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "ReactContext is null" }

  private var textReceiver: BroadcastReceiver? = null
  private var errorReceiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("ScreenCapture")

    // ─── Events ──────────────────────────────────────────────────────────────
    Events("onTextCaptured", "onCaptureError")

    OnCreate {
      val lbm = LocalBroadcastManager.getInstance(context)

      textReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
          val text = intent.getStringExtra("text") ?: return
          sendEvent("onTextCaptured", mapOf("text" to text))
        }
      }
      errorReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
          val message = intent.getStringExtra("message") ?: return
          sendEvent("onCaptureError", mapOf("message" to message))
        }
      }

      lbm.registerReceiver(textReceiver!!, IntentFilter("com.aireplyassistant.screencapture.TEXT_CAPTURED"))
      lbm.registerReceiver(errorReceiver!!, IntentFilter("com.aireplyassistant.screencapture.CAPTURE_ERROR"))
    }

    OnDestroy {
      val lbm = LocalBroadcastManager.getInstance(context)
      textReceiver?.let { lbm.unregisterReceiver(it) }
      errorReceiver?.let { lbm.unregisterReceiver(it) }
    }

    // ─── Overlay permission ───────────────────────────────────────────────────
    AsyncFunction("hasOverlayPermission") {
      Settings.canDrawOverlays(context)
    }

    AsyncFunction("requestOverlayPermission") {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${context.packageName}"),
      ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
      context.startActivity(intent)
    }

    // ─── Bubble service lifecycle ─────────────────────────────────────────────
    AsyncFunction("startBubbleService") {
      val intent = Intent(context, BubbleService::class.java)
      ContextCompat.startForegroundService(context, intent)
    }

    AsyncFunction("stopBubbleService") {
      context.stopService(Intent(context, BubbleService::class.java))
    }

    AsyncFunction("isBubbleRunning") {
      val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      @Suppress("DEPRECATION")
      am.getRunningServices(Int.MAX_VALUE)
        .any { it.service.className == BubbleService::class.java.name }
    }

    // ─── Config (persisted to SharedPreferences for backgrounded calls) ───────
    AsyncFunction("configureBubbleService") { config: Map<String, String> ->
      val prefs = context.getSharedPreferences("BubbleServicePrefs", Context.MODE_PRIVATE)
      prefs.edit()
        .putString("supabaseUrl", config["supabaseUrl"])
        .putString("supabaseAnonKey", config["supabaseAnonKey"])
        .putString("tone", config["tone"])
        .apply()
    }

    // ─── Push replies to the native overlay window ────────────────────────────
    AsyncFunction("sendRepliesToNative") { replies: ArrayList<String> ->
      val intent = Intent(BubbleService.ACTION_SHOW_REPLIES).apply {
        putStringArrayListExtra(BubbleService.EXTRA_REPLIES, replies)
      }
      LocalBroadcastManager.getInstance(context).sendBroadcast(intent)
    }
  }
}
