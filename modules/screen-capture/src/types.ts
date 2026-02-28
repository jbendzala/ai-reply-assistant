export type CaptureEvent = { text: string };
export type CaptureErrorEvent = { message: string };
export type BubbleServiceConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  tone: string;
  accessToken: string;
};
