import { useState, useRef } from "react";
import { Send, Mic, MicOff, Paperclip, Download, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InputBarProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isRecording: boolean;
  onStartRecording: () => void;
  onExportHistory: () => void;
  onClearHistory: () => void;
}

export function InputBar({
  onSendMessage,
  isLoading,
  isRecording,
  onStartRecording,
  onExportHistory,
  onClearHistory
}: InputBarProps) {
  const [input, setInput] = useState("");
  const [showActions, setShowActions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const quickActions = [
    { icon: Download, label: "Export Chat", action: onExportHistory },
    { icon: Trash2, label: "Clear History", action: onClearHistory }
  ];

  return (
    <div className="border-t bg-card p-4" data-testid="input-bar">
      {/* Quick Actions */}
      {showActions && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="flex gap-2 mb-3 pb-3 border-b"
        >
          {quickActions.map((action, idx) => (
            <Button
              key={idx}
              variant="ghost"
              size="sm"
              onClick={action.action}
              className="text-xs"
              data-testid={`button-${action.label.toLowerCase().replace(' ', '-')}`}
            >
              <action.icon className="h-3 w-3 mr-1" />
              {action.label}
            </Button>
          ))}
        </motion.div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your content..."
            disabled={isLoading}
            className="pr-10"
            data-testid="input-message"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowActions(!showActions)}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
            data-testid="button-actions"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>

        {/* Voice Button */}
        <Button
          type="button"
          variant={isRecording ? "destructive" : "outline"}
          size="icon"
          onClick={onStartRecording}
          disabled={isLoading}
          className={isRecording ? "animate-pulse" : ""}
          data-testid="button-voice"
        >
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        {/* Send Button */}
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-gradient-to-r from-primary to-secondary"
          data-testid="button-send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
