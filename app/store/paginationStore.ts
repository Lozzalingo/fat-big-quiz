import { create } from "zustand";

export type State = {
  page: number;
  totalPages: number;
};

export type Actions = {
  incrementPage: () => void;
  decrementPage: () => void;
  setPage: (page: number) => void;
  setTotalPages: (totalPages: number) => void;
};

export const usePaginationStore = create<State & Actions>((set, get) => ({
  page: 1,
  totalPages: 1,
  incrementPage: () => {
    set((state) => {
      if (state.page < state.totalPages) {
        return { page: state.page + 1 };
      }
      return {};
    });
  },
  decrementPage: () => {
    set((state) => {
      if (state.page > 1) {
        return { page: state.page - 1 };
      }
      return {};
    });
  },
  setPage: (page: number) => {
    const { totalPages } = get();
    if (page >= 1 && page <= totalPages) {
      set({ page });
    }
  },
  setTotalPages: (totalPages: number) => {
    set({ totalPages: Math.max(1, totalPages) });
  },
}));
