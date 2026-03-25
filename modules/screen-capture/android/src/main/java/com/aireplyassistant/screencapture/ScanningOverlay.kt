package com.aireplyassistant.screencapture

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.Shader
import android.os.Handler
import android.os.Looper
import android.view.View
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

class ScanningOverlay(context: Context) : View(context) {

  private val dp = context.resources.displayMetrics.density
  private var time = 0f
  private val handler = Handler(Looper.getMainLooper())

  // ─── Paints ───────────────────────────────────────────────────────────────

  private val bgPaint = Paint().apply {
    color = Color.parseColor("#F0000000") // ~94% opacity black
  }

  private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    color = Color.WHITE
  }

  private val corePaint = Paint(Paint.ANTI_ALIAS_FLAG)

  private val wavePath = Path()

  private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE
    textAlign = Paint.Align.CENTER
    letterSpacing = 0.14f
  }

  // ─── Animation ────────────────────────────────────────────────────────────

  private val animRunnable = object : Runnable {
    override fun run() {
      time += 0.010f
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

    // Background
    canvas.drawRect(0f, 0f, w, h, bgPaint)

    // ── Wavy energy band — radius based on cx so it stays within screen ──────
    val waveR = cx * (0.68f + sin(time * 1.0f) * 0.06f)
    for (wave in 0..1) {
      val phaseOffset = wave * PI.toFloat()
      wavePath.reset()
      val steps = 140
      for (s in 0..steps) {
        val theta = (s.toFloat() / steps) * 2f * PI.toFloat()
        val wobble = sin(theta * 5f + time * 3.0f + phaseOffset) * (waveR * 0.04f)
        val r = waveR + wobble
        val px = cx + cos(theta) * r
        val py = cy + sin(theta) * r
        if (s == 0) wavePath.moveTo(px, py) else wavePath.lineTo(px, py)
      }
      wavePath.close()
      val wAlpha = (90 + sin(time * 2f + wave * 1.4f) * 50).toInt().coerceIn(50, 140)
      ringPaint.strokeWidth = (1.6f + wave * 0.8f) * dp
      ringPaint.alpha = wAlpha
      canvas.drawPath(wavePath, ringPaint)
    }

    // ── Pulsing radial fill — fills center, fades to edges ──────────────────
    // Gives a deep "breathing" heartbeat to the whole screen.
    val fillR = cx * (1.0f + sin(time * 1.8f) * 0.15f)
    corePaint.shader = RadialGradient(
      cx, cy, fillR,
      intArrayOf(
        Color.parseColor("#55FFFFFF"),  // semi-transparent white at center
        Color.parseColor("#18E0F0FF"),  // very faint blue-white mid
        Color.TRANSPARENT,
      ),
      floatArrayOf(0f, 0.45f, 1f),
      Shader.TileMode.CLAMP,
    )
    canvas.drawCircle(cx, cy, fillR, corePaint)

    // ── Label ──────────────────────────────────────────────────────────────
    val labelAlpha = (190 + sin(time * 1.6f) * 50).toInt().coerceIn(140, 240)
    textPaint.textSize = 16f * dp
    textPaint.alpha = labelAlpha
    val textY = cy - (textPaint.descent() + textPaint.ascent()) / 2f
    canvas.drawText("Scanning…", cx, textY, textPaint)
  }

  fun stop() {
    handler.removeCallbacks(animRunnable)
  }
}
