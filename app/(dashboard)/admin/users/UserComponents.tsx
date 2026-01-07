"use client";
import { isValidEmailAddressFormat } from "@/lib/utils";
import { getUserAvatarUrl } from "@/utils/cdn";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

// UserAvatar Component - Reusable for all views
interface UserAvatarProps {
  avatar?: string;
  editable?: boolean;
  selectedImage?: File | null;
  setSelectedImage: (file: File | null) => void;
  previewImage?: string;
}

export const UserAvatar = ({ 
  avatar, 
  editable = false, 
  selectedImage, 
  setSelectedImage, 
  previewImage 
}: UserAvatarProps) => {
  const getImageSrc = () => {
    if (previewImage) return previewImage;
    if (!avatar) return "/user_placeholder.jpg";
    return getUserAvatarUrl(avatar);
  };

  return (
    <div className="text-center">
      <img
        src={getImageSrc()}
        alt="Profile"
        className="w-24 h-24 rounded-full object-cover mx-auto mb-2"
        onError={(e) => {
          console.error("Image failed to load");
          e.currentTarget.src = "/user_placeholder.jpg";
        }}
      />
      {editable && (
        <>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setSelectedImage(e.target.files ? e.target.files[0] : null)
            }
            className="file-input file-input-bordered w-full max-w-xs mt-2"
          />
          {selectedImage && (
            <p className="text-sm text-gray-600 mt-1">
              Selected: {selectedImage.name}
            </p>
          )}
        </>
      )}
    </div>
  );
};

// UserProfileForm Component - For creating and editing users
interface UserProfileFormProps {
  userInput: {
    email: string;
    password?: string;
    newPassword?: string;
    role?: string;
    userName?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
  };
  setUserInput: (input: Partial<UserProfileFormProps["userInput"]>) => void;
  isAdmin?: boolean;
  isNewUser?: boolean;
  isSubscribed?: boolean;
  subscriptionStatusLoading?: boolean;
  handleSubscriptionChange?: (isSubscribed: boolean) => void;
}

