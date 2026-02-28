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
import kotlin.math.cos
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
    color = Color.parseColor("#060E1F") // near-black navy
  }
  private val boltPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = 1.6f * dp
    strokeCap = Paint.Cap.ROUND
    color = Color.parseColor("#E2F0FF") // near-white icy blue
  }
  private val boltGlowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = 3.5f * dp
    strokeCap = Paint.Cap.ROUND
    color = Color.parseColor("#7DD3FC") // soft blue glow layer
  }
  private val corePaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val clipPath = Path()
  private val boltPath = Path()

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
      time += 0.045f
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

    // 13 plasma bolt arms — each fires independently with its own angle and timing.
    // Bolts randomly appear/fade rather than orbiting at fixed angular positions.
    for (i in 0 until 13) {
      // Each bolt has its own slow pulse with a unique frequency — when the
      // pulse crosses the threshold the bolt is "alive".
      val pulse = sin(time * (0.9f + i * 0.38f) + i * 2.6f)
      if (pulse < -0.2f) continue // bolt dormant — skip draw entirely
      val visibility = ((pulse + 0.2f) / 1.2f).coerceIn(0f, 1f)

      // Angle drifts on a different frequency from visibility, so bolts appear
      // pointing in a new direction each time they wake up.
      val angle = (sin(time * 0.35f + i * 1.9f) * Math.PI.toFloat() +
                   cos(time * 0.25f + i * 2.8f) * Math.PI.toFloat())

      val length = r * visibility * (0.55f + sin(time * 3.1f + i * 0.85f) * 0.22f)
      val midFrac = 0.45f + sin(time * 2.3f + i * 1.1f) * 0.12f
      val perpOffset = sin(time * 5.5f + i * 1.9f) * r * 0.18f

      val perpAngle = angle + (Math.PI / 2).toFloat()
      val midDist = length * midFrac
      val midX = cx + cos(angle) * midDist + cos(perpAngle) * perpOffset
      val midY = cy + sin(angle) * midDist + sin(perpAngle) * perpOffset
      val endX = cx + cos(angle) * length
      val endY = cy + sin(angle) * length

      boltPath.reset()
      boltPath.moveTo(cx, cy)
      boltPath.lineTo(midX, midY)
      boltPath.lineTo(endX, endY)

      // Glow layer (wider, less opaque) — scales with visibility
      val glowAlpha = (visibility * 90f).toInt().coerceIn(0, 90)
      boltGlowPaint.alpha = glowAlpha
      canvas.drawPath(boltPath, boltGlowPaint)

      // Sharp bright bolt on top
      val boltAlpha = (visibility * 220f + sin(time * 6f + i * 2.5f) * 30f).toInt().coerceIn(0, 240)
      boltPaint.alpha = boltAlpha
      canvas.drawPath(boltPath, boltPaint)
    }

    // Bright pulsing core — radial gradient white → transparent
    val coreRadius = r * (0.22f + sin(time * 2.0f) * 0.06f)
    corePaint.shader = RadialGradient(
      cx, cy, coreRadius,
      intArrayOf(Color.WHITE, Color.parseColor("#80BAE6FF"), Color.TRANSPARENT),
      floatArrayOf(0f, 0.55f, 1f),
      Shader.TileMode.CLAMP,
    )
    canvas.drawCircle(cx, cy, coreRadius, corePaint)

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
