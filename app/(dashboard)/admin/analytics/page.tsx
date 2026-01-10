"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FaUsers,
  FaEye,
  FaClock,
  FaChartLine,
  FaMobile,
  FaDesktop,
  FaTabletAlt,
  FaGlobe,
  FaShoppingCart,
  FaArrowUp,
  FaArrowDown,
  FaSearch,
  FaEnvelope,
  FaShareAlt,
  FaLink,
  FaChrome,
  FaSafari,
  FaFirefox,
  FaEdge,
  FaApple,
  FaAndroid,
  FaWindows,
  FaLinux,
  FaFacebook,
  FaInstagram,
  FaSnapchat,
  FaTwitter,
  FaTiktok,
  FaYoutube,
  FaLinkedin,
  FaPinterest,
  FaReddit,
  FaWhatsapp,
  FaTelegram,
  FaDiscord,
  FaGoogle,
  FaYahoo,
} from "react-icons/fa";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import dynamic from "next/dynamic";
import io from "socket.io-client";
import { DashboardSidebar } from "@/components";

// Dynamic import for map component
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="animate-pulse text-gray-400">Loading map...</div>
    </div>
  ),
});

// Colors for charts
const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];
const DEVICE_COLORS = { desktop: "#3B82F6", mobile: "#10B981", tablet: "#F59E0B", tv: "#8B5CF6", unknown: "#6B7280" };

interface OverviewStats {
  totalPageViews: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  avgSessionDuration: number;
  avgPagesPerSession: string;
  bounceRate: string;
}

interface TimelineData {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  newVisitors: number;
}

interface DeviceStats {
  deviceTypes: { name: string; count: number }[];
  browsers: { name: string; count: number }[];
  operatingSystems: { name: string; count: number }[];
  deviceBrands: { name: string; count: number }[];
  screenResolutions: { resolution: string; count: number }[];
}

interface GeoStats {
  countries: { name: string; count: number }[];
  cities: { name: string; count: number }[];
  locations: { latitude: number; longitude: number; city: string; country: string }[];
}

interface PlatformStats {
  name: string;
  count: number;
  avgPages?: string;
  avgTime?: number;
}

interface ReferrerStats {
  categories: { name: string; count: number }[];
  platforms: PlatformStats[];
  socialPlatforms: PlatformStats[];
  searchEngines: PlatformStats[];
  referrers: PlatformStats[];
  utmSources: { source: string; medium: string | null; campaign: string | null; count: number }[];
  totalVisits: number;
}

interface PageStats {
  pages: { path: string; views: number; avgTimeOnPage: number }[];
}

interface EcommerceFunnel {
  funnel: {
    productViews: number;
    addedToCart: number;
    checkoutStarted: number;
    purchases: number;
  };
  conversionRates: {
    viewToCart: string;
    cartToCheckout: string;
    checkoutToPurchase: string;
    overall: string;
  };
  totalRevenue: number;
  topProducts: { productId: string; views: number }[];
}

interface Activity {
  id: string;
  path: string;
  eventType: string;
  eventData: string | { buttonName?: string; button?: string } | null;
  country: string;
  city: string;
  deviceType: string;
  browser: string;
  os: string;
  timestamp: string;
  referrerCategory: string;
}

interface BotStats {
  humanCount: number;
  botCount: number;
  total: number;
  botPercentage: string;
  botTypes: { type: string; count: number }[];
}

interface InteractionStats {
  interactions: { type: string; count: number }[];
  buttonClicks: { name: string; count: number }[];
}

