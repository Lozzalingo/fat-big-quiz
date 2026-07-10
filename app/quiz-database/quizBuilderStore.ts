import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type SelectedQuestion = {
  id: string;
  questionText: string;
  answerText: string;
  options: string | null;
  difficulty: string;
  questionType: string;
  category: { name: string };
};

type QuizBuilderState = {
  selectedQuestions: SelectedQuestion[];
  panelOpen: boolean;
  toggleQuestion: (question: SelectedQuestion) => void;
  removeQuestion: (id: string) => void;
  reorderQuestions: (fromIndex: number, toIndex: number) => void;
  clearAll: () => void;
  setQuestions: (questions: SelectedQuestion[]) => void;
  setPanelOpen: (open: boolean) => void;
  isSelected: (id: string) => boolean;
};

export const useQuizBuilderStore = create<QuizBuilderState>()(
  persist(
    (set, get) => ({
      selectedQuestions: [],
      panelOpen: false,

      toggleQuestion: (question) => {
        const current = get().selectedQuestions;
        const exists = current.find((q) => q.id === question.id);
        if (exists) {
          set({ selectedQuestions: current.filter((q) => q.id !== question.id) });
        } else {
          set({ selectedQuestions: [...current, question] });
        }
      },

      removeQuestion: (id) => {
        set({
          selectedQuestions: get().selectedQuestions.filter((q) => q.id !== id),
        });
      },

      reorderQuestions: (fromIndex, toIndex) => {
        const items = [...get().selectedQuestions];
        const [moved] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, moved);
        set({ selectedQuestions: items });
      },

      clearAll: () => set({ selectedQuestions: [], panelOpen: false }),

      setQuestions: (questions) => set({ selectedQuestions: questions }),

      setPanelOpen: (open) => set({ panelOpen: open }),

      isSelected: (id) => {
        return get().selectedQuestions.some((q) => q.id === id);
      },
    }),
    {
      name: "quiz-builder-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
