"use client"

import { useState, useEffect } from 'react';
import { 
  FaArrowUp, FaArrowDown, FaGlobeAmericas, FaUsers, 
  FaNetworkWired, FaChartLine, FaClock, FaMapMarkerAlt 
} from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import dynamic from 'next/dynamic';
import io from 'socket.io-client';
import { DashboardSidebar } from '@/components';

// Import the map component dynamically with ssr disabled
const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 rounded-full bg-gray-300 mb-2"></div>
        <div className="h-4 w-32 bg-gray-300 rounded"></div>
      </div>
    </div>
  )
});

interface Visitor {
  id: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  ip: string;
  referrerCategory: string;
  referrer: string;
  path: string;
  timestamp: string;
}

interface VisitorData {
  count: number;
  visitors: Visitor[];
  hourlyData: { hour: string; count: number }[];
  pathData: { path: string; count: number }[];
}

export default function EnhancedDashboard() {
  const [visitorData, setVisitorData] = useState<VisitorData>({ 
    count: 0, 
    visitors: [],
    hourlyData: [],
    pathData: []
  });
  const [percentageChange, setPercentageChange] = useState<string | null>(null);
  const [isPositiveChange, setIsPositiveChange] = useState(true);
  const [loading, setLoading] = useState(true);
  const [referrerCounts, setReferrerCounts] = useState<{[key: string]: number}>({});
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('today');
  
  useEffect(() => {
    // Fetch percentage change
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/visitors/change`)
      .then((res) => res.json())
      .then((data) => {
        setPercentageChange(data.percentageChange);
        setIsPositiveChange(parseFloat(data.percentageChange) >= 0);
      })
      .catch((err) => console.error('Error fetching visitor change:', err));

    // Set up Socket.IO
    const socket = io(`${process.env.NEXT_PUBLIC_API_BASE_URL}`, { transports: ['websocket'] });

    socket.on('visitorUpdate', (data) => {
      setVisitorData({
        ...data,
        hourlyData: processHourlyData(data.visitors),
        pathData: processPathData(data.visitors)
      });
      setLoading(false);
      
      // Calculate referrer counts
      const referrers: {[key: string]: number} = {};
      data.visitors.forEach((visitor: Visitor) => {
        const referrer = visitor.referrerCategory || 'Direct';
        referrers[referrer] = (referrers[referrer] || 0) + 1;
      });
      setReferrerCounts(referrers);
    });

    socket.on('connect', () => {
      socket.emit('getVisitorData', { timeRange });
    });

    return () => {
      socket.disconnect();
    };
  }, [timeRange]);

  // Process visitor data to get hourly distribution
  const processHourlyData = (visitors: Visitor[]) => {
    const hourCounts: {[key: string]: number} = {};
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      const hourStr = i.toString().padStart(2, '0') + ':00';
      hourCounts[hourStr] = 0;
    }
    
    // Count visitors per hour
    visitors.forEach(visitor => {
      if (visitor.timestamp) {
        const date = new Date(visitor.timestamp);
        const hour = date.getHours().toString().padStart(2, '0') + ':00';
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
    
    // Convert to array format for charts
    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  };
  
  // Process visitor data to get path distribution
  const processPathData = (visitors: Visitor[]) => {
    const pathCounts: {[key: string]: number} = {};
    
    visitors.forEach(visitor => {
      if (visitor.path) {
        const path = visitor.path;
        pathCounts[path] = (pathCounts[path] || 0) + 1;
      }
    });
    
    // Convert to array and sort by count (descending)
    return Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Get top 10 paths
  };
  
  // Get unique countries
  const uniqueCountries = visitorData.visitors
    .map(visitor => visitor.country)
    .filter((country, index, self) => 
      country && self.indexOf(country) === index
    );

  // Calculate peak traffic hour
  const peakTrafficHour = visitorData.hourlyData.length > 0
    ? visitorData.hourlyData.reduce((max, hour) => hour.count > max.count ? hour : max, { hour: '', count: 0 })
    : null;

  return (
    <div className="bg-gray-50 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-6 overflow-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Visitor Analytics Dashboard</h1>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setTimeRange('today')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  timeRange === 'today' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Today
              </button>
              <button 
                onClick={() => setTimeRange('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  timeRange === 'week' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                This Week
              </button>
              <button 
                onClick={() => setTimeRange('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  timeRange === 'month' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                This Month
              </button>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-8">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('traffic')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'traffic'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Traffic Sources
              </button>
              <button 
                onClick={() => setActiveTab('content')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'content'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Content Performance
              </button>
              <button 
                onClick={() => setActiveTab('geo')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'geo'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Geographic
              </button>
            </nav>
          </div>
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Today's Visitors Card */}
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Today's Visitors</p>
                      <h2 className="text-3xl font-bold text-gray-800">{loading ? '...' : visitorData.count}</h2>
                      {percentageChange !== null && (
                        <p className={`text-sm flex items-center mt-2 ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositiveChange ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
                          {percentageChange}% since yesterday
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <FaUsers className="text-blue-500 text-xl" />
                    </div>
                  </div>
                </div>
                
                {/* Peak Hour Card */}
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Peak Traffic Hour</p>
                      <h2 className="text-3xl font-bold text-gray-800">
                        {loading ? '...' : peakTrafficHour ? peakTrafficHour.hour : 'N/A'}
                      </h2>
                      <p className="text-sm text-gray-500 mt-2">
                        {peakTrafficHour ? `${peakTrafficHour.count} visitors` : 'No data'}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <FaClock className="text-purple-500 text-xl" />
                    </div>
                  </div>
                </div>
                
                {/* Top Referrer Card */}
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Top Referrer</p>
                      <h2 className="text-xl font-bold text-gray-800 truncate">
                        {loading ? '...' : 
                          Object.keys(referrerCounts).length > 0 ? 
                            Object.keys(referrerCounts).reduce((a, b) => 
                              (referrerCounts[a] || 0) > (referrerCounts[b] || 0) ? a : b
                            ) : 'Direct'
                        }
                      </h2>
                      <p className="text-sm text-gray-500 mt-2">Traffic source</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <FaNetworkWired className="text-green-500 text-xl" />
                    </div>
                  </div>
                </div>
                
                {/* Top Page Card */}
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-500 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Top Page</p>
                      <h2 className="text-xl font-bold text-gray-800 truncate">
                        {loading ? '...' : 
                          visitorData.pathData.length > 0 ? 
                            visitorData.pathData[0].path : '/'
                        }
                      </h2>
                      <p className="text-sm text-gray-500 mt-2">Most visited page</p>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-full">
                      <FaMapMarkerAlt className="text-amber-500 text-xl" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Hourly Traffic Chart */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Hourly Traffic Distribution</h2>
                <div className="h-72">
                  {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-300 mb-2"></div>
                        <div className="h-4 w-32 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={visitorData.hourlyData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          name="Visitors" 
                          stroke="#3B82F6" 
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              
              {/* Top Pages Chart */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Top Pages</h2>
                <div className="h-72">
                  {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-300 mb-2"></div>
                        <div className="h-4 w-32 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={visitorData.pathData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="path" 
                          width={150}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar 
                          dataKey="count" 
                          name="Visits" 
                          fill="#10B981" 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* Traffic Tab */}
          {activeTab === 'traffic' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Referrer Breakdown */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Traffic Sources</h2>
                  {loading ? (
                    <div className="animate-pulse space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(referrerCounts).map(([referrer, count], index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 bg-blue-500`}></div>
                            <span className="font-medium">{referrer}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-gray-600 font-medium">{count}</span>
                            <span className="text-gray-400 text-sm ml-1">
                              ({((count / visitorData.count) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Referrer Growth Chart */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Referrer Growth</h2>
                  <div className="h-72">
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">Historical data available with time period comparison</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Detailed Referrer Table */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Detailed Referrers</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          URL
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Visitors
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Percentage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        Array(5).fill(0).map((_, index) => (
                          <tr key={index} className="animate-pulse">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded w-24"></div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded w-28"></div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded w-12"></div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded w-16"></div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        // Group by actual referrer URL
                        Object.entries(
                          visitorData.visitors.reduce((acc: Record<string, { count: number; category: string }>, visitor) => {
                            const ref = visitor.referrer || 'Direct';
                            if (!acc[ref]) acc[ref] = { count: 0, category: visitor.referrerCategory || 'Direct' };
                            acc[ref].count++;
                            return acc;
                          }, {})
                        ).sort((a, b) => b[1].count - a[1].count)
                        .map(([url, data]: [string, { count: number; category: string }], index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                data.category === 'Organic Search' ? 'bg-green-100 text-green-800' :
                                data.category === 'Social Media' ? 'bg-blue-100 text-blue-800' :
                                data.category === 'Email' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {data.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 truncate max-w-xs">{url}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{data.count}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {((data.count / visitorData.count) * 100).toFixed(1)}%
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          
          {/* Content Tab */}
          {activeTab === 'content' && (
            <>
              {/* Page Performance Chart */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Page Performance</h2>
                <div className="h-72">
                  {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-300 mb-2"></div>
                        <div className="h-4 w-32 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={visitorData.pathData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="path" 
                          tick={(props) => {
                            const { x, y, payload } = props;
                            return (
                              <text 
                                x={x} 
                                y={y} 
                                dy={16} 
                                textAnchor="end" 
                                transform={`rotate(-45, ${x}, ${y})`} 
                                fontSize={10}
                              >
                                {payload.value}
                              </text>
                            );
                          }} 
                          height={60} 
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Visits" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              
              {/* Entry & Exit Pages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Top Entry Pages</h2>
                  {loading ? (
                    <div className="animate-pulse space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-6 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <ol className="list-decimal list-inside space-y-2">
                      {visitorData.pathData.slice(0, 5).map((item, index) => (
                        <li key={index} className="text-gray-800">
                          <span className="font-medium">{item.path}</span>
                          <span className="text-gray-500 text-sm ml-2">({item.count} visitors)</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Page Engagement</h2>
                  <p className="text-gray-500 mb-4">
                    Enhanced tracking available with session duration metrics
                  </p>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      Tip: Track session duration to measure engagement on each page
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Page Contents Detail */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Page Details</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Page Path
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Visits
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Top Referrer
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          % of Total Traffic
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        Array(5).fill(0).map((_, index) => (
                          <tr key={index} className="animate-pulse">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded w-28"></div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded w-12"></div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded w-20"></div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded w-16"></div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        visitorData.pathData.map((pathData, index) => {
                          // Find top referrer for this path
                          const pathVisitors = visitorData.visitors.filter(v => v.path === pathData.path);
                          const referrerCounts: Record<string, number> = {};
                          pathVisitors.forEach(v => {
                            const ref = v.referrerCategory || 'Direct';
                            referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
                          });
                          
                          const topReferrer = Object.keys(referrerCounts).length > 0 
                            ? Object.keys(referrerCounts).reduce((a, b) => 
                                referrerCounts[a] > referrerCounts[b] ? a : b
                              ) 
                            : 'Direct';
                            
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{pathData.path}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{pathData.count}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{topReferrer}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">
                                  {((pathData.count / visitorData.count) * 100).toFixed(1)}%
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          
          {/* Geographic Tab */}
          {activeTab === 'geo' && (
            <>
              {/* Map Section */}
              <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Visitor Locations</h2>
                <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: '500px' }}>
                  {loading ? (
                    <div className="h-full w-full flex items-center justify-center bg-gray-100">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-gray-300 mb-2"></div>
                        <div className="h-4 w-32 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                  ) : (
                    <MapView visitors={visitorData.visitors} />
                  )}
                </div>
              </div>
              
              {/* Countries Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Top Countries</h2>
                  {loading ? (
                    <div className="animate-pulse space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {uniqueCountries.slice(0, 5).map((country, index) => {
                        const count = visitorData.visitors.filter(v => v.country === country).length;
                        return (
                          <div key={index} className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-2 bg-green-500`}></div>
                              <span className="font-medium">{country}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-gray-600 font-medium">{count}</span>
                              <span className="text-gray-400 text-sm ml-1">
                                ({((count / visitorData.count) * 100).toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* Cities Breakdown */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Top Cities</h2>
                  {loading ? (
                    <div className="animate-pulse space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Group by city */}
                      {Object.entries(
                        visitorData.visitors.reduce<Record<string, number>>((acc, visitor) => {
                          if (visitor.city) {
                            const city = `${visitor.city}, ${visitor.country || 'Unknown'}`;
                            acc[city] = (acc[city] || 0) + 1;
                          }
                          return acc;
                        }, {})
                      )
                        .sort(([_, countA], [__, countB]) => countB - countA)
                        .slice(0, 5)
                        .map(([city, count], index) => (
                          <div key={index} className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-2 bg-blue-500`}></div>
                              <span className="font-medium">{city}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-gray-600 font-medium">{count}</span>
                              <span className="text-gray-400 text-sm ml-1">
                                ({((count / visitorData.count) * 100).toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Time Zone Analysis */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Timezone Distribution</h2>
                <p className="text-gray-500 mb-4">
                  Enhance visitor tracking to include timezone data for better global audience insights
                </p>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Tip: Adding timezone tracking can help optimize content publishing schedules
                  </p>
                </div>
              </div>
            </>
          )}
          
          {/* Recent Visitors Table - Always shown at bottom */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Recent Visitors</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Referrer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    Array(5).fill(0).map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-28"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    visitorData.visitors.slice(0, 10).map((visitor, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {visitor.city || 'Unknown'}, {visitor.country || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{visitor.path || '/'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            visitor.referrerCategory === 'Organic Search' ? 'bg-green-100 text-green-800' :
                            visitor.referrerCategory === 'Social Media' ? 'bg-blue-100 text-blue-800' :
                            visitor.referrerCategory === 'Email' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {visitor.referrerCategory || 'Direct'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {visitor.timestamp ? new Date(visitor.timestamp).toLocaleString() : 'N/A'}
                          </div>
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