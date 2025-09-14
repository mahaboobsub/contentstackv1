import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Clock, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ContentCard } from "./ContentCard";
import { Button } from "@/components/ui/button";

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  responseTime?: number;
  contentReferences?: any[];
}

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function MessageList({ messages, isTyping, messagesEndRef }: MessageListProps) {
  const handleSuggestionClick = (text: string) => {
    window.dispatchEvent(new CustomEvent('contentiq:message', {
      detail: { message: text }
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-muted/30 to-background" data-testid="message-list">
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Bot className="mx-auto text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Welcome to ContentIQ!
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
            Ask me anything about your content. I can help you find information, identify gaps,
            and suggest improvements.
          </p>
          <div className="space-y-2">
            <SuggestionChip 
              text="Show me available tours" 
              onClick={() => handleSuggestionClick("Show me available tours")}
            />
            <SuggestionChip 
              text="What content is missing?" 
              onClick={() => handleSuggestionClick("What content is missing?")}
            />
            <SuggestionChip 
              text="Analytics dashboard" 
              onClick={() => handleSuggestionClick("Show me the analytics dashboard")}
            />
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`message-${message.role}-${message.id}`}
          >
            <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-gradient-to-r from-secondary to-primary text-primary-foreground'
              }`}>
                {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`flex flex-col gap-1 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border shadow-sm text-foreground'
                }`}>
                  {message.isStreaming && (
                    <Sparkles className="inline-block mr-1 h-3 w-3 animate-pulse" />
                  )}
                  <ReactMarkdown 
                    components={{
                      p: ({ children }) => <p className="prose prose-sm max-w-none dark:prose-invert">{children}</p>,
                      div: ({ children }) => <div className="prose prose-sm max-w-none dark:prose-invert">{children}</div>
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                {message.responseTime && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 px-2">
                    <Clock className="h-3 w-3" />
                    {message.responseTime}ms
                  </span>
                )}
                {message.contentReferences && message.contentReferences.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.contentReferences.map((ref, idx) => (
                      <ContentCard key={idx} content={ref} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {isTyping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-muted-foreground"
          data-testid="typing-indicator"
        >
          <Bot className="h-5 w-5" />
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

interface SuggestionChipProps {
  text: string;
  onClick: () => void;
}

function SuggestionChip({ text, onClick }: SuggestionChipProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="text-xs"
      data-testid={`suggestion-${text.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {text}
    </Button>
  );
}
