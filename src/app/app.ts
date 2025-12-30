import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RecordControls } from './features/recorder/components/record-controls/record-controls';
import { TransportControls } from './features/transport/components/transport-controls/transport-controls';
import { TimelineContainer } from './features/timeline/components/timeline-container/timeline-container';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RecordControls, TransportControls, TimelineContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('recordit');
}
