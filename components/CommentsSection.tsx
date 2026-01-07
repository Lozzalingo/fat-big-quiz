"use client"

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { MessageCircle, Send, Edit, Trash2, User, Reply, CornerDownRight } from "lucide-react";
import CommentVoting from "./CommentVoting";
import { getUserAvatarUrl } from "@/utils/cdn";

type User = {
  id: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
};

type Comment = {
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
};

type CommentFormProps = {
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
  availableUsers?: User[];
};

const CommentForm: React.FC<CommentFormProps> = ({
  postId, 
  userId, 
  onCommentAdded, 
  isEdit = false, 
  commentId = null,
  initialMessage = "", 
  onCancelEdit = () => {},
  parentId = null,
  onCancelReply = () => {},
  isReply = false,
  availableUsers = []
}) => {
  const [message, setMessage] = useState(initialMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState<number | null>(null);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mentionQuery) {
      const filtered = availableUsers.filter(user => 
        `${user.userName}`
          .toLowerCase()
          .includes(mentionQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [mentionQuery, availableUsers]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    
    // Check if user is typing @ symbol
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    
    const atSignIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atSignIndex !== -1 && (atSignIndex === 0 || /\s/.test(textBeforeCursor[atSignIndex - 1]))) {
      const mentionText = textBeforeCursor.substring(atSignIndex + 1);
      if (!mentionText.includes(' ')) {
        setMentionQuery(mentionText);
        setMentionPosition(atSignIndex);
        setShowMentionSuggestions(true);
        return;
      }
    }
    
    setShowMentionSuggestions(false);
  };

  const insertMention = (user: User) => {
    if (mentionPosition !== null && textareaRef.current) {
      const beforeMention = message.substring(0, mentionPosition);
      const afterMention = message.substring(mentionPosition + 1 + mentionQuery.length);
      const newMessage = `${beforeMention}@${user.userName} ${afterMention}`;
      
      setMessage(newMessage);
      setShowMentionSuggestions(false);
      
      // Focus back on textarea and place cursor after the inserted mention
      textareaRef.current.focus();
      const newCursorPosition = mentionPosition + `@${user.userName} `.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursorPosition;
          textareaRef.current.selectionEnd = newCursorPosition;
        }
      }, 0);
    }
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@([a-zA-Z]+ [a-zA-Z]+)/g;
    const matches = text.match(mentionRegex);
    if (!matches) return [];
    
    return matches.map(mention => mention.substring(1).trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    // Extract mentions from text
    const mentions = extractMentions(message);
    
    try {
      const url = isEdit
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/comments/${commentId}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/comments`;
      const method = isEdit ? "PUT" : "POST";
      const body = JSON.stringify(
        isEdit 
          ? { message, mentions } 
          : { message, userId, postId, parentId, mentions }
      );
      
      const res = await fetch(url, { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body 
      });
      
      if (!res.ok) throw new Error((await res.json()).error || "Failed to submit comment");
      
      const data = await res.json();
      onCommentAdded(data);
      setMessage("");
      
      if (isEdit) onCancelEdit();
      if (isReply) onCancelReply();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`${isReply ? "ml-8 mt-4" : "mb-6"}`}>
      <div className="relative mb-4">
        <label htmlFor="comment" className="sr-only">Your comment</label>
        <textarea
          id="comment"
          ref={textareaRef}
          rows={isReply ? 2 : 4}
          className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg"
          placeholder={isReply ? "Write a reply..." : "Write a comment..."}
          value={message}
          onChange={handleTextChange}
          required
        ></textarea>
        
        {showMentionSuggestions && filteredUsers.length > 0 && (
          <div className="absolute z-10 w-64 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
            {filteredUsers.map(user => (
              <div 
                key={user.id}
                className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                onClick={() => insertMention(user)}
              >
                {user.avatar ? (
                  <div className="relative h-6 w-6 mr-2 rounded-full overflow-hidden">
                    <img
                      src={getUserAvatarUrl(user.avatar)}
                      alt="avatar"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-6 w-6 mr-2 rounded-full bg-gray-200 flex items-center justify-center">
                    <User size={12} className="text-gray-500" />
                  </div>
                )}
                <span className="text-sm">{user.userName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <button type="submit"   
        className={`
          py-2.5 px-4
          text-sm font-semibold
          text-white
          bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500
          rounded-xl shadow-lg
          hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600
          transition-all duration-300 ease-in-out
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center
        `}>
          {isSubmitting ? "Submitting..." : (
            <>
              <Send size={16} className="mr-1" />
              {isEdit ? "Update" : isReply ? "Reply" : "Post comment"}
            </>
          )}
        </button>
        
        {(isEdit || isReply) && (
          <button 
            type="button" 
            onClick={isEdit ? onCancelEdit : onCancelReply} 
            className="py-2 px-4 text-xs text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
};

type CommentItemProps = {
  comment: Comment;
  userId: string | null;
  postId: string;
  onCommentUpdated: (comment: Comment) => void;
  onCommentDeleted: (commentId: string) => void;
  onReplyAdded: (comment: Comment) => void;
  onVoteChange: (commentId: string, upCount: number, downCount: number) => void;
  comments: Comment[];
  availableUsers: User[];
  level?: number;
};

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  userId, 
  postId, 
  onCommentUpdated, 
  onCommentDeleted,
  onReplyAdded,
  onVoteChange,
  comments,
  availableUsers,
  level = 0
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  
  const childComments = comments.filter(c => c.parentId === comment.id);
  
  const formatDate = (date: string) => new Date(date).toLocaleString();

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure? This will also delete all replies.")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/comments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onCommentDeleted(id);
    } catch {
      alert("Failed to delete");
    }
  };

  const handleVoteUpdate = (commentId: string, upCount: number, downCount: number) => {
    onVoteChange(commentId, upCount, downCount);
  };
  
  const highlightMentions = (text: string) => {
    const parts = [];
    let lastIndex = 0;
    const mentionRegex = /@([a-zA-Z]+ [a-zA-Z]+)/g;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {     
        parts.push(text.substring(lastIndex, match.index));
      }
      
      parts.push(
        <span key={match.index} className="text-blue-600 font-medium">
          {match[0]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts;
  };

  return (
    <div className={`${level > 0 ? "ml-8 border-l-2 border-gray-200 pl-4" : ""} mb-4`}>
      <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
        {editingId === comment.id ? (
          <CommentForm 
            postId={postId} 
            userId={userId || ""} 
            isEdit 
            commentId={comment.id} 
            initialMessage={comment.message} 
            onCommentAdded={onCommentUpdated} 
            onCancelEdit={() => setEditingId(null)}
            availableUsers={availableUsers}
          />
        ) : (
          <>
            <div className="flex items-center mb-2">
              {/* Make the avatar clickable */}
              <Link href={`/profile/${comment.userId}`}>
                <div className="relative h-8 w-8 mr-2 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                  {comment.user.avatar ? (
                    <img
                      src={getUserAvatarUrl(comment.user.avatar)}
                      alt="avatar"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User size={16} className="text-gray-500" />
                    </div>
                  )}
                </div>
              </Link>
              <div>
                {/* Make the username clickable */}
                <Link href={`/profile/${comment.userId}`} className="hover:underline">
                  <p className="text-sm font-semibold cursor-pointer">{comment.user.userName}</p>
                </Link>
                <p className="text-xs text-gray-500">{formatDate(comment.createdAt)}</p>
              </div>
              {userId === comment.userId && (
                <div className="ml-auto flex space-x-2">
                  <button onClick={() => setEditingId(comment.id)} className="text-gray-500 hover:text-blue-600">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(comment.id)} className="text-gray-500 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-gray-800 whitespace-pre-line mb-2">
              {highlightMentions(comment.message)}
            </p>
            <div className="flex items-center text-xs text-gray-500 space-x-4 mt-2">
              {/* Updated Voting System */}
              <CommentVoting 
                commentId={comment.id}
                userId={userId}
                initialUpCount={comment.upCount}
                initialDownCount={comment.downCount}
              />
              
              {userId && (
                <button 
                  onClick={() => setIsReplying(!isReplying)} 
                  className="flex items-center hover:text-blue-600"
                >
                  <Reply size={14} className="mr-1" />
                  Reply
                </button>
              )}
              
              {childComments.length > 0 && (
                <button 
                  onClick={() => setShowReplies(!showReplies)}
                  className="flex items-center hover:text-blue-600"
                >
                  <CornerDownRight size={14} className="mr-1" />
                  {showReplies ? `Hide ${childComments.length} ${childComments.length === 1 ? 'reply' : 'replies'}` : `Show ${childComments.length} ${childComments.length === 1 ? 'reply' : 'replies'}`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      
      {isReplying && userId && (
        <CommentForm 
          postId={postId} 
          userId={userId} 
          onCommentAdded={onReplyAdded}
          isReply={true}
          parentId={comment.id}
          onCancelReply={() => setIsReplying(false)}
          availableUsers={availableUsers}
        />
      )}
      
      {showReplies && childComments.length > 0 && (
        <div className="mt-3">
          {childComments.map(childComment => (
            <CommentItem
              key={childComment.id}
              comment={childComment}
              userId={userId}
              postId={postId}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
              onReplyAdded={onReplyAdded}
              onVoteChange={onVoteChange}
              comments={comments}
              availableUsers={availableUsers}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

type CommentListProps = {
  comments: Comment[];
  userId: string | null;
  postId: string;
  onCommentUpdated: (comment: Comment) => void;
  onCommentDeleted: (commentId: string) => void;
  onReplyAdded: (comment: Comment) => void;
  onVoteChange: (commentId: string, upCount: number, downCount: number) => void;
  availableUsers: User[];
};

const CommentList: React.FC<CommentListProps> = ({ 
  comments, 
  userId, 
  postId, 
  onCommentUpdated, 
  onCommentDeleted,
  onReplyAdded,
  onVoteChange,
  availableUsers
}) => {
  // Get top-level comments (no parent)
  const topLevelComments = comments.filter(comment => !comment.parentId);

  if (!comments.length) return <p className="text-gray-500 italic mt-4">No comments yet.</p>;

  return (
    <div className="space-y-6">
      {topLevelComments.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          userId={userId}
          postId={postId}
          onCommentUpdated={onCommentUpdated}
          onCommentDeleted={onCommentDeleted}
          onReplyAdded={onReplyAdded}
          onVoteChange={onVoteChange}
          comments={comments}
          availableUsers={availableUsers}
        />
      ))}
    </div>
  );
};

// Updated CommentsSection with proper vote handling
const CommentsSection = ({ postId, userId }: { postId: string; userId: string | null }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch comments
        const commentsRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/comments/post/${postId}`);
        const commentsData = await commentsRes.json();
        
        // Make sure all comments have upCount and downCount properties
        const processedComments = commentsData.map((comment: any) => ({
          ...comment,
          upCount: comment.upCount || 0,
          downCount: comment.downCount || 0
        }));
        
        setComments(processedComments);

        // Fetch users for @ mentions
        const usersRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users`);
        const usersData = await usersRes.json();
        setAvailableUsers(usersData);
      } catch (err) {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [postId]);

  // Handle vote changes with actual counts from the server
  const handleVoteChange = (commentId: string, upCount: number, downCount: number) => {
    setComments(prevComments => 
      prevComments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            upCount: upCount,
            downCount: downCount
          };
        }
        return comment;
      })
    );
  };

  // Modified add function to handle both top-level comments and replies
  const add = (c: Comment) => {
    // Ensure new comments have upCount and downCount properties
    const commentWithVotes = {
      ...c,
      upCount: c.upCount || 0,
      downCount: c.downCount || 0
    };
    
    setComments(prev => {
      // If it's a reply (has parentId), insert it in the appropriate position
      // to maintain the hierarchical structure
      if (commentWithVotes.parentId) {
        // Find the index of the parent comment
        const parentIndex = prev.findIndex(comment => comment.id === commentWithVotes.parentId);
        
        if (parentIndex !== -1) {
          // Create a new array with the reply inserted right after its parent
          const result = [...prev];
          result.splice(parentIndex + 1, 0, commentWithVotes);
          return result;
        }
      }
      
      // If it's a top-level comment or parent not found, add it to the top
      return [commentWithVotes, ...prev];
    });
  };
  
  const update = (c: Comment) => setComments(prev => prev.map(p => p.id === c.id ? c : p));
  
  const remove = (id: string) => {
    // Remove comment and all its replies (recursively)
    const removeCommentAndReplies = (commentId: string, commentsArray: Comment[]): Comment[] => {
      // Find direct replies to this comment
      const replies = commentsArray.filter(c => c.parentId === commentId);
      
      // If there are replies, recursively remove them too
      let filteredComments = commentsArray;
      replies.forEach(reply => {
        filteredComments = removeCommentAndReplies(reply.id, filteredComments);
      });
      
      // Remove the comment itself
      return filteredComments.filter(c => c.id !== commentId);
    };
    
    setComments(prev => removeCommentAndReplies(id, prev));
  };

  return (
    <section className="bg-gray-50 p-6 md:p-8 rounded-xl mt-12" id="comments">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center mb-6">
          <MessageCircle size={24} className="text-blue-600 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900">Comments ({comments.length})</h2>
        </div>

        {userId ? (
          <CommentForm 
            postId={postId} 
            userId={userId} 
            onCommentAdded={add}
            availableUsers={availableUsers}
          />
        ) : (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-blue-800">
              <Link href="/login" className="font-medium text-blue-600 underline">Sign in</Link> to leave a comment.
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading comments...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        ) : (
          <CommentList 
            comments={comments} 
            userId={userId} 
            postId={postId} 
            onCommentUpdated={update} 
            onCommentDeleted={remove}
            onReplyAdded={add}
            onVoteChange={handleVoteChange}
            availableUsers={availableUsers}
          />
        )}
      </div>
    </section>
  );
};

export default CommentsSection;