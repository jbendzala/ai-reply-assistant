import { EventEmitter, requireNativeModule } from 'expo-modules-core';

import type { BubbleServiceConfig, CaptureErrorEvent, CaptureEvent } from './types';

export type { BubbleServiceConfig, CaptureErrorEvent, CaptureEvent };

// Guard for Expo Go / environments where the native module isn't compiled in
let ScreenCaptureModule: ReturnType<typeof requireNativeModule> | null = null;
let emitter: EventEmitter | null = null;
try {
  ScreenCaptureModule = requireNativeModule('ScreenCapture');
  emitter = new EventEmitter(ScreenCaptureModule);
} catch {
  console.warn('[ScreenCapture] Native module not available — running in stub mode (Expo Go).');
}

/**
 * Returns whether the SYSTEM_ALERT_WINDOW (overlay) permission has been granted.
 */
export async function hasOverlayPermission(): Promise<boolean> {
  return ScreenCaptureModule?.hasOverlayPermission() ?? false;
}

/**
 * Opens the Android Settings screen for the app's overlay permission.
 * The user must grant it manually; there is no system dialog for this permission.
 */
export async function requestOverlayPermission(): Promise<void> {
  return ScreenCaptureModule?.requestOverlayPermission();
}

/**
 * Shows the system MediaProjection consent dialog ("Share your screen?") from
 * the foreground activity context. Returns true if the user accepted, false if
 * they denied or the dialog could not be shown.
 *
 * Note: MediaProjection permission cannot be stored — it must be re-granted
 * each session. Use this pre-flight check to confirm the user has seen and
 * accepted the dialog at least once so the bubble flow will work reliably.
 */
export async function requestMediaProjectionPermission(): Promise<boolean> {
  return ScreenCaptureModule?.requestMediaProjectionPermission() ?? false;
}

/**
 * Starts the BubbleService foreground service, which draws the floating bubble.
 * Requires overlay permission and should only be called after configureBubbleService().
 */
export async function startBubbleService(): Promise<void> {
  return ScreenCaptureModule?.startBubbleService();
}

/**
 * Stops the BubbleService foreground service and removes the bubble from the screen.
 */
export async function stopBubbleService(): Promise<void> {
  return ScreenCaptureModule?.stopBubbleService();
}

/**
 * Returns whether the BubbleService is currently running.
 */
export async function isBubbleRunning(): Promise<boolean> {
  return ScreenCaptureModule?.isBubbleRunning() ?? false;
}

/**
 * Sends reply suggestions to the native OverlayWindow so they can be displayed
 * as a floating card on top of other apps.
 */
export async function sendRepliesToNative(replies: string[]): Promise<void> {
  return ScreenCaptureModule?.sendRepliesToNative(replies);
}

/**
 * Persists Supabase config to SharedPreferences so BubbleService can call
 * the Edge Function when the RN app is backgrounded.
 */
export async function configureBubbleService(config: BubbleServiceConfig): Promise<void> {
  return ScreenCaptureModule?.configureBubbleService(config);
}

/**
 * Fires when the bubble captures and extracts text from the screen.
 */
export function addTextCapturedListener(
  callback: (event: CaptureEvent) => void,
) {
  return emitter?.addListener<CaptureEvent>('onTextCaptured', callback) ?? { remove: () => {} };
}

/**
 * Fires when screen capture or OCR fails.
 */
export function addCaptureErrorListener(
  callback: (event: CaptureErrorEvent) => void,
) {
  return emitter?.addListener<CaptureErrorEvent>('onCaptureError', callback) ?? { remove: () => {} };
}
