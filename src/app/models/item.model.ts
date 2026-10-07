import { BinaryObject, BinaryObjectPayload } from './collection.model';

export interface Item {
  id: number;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  price: number;
  collection_id: number;
  binary_object_id?: number | null;
  binary_object?: BinaryObject | null;
}

export interface CreateItemRequest {
  name: string;
  description?: string | null;
  tags?: string[] | null;
  price: number;
  collection_id: number;
  binary_object?: BinaryObjectPayload | null;
}

export interface SuggestItemRequest {
  name: string;
  collection_id: number;
  image_base64?: string | null;
}

export interface ItemSuggestion {
  description: string;
  tags: string[];
}

export interface UpdateItemRequest {
  name: string;
  description?: string | null;
  tags?: string[] | null;
  price: number;
  collection_id: number;
  binary_object?: BinaryObjectPayload | null;
}
