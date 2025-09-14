/**
 * HTTP client for connecting Node.js Express to Python FastAPI services
 * Replaces mock services with real API calls
 */

interface MCPClient {
  fetch_content(content_type: string, query?: string): Promise<any[]>;
  search_content(query: string, content_types?: string[]): Promise<any[]>;
  create_draft_content(content_type: string, title: string, data: any): Promise<any>;
}

interface LLMService {
  generate_response(messages: any[], content_context?: any[], stream?: boolean): AsyncGenerator<any>;
  analyze_content_gap(query: string, available_content: any[]): Promise<any>;
}

interface AnalyticsService {
  track_query(session_id: string, query: string, response_time_ms: number, success: boolean): Promise<void>;
  track_content_gap(query: string, gap_data: any): Promise<void>;
  get_analytics_summary(): Promise<any>;
  get_query_trends(days?: number): Promise<any[]>;
  get_top_queries(limit?: number): Promise<any[]>;
  get_content_gaps(): Promise<any[]>;
}

const PYTHON_API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:8001';

// Real HTTP client for MCP service
const mcpClient: MCPClient = {
  async fetch_content(content_type: string, query?: string) {
    const url = new URL(`${PYTHON_API_BASE}/api/mcp/content/${content_type}`);
    if (query) url.searchParams.append('query', query);
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`MCP fetch_content failed: ${response.status} ${response.statusText}`);
      return [];
    }
    return response.json();
  },

  async search_content(query: string, content_types?: string[]) {
    const response = await fetch(`${PYTHON_API_BASE}/api/mcp/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, content_types })
    });
    
    if (!response.ok) {
      console.error(`MCP search_content failed: ${response.status} ${response.statusText}`);
      return [];
    }
    return response.json();
  },

  async create_draft_content(content_type: string, title: string, data: any) {
    const response = await fetch(`${PYTHON_API_BASE}/api/mcp/create-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_type, title, data })
    });
    
    if (!response.ok) {
      console.error(`MCP create_draft_content failed: ${response.status} ${response.statusText}`);
      return null;
    }
    return response.json();
  }
};

// Real HTTP client for LLM service
const llmService: LLMService = {
  async* generate_response(messages: any[], content_context?: any[], stream = false) {
    try {
      if (stream) {
        // Streaming request
        const response = await fetch(`${PYTHON_API_BASE}/api/llm/generate/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, content_context, stream: true })
        });

        if (!response.ok) {
          yield { chunk: "LLM service error", done: true, error: true };
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.trim().startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.trim().slice(6));
                  yield data;
                  if (data.done) return;
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }
      } else {
        // Non-streaming request
        const response = await fetch(`${PYTHON_API_BASE}/api/llm/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, content_context, stream: false })
        });

        if (!response.ok) {
          yield { chunk: "LLM service error", done: true, error: true };
          return;
        }

        const result = await response.json();
        yield result;
      }
    } catch (error) {
      console.error('LLM generate_response error:', error);
      yield { chunk: "LLM service connection error", done: true, error: true };
    }
  },

  async analyze_content_gap(query: string, available_content: any[]) {
    try {
      const response = await fetch(`${PYTHON_API_BASE}/api/llm/analyze-content-gap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, available_content })
      });

      if (!response.ok) {
        console.error(`LLM analyze_content_gap failed: ${response.status} ${response.statusText}`);
        return { is_gap: false, priority: "low", suggested_content_type: "article" };
      }

      return response.json();
    } catch (error) {
      console.error('LLM analyze_content_gap error:', error);
      return { is_gap: false, priority: "low", suggested_content_type: "article" };
    }
  }
};

// Real HTTP client for Analytics service
const analyticsService: AnalyticsService = {
  async track_query(session_id: string, query: string, response_time_ms: number, success: boolean) {
    try {
      await fetch(`${PYTHON_API_BASE}/api/analytics/track-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, query, response_time_ms, success })
      });
    } catch (error) {
      console.error('Analytics track_query error:', error);
    }
  },

  async track_content_gap(query: string, gap_data: any) {
    try {
      await fetch(`${PYTHON_API_BASE}/api/analytics/track-content-gap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, gap_data })
      });
    } catch (error) {
      console.error('Analytics track_content_gap error:', error);
    }
  },

  async get_analytics_summary() {
    try {
      const response = await fetch(`${PYTHON_API_BASE}/api/analytics/summary`);
      if (!response.ok) {
        console.error(`Analytics summary failed: ${response.status} ${response.statusText}`);
        return { total_queries: 0, average_response_time_ms: 0, success_rate: 0, content_gaps_count: 0 };
      }
      return response.json();
    } catch (error) {
      console.error('Analytics get_analytics_summary error:', error);
      return { total_queries: 0, average_response_time_ms: 0, success_rate: 0, content_gaps_count: 0 };
    }
  },

  async get_query_trends(days = 7) {
    try {
      const response = await fetch(`${PYTHON_API_BASE}/api/analytics/trends?days=${days}`);
      if (!response.ok) {
        console.error(`Analytics trends failed: ${response.status} ${response.statusText}`);
        return [];
      }
      return response.json();
    } catch (error) {
      console.error('Analytics get_query_trends error:', error);
      return [];
    }
  },

  async get_top_queries(limit = 10) {
    try {
      const response = await fetch(`${PYTHON_API_BASE}/api/analytics/top-queries?limit=${limit}`);
      if (!response.ok) {
        console.error(`Analytics top queries failed: ${response.status} ${response.statusText}`);
        return [];
      }
      return response.json();
    } catch (error) {
      console.error('Analytics get_top_queries error:', error);
      return [];
    }
  },

  async get_content_gaps() {
    try {
      const response = await fetch(`${PYTHON_API_BASE}/api/analytics/content-gaps`);
      if (!response.ok) {
        console.error(`Analytics content gaps failed: ${response.status} ${response.statusText}`);
        return [];
      }
      return response.json();
    } catch (error) {
      console.error('Analytics get_content_gaps error:', error);
      return [];
    }
  }
};

export { mcpClient, llmService, analyticsService, MCPClient, LLMService, AnalyticsService };