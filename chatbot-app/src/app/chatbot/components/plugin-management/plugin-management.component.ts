import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Plugin } from '../../models/plugin.interface';

@Component({
  selector: 'app-plugin-management',
  templateUrl: './plugin-management.component.html',
  styleUrls: ['./plugin-management.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PluginManagementComponent implements OnInit {
  private readonly apiUrl = environment.apiUrl;
  plugins: Plugin[] = [];
  isLoading = false;
  showAddForm = false;
  newPlugin = { name: '', description: '', url: '', httpMethod: 'GET' };

  constructor(
    private dialogRef: MatDialogRef<PluginManagementComponent>,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPlugins();
  }

  loadPlugins(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.http.get<Plugin[]>(`${this.apiUrl}/api/plugins`).subscribe({
      next: plugins => {
        this.plugins = plugins;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  togglePlugin(plugin: Plugin): void {
    this.http.patch<Plugin>(`${this.apiUrl}/api/plugins/${plugin.id}/toggle`, {}).subscribe({
      next: updated => {
        const plugins = [...this.plugins];
        const idx = plugins.findIndex(p => p.id === plugin.id);
        if (idx !== -1) plugins[idx] = updated;
        this.plugins = plugins;
        this.cdr.detectChanges();
      }
    });
  }

  addPlugin(): void {
    if (!this.newPlugin.name || !this.newPlugin.url) return;
    this.http.post<Plugin>(`${this.apiUrl}/api/plugins`, this.newPlugin).subscribe({
      next: plugin => {
        this.plugins = [plugin, ...this.plugins];
        this.showAddForm = false;
        this.newPlugin = { name: '', description: '', url: '', httpMethod: 'GET' };
        this.cdr.detectChanges();
      }
    });
  }

  deletePlugin(id: number): void {
    this.http.delete(`${this.apiUrl}/api/plugins/${id}`).subscribe({
      next: () => {
        this.plugins = this.plugins.filter(p => p.id !== id);
        this.cdr.detectChanges();
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
