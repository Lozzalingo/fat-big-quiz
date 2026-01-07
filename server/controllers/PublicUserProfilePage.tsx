"use client";
import React, { useCallback, useEffect, useState } from "react";
import { UserPublicProfile } from "@/app/(dashboard)/admin/users/UserComponents";
import toast from "react-hot-toast";

interface PublicUserProfileProps {
  params: { username: string };
}

const PublicUserProfilePage = ({
  params: { username },
}: PublicUserProfileProps) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/profile/${username}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("User not found");
        }
        throw new Error("Failed to fetch user");
      }

      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error("Error fetching user data:", err);
      if (err instanceof Error) {
        toast.error(err.message || "Failed to fetch user data");
      } else {
        toast.error("Failed to fetch user data");
      }
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-10">User Profile</h1>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : user ? (
          <UserPublicProfile user={user} />
        ) : (
          <div className="text-center p-8 bg-white shadow-md rounded-lg max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">User Not Found</h2>
            <p className="text-gray-600">
              The user profile you're looking for doesn't exist or has been removed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicUserProfilePage;