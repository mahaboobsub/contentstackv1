import json
import redis
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import os
import logging

logger = logging.getLogger(__name__)

class AnalyticsService:
    """Real-time analytics service with Redis caching"""
    
    def __init__(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
        except Exception as e:
            logger.warning(f"Redis connection failed, using in-memory storage: {e}")
            self.redis_client = None
            self._memory_storage = {}
    
    async def track_query(self, session_id: str, query: str, response_time_ms: float, success: bool):
        """Track a user query with analytics"""
        
        timestamp = datetime.now()
        query_data = {
            "session_id": session_id,
            "query": query,
            "response_time_ms": response_time_ms,
            "success": success,
            "timestamp": timestamp.isoformat()
        }
        
        # Store in Redis or memory
        if self.redis_client:
            # Store individual query
            query_key = f"query:{session_id}:{timestamp.timestamp()}"
            self.redis_client.setex(query_key, 86400, json.dumps(query_data))  # 24h TTL
            
            # Update aggregate stats
            await self._update_aggregate_stats(query_data)
        else:
            # Memory storage fallback
            if "queries" not in self._memory_storage:
                self._memory_storage["queries"] = []
            self._memory_storage["queries"].append(query_data)
    
    async def track_content_gap(self, query: str, gap_data: Dict[str, Any]):
        """Track identified content gaps"""
        
        timestamp = datetime.now()
        gap_record = {
            "query": query,
            "gap_data": gap_data,
            "timestamp": timestamp.isoformat()
        }
        
        if self.redis_client:
            gap_key = f"content_gap:{hash(query)}"
            existing = self.redis_client.get(gap_key)
            
            if existing:
                # Increment frequency
                existing_data = json.loads(existing)
                existing_data["frequency"] = existing_data.get("frequency", 1) + 1
                existing_data["last_seen"] = timestamp.isoformat()
                self.redis_client.setex(gap_key, 86400 * 7, json.dumps(existing_data))  # 7 days TTL
            else:
                # New gap
                gap_record["frequency"] = 1
                self.redis_client.setex(gap_key, 86400 * 7, json.dumps(gap_record))
        else:
            # Memory storage
            if "content_gaps" not in self._memory_storage:
                self._memory_storage["content_gaps"] = {}
            
            query_hash = str(hash(query))
            if query_hash in self._memory_storage["content_gaps"]:
                self._memory_storage["content_gaps"][query_hash]["frequency"] += 1
            else:
                gap_record["frequency"] = 1
                self._memory_storage["content_gaps"][query_hash] = gap_record
    
    async def get_analytics_summary(self) -> Dict[str, Any]:
        """Get real-time analytics summary"""
        
        try:
            if self.redis_client:
                return await self._get_redis_analytics()
            else:
                return await self._get_memory_analytics()
        except Exception as e:
            logger.error(f"Error getting analytics: {e}")
            return self._get_default_analytics()
    
    async def get_query_trends(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get query trends over time"""
        
        trends = []
        end_date = datetime.now()
        
        for i in range(days):
            date = end_date - timedelta(days=i)
            day_key = date.strftime("%Y-%m-%d")
            
            if self.redis_client:
                count = self.redis_client.get(f"daily_queries:{day_key}") or 0
            else:
                count = self._get_memory_daily_count(date)
            
            trends.append({
                "date": day_key,
                "queries": int(count)
            })
        
        return list(reversed(trends))
    
    async def get_top_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most frequent queries"""
        
        if self.redis_client:
            # Get all query keys and count frequencies
            query_keys = self.redis_client.keys("query:*")
            query_counts = {}
            
            for key in query_keys:
                data = json.loads(self.redis_client.get(key) or "{}")
                query = data.get("query", "")
                if query:
                    query_counts[query] = query_counts.get(query, 0) + 1
            
            # Sort by frequency
            sorted_queries = sorted(query_counts.items(), key=lambda x: x[1], reverse=True)
            
            return [
                {
                    "query": query,
                    "count": count,
                    "category": self._categorize_query(query)
                }
                for query, count in sorted_queries[:limit]
            ]
        else:
            # Memory storage
            queries = self._memory_storage.get("queries", [])
            query_counts = {}
            
            for query_data in queries:
                query = query_data.get("query", "")
                if query:
                    query_counts[query] = query_counts.get(query, 0) + 1
            
            sorted_queries = sorted(query_counts.items(), key=lambda x: x[1], reverse=True)
            
            return [
                {
                    "query": query,
                    "count": count,
                    "category": self._categorize_query(query)
                }
                for query, count in sorted_queries[:limit]
            ]
    
    async def get_content_gaps(self) -> List[Dict[str, Any]]:
        """Get identified content gaps"""
        
        if self.redis_client:
            gap_keys = self.redis_client.keys("content_gap:*")
            gaps = []
            
            for key in gap_keys:
                gap_data = json.loads(self.redis_client.get(key) or "{}")
                gaps.append(gap_data)
            
            # Sort by frequency and priority
            return sorted(gaps, key=lambda x: (
                self._priority_score(x.get("gap_data", {}).get("priority", "low")),
                x.get("frequency", 0)
            ), reverse=True)
        else:
            # Memory storage
            gaps = list(self._memory_storage.get("content_gaps", {}).values())
            return sorted(gaps, key=lambda x: (
                self._priority_score(x.get("gap_data", {}).get("priority", "low")),
                x.get("frequency", 0)
            ), reverse=True)
    
    async def _update_aggregate_stats(self, query_data: Dict[str, Any]):
        """Update aggregate statistics in Redis"""
        
        date_key = datetime.now().strftime("%Y-%m-%d")
        
        # Daily query count
        self.redis_client.incr(f"daily_queries:{date_key}")
        self.redis_client.expire(f"daily_queries:{date_key}", 86400 * 30)  # 30 days
        
        # Response time tracking
        response_time = query_data.get("response_time_ms", 0)
        self.redis_client.lpush(f"response_times:{date_key}", response_time)
        self.redis_client.ltrim(f"response_times:{date_key}", 0, 999)  # Keep last 1000
        self.redis_client.expire(f"response_times:{date_key}", 86400)
        
        # Success rate tracking
        success = 1 if query_data.get("success", False) else 0
        self.redis_client.lpush(f"success_rate:{date_key}", success)
        self.redis_client.ltrim(f"success_rate:{date_key}", 0, 999)
        self.redis_client.expire(f"success_rate:{date_key}", 86400)
    
    async def _get_redis_analytics(self) -> Dict[str, Any]:
        """Get analytics from Redis"""
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Total queries (last 7 days)
        total_queries = 0
        for i in range(7):
            date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            daily_count = int(self.redis_client.get(f"daily_queries:{date}") or 0)
            total_queries += daily_count
        
        # Average response time
        response_times = [
            float(x) for x in self.redis_client.lrange(f"response_times:{today}", 0, -1)
        ]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # Success rate
        success_records = [
            int(x) for x in self.redis_client.lrange(f"success_rate:{today}", 0, -1)
        ]
        success_rate = (sum(success_records) / len(success_records) * 100) if success_records else 0
        
        # Content gaps count
        content_gaps_count = len(self.redis_client.keys("content_gap:*"))
        
        return {
            "total_queries": total_queries,
            "average_response_time_ms": round(avg_response_time),
            "success_rate": round(success_rate, 1),
            "content_gaps_count": content_gaps_count,
            "last_updated": datetime.now().isoformat()
        }
    
    async def _get_memory_analytics(self) -> Dict[str, Any]:
        """Get analytics from memory storage"""
        
        queries = self._memory_storage.get("queries", [])
        content_gaps = self._memory_storage.get("content_gaps", {})
        
        # Filter last 7 days
        week_ago = datetime.now() - timedelta(days=7)
        recent_queries = [
            q for q in queries 
            if datetime.fromisoformat(q["timestamp"]) > week_ago
        ]
        
        total_queries = len(recent_queries)
        
        # Average response time
        if recent_queries:
            avg_response_time = sum(q.get("response_time_ms", 0) for q in recent_queries) / len(recent_queries)
            success_rate = (sum(1 for q in recent_queries if q.get("success", False)) / len(recent_queries)) * 100
        else:
            avg_response_time = 0
            success_rate = 0
        
        return {
            "total_queries": total_queries,
            "average_response_time_ms": round(avg_response_time),
            "success_rate": round(success_rate, 1),
            "content_gaps_count": len(content_gaps),
            "last_updated": datetime.now().isoformat()
        }
    
    def _get_memory_daily_count(self, date: datetime) -> int:
        """Get daily query count from memory"""
        
        queries = self._memory_storage.get("queries", [])
        date_str = date.strftime("%Y-%m-%d")
        
        return len([
            q for q in queries
            if datetime.fromisoformat(q["timestamp"]).strftime("%Y-%m-%d") == date_str
        ])
    
    def _categorize_query(self, query: str) -> str:
        """Simple query categorization"""
        
        query_lower = query.lower()
        
        if any(word in query_lower for word in ["hotel", "accommodation", "stay"]):
            return "Hotels"
        elif any(word in query_lower for word in ["tour", "trip", "travel"]):
            return "Tours"
        elif any(word in query_lower for word in ["restaurant", "food", "dining"]):
            return "Dining"
        elif any(word in query_lower for word in ["price", "cost", "budget"]):
            return "Pricing"
        else:
            return "General"
    
    def _priority_score(self, priority: str) -> int:
        """Convert priority to numeric score"""
        
        return {"high": 3, "medium": 2, "low": 1}.get(priority, 1)
    
    def _get_default_analytics(self) -> Dict[str, Any]:
        """Default analytics when service is unavailable"""
        
        return {
            "total_queries": 0,
            "average_response_time_ms": 0,
            "success_rate": 0,
            "content_gaps_count": 0,
            "last_updated": datetime.now().isoformat()
        }

# Global analytics service instance
analytics_service = AnalyticsService()
