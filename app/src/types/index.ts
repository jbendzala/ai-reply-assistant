export type TonePreference = 'casual' | 'formal' | 'friendly';

export interface Reply {
  id: string;
  text: string;
}

export type PermissionStatus = 'not_asked' | 'granted' | 'denied';
