import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HomeSummary, SearchResponse } from '../models/home.model';

@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly API_BASE = environment.apiBase;

  constructor(private http: HttpClient) {}

  search(q: string): Observable<SearchResponse> {
    const params = new HttpParams().set('q', q);
    return this.http.get<SearchResponse>(`${this.API_BASE}/search`, { params });
  }

  summary(): Observable<HomeSummary> {
    return this.http.get<HomeSummary>(`${this.API_BASE}/home/summary`);
  }
}
