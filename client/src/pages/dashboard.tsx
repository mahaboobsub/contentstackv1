import { useState } from "react";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { ChatWidget } from "@/components/ChatWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Moon, Sun, Settings, ExternalLink } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  const handleDemoQuery = (query: string) => {
    // Dispatch custom event to open chat widget with query
    window.dispatchEvent(new CustomEvent('contentiq:message', {
      detail: { message: query }
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted to-background">
      {/* Header Navigation */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center">
                  <Brain className="text-primary-foreground text-lg" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">ContentIQ</h1>
                  <p className="text-xs text-muted-foreground">Powered by Contentstack MCP</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="button-theme-toggle"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              
              <div className="flex items-center space-x-3">
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face" 
                  alt="User Avatar" 
                  className="w-10 h-10 rounded-full border-2 border-border"
                />
                <div className="hidden md:block">
                  <p className="text-sm font-medium">Admin User</p>
                  <p className="text-xs text-muted-foreground">admin@company.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Analytics Dashboard */}
        <AnalyticsDashboard />

        {/* Live Chat Demo Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Live Chat Demo</CardTitle>
            <CardDescription>
              Try the ContentIQ chat assistant with different queries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Demo Content Cards */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid="card-demo-italian-tours">
                <CardContent className="pt-6">
                  <img 
                    src="https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200" 
                    alt="Italian countryside" 
                    className="w-full h-32 object-cover rounded-lg mb-4"
                  />
                  <h3 className="font-bold text-lg mb-2">Italian Tours</h3>
                  <p className="text-muted-foreground mb-4">Explore beautiful Italy</p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleDemoQuery('Tell me about Italian tours')}
                    data-testid="button-ask-italian-tours"
                  >
                    Ask AI <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid="card-demo-tokyo-tours">
                <CardContent className="pt-6">
                  <img 
                    src="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200" 
                    alt="Tokyo skyline" 
                    className="w-full h-32 object-cover rounded-lg mb-4"
                  />
                  <h3 className="font-bold text-lg mb-2">Tokyo Adventures</h3>
                  <p className="text-muted-foreground mb-4">Discover modern Japan</p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleDemoQuery('Show me Tokyo tour packages')}
                    data-testid="button-ask-tokyo-tours"
                  >
                    Ask AI <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid="card-demo-safari-tours">
                <CardContent className="pt-6">
                  <img 
                    src="https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200" 
                    alt="African safari" 
                    className="w-full h-32 object-cover rounded-lg mb-4"
                  />
                  <h3 className="font-bold text-lg mb-2">Safari Experience</h3>
                  <p className="text-muted-foreground mb-4">African wildlife adventure</p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleDemoQuery('What safari tours are available?')}
                    data-testid="button-ask-safari-tours"
                  >
                    Ask AI <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* SDK Integration Code */}
            <div className="mt-8 bg-muted rounded-lg p-4">
              <p className="text-sm font-medium text-foreground mb-2">Embed Code</p>
              <div className="bg-background rounded border p-3 text-xs font-mono text-muted-foreground">
                <div>&lt;script src="https://cdn.contentiq.io/widget.js"&gt;&lt;/script&gt;</div>
                <div>&lt;script&gt;</div>
                <div>&nbsp;&nbsp;ContentIQ.init({`{`}</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;apiKey: 'your-api-key',</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;theme: 'auto'</div>
                <div>&nbsp;&nbsp;{`}`});</div>
                <div>&lt;/script&gt;</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Chat Widget */}
      <ChatWidget />

      {/* Floating Settings Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-6 left-6 rounded-full shadow-lg"
        onClick={() => setShowSettings(!showSettings)}
        data-testid="button-settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}
