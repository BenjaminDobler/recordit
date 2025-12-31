import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStorageService } from '../../core/services/project-storage.service';
import { ExportService } from '../../core/services/export.service';

interface SavedProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

@Component({
  selector: 'app-project-manager',
  imports: [CommonModule, FormsModule],
  templateUrl: './project-manager.html',
  styleUrl: './project-manager.scss',
  standalone: true
})
export class ProjectManager {
  private projectStorageService = inject(ProjectStorageService);
  private exportService = inject(ExportService);

  savedProjects = signal<SavedProject[]>([]);
  showSaveDialog = signal(false);
  showLoadDialog = signal(false);
  showExportDialog = signal(false);
  projectName = signal('');
  exportFilename = signal('');
  isSaving = signal(false);
  isLoading = signal(false);
  isExporting = signal(false);
  exportProgress = signal(0);
  errorMessage = signal('');
  successMessage = signal('');

  projectDuration = computed(() => {
    const duration = this.exportService.getProjectDuration();
    return duration.toFixed(2);
  });

  async ngOnInit() {
    await this.loadProjectList();
  }

  /**
   * Loads the list of saved projects
   */
  async loadProjectList(): Promise<void> {
    try {
      const projects = await this.projectStorageService.getAllProjects();
      this.savedProjects.set(projects.map(p => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      })));
    } catch (error) {
      console.error('Failed to load project list:', error);
      this.errorMessage.set('Failed to load project list');
    }
  }

  /**
   * Opens the save dialog
   */
  openSaveDialog(): void {
    this.showSaveDialog.set(true);
    this.projectName.set('My Project');
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  /**
   * Closes the save dialog
   */
  closeSaveDialog(): void {
    this.showSaveDialog.set(false);
    this.projectName.set('');
  }

  /**
   * Saves the current project
   */
  async saveProject(): Promise<void> {
    const name = this.projectName().trim();

    if (!name) {
      this.errorMessage.set('Please enter a project name');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await this.projectStorageService.saveProject(name);
      this.successMessage.set('Project saved successfully!');
      await this.loadProjectList();

      setTimeout(() => {
        this.closeSaveDialog();
        this.successMessage.set('');
      }, 1500);
    } catch (error) {
      console.error('Failed to save project:', error);
      this.errorMessage.set('Failed to save project. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Opens the load dialog
   */
  openLoadDialog(): void {
    this.showLoadDialog.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  /**
   * Closes the load dialog
   */
  closeLoadDialog(): void {
    this.showLoadDialog.set(false);
  }

  /**
   * Loads a project
   */
  async loadProject(projectId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await this.projectStorageService.loadProject(projectId);
      this.successMessage.set('Project loaded successfully!');

      setTimeout(() => {
        this.closeLoadDialog();
        this.successMessage.set('');
      }, 1500);
    } catch (error) {
      console.error('Failed to load project:', error);
      this.errorMessage.set('Failed to load project. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Deletes a project
   */
  async deleteProject(projectId: string, projectName: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${projectName}"?`)) {
      return;
    }

    try {
      await this.projectStorageService.deleteProject(projectId);
      await this.loadProjectList();
      this.successMessage.set('Project deleted successfully!');

      setTimeout(() => {
        this.successMessage.set('');
      }, 2000);
    } catch (error) {
      console.error('Failed to delete project:', error);
      this.errorMessage.set('Failed to delete project. Please try again.');
    }
  }

  /**
   * Formats a timestamp for display
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Opens the export dialog
   */
  openExportDialog(): void {
    this.showExportDialog.set(true);
    this.exportFilename.set('my-mix.webm');
    this.errorMessage.set('');
    this.successMessage.set('');
    this.exportProgress.set(0);
  }

  /**
   * Closes the export dialog
   */
  closeExportDialog(): void {
    this.showExportDialog.set(false);
    this.exportFilename.set('');
    this.exportProgress.set(0);
  }

  /**
   * Exports the final mix
   */
  async exportMix(): Promise<void> {
    const filename = this.exportFilename().trim();

    if (!filename) {
      this.errorMessage.set('Please enter a filename');
      return;
    }

    // Ensure .webm extension
    const finalFilename = filename.endsWith('.webm') ? filename : `${filename}.webm`;

    this.isExporting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.exportProgress.set(0);

    try {
      await this.exportService.exportMix(finalFilename, (progress) => {
        this.exportProgress.set(progress);
      });

      this.successMessage.set('Mix exported successfully!');

      setTimeout(() => {
        this.closeExportDialog();
        this.successMessage.set('');
      }, 2000);
    } catch (error) {
      console.error('Failed to export mix:', error);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to export mix. Please try again.'
      );
    } finally {
      this.isExporting.set(false);
    }
  }
}
