import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Plugin, PluginExecuteResult } from '../models/plugin.interface';

@Injectable({ providedIn: 'root' })
export class PluginService {
  private readonly apiUrl = environment.apiUrl;
  private plugins$ = new BehaviorSubject<Plugin[]>([]);

  constructor(private http: HttpClient) {}

  get activePlugins(): Plugin[] {
    return this.plugins$.value.filter(p => p.isActive);
  }

  loadPlugins(): Observable<Plugin[]> {
    return this.http.get<Plugin[]>(`${this.apiUrl}/api/plugins`).pipe(
      tap(plugins => this.plugins$.next(plugins))
    );
  }

  executePlugin(id: number): Observable<PluginExecuteResult> {
    return this.http.post<PluginExecuteResult>(`${this.apiUrl}/api/plugins/${id}/execute`, {});
  }
}
