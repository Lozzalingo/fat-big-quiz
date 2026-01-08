"use client";

import React, { useState, useEffect } from "react";
import { MdDashboard } from "react-icons/md";
import { FaTable } from "react-icons/fa6";
import { FaRegUser } from "react-icons/fa6";
import { FaGear } from "react-icons/fa6";
import { FaBook, FaEnvelope, FaHome } from "react-icons/fa";
import { FaBagShopping } from "react-icons/fa6";
import { MdCategory, MdQuiz } from "react-icons/md";
import { FaBars } from "react-icons/fa6";
import { IoClose } from "react-icons/io5";
import { PiReadCvLogoDuotone } from "react-icons/pi";
import { FaPlus } from "react-icons/fa6";
import { FaStar } from "react-icons/fa6";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import Link from "next/link";
import axios from "axios";
import { useSession } from "next-auth/react";

// Define types for our settings
type SettingsType = {
  id?: number;
  userId: string;
  orders: boolean;
  products: boolean;
  blog: boolean;
  users: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const DashboardSidebar = () => {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("adminSidebarOpenMenus");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user settings from the API
  useEffect(() => {
    const fetchSettings = async () => {
      if (!userEmail) return;

      try {
        // First, get the user ID from email
        const userResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/email/${encodeURIComponent(userEmail)}`);
        const userId = userResponse.data.id;

        // Then fetch settings using the user ID
        const settingsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/settings?userId=${userId}`);
        setSettings(settingsResponse.data);
      } catch (error) {
        console.error("Failed to fetch user settings:", error);
        // Set default settings on error
        if (userEmail) {
          setSettings({
            userId: userEmail, // Use email as fallback userId
            orders: true,
            products: true,
            blog: true,
            users: true
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [userEmail]);

  // Monitor screen size - collapse at md breakpoint (768px)
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsOpen(!mobile);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => {
      const newState = {
        ...prev,
        [label]: !prev[label],
      };
      // Persist to localStorage
      localStorage.setItem("adminSidebarOpenMenus", JSON.stringify(newState));
      return newState;
    });
  };

  // Sidebar Navigation Items - base definition
  const baseNavItems = [
    { path: "/admin", icon: <MdDashboard className="text-2xl" />, label: "Dashboard" },
    { path: "/admin/orders", icon: <FaBagShopping className="text-2xl" />, label: "Orders", visibilitySetting: "orders" },
    {
      icon: <FaTable className="text-2xl" />,
      label: "Products",
      visibilitySetting: "products",
      subItems: [
        { path: "/admin/products", icon: <FaPlus className="text-xl" />, label: "Edit" },
        { path: "/admin/products/new", icon: <FaStar className="text-xl" />, label: "New" },
        { path: "/admin/categories", icon: <MdCategory className="text-xl" />, label: "Categories" },
        { path: "/admin/quiz-formats", icon: <MdQuiz className="text-xl" />, label: "Quiz Formats" },
        { path: "/admin/discount-codes", icon: <FaTable className="text-xl" />, label: "Discount Codes" },
      ],
    },
    {
      icon: <FaBook className="text-2xl" />,
      label: "Blog",
      visibilitySetting: "blog",
      subItems: [
        { path: "/admin/blog-editor", icon: <FaPlus className="text-xl" />, label: "Edit" },
        { path: "/admin/blog-editor/new", icon: <FaStar className="text-xl" />, label: "New" },
        { path: "/admin/blog-categories", icon: <PiReadCvLogoDuotone className="text-xl" />, label: "Categories" },
      ],
    },
    { path: "/admin/users", icon: <FaRegUser className="text-2xl" />, label: "Users", visibilitySetting: "users" },
    { path: "/admin/homepage-cards", icon: <FaHome className="text-2xl" />, label: "Homepage Cards" },
    { path: "/admin/emails", icon: <FaEnvelope className="text-2xl" />, label: "Emails" },
    { path: "/admin/settings", icon: <FaGear className="text-2xl" />, label: "Settings" },
  ];

  // Filter navigation items based on user settings
  const getVisibleNavItems = () => {
    if (!settings || loading) {
      // Return all items when loading or no settings available
      return baseNavItems;
    }
    
    return baseNavItems.filter(item => {
      // Always show items without visibility settings (like Dashboard and Settings)
      if (!item.visibilitySetting) return true;
      
      // Otherwise check the settings
      const settingKey = item.visibilitySetting as keyof SettingsType;
      return settings[settingKey];
    });
  };

  const navItems = getVisibleNavItems();

  // Mobile hamburger button - show below md breakpoint (768px)
  const mobileToggle = (
    <div className="md:hidden fixed top-4 left-4 z-50">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-md bg-gray-900 text-gray-200 hover:bg-gray-800 transition-all"
      >
        {isOpen ? <IoClose className="text-xl" /> : <FaBars className="text-xl" />}
      </button>
    </div>
  );

  return (
    <>
      {mobileToggle}
      {/* Spacer to push content right on desktop when sidebar is open */}
      {isOpen && <div className="hidden md:block w-[250px] min-w-[250px] flex-shrink-0" />}
      <div
        className={`
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          w-[250px] min-w-[250px] bg-gray-900 h-screen shadow-lg flex-shrink-0
          fixed top-0 left-0 z-40 overflow-y-auto
          transform transition-transform duration-300 ease-in-out
        `}
      >
        <div className="py-6 px-4 border-b border-gray-700 flex items-center justify-center">
          <h2 className="text-xl font-semibold text-gray-100">Admin Dashboard</h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-6 h-6 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-400">Loading...</span>
          </div>
        ) : (
          <div className="py-4">
            {navItems.map((item, index) => (
              <div key={index}>
                {item.subItems ? (
                  <div>
                    <div
                      className="flex items-center justify-between px-6 py-4 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer group"
                      onClick={() => toggleMenu(item.label)}
                    >
                      <div className="flex items-center gap-x-4">
                        <span className="text-gray-400 group-hover:text-gray-100 transition-colors">
                          {item.icon}
                        </span>
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <span>
                        {openMenus[item.label] ? (
                          <IoIosArrowUp className="text-gray-400" />
                        ) : (
                          <IoIosArrowDown className="text-gray-400" />
                        )}
                      </span>
                    </div>
                    {openMenus[item.label] && (
                      <div className="pl-8">
                        {item.subItems.map((subItem, subIndex) => (
                          <Link href={subItem.path} key={subIndex}>
                            <div className="flex items-center gap-x-4 px-6 py-3 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer group">
                              <span className="text-gray-500 group-hover:text-gray-100 transition-colors">
                                {subItem.icon}
                              </span>
                              <span className="font-medium text-sm">{subItem.label}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href={item.path}>
                    <div className="flex items-center gap-x-4 px-6 py-4 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer group">
                      <span className="text-gray-400 group-hover:text-gray-100 transition-colors">
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default DashboardSidebar;