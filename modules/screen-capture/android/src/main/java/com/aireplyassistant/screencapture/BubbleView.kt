package com.aireplyassistant.screencapture

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
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

  // ─── Plasma paints ───────────────────────────────────────────────────────

  private val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.parseColor("#1E3A8A") // dark navy blue
  }
  private val blob1Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.parseColor("#3B82F6"); alpha = 165
  }
  private val blob2Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.parseColor("#93C5FD"); alpha = 130
  }
  private val blob3Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.parseColor("#DBEAFE"); alpha = 90
  }
  private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE; alpha = 55
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

  // ─── Plasma animation ────────────────────────────────────────────────────

  private var time = 0f
  private val plasmaRunnable = object : Runnable {
    override fun run() {
      time += 0.04f
      invalidate()
      postDelayed(this, 16)
    }
  }

  init {
    params.width = bubbleSizePx
    params.height = bubbleSizePx
    post(plasmaRunnable)
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(bubbleSizePx, bubbleSizePx)
  }

  override fun onDraw(canvas: Canvas) {
    val cx = width / 2f
    val cy = height / 2f
    val r = (width / 2f) - 2f

    clipPath.reset()
    clipPath.addCircle(cx, cy, r, Path.Direction.CW)
    canvas.save()
    canvas.clipPath(clipPath)

    // Background
    canvas.drawCircle(cx, cy, r, bgPaint)

    // Animated plasma blobs
    canvas.drawCircle(
      cx + sin(time * 1.1f) * r * 0.35f,
      cy + cos(time * 0.9f) * r * 0.30f,
      r * 0.62f, blob1Paint,
    )
    canvas.drawCircle(
      cx + sin(time * 0.7f + 2.1f) * r * 0.30f,
      cy + cos(time * 1.3f + 1.0f) * r * 0.40f,
      r * 0.55f, blob2Paint,
    )
    canvas.drawCircle(
      cx + sin(time * 1.5f + 4.2f) * r * 0.25f,
      cy + cos(time * 0.8f + 3.0f) * r * 0.35f,
      r * 0.45f, blob3Paint,
    )

    // Central white glow
    canvas.drawCircle(cx, cy, r * 0.28f, glowPaint)

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

  // ─── Edge snap ──────────────────────���────────────────────────────────────

  private fun snapToEdge() {
    val screenWidth = resources.displayMetrics.widthPixels
    val targetX = if (params.x + bubbleSizePx / 2 > screenWidth / 2)
      screenWidth - bubbleSizePx - (12 * dp).toInt()
    else
      (12 * dp).toInt()
    ValueAnimator.ofInt(params.x, targetX).apply {
      addUpdateListener {
        params.x = it.animatedValue as Int
        try { windowManager.updateViewLayout(this@BubbleView, params) } catch (_: Exception) {}
      }
      duration = 200
      interpolator = DecelerateInterpolator()
      start()
    }
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
    removeCallbacks(plasmaRunnable)
    hideDismissTarget()
    longPressRunnable?.let { handler.removeCallbacks(it) }
  }
}
