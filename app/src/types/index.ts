export type TonePreference = 'casual' | 'formal' | 'friendly' | 'witty';

export interface Reply {
  id: string;
  text: string;
}

export type PermissionStatus = 'not_asked' | 'granted' | 'denied';

// Phase 4 — native module event types
export type CaptureEvent = { text: string };
export type CaptureErrorEvent = { message: string };
export type BubbleServiceConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  tone: string;
};
