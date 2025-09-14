import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Maximize2, Minimize2, Bot,
  TrendingUp, Settings, Mic, MicOff, Volume2, VolumeX
} from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { MessageList } from "./MessageList";
import { InputBar } from "./InputBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    sendMessage,
    isLoading,
    isTyping,
    sessionId,
    clearHistory,
    exportHistory,
    analytics
  } = useChat();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for custom events to open chat with message
  useEffect(() => {
    const handleContentIQMessage = (event: CustomEvent) => {
      const { message } = event.detail;
      setIsOpen(true);
      if (message) {
        sendMessage(message);
      }
    };

    window.addEventListener('contentiq:message', handleContentIQMessage as EventListener);
    return () => {
      window.removeEventListener('contentiq:message', handleContentIQMessage as EventListener);
    };
  }, [sendMessage]);

  // Text-to-Speech for assistant responses
  useEffect(() => {
    if (!isTTSEnabled) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.isStreaming) {
      const utterance = new SpeechSynthesisUtterance(lastMessage.content);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }, [messages, isTTSEnabled]);

  // Voice recording
  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      sendMessage(transcript);
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-secondary shadow-lg hover:shadow-xl transition-all relative"
              data-testid="button-chat-open"
            >
              <MessageCircle className="h-6 w-6" />
              {messages.length > 0 && (
                <Badge className="absolute -top-2 -right-2 px-2 py-1 text-xs">
                  {messages.length}
                </Badge>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: "spring", damping: 25 }}
            className={`fixed ${
              isFullscreen 
                ? 'inset-4' 
                : 'bottom-6 right-6 w-96 h-[600px]'
            } bg-background rounded-2xl border shadow-2xl flex flex-col overflow-hidden z-50`}
            data-testid="chat-widget"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bot className="h-6 w-6" />
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">ContentIQ Assistant</h3>
                  <p className="text-xs opacity-90">Powered by Contentstack MCP</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsTTSEnabled(!isTTSEnabled)}
                  className="text-primary-foreground hover:bg-white/20"
                  data-testid="button-tts-toggle"
                >
                  {isTTSEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                {analytics && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className="text-primary-foreground hover:bg-white/20"
                    data-testid="button-analytics-toggle"
                  >
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="text-primary-foreground hover:bg-white/20"
                  data-testid="button-fullscreen-toggle"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-primary-foreground hover:bg-white/20"
                  data-testid="button-chat-close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Analytics Panel */}
            {showAnalytics && analytics && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                className="bg-muted p-4 border-b"
              >
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center" data-testid="stat-total-queries">
                    <p className="text-muted-foreground">Total Queries</p>
                    <p className="font-bold text-lg">{analytics.total_queries}</p>
                  </div>
                  <div className="text-center" data-testid="stat-avg-response">
                    <p className="text-muted-foreground">Avg Response</p>
                    <p className="font-bold text-lg">{Math.round(analytics.average_response_time_ms)}ms</p>
                  </div>
                  <div className="text-center" data-testid="stat-success-rate">
                    <p className="text-muted-foreground">Success Rate</p>
                    <p className="font-bold text-lg">{Math.round(analytics.success_rate)}%</p>
                  </div>
                </div>
                {analytics.content_gaps_count > 0 && (
                  <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {analytics.content_gaps_count} content gaps detected
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Messages Area */}
            <MessageList
              messages={messages}
              isTyping={isTyping}
              messagesEndRef={messagesEndRef}
            />

            {/* Input Area */}
            <InputBar
              onSendMessage={sendMessage}
              isLoading={isLoading}
              isRecording={isRecording}
              onStartRecording={startRecording}
              onExportHistory={exportHistory}
              onClearHistory={clearHistory}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
