"use client"

import React, { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

type VotingProps = {
  commentId: string;
  userId: string | null;
  initialUpCount: number;
  initialDownCount: number;
};

const CommentVoting: React.FC<VotingProps> = ({
  commentId,
  userId,
  initialUpCount = 0,
  initialDownCount = 0
}) => {
  const [upCount, setUpCount] = useState(initialUpCount);
  const [downCount, setDownCount] = useState(initialDownCount);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's existing vote when component mounts
  useEffect(() => {
    if (userId) {
      fetchUserVote();
    }
  }, [userId]);

  const fetchUserVote = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/comments/${commentId}/votes/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserVote(data.vote);
      }
    } catch (error) {
      console.error("Error fetching user vote:", error);
    }
  };

  const handleVote = async (isUpvote: boolean) => {
    if (!userId || isLoading) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, upvote: isUpvote })
      });
      
      if (!response.ok) throw new Error("Failed to vote");
      
      const data = await response.json();
      
      // Update UI with latest counts from server
      setUpCount(data.upCount);
      setDownCount(data.downCount);
      
      // Update user's vote status based on server response
      if (data.message === "Vote removed") {
        setUserVote(null);
      } else {
        setUserVote(isUpvote ? "upvote" : "downvote");
      }
      
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate total vote score
  const voteScore = upCount - downCount;

  return (
    <div className="flex items-center space-x-2">
      <button 
        onClick={() => handleVote(true)}
        className={`flex items-center transition-colors ${!userId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-blue-600'} ${userVote === 'upvote' ? 'text-blue-600' : 'text-gray-500'}`}
        disabled={!userId || isLoading}
        aria-label="Upvote"
      >
        <ThumbsUp size={14} className="mr-1" />
      </button>
      
      <span className={`font-medium ${voteScore > 0 ? 'text-green-600' : voteScore < 0 ? 'text-red-600' : 'text-gray-500'}`}>
        {voteScore}
      </span>
      
      <button 
        onClick={() => handleVote(false)}
        className={`flex items-center transition-colors ${!userId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-red-600'} ${userVote === 'downvote' ? 'text-red-600' : 'text-gray-500'}`}
        disabled={!userId || isLoading}
        aria-label="Downvote"
      >
        <ThumbsDown size={14} className="mr-1" />
      </button>
    </div>
  );
};

export default CommentVoting;