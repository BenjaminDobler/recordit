export interface AudioClip {
  id: string;
  trackId: string;
  name: string;
  startTime: number;        // Position on timeline (seconds)
  duration: number;         // Clip length (seconds)
  trimStart: number;        // Trim from start (seconds)
  trimEnd: number;          // Trim from end (seconds)
  audioBuffer: AudioBuffer; // Web Audio API buffer
  waveformData?: number[];  // Cached peaks for visualization
  color?: string;
}
