import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Item } from '../models/item.model';
import { QuickAddAnalysis, QuickAddRequest } from '../models/quick-add.model';

@Injectable({ providedIn: 'root' })
export class QuickAddService {
  private readonly API_BASE = environment.apiBase;

  constructor(private http: HttpClient) {}

  analyze(imageBase64: string): Observable<QuickAddAnalysis> {
    return this.http.post<QuickAddAnalysis>(`${this.API_BASE}/quick-add/analyze`, {
      image_base64: imageBase64,
    });
  }

  create(request: QuickAddRequest): Observable<Item> {
    return this.http.post<Item>(`${this.API_BASE}/quick-add`, request);
  }
}
