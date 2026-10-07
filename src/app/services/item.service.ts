import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateItemRequest,
  Item,
  ItemSuggestion,
  SuggestItemRequest,
  UpdateItemRequest,
} from '../models/item.model';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private readonly API_BASE = environment.apiBase;

  constructor(private http: HttpClient) {}

  getItemsByCollection(collectionId: number): Observable<Item[]> {
    const params = new HttpParams().set('collection_id', collectionId);
    return this.http.get<Item[]>(`${this.API_BASE}/items`, { params });
  }

  addItem(item: CreateItemRequest): Observable<Item> {
    return this.http.post<Item>(`${this.API_BASE}/items`, item);
  }

  updateItem(id: number, item: UpdateItemRequest): Observable<Item> {
    return this.http.put<Item>(`${this.API_BASE}/items/${id}`, item);
  }

  suggestDetails(request: SuggestItemRequest): Observable<ItemSuggestion> {
    return this.http.post<ItemSuggestion>(`${this.API_BASE}/items/suggest`, request);
  }

  deleteItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/items/${id}`);
  }
}
