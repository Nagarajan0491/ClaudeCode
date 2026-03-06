import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Plugin, CreatePluginRequest, UpdatePluginRequest, ExecutePluginRequest, PluginExecuteResult } from '../models/plugin.interface';

@Injectable({ providedIn: 'root' })
export class PluginService {
  private readonly apiUrl = `${environment.apiUrl}/api/plugins`;
  private pluginsSubject = new BehaviorSubject<Plugin[]>([]);
  plugins$ = this.pluginsSubject.asObservable();

  constructor(private http: HttpClient) {}

  get activePlugins(): Plugin[] {
    return this.pluginsSubject.value.filter(p => p.isActive);
  }

  loadPlugins(): Observable<Plugin[]> {
    return this.http.get<Plugin[]>(this.apiUrl).pipe(
      tap(plugins => this.pluginsSubject.next(plugins))
    );
  }

  getPlugin(id: number): Observable<Plugin> {
    return this.http.get<Plugin>(`${this.apiUrl}/${id}`);
  }

  createPlugin(request: CreatePluginRequest): Observable<Plugin> {
    return this.http.post<Plugin>(this.apiUrl, request).pipe(
      tap(plugin => this.pluginsSubject.next([...this.pluginsSubject.value, plugin]))
    );
  }

  updatePlugin(id: number, request: UpdatePluginRequest): Observable<Plugin> {
    return this.http.put<Plugin>(`${this.apiUrl}/${id}`, request).pipe(
      tap(updated => {
        const current = this.pluginsSubject.value;
        this.pluginsSubject.next(current.map(p => p.id === id ? updated : p));
      })
    );
  }

  deletePlugin(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.pluginsSubject.next(this.pluginsSubject.value.filter(p => p.id !== id)))
    );
  }

  togglePlugin(id: number): Observable<Plugin> {
    return this.http.patch<Plugin>(`${this.apiUrl}/${id}/toggle`, {}).pipe(
      tap(updated => {
        const current = this.pluginsSubject.value;
        this.pluginsSubject.next(current.map(p => p.id === id ? updated : p));
      })
    );
  }

  executePlugin(id: number, parameters?: Record<string, unknown>): Observable<PluginExecuteResult> {
    const body: ExecutePluginRequest = { parameters };
    return this.http.post<PluginExecuteResult>(`${this.apiUrl}/${id}/execute`, body);
  }
}
