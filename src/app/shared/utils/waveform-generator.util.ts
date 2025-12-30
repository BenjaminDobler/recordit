/**
 * Generates waveform peak data from an AudioBuffer
 * @param audioBuffer The audio buffer to analyze
 * @param samples Number of samples/peaks to generate (default: 200)
 * @returns Array of normalized peak values (0-1)
 */
export function generateWaveformData(audioBuffer: AudioBuffer, samples: number = 200): number[] {
  const channelData = audioBuffer.getChannelData(0); // Use first channel
  const blockSize = Math.floor(channelData.length / samples);
  const peaks: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channelData.length);
    let max = 0;

    // Find the maximum absolute value in this block
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) {
        max = abs;
      }
    }

    peaks.push(max);
  }

  return peaks;
}
