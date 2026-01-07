"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";

// Define the settings type for better type safety
type SettingsType = {
  id?: number;
  userId: string; // This will match the user ID from the database
  orders: boolean;
  products: boolean;
  blog: boolean;
  users: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type UserType = {
  id: string;
  email: string;
  // Add other user fields as needed
};

const SettingsPage = () => {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;
  
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // First fetch user details to get the user ID
  useEffect(() => {
    const fetchUser = async () => {
      if (!userEmail) return;
      
      try {
        // Get user details by email to obtain the user ID
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/email/${encodeURIComponent(userEmail)}`);
        setUserId(response.data.id);
      } catch (error) {
        console.error("Failed to fetch user details:", error);
        setLoading(false);
      }
    };

    fetchUser();
  }, [userEmail]);

  // Then fetch settings using the user ID
  useEffect(() => {
    const fetchSettings = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        // Use userId to fetch settings
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/settings?userId=${userId}`);
        setSettings(response.data);
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchSettings();
    }
  }, [userId]);

  // Handle checkbox changes
  const handleToggle = async (component: keyof Omit<SettingsType, "id" | "userId" | "createdAt" | "updatedAt">) => {
    if (!settings || !userId) return;
    
    // Update local state immediately for UI responsiveness
    const updatedSettings = {
      ...settings,
      [component]: !settings[component]
    };
    
    setSettings(updatedSettings);
    
    // Send the update request with the user ID
    try {
      setSaveStatus("Saving...");
      await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/settings?userId=${userId}`, {
        orders: updatedSettings.orders,
        products: updatedSettings.products,
        blog: updatedSettings.blog,
        users: updatedSettings.users
      });
      setSaveStatus("Saved!");
      
      // Clear status message after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Failed to update settings:", error);
      setSaveStatus("Save failed");
      
      // Revert back to original settings on error
      setSettings(settings);
    }
  };

  if (!userEmail) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-black-100 mb-6">Dashboard Settings</h1>
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
          <p className="text-gray-300">Please sign in to access your settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-black-100 mb-6">Dashboard Settings</h1>
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-300">Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-black-100 mb-6">Dashboard Settings</h1>
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
          <p className="text-gray-300">Unable to load settings. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-black-100 mb-6">Dashboard Settings</h1>
      
      <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-xl font-medium text-gray-200 mb-6">Component Visibility</h2>
        
        <div className="space-y-5">
          {Object.entries(settings)
            .filter(([key]) => ["orders", "products", "blog", "users"].includes(key))
            .map(([component, isVisible]) => (
              <label 
                key={component} 
                className="flex items-center gap-x-4 text-gray-300 hover:text-gray-100 transition-colors cursor-pointer group"
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={Boolean(isVisible)}
                    onChange={() => handleToggle(component as keyof Omit<SettingsType, "id" | "userId" | "createdAt" | "updatedAt">)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-6 rounded bg-gray-700 border border-gray-600 peer-checked:bg-blue-600 peer-checked:border-blue-500 transition-all flex items-center justify-center">
                    {isVisible && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="capitalize text-lg group-hover:text-gray-100 transition-colors">
                  {component}
                </span>
              </label>
            ))}
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-gray-400 text-sm flex items-center">
            {saveStatus ? (
              <span className={`${saveStatus === "Saved!" ? "text-green-500" : saveStatus === "Save failed" ? "text-red-500" : "text-blue-500"}`}>
                {saveStatus}
              </span>
            ) : (
              "Changes are automatically saved to your account."
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;