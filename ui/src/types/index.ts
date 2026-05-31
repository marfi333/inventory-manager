export type Label = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  description?: string;
  labelIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type Item = {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  quantity: number;
  skus: string[];
  labelIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateLabelRequest = {
  name: string;
  color?: string;
};

export type UpdateLabelRequest = {
  name?: string;
  color?: string;
};

export type CreateCategoryRequest = {
  name: string;
  description?: string;
  labelIds?: string[];
};

export type UpdateCategoryRequest = {
  name?: string;
  description?: string;
  labelIds?: string[];
};

export type CreateItemRequest = {
  name: string;
  description?: string;
  categoryId: string;
  quantity: number;
  skus: string[];
  labelIds?: string[];
};

export type UpdateItemRequest = {
  name?: string;
  description?: string;
  categoryId?: string;
  quantity?: number;
  skus?: string[];
  labelIds?: string[];
};

export type UpdateQuantityRequest = {
  quantity: number;
  operation: 'set' | 'add' | 'subtract';
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}; 