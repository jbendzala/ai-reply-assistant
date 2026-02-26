declare module 'screen-capture' {
  export type CaptureEvent = { text: string };
  export type CaptureErrorEvent = { message: string };
  export type BubbleServiceConfig = {
    supabaseUrl: string;
    supabaseAnonKey: string;
    tone: string;
  };

  export type Subscription = { remove: () => void };

  export function hasOverlayPermission(): Promise<boolean>;
  export function requestOverlayPermission(): Promise<void>;
  export function startBubbleService(): Promise<void>;
  export function stopBubbleService(): Promise<void>;
  export function isBubbleRunning(): Promise<boolean>;
  export function sendRepliesToNative(replies: string[]): Promise<void>;
  export function configureBubbleService(config: BubbleServiceConfig): Promise<void>;
  export function addTextCapturedListener(cb: (event: CaptureEvent) => void): Subscription;
  export function addCaptureErrorListener(cb: (event: CaptureErrorEvent) => void): Subscription;
}
