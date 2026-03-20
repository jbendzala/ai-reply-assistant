package com.aireplyassistant.screencapture

import android.animation.ObjectAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.RadialGradient
import android.graphics.Shader
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import kotlin.math.abs
import kotlin.math.sin
import kotlin.math.sqrt

class BubbleView(
  context: Context,
  private val windowManager: WindowManager,
  private val params: WindowManager.LayoutParams,
  private val onTap: () -> Unit,
  private val onDismiss: () -> Unit,
) : View(context) {

  private val dp = resources.displayMetrics.density
  private val bubbleSizePx = (48 * dp).toInt()
  private val dismissTargetSizePx = (64 * dp).toInt()
  private val snapThresholdPx = 90 * dp

  // ─── Paints ───────────────────────────────────────────────────────────────

  private val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.parseColor("#0D1B2A") // deep navy
  }

  // Bubble outline — visible on dark backgrounds
  private val outlinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = 1.2f * resources.displayMetrics.density
    color = Color.parseColor("#4A7FA8") // muted steel-blue
  }

  // Water-drop ripple rings
  private val ripplePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    color = Color.parseColor("#7DD3FC") // soft sky-blue
  }

  // Subtle center glow
  private val corePaint = Paint(Paint.ANTI_ALIAS_FLAG)

  // "AI" label
  private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE
    textAlign = Paint.Align.CENTER
    isFakeBoldText = true
  }

  private val clipPath = Path()

  // ─── Touch tracking ───────────────────────────────────────────────────────

  private var initialTouchX = 0f
  private var initialTouchY = 0f
  private var initialParamX = 0
  private var initialParamY = 0
  private var isDragging = false
  private val handler = Handler(Looper.getMainLooper())
  private var longPressRunnable: Runnable? = null
  private var isOverDismiss = false

  // ─── Dismiss target ───────────────────────────────────────────────────────

  private var dismissTargetView: DismissTargetView? = null

  // ─── Animation ────────────────────────────────────────────────────────────

  private var time = 0f
  private val animRunnable = object : Runnable {
    override fun run() {
      time += 0.030f
      invalidate()
      postDelayed(this, 16)
    }
  }

  init {
    params.width = bubbleSizePx
    params.height = bubbleSizePx
    post(animRunnable)
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(bubbleSizePx, bubbleSizePx)
  }

  override fun onDraw(canvas: Canvas) {
    val cx = width / 2f
    val cy = height / 2f
    val r = (width / 2f) - 2f

    // Clip to circle
    clipPath.reset()
    clipPath.addCircle(cx, cy, r, Path.Direction.CW)
    canvas.save()
    canvas.clipPath(clipPath)

    // Background
    canvas.drawCircle(cx, cy, r, bgPaint)

    // ── Water-drop ripple rings (2 staggered, slow and faint) ────────────────
    for (i in 0 until 2) {
      val phase = ((time * 0.18f + i * 0.5f) % 1f)
      val radius = r * (0.25f + phase * 0.72f)
      val alpha = (sin(phase * Math.PI.toFloat()) * 28f).toInt().coerceIn(0, 28)
      ripplePaint.strokeWidth = 0.9f * dp
      ripplePaint.alpha = alpha
      canvas.drawCircle(cx, cy, radius, ripplePaint)
    }

    // Subtle pulsing center glow
    val coreR = r * (0.32f + sin(time * 1.6f) * 0.05f)
    corePaint.shader = RadialGradient(
      cx, cy, coreR,
      intArrayOf(Color.parseColor("#30558B"), Color.TRANSPARENT),
      floatArrayOf(0f, 1f),
      Shader.TileMode.CLAMP,
    )
    canvas.drawCircle(cx, cy, coreR, corePaint)

    // "AI" label — centred, gently pulsing opacity
    textPaint.textSize = 15f * dp
    val labelAlpha = (215 + sin(time * 1.4f) * 25).toInt().coerceIn(190, 240)
    textPaint.alpha = labelAlpha
    val textY = cy - (textPaint.descent() + textPaint.ascent()) / 2f
    canvas.drawText("AI", cx, textY, textPaint)

    // Outline drawn last so it sits on top of all internal layers
    canvas.drawCircle(cx, cy, r - outlinePaint.strokeWidth / 2f, outlinePaint)

    canvas.restore()
  }

  // ─── Touch ────────────────────────────────────────────────────────────────

  override fun onTouchEvent(event: MotionEvent): Boolean {
    when (event.action) {
      MotionEvent.ACTION_DOWN -> {
        initialTouchX = event.rawX
        initialTouchY = event.rawY
        initialParamX = params.x
        initialParamY = params.y
        isDragging = false
        longPressRunnable = Runnable { startShake() }
        handler.postDelayed(longPressRunnable!!, 600)
      }

      MotionEvent.ACTION_MOVE -> {
        val dx = event.rawX - initialTouchX
        val dy = event.rawY - initialTouchY
        if (!isDragging && (abs(dx) > 10 || abs(dy) > 10)) {
          isDragging = true
          longPressRunnable?.let { handler.removeCallbacks(it) }
          showDismissTarget()
        }
        if (isDragging) {
          params.x = initialParamX + dx.toInt()
          params.y = initialParamY + dy.toInt()
          try { windowManager.updateViewLayout(this, params) } catch (_: Exception) {}

          val near = isNearDismissTarget(event.rawX, event.rawY)
          if (near != isOverDismiss) {
            isOverDismiss = near
            dismissTargetView?.setActive(near)
          }
        }
      }

      MotionEvent.ACTION_UP -> {
        longPressRunnable?.let { handler.removeCallbacks(it) }
        if (isDragging) {
          if (isOverDismiss) {
            hideDismissTarget()
            onDismiss()
          } else {
            hideDismissTarget()
          }
          isDragging = false
        } else {
          performClick()
        }
      }
    }
    return true
  }

  override fun performClick(): Boolean {
    super.performClick()
    onTap()
    return true
  }

  // ─── Dismiss target ───────────────────────────────────────────────────────

  private fun showDismissTarget() {
    if (dismissTargetView != null) return
    val dv = DismissTargetView(context, dismissTargetSizePx)
    val dvParams = WindowManager.LayoutParams(
      dismissTargetSizePx,
      dismissTargetSizePx,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else
        @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
      y = (56 * dp).toInt()
    }
    windowManager.addView(dv, dvParams)
    dismissTargetView = dv
    dv.animateIn()
  }

  private fun hideDismissTarget() {
    dismissTargetView?.let {
      try { windowManager.removeView(it) } catch (_: Exception) {}
      dismissTargetView = null
    }
    isOverDismiss = false
  }

  private fun isNearDismissTarget(rawX: Float, rawY: Float): Boolean {
    val metrics = resources.displayMetrics
    val targetCx = metrics.widthPixels / 2f
    val targetCy = metrics.heightPixels - (56 * dp) - dismissTargetSizePx / 2f
    val dx = rawX - targetCx
    val dy = rawY - targetCy
    return sqrt((dx * dx + dy * dy).toDouble()) < snapThresholdPx
  }

  // ─── Shake hint ──────────────────────────────────────────────────────────

  private fun startShake() {
    ObjectAnimator.ofFloat(this, "translationX", 0f, -15f, 15f, -10f, 10f, 0f).apply {
      duration = 400
      start()
    }
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  fun cleanup() {
    removeCallbacks(animRunnable)
    hideDismissTarget()
    longPressRunnable?.let { handler.removeCallbacks(it) }
  }
}
