import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAnalytics } from "@/hooks/useAnalytics";
import { 
  MessageSquare, Clock, CheckCircle, AlertTriangle, 
  TrendingUp, TrendingDown, Plus, ArrowUp, ArrowDown,
  Lightbulb
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function AnalyticsDashboard() {
  const { analytics, queryTrends, topQueries, contentGaps } = useAnalytics();
  const [selectedPeriod, setSelectedPeriod] = useState("7d");

  const statsCards = [
    {
      title: "Total Queries",
      value: analytics?.total_queries || 0,
      icon: MessageSquare,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900",
      change: "+12%",
      trend: "up"
    },
    {
      title: "Avg Response",
      value: `${analytics?.average_response_time_ms || 0}ms`,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900",
      change: "-8%",
      trend: "down"
    },
    {
      title: "Success Rate",
      value: `${analytics?.success_rate || 0}%`,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900",
      change: "+2.1%",
      trend: "up"
    },
    {
      title: "Content Gaps",
      value: analytics?.content_gaps_count || 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900",
      change: "+5",
      trend: "up"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1" data-testid={`stat-value-${index}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`${stat.color} h-6 w-6`} />
                </div>
              </div>
              <div className="flex items-center mt-4 text-sm">
                {stat.trend === "up" ? (
                  <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-green-500 mr-1" />
                )}
                <span className="text-green-500 font-medium">{stat.change}</span>
                <span className="text-muted-foreground ml-1">vs last week</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Query Trends Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Query Trends</CardTitle>
              <div className="flex items-center space-x-2">
                {["7d", "30d", "90d"].map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod(period)}
                    data-testid={`button-period-${period}`}
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {queryTrends && queryTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={queryTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-muted-foreground text-xs"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis className="text-muted-foreground text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="queries" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">No trend data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Queries */}
        <Card>
          <CardHeader>
            <CardTitle>Top Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topQueries && topQueries.length > 0 ? (
                topQueries.slice(0, 5).map((query, index) => (
                  <div key={index} className="flex items-center justify-between" data-testid={`top-query-${index}`}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{query.query}</p>
                      <p className="text-xs text-muted-foreground">{query.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{query.count}</p>
                      <p className="text-xs text-green-500">+12%</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">No query data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Gap Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <Lightbulb className="text-orange-600 h-4 w-4" />
              </div>
              <div>
                <CardTitle>Content Opportunities</CardTitle>
                <CardDescription>AI-detected gaps with auto-draft suggestions</CardDescription>
              </div>
            </div>
            <Button className="bg-gradient-to-r from-primary to-secondary" data-testid="button-create-all-drafts">
              <Plus className="h-4 w-4 mr-2" />
              Create All Drafts
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contentGaps && contentGaps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contentGaps.slice(0, 6).map((gap, index) => (
                <Card key={index} className="border-l-4 border-l-orange-500" data-testid={`content-gap-${index}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Badge 
                        variant={gap.gap_data?.priority === 'high' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {gap.gap_data?.priority || 'Medium'} Priority
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Asked {gap.frequency || 1} times
                      </span>
                    </div>
                    <h4 className="font-medium text-foreground mb-2">{gap.query}</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {gap.gap_data?.reason || 'Content gap detected for this query'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Suggested: {gap.gap_data?.suggested_content_type || 'Article'}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        data-testid={`button-create-draft-${index}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Create Draft
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No content gaps detected</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