export const UserProfileForm = ({ 
  userInput, 
  setUserInput, 
  isAdmin = false, 
  isNewUser = false,
  isSubscribed,
  subscriptionStatusLoading,
  handleSubscriptionChange
}: UserProfileFormProps) => {
  return (
    <div className="w-full space-y-4">
      {/* Email Field */}
      <label className="form-control w-full">
        <span className="label-text mb-1">Email</span>
        <input
          type="email"
          className="input input-bordered w-full"
          value={userInput.email}
          onChange={(e) =>
            setUserInput({ ...userInput, email: e.target.value })
          }
        />
      </label>

      {/* Password Field */}
      <label className="form-control w-full">
        <span className="label-text mb-1">
          {isNewUser ? "Password" : "New Password (leave empty to keep current)"}
        </span>
        <input
          type="password"
          className="input input-bordered w-full"
          value={isNewUser ? userInput.password : userInput.newPassword}
          onChange={(e) =>
            setUserInput({ 
              ...userInput, 
              [isNewUser ? "password" : "newPassword"]: e.target.value 
            })
          }
          placeholder={isNewUser ? "" : "Enter only if changing password"}
        />
      </label>

      {/* Role Field - Only for admins */}
      {isAdmin && (
        <label className="form-control w-full">
          <span className="label-text mb-1">User Role</span>
          <select
            className="select select-bordered w-full"
            value={userInput.role}
            onChange={(e) =>
              setUserInput({ ...userInput, role: e.target.value })
            }
          >
            <option value="">Select a role</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </label>
      )}

      {/* Personal Info Fields */}
      <label className="form-control w-full">
        <span className="label-text mb-1">Username</span>
        <input
          type="text"
          className="input input-bordered w-full"
          value={userInput.userName || ""}
          onChange={(e) =>
            setUserInput({ ...userInput, userName: e.target.value })
          }
        />
      </label>

      {/* Personal Info Fields */}
      <label className="form-control w-full">
        <span className="label-text mb-1">First Name</span>
        <input
          type="text"
          className="input input-bordered w-full"
          value={userInput.firstName || ""}
          onChange={(e) =>
            setUserInput({ ...userInput, firstName: e.target.value })
          }
        />
      </label>

      <label className="form-control w-full">
        <span className="label-text mb-1">Last Name</span>
        <input
          type="text"
          className="input input-bordered w-full"
          value={userInput.lastName || ""}
          onChange={(e) =>
            setUserInput({ ...userInput, lastName: e.target.value })
          }
        />
      </label>

      <label className="form-control w-full">
        <span className="label-text mb-1">Bio</span>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          value={userInput.bio || ""}
          onChange={(e) =>
            setUserInput({ ...userInput, bio: e.target.value })
          }
        />
      </label>

      {/* Subscription Status - Only for edit views */}
      {!isNewUser && handleSubscriptionChange && (
        <div className="form-control w-full flex items-center gap-2 mt-4">
          <div className="flex items-center gap-2 w-full">
            <input
              type="checkbox"
              className="checkbox"
              checked={isSubscribed}
              disabled={subscriptionStatusLoading}
              onChange={(e) => handleSubscriptionChange(e.target.checked)}
            />
            <span className="label-text">
              {subscriptionStatusLoading ? (
                <span className="flex items-center gap-2">
                  Checking subscription status...
                  <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                </span>
              ) : (
                `Newsletter Subscription (${isSubscribed ? "Subscribed" : "Not Subscribed"})`
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// UserPublicProfile Component - For public view
interface UserPublicProfileProps {
  user: {
    avatar?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    bio?: string;
    email?: string;
  };
}

export const UserPublicProfile = ({ user }: UserPublicProfileProps) => {
  return (
    <div className="w-full max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col items-center">
          <img
            src={user.avatar ? getUserAvatarUrl(user.avatar) : "/user_placeholder.jpg"}
            alt={`${user.firstName || 'User'}'s profile`}
            className="w-32 h-32 rounded-full object-cover mb-4"
            onError={(e) => {
              e.currentTarget.src = "/user_placeholder.jpg";
            }}
          />
          
          <h2 className="text-2xl font-bold text-gray-800">
            {user.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}`
              : "Anonymous User"
            }
          </h2>
          
          {user.role && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm mt-2">
              {user.role}
            </span>
          )}
        </div>

        {user.bio && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Bio</h3>
            <p className="text-gray-600">{user.bio}</p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Contact</h3>
          {user.email && (
            <p className="text-gray-600">
              <span className="font-medium">Email:</span> {user.email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// UserNotifications Component - For notification tab
export const UserNotifications = ({ userId }: { userId: string }) => {
  interface Notification {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
  }
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${userId}/notifications`);
        if (!res.ok) throw new Error("Failed to fetch notifications");
        
        const data = await res.json();
        setNotifications(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        toast.error("Failed to load notifications");
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userId]);

  const toggleNotification = async (notificationId: string, enabled: boolean) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${userId}/notifications/${notificationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled }),
        }
      );

      if (res.ok) {
        setNotifications(
          notifications.map((notification: Notification) =>
            notification.id === notificationId
              ? { ...notification, enabled }
              : notification
          )
        );
        toast.success("Notification preference updated");
      } else {
        toast.error("Failed to update notification preference");
      }
    } catch (err) {
      console.error("Error updating notification:", err);
      toast.error("An error occurred");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <h2 className="text-2xl font-bold">Notification Preferences</h2>
      
      {notifications.length === 0 ? (
        <p className="text-gray-600">No notification preferences available.</p>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">{notification.name}</h3>
                <p className="text-sm text-gray-600">{notification.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notification.enabled}
                  onChange={(e) => toggleNotification(notification.id, e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper Functions
export const uploadProfileImage = async (file: File, oldImage?: string) => {
  const formData = new FormData();
  formData.append("uploadedFile", file);
  formData.append("folderName", "avatars");
  if (oldImage) {
    formData.append("oldImage", oldImage);
  }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/backendimages`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (res.ok) {
      toast.success("Profile image uploaded");
      return data.filename;
    } else {
      toast.error(data.error || "Image upload failed");
      return null;
    }
  } catch (err) {
    console.error("Image upload error:", err);
    toast.error("Image upload error");
    return null;
  }
};