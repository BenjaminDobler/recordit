import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TransportControls } from './features/transport/components/transport-controls/transport-controls';
import { TimelineContainer } from './features/timeline/components/timeline-container/timeline-container';
import { ProjectManager } from './features/project/project-manager';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TransportControls, TimelineContainer, ProjectManager],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('recordit');
}
