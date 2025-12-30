import { AudioClip } from './audio-clip.model';
import { Effect } from './effect.model';

export interface AudioTrack {
  id: string;
  name: string;
  volume: number;    // 0-1
  muted: boolean;
  solo: boolean;
  armed: boolean;    // Ready for recording
  clips: AudioClip[];
  effects: Effect[];
  color: string;
}
