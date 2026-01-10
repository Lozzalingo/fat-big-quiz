"use client";

import { useState, useEffect } from "react";
import {
  FaShoppingBag,
  FaUsers,
  FaPoundSign,
  FaChartLine,
  FaEnvelope,
  FaBoxOpen,
  FaGoogle,
  FaEye,
} from "react-icons/fa";
import { DashboardSidebar } from "@/components";
import Link from "next/link";

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  newUsersToday: number;
  subscriberCount: number;
  productCount: number;
  lowStockCount: number;
  todayVisitors: number;
  percentageChange: string;
}

interface RecentOrder {
  id: string;
  createdAt: string;
  total: number;
  status: string;
  user?: {
    email: string;
    name?: string;
  };
}

interface GoogleMerchantStatus {
  configured: boolean;
  productCount?: number;
  lastSync?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [merchantStatus, setMerchantStatus] = useState<GoogleMerchantStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch multiple endpoints in parallel
        const [ordersRes, usersRes, productsRes, visitorsRes, merchantRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/orders`),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users`),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products?mode=admin`),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/visitors/change`),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/merchant/status`).catch(() => null),
        ]);

        const orders = await ordersRes.json();
        const users = await usersRes.json();
        const products = await productsRes.json();
        const visitors = await visitorsRes.json();
        const merchant = merchantRes ? await merchantRes.json() : null;

        // Calculate today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOrders = orders.filter((o: any) => new Date(o.createdAt) >= today);
        const todayRevenue = todayOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

        const newUsersToday = users.filter((u: any) => new Date(u.createdAt) >= today).length;
        const subscribers = users.filter((u: any) => u.newsletter === true || u.newsletter === 1).length;

        const lowStockProducts = products.filter((p: any) => p.inStock !== undefined && p.inStock < 5 && p.inStock > 0);

        setStats({
          todayOrders: todayOrders.length,
          todayRevenue,
          totalOrders: orders.length,
          totalRevenue,
          totalUsers: users.length,
          newUsersToday,
          subscriberCount: subscribers,
          productCount: products.length,
          lowStockCount: lowStockProducts.length,
          todayVisitors: visitors.todayCount || 0,
          percentageChange: visitors.percentageChange || "0",
        });

        setRecentOrders(orders.slice(0, 5));

        if (merchant) {
          setMerchantStatus({
            configured: merchant.configured || merchant.success || false,
            productCount: merchant.productCount,
          });
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const StatCard = ({
    title,
    value,
    subValue,
    icon,
    color,
    link,
  }: {
    title: string;
    value: string | number;
    subValue?: string;
    icon: React.ReactNode;
    color: string;
    link?: string;
  }) => {
    const content = (
      <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color} hover:shadow-lg transition-shadow h-full`}>
        <div className="flex justify-between items-start h-full">
          <div className="flex flex-col">
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <h2 className="text-2xl font-bold text-gray-800">{loading ? "..." : value}</h2>
            {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
            {!subValue && <p className="text-sm text-gray-500 mt-1 invisible">placeholder</p>}
          </div>
          <div className={`p-3 rounded-full ${color.replace("border-", "bg-").replace("-500", "-100")} flex-shrink-0`}>
            {icon}
          </div>
        </div>
      </div>
    );

    return link ? <Link href={link} className="h-full">{content}</Link> : content;
  };

  return (
    <div className="bg-gray-50 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Today's Orders"
            value={stats?.todayOrders || 0}
            subValue={`£${(stats?.todayRevenue || 0).toFixed(2)} revenue`}
            icon={<FaShoppingBag className="text-blue-500 text-xl" />}
            color="border-blue-500"
            link="/admin/orders"
          />
          <StatCard
            title="Total Revenue"
            value={`£${(stats?.totalRevenue || 0).toFixed(2)}`}
            subValue={`${stats?.totalOrders || 0} orders total`}
            icon={<FaPoundSign className="text-green-500 text-xl" />}
            color="border-green-500"
            link="/admin/orders"
          />
          <StatCard
            title="Registered Users"
            value={stats?.totalUsers || 0}
            subValue={`+${stats?.newUsersToday || 0} today`}
            icon={<FaUsers className="text-purple-500 text-xl" />}
            color="border-purple-500"
            link="/admin/users"
          />
          <StatCard
            title="Site Visitors"
            value={stats?.todayVisitors || 0}
            subValue={`${stats?.percentageChange || "0"}% vs yesterday`}
            icon={<FaEye className="text-amber-500 text-xl" />}
            color="border-amber-500"
            link="/admin/analytics"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Newsletter Subscribers"
            value={stats?.subscriberCount || 0}
            icon={<FaEnvelope className="text-pink-500 text-xl" />}
            color="border-pink-500"
            link="/admin/emails"
          />
          <StatCard
            title="Products Listed"
            value={stats?.productCount || 0}
            subValue={stats?.lowStockCount ? `${stats.lowStockCount} low stock` : undefined}
            icon={<FaBoxOpen className="text-indigo-500 text-xl" />}
            color="border-indigo-500"
            link="/admin/products"
          />
          <StatCard
            title="Google Merchant"
            value={merchantStatus?.configured ? "Connected" : "Not configured"}
            subValue={merchantStatus?.productCount ? `${merchantStatus.productCount} products synced` : undefined}
            icon={<FaGoogle className="text-red-500 text-xl" />}
            color="border-red-500"
            link="/admin/google-merchant"
          />
          <StatCard
            title="Analytics"
            value="View Details"
            subValue="Traffic, sources, geography"
            icon={<FaChartLine className="text-cyan-500 text-xl" />}
            color="border-cyan-500"
            link="/admin/analytics"
          />
        </div>

        {/* Recent Orders Section */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Recent Orders</h2>
            <Link href="/admin/orders" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </td>
                      </tr>
                    ))
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                          {order.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.user?.email || "Guest"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        £{(order.total || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : order.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.status || "pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
