interface QueryRecord {
  id: string;
  sessionId: string;
  query: string;
  responseTime: number;
  success: boolean;
  timestamp: Date;
}

interface ContentGap {
  id: string;
  query: string;
  suggestedContentType: string;
  confidence: number;
  timestamp: Date;
}

export class AnalyticsService {
  private queries: QueryRecord[] = [];
  private contentGaps: ContentGap[] = [];

  async track_query(sessionId: string, query: string, responseTimeMs: number, success: boolean): Promise<void> {
    const record: QueryRecord = {
      id: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      query,
      responseTime: responseTimeMs,
      success,
      timestamp: new Date()
    };

    this.queries.push(record);
    
    // Keep only last 1000 queries to prevent memory issues
    if (this.queries.length > 1000) {
      this.queries = this.queries.slice(-1000);
    }
  }

  async track_content_gap(query: string, gapData: any): Promise<void> {
    const gap: ContentGap = {
      id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      suggestedContentType: gapData.suggested_content_type || 'unknown',
      confidence: gapData.confidence || 0.5,
      timestamp: new Date()
    };

    this.contentGaps.push(gap);
    
    // Keep only last 500 gaps
    if (this.contentGaps.length > 500) {
      this.contentGaps = this.contentGaps.slice(-500);
    }
  }

  async get_analytics_summary(): Promise<any> {
    const totalQueries = this.queries.length;
    const successfulQueries = this.queries.filter(q => q.success).length;
    const averageResponseTime = totalQueries > 0 
      ? Math.round(this.queries.reduce((sum, q) => sum + q.responseTime, 0) / totalQueries)
      : 0;

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentQueries = this.queries.filter(q => q.timestamp > last24h);

    return {
      total_queries: totalQueries,
      successful_queries: successfulQueries,
      success_rate: totalQueries > 0 ? Math.round((successfulQueries / totalQueries) * 100) : 0,
      average_response_time_ms: averageResponseTime,
      queries_last_24h: recentQueries.length,
      content_gaps_detected: this.contentGaps.length,
      last_updated: new Date().toISOString()
    };
  }

  async get_query_trends(days = 7): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const relevantQueries = this.queries.filter(q => q.timestamp > startDate);

    // Group by day
    const trendMap = new Map<string, { date: string; count: number; avgResponseTime: number }>();

    relevantQueries.forEach(query => {
      const dateKey = query.timestamp.toISOString().split('T')[0];
      
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, { date: dateKey, count: 0, avgResponseTime: 0 });
      }

      const dayData = trendMap.get(dateKey)!;
      const newCount = dayData.count + 1;
      dayData.avgResponseTime = Math.round((dayData.avgResponseTime * dayData.count + query.responseTime) / newCount);
      dayData.count = newCount;
    });

    return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async get_top_queries(limit = 10): Promise<any[]> {
    // Count query frequency
    const queryCount = new Map<string, number>();
    const queryDetails = new Map<string, { query: string; lastAsked: Date; avgResponseTime: number }>();

    this.queries.forEach(record => {
      const query = record.query.toLowerCase();
      queryCount.set(query, (queryCount.get(query) || 0) + 1);
      
      if (!queryDetails.has(query)) {
        queryDetails.set(query, { 
          query: record.query, 
          lastAsked: record.timestamp,
          avgResponseTime: record.responseTime
        });
      } else {
        const details = queryDetails.get(query)!;
        if (record.timestamp > details.lastAsked) {
          details.lastAsked = record.timestamp;
        }
      }
    });

    // Sort by frequency and return top queries
    const topQueries = Array.from(queryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query, count]) => {
        const details = queryDetails.get(query)!;
        return {
          query: details.query,
          count,
          last_asked: details.lastAsked.toISOString(),
          avg_response_time_ms: details.avgResponseTime
        };
      });

    return topQueries;
  }

  async get_content_gaps(): Promise<any[]> {
    return this.contentGaps
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .map(gap => ({
        id: gap.id,
        query: gap.query,
        suggested_content_type: gap.suggestedContentType,
        confidence: gap.confidence,
        timestamp: gap.timestamp.toISOString()
      }));
  }
}

export const analyticsService = new AnalyticsService();