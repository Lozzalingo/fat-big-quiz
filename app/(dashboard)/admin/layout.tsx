"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import {
  FaBagShopping,
  FaCalendarCheck,
  FaRegUser,
  FaGear,
  FaPlus,
  FaStar,
  FaGift,
  FaUsers,
} from "react-icons/fa6";
import { FaBook, FaGoogle, FaTheaterMasks, FaEnvelope, FaHome } from "react-icons/fa";
import { FaTable } from "react-icons/fa6";
import { MdCategory, MdQuiz } from "react-icons/md";
import { PiReadCvLogoDuotone } from "react-icons/pi";
import { AdminSidebar } from "@lozzalingo/dashboard/components";
import type { NavItem } from "@lozzalingo/dashboard/components";
import { ModulePageProvider } from "@lozzalingo/dashboard/pages";

type SettingsType = {
  orders: boolean;
  products: boolean;
  blog: boolean;
  users: boolean;
};

export default function FBQAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!userEmail) {
        setSettings({ orders: true, products: true, blog: true, users: true });
        setLoading(false);
        return;
      }
      try {
        const userRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/email/${encodeURIComponent(userEmail)}`
        );
        const settingsRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/settings?userId=${userRes.data.id}`
        );
        setSettings(settingsRes.data);
      } catch (error) {
        console.error("[Admin] Failed to fetch settings:", error);
        setSettings({ orders: true, products: true, blog: true, users: true });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [userEmail]);

  // Build custom nav items based on settings
  const customNavItems: NavItem[] = [];

  if (!loading && settings) {
    customNavItems.push({
      path: "/admin/crm",
      icon: <FaUsers className="text-lg" />,
      label: "CRM",
      id: "crm",
    });

    if (settings.orders) {
      customNavItems.push({
        path: "/admin/orders",
        icon: <FaBagShopping className="text-lg" />,
        label: "Orders",
        id: "orders",
      });
    }

    if (settings.products) {
      customNavItems.push({
        icon: <FaTable className="text-lg" />,
        label: "Products",
        id: "products",
        subItems: [
          { path: "/admin/products", icon: <FaPlus className="text-base" />, label: "Edit" },
          { path: "/admin/products/new", icon: <FaStar className="text-base" />, label: "New" },
          { path: "/admin/categories", icon: <MdCategory className="text-base" />, label: "Categories" },
          { path: "/admin/quiz-formats", icon: <MdQuiz className="text-base" />, label: "Quiz Formats" },
          { path: "/admin/discount-codes", icon: <FaTable className="text-base" />, label: "Discount Codes" },
          { path: "/admin/global-files", icon: <FaGift className="text-base" />, label: "Bonus Files" },
        ],
      });
    }

    customNavItems.push({
      path: "/admin/events",
      icon: <FaTheaterMasks className="text-lg" />,
      label: "Events",
      id: "events",
    });

    customNavItems.push({
      path: "/admin/bookings",
      icon: <FaCalendarCheck className="text-lg" />,
      label: "Bookings",
      id: "bookings",
    });

    if (settings.users) {
      customNavItems.push({
        path: "/admin/users",
        icon: <FaRegUser className="text-lg" />,
        label: "Users",
        id: "users",
      });
    }

    customNavItems.push({
      path: "/admin/homepage-cards",
      icon: <FaHome className="text-lg" />,
      label: "Homepage Cards",
      id: "homepage-cards",
    });

    customNavItems.push({
      path: "/admin/google-merchant",
      icon: <FaGoogle className="text-lg" />,
      label: "Google Merchant",
      id: "google-merchant",
    });

    customNavItems.push({
      path: "/admin/campaigns",
      icon: <FaEnvelope className="text-lg" />,
      label: "Campaigns",
      id: "campaigns",
    });
  }

  // Override the core Blog item with FBQ's submenu version
  const coreNavOverrides: Record<string, NavItem> = {};
  if (!loading && settings?.blog) {
    coreNavOverrides["Blog"] = {
      icon: <FaBook className="text-lg" />,
      label: "Blog",
      id: "blog",
      subItems: [
        { path: "/admin/blog-editor", icon: <FaPlus className="text-base" />, label: "Edit" },
        { path: "/admin/blog-editor/new", icon: <FaStar className="text-base" />, label: "New" },
        { path: "/admin/blog-categories", icon: <PiReadCvLogoDuotone className="text-base" />, label: "Categories" },
      ],
    };
  }

  // Hide blog from core if settings say so
  const hideCore: string[] = [];
  if (settings && !settings.blog) {
    hideCore.push("Blog");
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <AdminSidebar
        brandName="Fat Big Quiz"
        accentColour="blue"
        subtitle={userEmail || "Admin"}
        customNavItems={customNavItems}
        coreNavOverrides={coreNavOverrides}
        hideCore={hideCore}
      />
      <main className="flex-1 overflow-auto">
        <ModulePageProvider
          apiBase={process.env.NEXT_PUBLIC_API_BASE_URL || ""}
          adminSecret={typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "localhost" : ""}
        >
          {children}
        </ModulePageProvider>
      </main>
    </div>
  );
}
