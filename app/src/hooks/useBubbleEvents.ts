import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'screen-capture';
import type { CaptureErrorEvent, CaptureEvent } from 'screen-capture';

export function useBubbleEvents(
  onText: (text: string) => void,
  onError?: (message: string) => void,
) {
  const stableOnText = useCallback(onText, [onText]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const textSub = ScreenCapture.addTextCapturedListener((e: CaptureEvent) => {
      stableOnText(e.text);
    });

    const errorSub = ScreenCapture.addCaptureErrorListener((e: CaptureErrorEvent) => {
      onError?.(e.message);
    });

    return () => {
      textSub.remove();
      errorSub.remove();
    };
  }, [stableOnText, onError]);
}
