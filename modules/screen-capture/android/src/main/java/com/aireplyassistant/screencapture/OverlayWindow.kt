package com.aireplyassistant.screencapture

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.animation.TranslateAnimation
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

class OverlayWindow(
  private val context: Context,
  private val windowManager: WindowManager,
  private val replies: List<String>,
  private val onDismiss: () -> Unit,
) {

  private var rootView: View? = null

  fun show() {
    val density = context.resources.displayMetrics.density
    val dp = { v: Int -> (v * density).toInt() }

    // ── Root card ──
    val card = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(16), dp(12), dp(16), dp(16))
      background = GradientDrawable().apply {
        setColor(Color.parseColor("#13131A"))
        cornerRadius = dp(20).toFloat()
      }
      elevation = dp(8).toFloat()
    }

    // ── Header row ──
    val header = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }

    val title = TextView(context).apply {
      text = "AI Reply Suggestions"
      textSize = 14f
      setTextColor(Color.parseColor("#8888AA"))
      layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
    }

    val closeBtn = TextView(context).apply {
      text = "✕"
      textSize = 16f
      setTextColor(Color.parseColor("#8888AA"))
      setPadding(dp(8), dp(4), 0, dp(4))
      setOnClickListener { dismiss() }
    }

    header.addView(title)
    header.addView(closeBtn)
    card.addView(header)

    // ── Divider ──
    card.addView(View(context).apply {
      setBackgroundColor(Color.parseColor("#2A2A3D"))
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT, dp(1),
      ).apply { setMargins(0, dp(8), 0, dp(8)) }
    })

    // ── Reply rows ──
    replies.forEach { replyText ->
      val row = LinearLayout(context).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        setPadding(dp(12), dp(10), dp(12), dp(10))
        background = GradientDrawable().apply {
          setColor(Color.parseColor("#1C1C28"))
          cornerRadius = dp(12).toFloat()
        }
        layoutParams = LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { setMargins(0, 0, 0, dp(8)) }
      }

      val replyTv = TextView(context).apply {
        text = replyText
        textSize = 15f
        setTextColor(Color.parseColor("#F0F0FF"))
        layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
      }

      val copyBtn = TextView(context).apply {
        text = "Copy"
        textSize = 13f
        setTextColor(Color.parseColor("#4F8EF7"))
        setPadding(dp(8), 0, 0, 0)
        setOnClickListener {
          val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
          clipboard.setPrimaryClip(ClipData.newPlainText("reply", replyText))
          text = "✓"
          setTextColor(Color.parseColor("#34D399"))
          postDelayed({ dismiss() }, 600)
        }
      }

      row.addView(replyTv)
      row.addView(copyBtn)
      card.addView(row)
    }

    // ── WindowManager params ──
    val metrics = context.resources.displayMetrics
    val params = WindowManager.LayoutParams(
      (metrics.widthPixels * 0.92).toInt(),
      WindowManager.LayoutParams.WRAP_CONTENT,
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O)
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else
        @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
      y = dp(32)
    }

    rootView = card
    windowManager.addView(card, params)

    // Slide-up animation
    val anim = TranslateAnimation(0f, 0f, dp(300).toFloat(), 0f).apply {
      duration = 320
      fillAfter = true
    }
    card.startAnimation(anim)
  }

  fun dismiss() {
    rootView?.let {
      try { windowManager.removeView(it) } catch (_: Exception) {}
      rootView = null
    }
    onDismiss()
  }
}
