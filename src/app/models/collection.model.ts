import { Category } from './category.model';

export interface BinaryObject {
  id: number;
  base64: string;
  filename: string;
  extension: string;
}

export interface BinaryObjectPayload {
  base64: string;
  filename: string;
  extension: string;
}

export interface Collection {
  id: number;
  name: string;
  category_id: number;
  category: Category;
  user_id?: number;
  binary_object_id?: number | null;
  binary_object?: BinaryObject | null;
}

export interface CreateCollectionRequest {
  name: string;
  category_id: number;
  binary_object?: BinaryObjectPayload | null;
}

export interface UpdateCollectionRequest {
  name: string;
  category_id: number;
  binary_object?: BinaryObjectPayload | null;
}
