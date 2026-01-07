export interface CommentUser {
  id: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export interface Comment {
  id: string;
  message: string;
  createdAt: string;
  userId: string;
  postId: string;
  parentId: string | null;
  mentions: string[];
  upCount: number;
  downCount: number;
  user: {
    userName?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

export interface CommentFormProps {
  postId: string;
  userId: string;
  onCommentAdded: (comment: Comment) => void;
  isEdit?: boolean;
  commentId?: string | null;
  initialMessage?: string;
  onCancelEdit?: () => void;
  parentId?: string | null;
  onCancelReply?: () => void;
  isReply?: boolean;
  availableUsers?: CommentUser[];
}

export interface CommentItemProps {
  comment: Comment;
  userId: string | null;
  postId: string;
  onCommentUpdated: (comment: Comment) => void;
  onCommentDeleted: (commentId: string) => void;
  onReplyAdded: (comment: Comment) => void;
  onVoteChange: (commentId: string, upCount: number, downCount: number) => void;
  comments: Comment[];
  availableUsers: CommentUser[];
  level?: number;
}

export interface CommentListProps {
  comments: Comment[];
  userId: string | null;
  postId: string;
  onCommentUpdated: (comment: Comment) => void;
  onCommentDeleted: (commentId: string) => void;
  onReplyAdded: (comment: Comment) => void;
  onVoteChange: (commentId: string, upCount: number, downCount: number) => void;
  availableUsers: CommentUser[];
}

export interface VotingProps {
  commentId: string;
  userId: string | null;
  initialUpCount: number;
  initialDownCount: number;
}
