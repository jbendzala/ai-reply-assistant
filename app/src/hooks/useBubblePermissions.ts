import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'screen-capture';
import { PermissionStatus } from '../types';

export function useBubblePermissions() {
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [screenRecordingStatus, setScreenRecordingStatus] = useState<PermissionStatus>('not_asked');

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    ScreenCapture.hasOverlayPermission().then(setOverlayGranted);
  }, []);

  async function requestOverlay() {
    if (Platform.OS !== 'android') return;
    await ScreenCapture.requestOverlayPermission();
    // Poll until the user grants or returns to the app (up to ~10 seconds)
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const granted = await ScreenCapture.hasOverlayPermission();
      if (granted || attempts >= 20) {
        clearInterval(poll);
        setOverlayGranted(granted);
      }
    }, 500);
  }

  async function requestScreenRecording() {
    if (Platform.OS !== 'android') return;
    const granted = await ScreenCapture.requestMediaProjectionPermission();
    setScreenRecordingStatus(granted ? 'granted' : 'denied');
  }

  function refresh() {
    if (Platform.OS !== 'android') return;
    ScreenCapture.hasOverlayPermission().then(setOverlayGranted);
  }

  return { overlayGranted, screenRecordingStatus, requestOverlay, requestScreenRecording, refresh };
}
