import { create } from 'zustand';
import type { Category } from '../types';

interface CourseStoreState {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const useCourseStore = create<CourseStoreState>((set) => ({
  categories: [],
  setCategories: (categories) => set({ categories }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
