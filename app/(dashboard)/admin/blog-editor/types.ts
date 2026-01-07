export interface BlogPostFormProps {
    initialData?: any;
    blogCategories: any[];
    authors: any[];
    onSubmit: (blogPost: any, selectedFile: File | null) => Promise<void>;
    isSubmitting: boolean;
    mode: "create" | "edit";
    onDelete?: () => void;
    isDeleting?: boolean;
  }