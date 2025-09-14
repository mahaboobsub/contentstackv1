import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  responseTime?: number;
  contentReferences?: any[];
}

interface Analytics {
  total_queries: number;
  average_response_time_ms: number;
  success_rate: number;
  content_gaps_count: number;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() =>
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { toast } = useToast();

  // Load chat history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem(`chat_${sessionId}`);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  }, [sessionId]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_${sessionId}`, JSON.stringify(messages));
    }
  }, [messages, sessionId]);

  const sendMessage = useCallback(async (content: string) => {
    // Add user message immediately
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsTyping(true);

    // Create assistant message placeholder
    const assistantMessageId = Date.now() + 1;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Use EventSource for streaming
      const eventSource = new EventSource(
        `${API_URL}/api/chat?` + new URLSearchParams({
          message: content,
          session_id: sessionId,
          stream: 'true'
        })
      );
      eventSourceRef.current = eventSource;

      let fullResponse = '';
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.chunk) {
            fullResponse += data.chunk;
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullResponse }
                : msg
            ));
          }

          if (data.done) {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { 
                    ...msg, 
                    isStreaming: false, 
                    responseTime: data.response_time_ms,
                    contentReferences: data.content_references
                  }
                : msg
            ));
            setIsTyping(false);
            eventSource.close();
          }

          if (data.notification) {
            toast({
              title: "Content Gap Detected",
              description: data.notification,
              variant: "default"
            });
          }

          if (data.error) {
            throw new Error(data.error);
          }
        } catch (parseError) {
          console.error('Error parsing event data:', parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        setIsTyping(false);
        setIsLoading(false);
        
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { 
                ...msg, 
                content: 'Sorry, I encountered an error. Please try again.', 
                isStreaming: false 
              }
            : msg
        ));

        toast({
          title: "Connection Error",
          description: "Failed to connect to the chat service. Please try again.",
          variant: "destructive"
        });
      };
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { 
              ...msg, 
              content: 'Sorry, I encountered an error. Please try again.', 
              isStreaming: false 
            }
          : msg
      ));
      
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, toast]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(`chat_${sessionId}`);
    toast({
      title: "History Cleared",
      description: "Chat history has been cleared successfully.",
    });
  }, [sessionId, toast]);

  const exportHistory = useCallback(() => {
    try {
      const chatData = {
        sessionId,
        exportDate: new Date().toISOString(),
        messages
      };
      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_history_${sessionId}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Chat history has been exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting history:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export chat history. Please try again.",
        variant: "destructive"
      });
    }
  }, [messages, sessionId, toast]);

  // Fetch analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`${API_URL}/api/analytics`);
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    isTyping,
    sessionId,
    clearHistory,
    exportHistory,
    analytics
  };
};
