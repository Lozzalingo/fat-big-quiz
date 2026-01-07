"use client";
import { UserAvatar, UserProfileForm, uploadProfileImage } from "@/app/(dashboard)/admin/users/UserComponents";
import { isValidEmailAddressFormat } from "@/lib/utils";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

const UserProfilePage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Log session data to debug
  useEffect(() => {
    console.log("Session status:", status);
    console.log("Session data:", session);
  }, [session, status]);
  
  const userEmail = session?.user?.email;
  const [userId, setUserId] = useState<string | null>(null);

  const [userInput, setUserInput] = useState({
    email: "",
    newPassword: "",
    avatar: "",
    bio: "",
    userName: "",
    firstName: "",
    lastName: "",

  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      console.log("User not authenticated, redirecting to signin");
      router.push("/login");
    }
  }, [status, router]);

  // Fetch user ID by email first
  const fetchUserIdByEmail = useCallback(async () => {
    if (!userEmail) {
      console.log("No userEmail available, skipping ID fetch");
      return null;
    }
    
    console.log("Fetching user ID for email:", userEmail);
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/email/${encodeURIComponent(userEmail)}`;
      console.log("API URL for email lookup:", apiUrl);
      
      const res = await fetch(apiUrl);
      console.log("Email lookup API response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API error response for email lookup:", errorText);
        throw new Error(`Failed to fetch user by email: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      console.log("User data received from email lookup:", data);
      
      if (data && data.id) {
        setUserId(data.id);
        return data.id;
      } else {
        console.error("User ID not found in response:", data);
        toast.error("Could not find your user ID");
        return null;
      }
    } catch (err) {
      console.error("Error fetching user ID by email:", err);
      toast.error("Failed to fetch user ID");
      return null;
    }
  }, [userEmail]);

  // Fetch user data
  const fetchUserData = useCallback(async (id: string) => {
    if (!id) {
      console.log("No userId available, skipping data fetch");
      return;
    }
    
    console.log("Fetching user data for ID:", id);
    setIsLoading(true);
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${id}`;
      console.log("API URL:", apiUrl);
      
      const res = await fetch(apiUrl);
      console.log("API response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API error response:", errorText);
        throw new Error(`Failed to fetch user: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      console.log("User data received:", data);

      setUserInput({
        email: data?.email || "",
        newPassword: "",
        avatar: data?.avatar || "",
        bio: data?.bio || "",
        userName: data?.userName || "",
        firstName: data?.firstName || "",
        lastName: data?.lastName || "",
      });
    } catch (err) {
      console.error("Error fetching user data:", err);
      toast.error("Failed to fetch user data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load user data when authentication state changes
  useEffect(() => {
    console.log("Authentication status changed:", status);
    console.log("Current userEmail:", userEmail);
    
    if (status === "authenticated") {
      if (userEmail) {
        console.log("User authenticated with email, fetching ID and data");
        const fetchData = async () => {
          const id = await fetchUserIdByEmail();
          if (id) {
            await fetchUserData(id);
          } else {
            setIsLoading(false);
          }
        };
        fetchData();
      } else {
        console.warn("User authenticated but no email found");
        setIsLoading(false);
        toast.error("User email not available");
      }
    }
  }, [status, userEmail, fetchUserIdByEmail, fetchUserData]);

  // Update user profile
  const updateUser = async () => {
    if (!userId) {
      toast.error("User ID not available for update");
      return;
    }

    if (userInput.email && !isValidEmailAddressFormat(userInput.email)) {
      toast.error("Invalid email address");
      return;
    }

    if (userInput.newPassword && userInput.newPassword.length <= 7) {
      toast.error("Password must be longer than 7 characters");
      return;
    }

    setUpdateLoading(true);
    try {
      let imageUploaded = false;
      let imageName = null;

      if (selectedImage) {
        console.log("Uploading profile image");
        imageName = await uploadProfileImage(selectedImage, userInput.avatar);
        if (!imageName) {
          toast.error("Image upload failed, update aborted");
          setUpdateLoading(false);
          return;
        }
        imageUploaded = true;
      }

      const updatedFields = Object.entries(userInput)
        .filter(([key, value]) => (key === "newPassword" ? value !== "" : true))
        .reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {} as any);

      if (imageUploaded && imageName) {
        updatedFields.avatar = imageName;
      }

      console.log("Updating user with data:", updatedFields);
      console.log("API endpoint:", `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${userId}`);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });

      console.log("Update response status:", res.status);
      
      if (res.ok) {
        toast.success("Profile updated successfully");
        await fetchUserData(userId);
        setSelectedImage(null);
        setPreviewImage(null);
      } else {
        const responseText = await res.text();
        console.error("Update error response:", responseText);
        const responseData = responseText ? JSON.parse(responseText) : {};
        toast.error(responseData.error || "Error updating profile");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Update failed. Please try again.");
    } finally {
      setUpdateLoading(false);
    }
  };

  // Handle image preview
  useEffect(() => {
    if (selectedImage) {
      const objectUrl = URL.createObjectURL(selectedImage);
      setPreviewImage(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewImage(null);
    }
  }, [selectedImage]);

  // Show detailed debug information
  console.log("Current render state:", {
    status,
    userEmail: userEmail || "not set",
    userId: userId || "not set",
    isLoading,
    hasEmail: !!userInput.email,
    hasUserName: !!userInput.userName,
    environmentVars: {
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "not set"
    }
  });

  // Show loading state while checking authentication
  if (status === "loading") {
    console.log("Rendering loading state - auth in progress");
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <div className="ml-4">Checking authentication...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    console.log("Rendering null - user not authenticated");
    return null; // Will be redirected by the useEffect
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Your Profile</h1>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="ml-4">Loading user data...</div>
        </div>
      ) : (
        <>
          <UserAvatar
            avatar={userInput.avatar}
            editable={true}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
          />

          <UserProfileForm
            userInput={userInput}
            setUserInput={(input) => setUserInput((prev) => ({ ...prev, ...input }))}
            isAdmin={false}
            isNewUser={false}
            isSubscribed={false}
            subscriptionStatusLoading={false}
            handleSubscriptionChange={() => {}}
          />

          <button
            type="button"
            className="mt-4 uppercase px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold shadow transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            onClick={updateUser}
            disabled={updateLoading}
          >
            {updateLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Updating...
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
        </>
      )}
    </div>
  );
};

export default UserProfilePage;