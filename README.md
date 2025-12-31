# RecordIt - Web-based DAW

A modern, browser-based Digital Audio Workstation (DAW) built with Angular 18+ and the Web Audio API. RecordIt enables multi-track recording, audio editing, and real-time effects processing entirely in your browser.

**[🎸 Try Live Demo](https://benjamindobbler.github.io/recordit/)**

## Features

### Multi-Track Recording
- **Multi-track support** - Create and manage multiple audio tracks
- **Track arming** - Arm specific tracks for recording while others remain inactive
- **Playback monitoring** - Hear existing tracks while recording new ones
- **Live recording preview** - Visual feedback during recording with real-time clip preview

### Timeline & Editing
- **Visual timeline** with time ruler and playhead
- **Drag-and-drop clips** - Move audio clips freely across the timeline
- **Trim clips** - Non-destructive trimming by dragging clip edges
- **Context menu** - Right-click clips to split, duplicate, or delete
- **Waveform display** - See visual representation of audio
- **Click-to-seek** - Jump to any position by clicking the time ruler

### Audio Effects
Six guitar-inspired effects with interactive stomp box UI:
- **Boost** - Clean gain (0-20 dB)
- **Distortion** - Tanh-based soft clipping with drive control
- **Flanger** - LFO modulation with rate, depth, and feedback
- **Delay** - Time-based echo with feedback and mix controls
- **Reverb** - Schroeder algorithm with room size, damping, and mix
- **Tremolo** - Amplitude modulation with rate and depth

### Effects Panel
- **Interactive stomp box pedalboard** - Drag and position effects like real guitar pedals
- **Rotary knobs** - Visual knob controls with 270° rotation (-135° to +135°)
- **LED indicators** - Visual feedback for active/bypassed effects
- **Footswitch bypass** - Click to enable/disable effects
- **Preset management** - Save, load, and delete effect configurations
- **Color-coded pedals** - Each effect has a unique color scheme

### Track Controls
- **Volume control** - Per-track volume faders
- **Mute/Solo** - Isolate or silence individual tracks
- **Effects panel** - Access per-track effect chains
- **Track deletion** - Remove tracks with confirmation

### Export
- **WAV export** - Download your mix as a WAV file
- **Full mix rendering** - Exports all tracks with effects applied

## Tech Stack

- **Angular 18+** - Standalone components with signal-based architecture
- **Web Audio API** - Native browser audio processing
- **MediaRecorder API** - Browser-based audio recording
- **RxJS** - Reactive state management
- **TypeScript** - Type-safe development
- **SCSS** - Advanced styling with variables and mixins

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

Navigate to `http://localhost:4200/` in your browser.

### Building for Production

```bash
npm run build
```

Build artifacts will be stored in the `dist/` directory.

## Usage Guide

### Recording Your First Track

1. **Create a track** - Click "Add Track" button
2. **Arm the track** - Click the arm button (track will show red border)
3. **Grant microphone access** - Browser will request permission
4. **Start recording** - Click the record button
5. **Stop recording** - Click stop when finished

### Adding Effects

1. **Open effects panel** - Click "Effects" button on any track
2. **Enable effects** - Click footswitch on any stomp box to activate
3. **Adjust parameters** - Drag knobs to change effect settings
4. **Save preset** - Click "💾 Save Current" to save your configuration
5. **Load preset** - Click any saved preset to apply settings

### Editing Clips

- **Move clip** - Click and drag clip body
- **Trim clip** - Hover near edges and drag to trim
- **Split clip** - Right-click → Split at Playhead
- **Duplicate clip** - Right-click → Duplicate
- **Delete clip** - Right-click → Delete

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── models/           # Data models (Track, Clip, Effect)
│   │   └── services/         # Core services
│   │       ├── audio-context.service.ts
│   │       ├── recorder.service.ts
│   │       ├── playback.service.ts
│   │       ├── effects-processor.service.ts
│   │       └── effects-preset.service.ts
│   ├── features/
│   │   ├── recorder/         # Recording controls
│   │   ├── transport/        # Playback controls
│   │   └── timeline/         # Timeline, tracks, clips
│   └── shared/
│       └── components/       # Reusable components
│           ├── effects-panel/
│           └── waveform-display/
```

## Architecture Highlights

### Signal-Based Reactivity
Uses Angular signals throughout for optimal performance:
- `signal()` for mutable state
- `computed()` for derived values
- `toSignal()` for Observable → Signal conversion

### Zoneless-Ready
Modern control flow syntax (`@if`, `@for`) and signals prepare the app for Angular's zoneless change detection.

### Web Audio Signal Chain
Effects are processed in series for authentic signal flow:
```
Source → Boost → Distortion → Flanger → Delay → Reverb → Tremolo → Gain → Destination
```

### Non-Destructive Editing
- Original audio buffers are never modified
- Trimming adjusts `trimStart` and `trimEnd` values
- Splitting creates new clips referencing the same buffer

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14.1+

Requires browsers with Web Audio API and MediaRecorder API support.

## Future Enhancements

- MIDI support
- VST plugin compatibility
- Cloud project storage
- Collaborative editing
- Time signature and tempo control
- Audio quantization and grid snapping

## License

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.4.

## Additional Resources

For more information on using the Angular CLI, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
