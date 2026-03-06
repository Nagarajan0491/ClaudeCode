import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { PluginService } from '../../services/plugin.service';
import { Plugin, CreatePluginRequest, UpdatePluginRequest } from '../../models/plugin.interface';

function jsonValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  try {
    JSON.parse(control.value);
    return null;
  } catch {
    return { invalidJson: true };
  }
}

@Component({
  selector: 'app-plugin-management',
  templateUrl: './plugin-management.component.html',
  styleUrls: ['./plugin-management.component.css'],
  standalone: false
})
export class PluginManagementComponent implements OnInit, OnDestroy {
  plugins: Plugin[] = [];
  showForm = false;
  editingPlugin: Plugin | null = null;
  isSubmitting = false;
  form!: FormGroup;
  httpMethods = ['GET', 'POST', 'PUT'];

  private destroy$ = new Subject<void>();

  constructor(
    private pluginService: PluginService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.pluginService.plugins$
      .pipe(takeUntil(this.destroy$))
      .subscribe(plugins => {
        this.plugins = plugins;
        this.cdr.detectChanges();
      });
    this.pluginService.loadPlugins().subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      endpointUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      httpMethod: ['POST', Validators.required],
      authToken: [''],
      parameterSchema: ['{}', [Validators.required, jsonValidator]],
      isActive: [true]
    });
  }

  openAddForm(): void {
    this.editingPlugin = null;
    this.form.reset({ httpMethod: 'POST', parameterSchema: '{}', isActive: true });
    this.showForm = true;
    this.cdr.detectChanges();
  }

  openEditForm(plugin: Plugin): void {
    this.editingPlugin = plugin;
    this.form.patchValue({
      name: plugin.name,
      description: plugin.description,
      endpointUrl: plugin.endpointUrl,
      httpMethod: plugin.httpMethod,
      authToken: '',
      parameterSchema: plugin.parameterSchema,
      isActive: plugin.isActive
    });
    this.showForm = true;
    this.cdr.detectChanges();
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingPlugin = null;
    this.cdr.detectChanges();
  }

  savePlugin(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const val = this.form.value;
    this.isSubmitting = true;

    if (this.editingPlugin) {
      const request: UpdatePluginRequest = {
        name: val.name,
        description: val.description,
        endpointUrl: val.endpointUrl,
        httpMethod: val.httpMethod,
        authToken: val.authToken || undefined,
        parameterSchema: val.parameterSchema,
        isActive: val.isActive
      };
      this.pluginService.updatePlugin(this.editingPlugin.id, request).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showForm = false;
          this.editingPlugin = null;
          this.snackBar.open('Plugin updated successfully.', 'OK', { duration: 3000 });
          this.cdr.detectChanges();
        },
        error: () => {
          this.isSubmitting = false;
          this.snackBar.open('Failed to update plugin.', 'Dismiss', { duration: 4000 });
          this.cdr.detectChanges();
        }
      });
    } else {
      const request: CreatePluginRequest = {
        name: val.name,
        description: val.description,
        endpointUrl: val.endpointUrl,
        httpMethod: val.httpMethod,
        authToken: val.authToken || undefined,
        parameterSchema: val.parameterSchema,
        isActive: val.isActive
      };
      this.pluginService.createPlugin(request).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showForm = false;
          this.snackBar.open('Plugin created successfully.', 'OK', { duration: 3000 });
          this.cdr.detectChanges();
        },
        error: () => {
          this.isSubmitting = false;
          this.snackBar.open('Failed to create plugin.', 'Dismiss', { duration: 4000 });
          this.cdr.detectChanges();
        }
      });
    }
  }

  togglePlugin(plugin: Plugin): void {
    this.pluginService.togglePlugin(plugin.id).subscribe({
      next: () => this.snackBar.open(`Plugin ${plugin.isActive ? 'deactivated' : 'activated'}.`, 'OK', { duration: 2000 }),
      error: () => this.snackBar.open('Failed to toggle plugin.', 'Dismiss', { duration: 4000 })
    });
  }

  testPlugin(plugin: Plugin): void {
    this.pluginService.executePlugin(plugin.id).subscribe({
      next: (result) => {
        const msg = result.success
          ? `Success (${result.statusCode}): ${(result.output ?? '').substring(0, 100)}`
          : `Failed (${result.statusCode}): ${result.error ?? 'Unknown error'}`;
        this.snackBar.open(msg, 'OK', { duration: 5000 });
      },
      error: () => this.snackBar.open('Plugin test request failed.', 'Dismiss', { duration: 4000 })
    });
  }

  deletePlugin(plugin: Plugin): void {
    const snackRef = this.snackBar.open(`Delete plugin "${plugin.name}"?`, 'Undo', { duration: 4000 });
    let deleted = false;
    const timer = setTimeout(() => {
      deleted = true;
      this.pluginService.deletePlugin(plugin.id).subscribe({
        next: () => this.snackBar.open('Plugin deleted.', 'OK', { duration: 2000 }),
        error: () => this.snackBar.open('Failed to delete plugin.', 'Dismiss', { duration: 4000 })
      });
    }, 4000);
    snackRef.onAction().subscribe(() => {
      if (!deleted) clearTimeout(timer);
    });
  }
}
