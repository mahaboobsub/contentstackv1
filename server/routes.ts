import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { insertChatMessageSchema } from "@shared/schema";

// Node.js services
import { llmService } from './services/llm';
import { mcpService } from './services/mcp';
import { analyticsService } from './services/analytics';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time analytics
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const analyticsClients = new Set<WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    analyticsClients.add(ws);
    
    ws.on('close', () => {
      analyticsClients.delete(ws);
    });
  });

  // Broadcast analytics updates
  const broadcastAnalytics = async () => {
    if (analyticsClients.size > 0) {
      try {
        const analytics = await analyticsService.get_analytics_summary();
        const message = JSON.stringify({ type: 'analytics_update', data: analytics });
        
        analyticsClients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      } catch (error) {
        console.error('Error broadcasting analytics:', error);
      }
    }
  };

  // Broadcast analytics every 5 seconds
  setInterval(broadcastAnalytics, 5000);

  // Chat endpoint with streaming support
  app.get('/api/chat', async (req, res) => {
    try {
      const { message, session_id, stream = 'false' } = req.query as {
        message: string;
        session_id: string;
        stream: string;
      };

      if (!message || !session_id) {
        return res.status(400).json({ error: 'Message and session_id are required' });
      }

      const isStreaming = stream === 'true';
      const startTime = Date.now();

      // Search for relevant content
      const contentResults = await mcpService.search_content(message, ['tours', 'hotels', 'guides']);
      
      // Get conversation history
      const messages = [
        { role: 'user', content: message }
      ];

      if (isStreaming) {
        // Set up Server-Sent Events
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });

        let fullResponse = '';
        let responseTime = 0;

        try {
          for await (const chunk of llmService.generate_response(messages, contentResults, true)) {
            if (chunk.chunk) {
              fullResponse += chunk.chunk;
            }
            
            if (chunk.done) {
              responseTime = chunk.response_time_ms || (Date.now() - startTime);
            }

            res.write(`data: ${JSON.stringify(chunk)}\n\n`);

            if (chunk.done) {
              break;
            }
          }

          // Save message to storage
          await storage.createMessage({
            sessionId: session_id,
            role: 'user',
            content: message,
            metadata: { response_time_ms: responseTime }
          });

          await storage.createMessage({
            sessionId: session_id,
            role: 'assistant',
            content: fullResponse,
            metadata: { 
              response_time_ms: responseTime,
              content_references: contentResults.length > 0 ? contentResults : undefined
            }
          });

          // Track analytics
          await analyticsService.track_query(session_id, message, responseTime, true);

          // Check for content gaps
          if (contentResults.length === 0) {
            const gapAnalysis = await llmService.analyze_content_gap(message, contentResults);
            if (gapAnalysis.is_gap) {
              await analyticsService.track_content_gap(message, gapAnalysis);
              
              res.write(`data: ${JSON.stringify({
                notification: 'Content gap detected',
                gap_data: gapAnalysis
              })}\n\n`);
            }
          }

        } catch (error) {
          console.error('Streaming error:', error);
          res.write(`data: ${JSON.stringify({
            error: 'An error occurred during response generation'
          })}\n\n`);
        }

        res.end();
      } else {
        // Non-streaming response
        const chunks: any[] = [];
        
        for await (const chunk of llmService.generate_response(messages, contentResults, false)) {
          chunks.push(chunk);
        }

        const response = chunks[chunks.length - 1];
        const responseTime = response.response_time_ms || (Date.now() - startTime);

        // Save messages and track analytics (same as streaming)
        await storage.createMessage({
          sessionId: session_id,
          role: 'user',
          content: message,
          metadata: { response_time_ms: responseTime }
        });

        await storage.createMessage({
          sessionId: session_id,
          role: 'assistant',
          content: response.chunk,
          metadata: { 
            response_time_ms: responseTime,
            content_references: contentResults.length > 0 ? contentResults : undefined
          }
        });

        await analyticsService.track_query(session_id, message, responseTime, true);

        res.json({
          response: response.chunk,
          response_time_ms: responseTime,
          content_references: contentResults,
          session_id
        });
      }

    } catch (error) {
      console.error('Chat endpoint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Analytics endpoints
  app.get('/api/analytics', async (req, res) => {
    try {
      const analytics = await analyticsService.get_analytics_summary();
      res.json(analytics);
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  app.get('/api/analytics/trends', async (req, res) => {
    try {
      const { days = '7' } = req.query;
      const trends = await analyticsService.get_query_trends(parseInt(days as string));
      res.json(trends);
    } catch (error) {
      console.error('Trends error:', error);
      res.status(500).json({ error: 'Failed to fetch trends' });
    }
  });

  app.get('/api/analytics/top-queries', async (req, res) => {
    try {
      const { limit = '10' } = req.query;
      const topQueries = await analyticsService.get_top_queries(parseInt(limit as string));
      res.json(topQueries);
    } catch (error) {
      console.error('Top queries error:', error);
      res.status(500).json({ error: 'Failed to fetch top queries' });
    }
  });

  app.get('/api/content-gaps', async (req, res) => {
    try {
      const contentGaps = await analyticsService.get_content_gaps();
      res.json(contentGaps);
    } catch (error) {
      console.error('Content gaps error:', error);
      res.status(500).json({ error: 'Failed to fetch content gaps' });
    }
  });

  // Content creation endpoint
  app.post('/api/content/create-draft', async (req, res) => {
    try {
      const { content_type, title, data } = req.body;

      if (!content_type || !title || !data) {
        return res.status(400).json({ error: 'content_type, title, and data are required' });
      }

      const result = await mcpService.create_draft_content(content_type, title, data);
      
      if (result) {
        res.json({ success: true, draft: result });
      } else {
        res.status(500).json({ error: 'Failed to create draft content' });
      }
    } catch (error) {
      console.error('Draft creation error:', error);
      res.status(500).json({ error: 'Failed to create draft content' });
    }
  });

  // Chat history endpoints
  app.get('/api/chat/history/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getMessagesBySession(sessionId);
      res.json(messages);
    } catch (error) {
      console.error('History fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });

  app.delete('/api/chat/history/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      await storage.clearSessionMessages(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('History clear error:', error);
      res.status(500).json({ error: 'Failed to clear chat history' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        mcp: 'connected',
        llm: 'available',
        analytics: 'active'
      }
    });
  });

  return httpServer;
}
