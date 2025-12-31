export enum EffectType {
  Distortion = 'distortion',
  Delay = 'delay',
  Boost = 'boost',
  Flanger = 'flanger',
  Reverb = 'reverb',
  Tremolo = 'tremolo'
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

export interface BoostEffect extends Effect {
  type: EffectType.Boost;
  parameters: {
    gain: number;  // 0-100 (boost amount in dB)
  };
}

export interface FlangerEffect extends Effect {
  type: EffectType.Flanger;
  parameters: {
    rate: number;      // 0-100 (LFO rate)
    depth: number;     // 0-100 (delay depth)
    feedback: number;  // 0-100
  };
}

export interface ReverbEffect extends Effect {
  type: EffectType.Reverb;
  parameters: {
    roomSize: number;  // 0-100
    damping: number;   // 0-100
    wetDry: number;    // 0-100 (wet/dry mix)
  };
}

export interface TremoloEffect extends Effect {
  type: EffectType.Tremolo;
  parameters: {
    rate: number;   // 0-100 (LFO rate in Hz)
    depth: number;  // 0-100 (modulation depth)
  };
}
