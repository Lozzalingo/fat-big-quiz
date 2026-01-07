import { Category } from "./categories";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  coverImage?: string;
  excerpt?: string;
  published: boolean;
  createdAt: string;
  updatedAt?: string;
  authorId?: string;
  categoryId?: string;
  category?: Category;
  tags?: string[];
}

export interface BlogSectionProps {
  posts: BlogPost[];
  title?: string;
}

export interface BlogPostItemProps {
  post: BlogPost;
}

export interface BlogPostPreviewProps {
  post: BlogPost;
}
