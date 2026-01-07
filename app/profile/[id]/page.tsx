"use client";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getUserAvatarUrl } from "@/utils/cdn";

const defaultAvatar = "/images/default-avatar.png"; // Path to default avatar image

interface PublicUserProfileProps {
  params: { id: number };
}

// Updated interfaces for our vote data
interface VotesReceived {
  upvotes: number;
  downvotes: number;
  total: number;
}

interface VotesGiven {
  upvotes: number;
  downvotes: number;
  total: number;
}

const PublicUserProfile = ({ params: { id } }: PublicUserProfileProps) => {
  const [userData, setUserData] = useState({
    email: "",
    role: "",
    avatar: "",
    bio: "",
    userName: "",
    firstName: "",
    lastName: "",
    createdAt: "",
  });
  const [votesReceived, setVotesReceived] = useState<VotesReceived>({
    upvotes: 0,
    downvotes: 0,
    total: 0
  });
  const [votesGiven, setVotesGiven] = useState<VotesGiven>({
    upvotes: 0,
    downvotes: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${id}`);
      if (!res.ok) throw new Error("Failed to fetch user");

      const data = await res.json();

      setUserData({
        email: data?.email || "",
        role: data?.role || "",
        avatar: data?.avatar || "",
        bio: data?.bio || "",
        userName: data?.userName || "",
        firstName: data?.firstName || "",
        lastName: data?.lastName || "",
        createdAt: data?.createdAt || "",
      });
      
      // Fetch both vote statistics
      fetchUserVotesReceived();
      fetchUserVotesGiven();
    } catch (err) {
      console.error("Error fetching user data:", err);
      toast.error("Failed to fetch user data");
    } finally {
      setIsLoading(false);
    }
  }, [id]);
  
  const fetchUserVotesReceived = async () => {
    try {
      // Fetch all comments by this user with their vote information
      const commentsRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${id}/comments`);
      if (!commentsRes.ok) throw new Error("Failed to fetch user comments");

      const comments = await commentsRes.json();
      
      // Sum up votes received on the user's comments
      const totalStats = comments.reduce(
        (acc: { upvotes: number; downvotes: number }, comment: { upCount?: number; downCount?: number }) => {
          return {
            upvotes: acc.upvotes + (comment.upCount || 0),
            downvotes: acc.downvotes + (comment.downCount || 0)
          };
        },
        { upvotes: 0, downvotes: 0 }
      );
      
      setVotesReceived({
        upvotes: totalStats.upvotes,
        downvotes: totalStats.downvotes,
        total: totalStats.upvotes - totalStats.downvotes
      });
    } catch (err) {
      console.error("Error fetching votes received:", err);
      setVotesReceived({
        upvotes: 0,
        downvotes: 0,
        total: 0
      });
    }
  };

  async function fetchUserVotesGiven() {
    try {
      // Fetch votes cast by this user on other users' comments
      const votesGivenRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${id}/votes`);
      if (!votesGivenRes.ok) throw new Error("Failed to fetch votes given");
  
      const votes = await votesGivenRes.json();
      
      // Filter votes to only include those on comments not authored by this user
      const filteredVotes = votes.filter((vote: { comment: { userId: string } }) => 
        vote.comment.userId !== id.toString()
      );
      
      // Count up votes given
      const upvotes = filteredVotes.filter((vote: { voteType: string }) => vote.voteType === 'up').length;
      const downvotes = filteredVotes.filter((vote: { voteType: string }) => vote.voteType === 'down').length;
      
      setVotesGiven({
        upvotes,
        downvotes,
        total: upvotes + downvotes
      });
    } catch (err) {
      console.error("Error fetching votes given:", err);
      setVotesGiven({
        upvotes: 0,
        downvotes: 0,
        total: 0
      });
    }
  }

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const getAvatarUrl = () => {
    if (!userData.avatar) return defaultAvatar;
    return getUserAvatarUrl(userData.avatar);
  };

  const formatDateUK = (dateString: string | null): string => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header with background */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Profile details */}
              <div className="px-4 py-5 sm:px-6 -mt-16 flex flex-col items-center">
                {/* Avatar */}
                <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-white bg-white shadow-lg">
                  <img
                    src={getAvatarUrl()}
                    alt={`${userData.userName}`}
                    sizes="128px"
                    className="object-cover w-full h-full"
                  />
                </div>
                
                {/* Name */}
                <h1 className="mt-4 text-3xl font-bold text-gray-900">
                  {userData.userName}
                </h1>
                
                {/* Role badge */}
                {userData.role && (
                  <span className="mt-2 inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                  </span>
                )}
                
                {/* Votes sections */}
                <div className="mt-6 w-full max-w-lg">
                  {/* Votes Received Section */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3 text-center">Votes Received</h3>
                    <div className="flex justify-center space-x-6">
                      <div className="flex flex-col items-center">
                        <span className="text-green-600 font-semibold text-lg">{votesReceived.upvotes}</span>
                        <span className="text-sm text-gray-500">Upvotes</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <span className="text-red-600 font-semibold text-lg">{votesReceived.downvotes}</span>
                        <span className="text-sm text-gray-500">Downvotes</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <span className={`font-bold text-lg ${votesReceived.total > 0 ? 'text-green-600' : votesReceived.total < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {votesReceived.total}
                        </span>
                        <span className="text-sm text-gray-500">Net Score</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Votes Given Section */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-3 text-center">Votes Given</h3>
                    <div className="flex justify-center space-x-6">
                      <div className="flex flex-col items-center">
                        <span className="text-green-600 font-semibold text-lg">{votesGiven.upvotes}</span>
                        <span className="text-sm text-gray-500">Upvotes</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <span className="text-red-600 font-semibold text-lg">{votesGiven.downvotes}</span>
                        <span className="text-sm text-gray-500">Downvotes</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-lg text-gray-600">{votesGiven.total}</span>
                        <span className="text-sm text-gray-500">Total Votes</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Bio */}
                {userData.bio && (
                  <div className="mt-6 text-center">
                    <h3 className="text-lg font-medium text-gray-900">About</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      {userData.bio}
                    </p>
                  </div>
                )}
                
                {/* Contact Info */}
                <div className="mt-6 border-t border-gray-200 pt-6 w-full max-w-md">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6">
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDateUK(userData.createdAt)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicUserProfile;