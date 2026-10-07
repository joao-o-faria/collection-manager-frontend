import { BinaryObjectPayload } from './collection.model';

export interface ResolvedRef {
  id: number;
  name: string;
  is_new: boolean;
}

export interface QuickAddAnalysis {
  name: string;
  description: string;
  tags: string[];
  category: ResolvedRef;
  collection: ResolvedRef;
}

export type QuickAddRef = { id: number } | { new_name: string };

export interface QuickAddRequest {
  category: QuickAddRef;
  collection: QuickAddRef;
  item: {
    name: string;
    description: string | null;
    tags: string[] | null;
    price: number;
    binary_object: BinaryObjectPayload | null;
  };
}