type TimeRange = "today" | "yesterday" | "week" | "month" | "3months" | "all";

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [devices, setDevices] = useState<DeviceStats | null>(null);
  const [geo, setGeo] = useState<GeoStats | null>(null);
  const [referrers, setReferrers] = useState<ReferrerStats | null>(null);
  const [pages, setPages] = useState<PageStats | null>(null);
  const [ecommerce, setEcommerce] = useState<EcommerceFunnel | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [visitorChange, setVisitorChange] = useState<{ todayCount: number; percentageChange: string } | null>(null);
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [interactions, setInteractions] = useState<InteractionStats | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    try {
      const [
        overviewRes,
        timelineRes,
        devicesRes,
        geoRes,
        referrersRes,
        pagesRes,
        ecommerceRes,
        activityRes,
        changeRes,
        botRes,
        interactionsRes,
      ] = await Promise.all([
        fetch(`${baseUrl}/api/visitors/overview?timeRange=${timeRange}`),
        fetch(`${baseUrl}/api/visitors/timeline?timeRange=${timeRange === "today" ? "week" : timeRange}`),
        fetch(`${baseUrl}/api/visitors/devices?timeRange=${timeRange}`),
        fetch(`${baseUrl}/api/visitors/geographic?timeRange=${timeRange}`),
        fetch(`${baseUrl}/api/visitors/referrers?timeRange=${timeRange}`),
        fetch(`${baseUrl}/api/visitors/pages?timeRange=${timeRange}`),
        fetch(`${baseUrl}/api/visitors/ecommerce?timeRange=${timeRange}`),
        fetch(`${baseUrl}/api/visitors/activity?limit=30`),
        fetch(`${baseUrl}/api/visitors/change`),
        fetch(`${baseUrl}/api/visitors/bots?timeRange=${timeRange}`),
        fetch(`${baseUrl}/api/visitors/interactions?timeRange=${timeRange}`),
      ]);

      const [overviewData, timelineData, devicesData, geoData, referrersData, pagesData, ecommerceData, activityData, changeData, botData, interactionsData] =
        await Promise.all([
          overviewRes.json(),
          timelineRes.json(),
          devicesRes.json(),
          geoRes.json(),
          referrersRes.json(),
          pagesRes.json(),
          ecommerceRes.json(),
          activityRes.json(),
          changeRes.json(),
          botRes.json(),
          interactionsRes.json(),
        ]);

      setOverview(overviewData);
      setTimeline(timelineData.timeline || []);
      setDevices(devicesData);
      setGeo(geoData);
      setReferrers(referrersData);
      setPages(pagesData);
      setEcommerce(ecommerceData);
      setActivities(activityData.activities || []);
      setVisitorChange(changeData);
      setBotStats(botData);
      setInteractions(interactionsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket.IO for real-time updates
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_BASE_URL || "", { transports: ["websocket"] });

    socket.on("newVisitorAdded", () => {
      // Refresh data when new visitor arrives
      fetchData();
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getDeviceIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "mobile":
        return <FaMobile className="text-green-500" />;
      case "tablet":
        return <FaTabletAlt className="text-yellow-500" />;
      case "desktop":
        return <FaDesktop className="text-blue-500" />;
      default:
        return <FaDesktop className="text-gray-500" />;
    }
  };

  const getBrowserIcon = (browser: string) => {
    switch (browser?.toLowerCase()) {
      case "chrome":
        return <FaChrome className="text-yellow-500" />;
      case "safari":
        return <FaSafari className="text-blue-500" />;
      case "firefox":
        return <FaFirefox className="text-orange-500" />;
      case "edge":
        return <FaEdge className="text-blue-400" />;
      default:
        return <FaGlobe className="text-gray-500" />;
    }
  };

  const getOsIcon = (os: string) => {
    switch (os?.toLowerCase()) {
      case "ios":
      case "macos":
        return <FaApple className="text-gray-700" />;
      case "android":
        return <FaAndroid className="text-green-500" />;
      case "windows":
        return <FaWindows className="text-blue-500" />;
      case "linux":
        return <FaLinux className="text-yellow-600" />;
      default:
        return <FaDesktop className="text-gray-500" />;
    }
  };

  const getReferrerIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "organic search":
        return <FaSearch className="text-blue-500" />;
      case "social media":
        return <FaShareAlt className="text-pink-500" />;
      case "email":
        return <FaEnvelope className="text-yellow-500" />;
      case "referral":
        return <FaLink className="text-green-500" />;
      default:
        return <FaGlobe className="text-gray-500" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "facebook":
        return <FaFacebook className="text-blue-600" />;
      case "instagram":
        return <FaInstagram className="text-pink-500" />;
      case "snapchat":
        return <FaSnapchat className="text-yellow-400" />;
      case "twitter/x":
        return <FaTwitter className="text-blue-400" />;
      case "tiktok":
        return <FaTiktok className="text-black" />;
      case "youtube":
        return <FaYoutube className="text-red-600" />;
      case "linkedin":
        return <FaLinkedin className="text-blue-700" />;
      case "pinterest":
        return <FaPinterest className="text-red-500" />;
      case "reddit":
        return <FaReddit className="text-orange-500" />;
      case "whatsapp":
        return <FaWhatsapp className="text-green-500" />;
      case "telegram":
        return <FaTelegram className="text-blue-400" />;
      case "discord":
        return <FaDiscord className="text-indigo-500" />;
      case "google":
        return <FaGoogle className="text-blue-500" />;
      case "bing":
        return <FaSearch className="text-teal-500" />;
      case "yahoo":
        return <FaYahoo className="text-purple-600" />;
      case "duckduckgo":
        return <FaSearch className="text-orange-500" />;
      case "direct":
        return <FaGlobe className="text-gray-500" />;
      case "email":
        return <FaEnvelope className="text-yellow-500" />;
      case "google ads":
        return <FaGoogle className="text-green-500" />;
      default:
        return <FaLink className="text-gray-400" />;
    }
  };

  const getButtonName = (eventData: Activity["eventData"]): string | null => {
    if (!eventData) return null;
    try {
      const data = typeof eventData === "string" ? JSON.parse(eventData) : eventData;
      return data?.buttonName || data?.button || null;
    } catch {
      return null;
    }
  };

  // Stat Card Component
  const StatCard = ({
    title,
    value,
    subValue,
    icon,
    change,
    color = "blue",
  }: {
    title: string;
    value: string | number;
    subValue?: string;
    icon: React.ReactNode;
    change?: number;
    color?: string;
  }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 border-${color}-500`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <h2 className="text-2xl font-bold text-gray-800">{loading ? "..." : value}</h2>
          {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
          {change !== undefined && (
            <p className={`text-sm mt-1 flex items-center ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
              {change >= 0 ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
              {Math.abs(change).toFixed(1)}% vs yesterday
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>{icon}</div>
      </div>
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "traffic", label: "Traffic Sources" },
    { id: "devices", label: "Devices" },
    { id: "pages", label: "Pages" },
    { id: "geographic", label: "Geographic" },
    { id: "ecommerce", label: "E-commerce" },
    { id: "interactions", label: "Interactions" },
    { id: "realtime", label: "Real-time" },
  ];

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "week", label: "Last 7 Days" },
    { value: "month", label: "Last 30 Days" },
    { value: "3months", label: "Last 90 Days" },
    { value: "all", label: "All Time" },
  ];

  return (
    <div className="bg-gray-50 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Analytics</h1>
              <p className="text-gray-500 mt-1">Comprehensive visitor insights and metrics</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value)}
                  data-track-button={`Analytics:Time Range ${range.label}`}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    timeRange === range.value
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-track-button={`Analytics:Tab ${tab.label}`}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Total Page Views"
                value={overview?.totalPageViews.toLocaleString() || 0}
                icon={<FaEye className="text-blue-500 text-xl" />}
                change={visitorChange ? parseFloat(visitorChange.percentageChange) : undefined}
                color="blue"
              />
              <StatCard
                title="Unique Visitors"
                value={overview?.uniqueVisitors.toLocaleString() || 0}
                subValue={`${overview?.newVisitors || 0} new`}
                icon={<FaUsers className="text-green-500 text-xl" />}
                color="green"
              />
              <StatCard
                title="Avg. Session Duration"
                value={formatDuration(overview?.avgSessionDuration || 0)}
                icon={<FaClock className="text-yellow-500 text-xl" />}
                color="yellow"
              />
              <StatCard
                title="Bounce Rate"
                value={`${overview?.bounceRate || 0}%`}
                subValue={`${overview?.avgPagesPerSession || 0} pages/session`}
                icon={<FaChartLine className="text-purple-500 text-xl" />}
                color="purple"
              />
            </div>

            {/* Traffic Timeline */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Traffic Over Time</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} />
                    <YAxis />
                    <Tooltip labelFormatter={(val) => new Date(val).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} />
                    <Legend />
                    <Area type="monotone" dataKey="pageViews" stackId="1" stroke="#3B82F6" fill="#93C5FD" name="Page Views" />
                    <Area type="monotone" dataKey="uniqueVisitors" stackId="2" stroke="#10B981" fill="#6EE7B7" name="Unique Visitors" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Device Types */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Device Types</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={devices?.deviceTypes || []}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {devices?.deviceTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DEVICE_COLORS[entry.name.toLowerCase() as keyof typeof DEVICE_COLORS] || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Pages */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Pages</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {pages?.pages.slice(0, 10).map((page, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm text-gray-700 truncate flex-1 mr-4">{page.path}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">{page.views.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 ml-2">({formatDuration(page.avgTimeOnPage)} avg)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Traffic Sources Tab */}
        {activeTab === "traffic" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Traffic by Category */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Traffic by Category</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={referrers?.categories || []}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {referrers?.categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Platforms */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Traffic Sources</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {referrers?.platforms?.slice(0, 15).map((platform, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getPlatformIcon(platform.name)}</span>
                        <span className="text-sm text-gray-700">{platform.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{platform.count.toLocaleString()}</span>
                        {referrers?.totalVisits && (
                          <span className="text-xs text-gray-500">
                            ({((platform.count / referrers.totalVisits) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Engagement by Source */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Engagement by Source</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Pages</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {referrers?.platforms?.filter(p => p.name !== 'Direct').slice(0, 10).map((platform, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getPlatformIcon(platform.name)}</span>
                            <span className="text-sm text-gray-900">{platform.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {platform.count}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {platform.avgPages || '-'} pages
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {platform.avgTime ? `${Math.floor(platform.avgTime / 60)}m ${platform.avgTime % 60}s` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!referrers?.platforms || referrers.platforms.filter(p => p.name !== 'Direct').length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">No external traffic sources yet</p>
                )}
              </div>
            </div>

            {/* Social Media & Search Engines Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Social Media */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaShareAlt className="text-pink-500" />
                  Social Media
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {referrers?.socialPlatforms && referrers.socialPlatforms.length > 0 ? (
                    referrers.socialPlatforms.map((platform, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getPlatformIcon(platform.name)}</span>
                          <div>
                            <span className="text-sm text-gray-700 block">{platform.name}</span>
                            <span className="text-xs text-gray-500">
                              {platform.avgPages} pages · {platform.avgTime ? `${Math.floor(platform.avgTime / 60)}m ${platform.avgTime % 60}s` : '0s'}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{platform.count} sessions</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No social media traffic yet</p>
                  )}
                </div>
              </div>

              {/* Search Engines */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaSearch className="text-blue-500" />
                  Search Engines
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {referrers?.searchEngines && referrers.searchEngines.length > 0 ? (
                    referrers.searchEngines.map((engine, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getPlatformIcon(engine.name)}</span>
                          <div>
                            <span className="text-sm text-gray-700 block">{engine.name}</span>
                            <span className="text-xs text-gray-500">
                              {engine.avgPages} pages · {engine.avgTime ? `${Math.floor(engine.avgTime / 60)}m ${engine.avgTime % 60}s` : '0s'}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{engine.count} sessions</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No search engine traffic yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* UTM Campaigns */}
            {referrers?.utmSources && referrers.utmSources.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">UTM Campaigns</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medium</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visitors</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {referrers.utmSources.map((utm, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{utm.source}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{utm.medium || "-"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{utm.campaign || "-"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{utm.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Devices Tab */}
        {activeTab === "devices" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Browsers */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Browsers</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={devices?.browsers || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Operating Systems */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Operating Systems</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={devices?.operatingSystems || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Device Brands */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Device Brands</h3>
                <div className="space-y-3">
                  {devices?.deviceBrands.slice(0, 10).map((brand, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm text-gray-700">{brand.name}</span>
                      <span className="text-sm font-medium text-gray-900">{brand.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Screen Resolutions */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Screen Resolutions</h3>
                <div className="space-y-3">
                  {devices?.screenResolutions?.slice(0, 10).map((res: any, index: number) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm text-gray-700 font-mono">{res.resolution}</span>
                      <span className="text-sm font-medium text-gray-900">{Number(res.count).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Pages Tab */}
        {activeTab === "pages" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">All Pages</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pages?.pages.map((page, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{page.path}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{page.views.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDuration(page.avgTimeOnPage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Geographic Tab */}
        {activeTab === "geographic" && (
          <>
            {/* Map */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Visitor Locations</h3>
              <div className="h-96">
                <MapView visitors={geo?.locations?.map(loc => ({ ...loc, ip: '', referrerCategory: 'Direct', referrer: '' })) || []} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Countries */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Countries</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {geo?.countries.map((country, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm text-gray-700">{country.name}</span>
                      <span className="text-sm font-medium text-gray-900">{country.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cities */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Cities</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {geo?.cities.map((city, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm text-gray-700">{city.name}</span>
                      <span className="text-sm font-medium text-gray-900">{city.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* E-commerce Tab */}
        {activeTab === "ecommerce" && (
          <>
            {/* Funnel */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Conversion Funnel</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{ecommerce?.funnel.productViews || 0}</p>
                  <p className="text-sm text-gray-600">Product Views</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-3xl font-bold text-yellow-600">{ecommerce?.funnel.addedToCart || 0}</p>
                  <p className="text-sm text-gray-600">Added to Cart</p>
                  <p className="text-xs text-gray-500">{ecommerce?.conversionRates.viewToCart}% conv.</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-3xl font-bold text-orange-600">{ecommerce?.funnel.checkoutStarted || 0}</p>
                  <p className="text-sm text-gray-600">Checkout Started</p>
                  <p className="text-xs text-gray-500">{ecommerce?.conversionRates.cartToCheckout}% conv.</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{ecommerce?.funnel.purchases || 0}</p>
                  <p className="text-sm text-gray-600">Purchases</p>
                  <p className="text-xs text-gray-500">{ecommerce?.conversionRates.checkoutToPurchase}% conv.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue</h3>
                <div className="text-center py-8">
                  <p className="text-4xl font-bold text-green-600">
                    £{(ecommerce?.totalRevenue || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">Total Revenue ({timeRange})</p>
                  <p className="text-lg text-gray-700 mt-4">
                    Overall Conversion: <span className="font-bold">{ecommerce?.conversionRates.overall}%</span>
                  </p>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Viewed Products</h3>
                <div className="space-y-3">
                  {ecommerce?.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm text-gray-700 truncate">{product.productId}</span>
                      <span className="text-sm font-medium text-gray-900">{product.views} views</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Interactions Tab */}
        {activeTab === "interactions" && (
          <>
            {/* Bot vs Human Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Human Visitors</h3>
                <p className="text-4xl font-bold text-green-600">{botStats?.humanCount?.toLocaleString() || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Real users</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Bot Traffic</h3>
                <p className="text-4xl font-bold text-red-500">{botStats?.botCount?.toLocaleString() || 0}</p>
                <p className="text-sm text-gray-500 mt-1">{botStats?.botPercentage || 0}% of total</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Requests</h3>
                <p className="text-4xl font-bold text-blue-600">{botStats?.total?.toLocaleString() || 0}</p>
                <p className="text-sm text-gray-500 mt-1">All traffic combined</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Bot Types Breakdown */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Bot Types Detected</h3>
                {botStats?.botTypes && botStats.botTypes.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={botStats.botTypes.map((b, i) => ({ name: b.type, value: b.count }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {botStats.botTypes.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No bot types detected</p>
                )}
              </div>

              {/* Event Types */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Event Types</h3>
                {interactions?.interactions && interactions.interactions.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {interactions.interactions.map((event, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm text-gray-700">{event.type}</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                          {event.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No custom events tracked yet</p>
                )}
              </div>
            </div>

            {/* Button Clicks */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Clicked Buttons</h3>
              {interactions?.buttonClicks && interactions.buttonClicks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Button</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% of Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {interactions.buttonClicks.map((button, index) => {
                        const totalClicks = interactions.buttonClicks.reduce((sum, b) => sum + b.count, 0);
                        const percentage = ((button.count / totalClicks) * 100).toFixed(1);
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{button.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{button.count}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-full bg-gray-200 rounded-full h-2 mr-2 max-w-[100px]">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-500">{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No button clicks tracked yet</p>
                  <p className="text-sm text-gray-400">Add data-track-button attributes to buttons across your site</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Real-time Tab */}
        {activeTab === "realtime" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{activity.path}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`px-2 py-1 text-xs rounded-full inline-block w-fit ${
                              activity.eventType === "page_view"
                                ? "bg-blue-100 text-blue-800"
                                : activity.eventType === "product_view"
                                ? "bg-purple-100 text-purple-800"
                                : activity.eventType === "add_to_cart"
                                ? "bg-yellow-100 text-yellow-800"
                                : activity.eventType === "purchase"
                                ? "bg-green-100 text-green-800"
                                : activity.eventType === "button_click"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {activity.eventType}
                          </span>
                          {activity.eventType === "button_click" && getButtonName(activity.eventData) && (
                            <span className="text-xs text-gray-600 font-medium truncate max-w-[200px]">
                              {getButtonName(activity.eventData)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {activity.city}, {activity.country}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(activity.deviceType)}
                          {getBrowserIcon(activity.browser)}
                          {getOsIcon(activity.os)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {getReferrerIcon(activity.referrerCategory)}
                          <span className="text-sm text-gray-500">{activity.referrerCategory}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
