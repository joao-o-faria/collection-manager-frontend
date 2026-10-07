import { Item } from './item.model';

export interface SearchResult {
  item: Item;
  score: number | null;
  match: 'text' | 'semantic';
}

export interface SearchResponse {
  mode: 'semantic' | 'text';
  results: SearchResult[];
}

export interface HomeTotals {
  items: number;
  collections: number;
  categories: number;
  total_value: number;
}

export interface HomeSummary {
  totals: HomeTotals;
  recent_items: Item[];
  top_tags: string[];
}
