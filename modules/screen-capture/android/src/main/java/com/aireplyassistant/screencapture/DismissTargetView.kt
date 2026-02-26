package com.aireplyassistant.screencapture

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.View

class DismissTargetView(context: Context, private val sizePx: Int) : View(context) {

  private val dp = context.resources.displayMetrics.density
  private var isActive = false

  private val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.parseColor("#CC1A1A2E")
  }
  private val bgActivePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.parseColor("#CCB71C1C")
  }
  private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE
    alpha = 100
    style = Paint.Style.STROKE
    strokeWidth = 1.5f * dp
  }
  private val xPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE
    strokeWidth = 2.5f * dp
    strokeCap = Paint.Cap.ROUND
    style = Paint.Style.STROKE
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(sizePx, sizePx)
  }

  override fun onDraw(canvas: Canvas) {
    val cx = width / 2f
    val cy = height / 2f
    val r = width / 2f - 4f
    canvas.drawCircle(cx, cy, r, if (isActive) bgActivePaint else bgPaint)
    canvas.drawCircle(cx, cy, r, ringPaint)
    val xLen = r * 0.32f
    canvas.drawLine(cx - xLen, cy - xLen, cx + xLen, cy + xLen, xPaint)
    canvas.drawLine(cx + xLen, cy - xLen, cx - xLen, cy + xLen, xPaint)
  }

  fun setActive(active: Boolean) {
    if (isActive == active) return
    isActive = active
    val scale = if (active) 1.25f else 1.0f
    animate().scaleX(scale).scaleY(scale).setDuration(150).start()
    invalidate()
  }

  fun animateIn() {
    alpha = 0f
    scaleX = 0.6f
    scaleY = 0.6f
    animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(250).start()
  }
}
