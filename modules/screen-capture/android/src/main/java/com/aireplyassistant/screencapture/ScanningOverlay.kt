package com.aireplyassistant.screencapture

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.os.Handler
import android.os.Looper
import android.view.View

class ScanningOverlay(context: Context) : View(context) {

  private val dp = context.resources.displayMetrics.density
  private var time = 0f
  private val handler = Handler(Looper.getMainLooper())

  private val bgPaint = Paint().apply {
    color = Color.parseColor("#D9000000") // ~85% opacity black
  }
  private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.parseColor("#60A5FA") // blue-400
    style = Paint.Style.STROKE
    strokeWidth = 2.5f * context.resources.displayMetrics.density
  }
  private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE
    textSize = 16f * context.resources.displayMetrics.density
    textAlign = Paint.Align.CENTER
    letterSpacing = 0.08f
  }

  private val animRunnable = object : Runnable {
    override fun run() {
      time += 0.025f
      invalidate()
      handler.postDelayed(this, 16)
    }
  }

  init {
    handler.post(animRunnable)
  }

  override fun onDraw(canvas: Canvas) {
    val w = width.toFloat()
    val h = height.toFloat()
    val cx = w / 2f
    val cy = h / 2f
    val maxRadius = w * 0.38f

    canvas.drawRect(0f, 0f, w, h, bgPaint)

    // 3 concentric rings expanding outward at staggered phases
    for (i in 0..2) {
      val phase = ((time + i * 0.5f) % 1.5f) / 1.5f
      val radius = (phase * maxRadius).coerceAtLeast(1f)
      ringPaint.alpha = ((1f - phase) * 210).toInt().coerceIn(0, 255)
      canvas.drawCircle(cx, cy, radius, ringPaint)
    }

    canvas.drawText("Scanning…", cx, cy + maxRadius + 44f * dp, textPaint)
  }

  fun stop() {
    handler.removeCallbacks(animRunnable)
  }
}
