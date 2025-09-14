import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

interface Analytics {
  total_queries: number;
  average_response_time_ms: number;
  success_rate: number;
  content_gaps_count: number;
  last_updated: string;
}

interface QueryTrend {
  date: string;
  queries: number;
}

interface TopQuery {
  query: string;
  count: number;
  category: string;
}

interface ContentGap {
  query: string;
  frequency: number;
  gap_data: {
    priority: 'high' | 'medium' | 'low';
    suggested_content_type: string;
    suggested_title: string;
    reason: string;
  };
  timestamp: string;
}

export const useAnalytics = () => {
  const [wsConnected, setWsConnected] = useState(false);
  
  // Real-time analytics via query
  const { data: analytics, refetch: refetchAnalytics } = useQuery<Analytics>({
    queryKey: ['/api/analytics'],
    refetchInterval: 5000,
  });

  // Query trends
  const { data: queryTrends } = useQuery<QueryTrend[]>({
    queryKey: ['/api/analytics/trends'],
    refetchInterval: 30000,
  });

  // Top queries
  const { data: topQueries } = useQuery<TopQuery[]>({
    queryKey: ['/api/analytics/top-queries'],
    refetchInterval: 30000,
  });

  // Content gaps
  const { data: contentGaps } = useQuery<ContentGap[]>({
    queryKey: ['/api/content-gaps'],
    refetchInterval: 10000,
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('Analytics WebSocket connected');
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'analytics_update') {
            // Trigger a refetch of analytics data
            refetchAnalytics();
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        console.log('Analytics WebSocket disconnected');
        setWsConnected(false);
      };

      socket.onerror = (error) => {
        console.error('Analytics WebSocket error:', error);
        setWsConnected(false);
      };

      return () => {
        socket.close();
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
    }
  }, [refetchAnalytics]);

  return {
    analytics,
    queryTrends,
    topQueries,
    contentGaps,
    wsConnected,
    refetch: {
      analytics: refetchAnalytics
    }
  };
};
