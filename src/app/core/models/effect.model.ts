export enum EffectType {
  Distortion = 'distortion',
  Delay = 'delay'
}

export interface Effect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, number>;
}

export interface DistortionEffect extends Effect {
  type: EffectType.Distortion;
  parameters: {
    amount: number;  // 0-100
  };
}

export interface DelayEffect extends Effect {
  type: EffectType.Delay;
  parameters: {
    time: number;     // Delay time in ms
    feedback: number; // 0-1
    wetDry: number;   // 0-1 (wet/dry mix)
  };
}
