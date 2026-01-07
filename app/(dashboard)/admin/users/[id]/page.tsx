"use client";
import { DashboardSidebar } from "@/components";
import { 
  UserAvatar, 
  UserProfileForm, 
  UserNotifications,
  uploadProfileImage
} from "@/app/(dashboard)/admin/users/UserComponents";
import { isValidEmailAddressFormat } from "@/lib/utils";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface DashboardUserDetailsProps {
  params: { id: number };
}

const DashboardSingleUserPage = ({
  params: { id },
}: DashboardUserDetailsProps) => {
  const [userInput, setUserInput] = useState({
    email: "",
    newPassword: "",
    role: "",
    avatar: "",
    bio: "",
    firstName: "",
    lastName: "",
  });
  const [activeTab, setActiveTab] = useState("profile");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [initialSubscriptionStatus, setInitialSubscriptionStatus] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [subscriptionStatusLoading, setSubscriptionStatusLoading] = useState(true);
  const router = useRouter();

  // Function to handle subscription status change
  const handleSubscriptionChange = (subscribeStatus: boolean) => {
    setIsSubscribed(subscribeStatus);
  };

  const deleteUser = async () => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${id}`, {
          method: "DELETE",
        });

        if (res.status === 204) {
          toast.success("User deleted successfully");
          router.push("/admin/users");
        } else {
          toast.error("There was an error while deleting user");
        }
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error("Failed to delete user");
      }
    }
  };

  const updateUser = async () => {
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

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });

      if (res.ok) {
        // Handle subscription status update
        if (isSubscribed !== initialSubscriptionStatus) {
          if (isSubscribed) {
            // Subscribe user
            const subRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/subscribers`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: userInput.email }),
            });
            
            if (subRes.ok) {
              toast.success("User subscribed successfully");
              setInitialSubscriptionStatus(true);
            } else {
              const errorData = await subRes.json();
              // Check if user is already subscribed but optIn is false
              if (subRes.status === 400 && errorData.error?.includes("already subscribed")) {
                // Update the existing subscriber to set optIn to true
                const updateRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/subscribers/${encodeURIComponent(userInput.email)}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ optIn: true }),
                });
                
                if (updateRes.ok) {
                  toast.success("User subscription reactivated");
                  setInitialSubscriptionStatus(true);
                } else {
                  toast.error("Failed to reactivate subscription");
                }
              } else {
                toast.error(errorData.error || "Failed to subscribe user");
              }
            }
          } else {
            // Instead of deleting, update optIn to false
            const updateRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/subscribers/${encodeURIComponent(userInput.email)}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ optIn: false }),
            });
            
            if (updateRes.ok) {
              toast.success("User unsubscribed successfully");
              setInitialSubscriptionStatus(false);
            } else if (updateRes.status === 404) {
              // If subscriber doesn't exist, there's nothing to unsubscribe
              setInitialSubscriptionStatus(false);
            } else {
              const errorData = await updateRes.text();
              toast.error(errorData || "Failed to unsubscribe user");
            }
          }
        }

        toast.success("User successfully updated");
        await fetchUserData();
        setSelectedImage(null);
        setPreviewImage(null);
      } else {
        const responseText = await res.text();
        const responseData = responseText ? JSON.parse(responseText) : {};
        toast.error(responseData.error || "Error updating user");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Update failed. Please try again.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const fetchSubscriptionStatus = useCallback(async (email: string) => {
    if (!email) {
      setIsSubscribed(false);
      setInitialSubscriptionStatus(false);
      setSubscriptionStatusLoading(false);
      return;
    }

    setSubscriptionStatusLoading(true);
    try {
      const subRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/subscribers/${encodeURIComponent(email)}`
      );
      
      if (subRes.ok) {
        const subData = await subRes.json();
        // Check the optIn field to determine subscription status
        setIsSubscribed(subData.optIn === true);
        setInitialSubscriptionStatus(subData.optIn === true);
      } else {
        setIsSubscribed(false);
        setInitialSubscriptionStatus(false);
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      setIsSubscribed(false);
      setInitialSubscriptionStatus(false);
    } finally {
      setSubscriptionStatusLoading(false);
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${id}`);
      if (!res.ok) throw new Error("Failed to fetch user");

      const data = await res.json();

      setUserInput({
        email: data?.email || "",
        newPassword: "",
        role: data?.role || "",
        avatar: data?.avatar || "",
        bio: data?.bio || "",
        firstName: data?.firstName || "",
        lastName: data?.lastName || "",
      });

      // Fetch subscription status separately
      if (data?.email) {
        await fetchSubscriptionStatus(data.email);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      toast.error("Failed to fetch user data");
    } finally {
      setIsLoading(false);
    }
  }, [id, fetchSubscriptionStatus]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    if (selectedImage) {
      const objectUrl = URL.createObjectURL(selectedImage);
      setPreviewImage(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewImage(null);
    }
  }, [selectedImage]);

  // When email changes, refetch subscription status
  useEffect(() => {
    if (userInput.email) {
      fetchSubscriptionStatus(userInput.email);
    }
  }, [userInput.email, fetchSubscriptionStatus]);

  return (
    <div className="flex min-h-screen w-full bg-white">
      <DashboardSidebar />
      <div className="flex flex-col items-center gap-8 w-full xl:pl-10 mt-6 pb-10">
        <h1 className="text-4xl font-bold text-center">User Details</h1>

        {/* Tab Navigation */}
        <div className="w-full max-w-md">
          <div className="flex border-b border-gray-200">
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === "profile"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-blue-500"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              Profile
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === "notifications"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-blue-500"
              }`}
              onClick={() => setActiveTab("notifications")}
            >
              Notifications
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="w-full max-w-md space-y-6">
            {activeTab === "profile" ? (
              <>
                {/* Profile Image Preview */}
                <UserAvatar 
                  avatar={userInput.avatar}
                  editable={true}
                  selectedImage={selectedImage}
                  setSelectedImage={setSelectedImage}
                  //previewImage={previewImage}
                />

                {/* User Form */}
                <UserProfileForm 
                  userInput={userInput}
                  setUserInput={(input) => setUserInput((prev) => ({ ...prev, ...input }))} 
                  isAdmin={true}
                  isNewUser={false}
                  isSubscribed={isSubscribed}
                  subscriptionStatusLoading={subscriptionStatusLoading}
                  handleSubscriptionChange={handleSubscriptionChange}
                />

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                  <button
                    type="button"
                    className="uppercase px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold shadow transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                    onClick={updateUser}
                    disabled={updateLoading || subscriptionStatusLoading}
                  >
                    {updateLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Updating...
                      </span>
                    ) : (
                      "Update User"
                    )}
                  </button>
                  <button
                    type="button"
                    className="uppercase px-6 py-3 text-white bg-red-600 hover:bg-red-700 rounded-xl font-semibold shadow transition-all duration-200"
                    onClick={deleteUser}
                    disabled={updateLoading}
                  >
                    Delete User
                  </button>
                </div>
              </>
            ) : (
              <UserNotifications userId={id.toString()} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardSingleUserPage;