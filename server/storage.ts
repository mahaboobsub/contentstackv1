import { 
  type User, 
  type InsertUser, 
  type ChatSession,
  type InsertChatSession,
  type ChatMessage,
  type InsertChatMessage,
  type ContentGap,
  type InsertContentGap
} from "@shared/schema";
import { randomUUID } from "crypto";

// Enhanced storage interface with chat functionality
export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Chat session management
  createSession(session: InsertChatSession): Promise<ChatSession>;
  getSession(sessionId: string): Promise<ChatSession | undefined>;
  updateSessionActivity(sessionId: string): Promise<void>;

  // Chat message management
  createMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getMessagesBySession(sessionId: string): Promise<ChatMessage[]>;
  clearSessionMessages(sessionId: string): Promise<void>;

  // Content gap management
  createContentGap(gap: InsertContentGap): Promise<ContentGap>;
  getContentGaps(): Promise<ContentGap[]>;
  updateContentGapFrequency(query: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, ChatSession>;
  private messages: Map<string, ChatMessage>;
  private contentGaps: Map<string, ContentGap>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.messages = new Map();
    this.contentGaps = new Map();
  }

  // User management
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Chat session management
  async createSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const now = new Date();
    const session: ChatSession = {
      ...insertSession,
      id,
      createdAt: now,
      lastActivity: now,
      userId: insertSession.userId || null
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<ChatSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
    }
  }

  // Chat message management
  async createMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      timestamp: new Date(),
      metadata: insertMessage.metadata || null
    };
    this.messages.set(id, message);

    // Update session activity
    await this.updateSessionActivity(insertMessage.sessionId);
    
    return message;
  }

  async getMessagesBySession(sessionId: string): Promise<ChatMessage[]> {
    const messages = Array.from(this.messages.values())
      .filter(message => message.sessionId === sessionId)
      .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
    
    return messages;
  }

  async clearSessionMessages(sessionId: string): Promise<void> {
    const messagesToDelete = Array.from(this.messages.entries())
      .filter(([_, message]) => message.sessionId === sessionId)
      .map(([id, _]) => id);

    messagesToDelete.forEach(id => this.messages.delete(id));
  }

  // Content gap management
  async createContentGap(insertGap: InsertContentGap): Promise<ContentGap> {
    const id = randomUUID();
    const now = new Date();
    const gap: ContentGap = {
      ...insertGap,
      id,
      createdAt: now,
      updatedAt: now,
      status: insertGap.status || 'detected',
      frequency: insertGap.frequency || 1,
      suggestedContentType: insertGap.suggestedContentType || null
    };
    
    // Use query as key to prevent duplicates
    const existingGap = Array.from(this.contentGaps.values())
      .find(g => g.query.toLowerCase() === gap.query.toLowerCase());
    
    if (existingGap) {
      // Update frequency instead of creating new
      existingGap.frequency = (existingGap.frequency || 1) + 1;
      existingGap.updatedAt = now;
      this.contentGaps.set(existingGap.id, existingGap);
      return existingGap;
    }

    this.contentGaps.set(id, gap);
    return gap;
  }

  async getContentGaps(): Promise<ContentGap[]> {
    return Array.from(this.contentGaps.values())
      .sort((a, b) => {
        // Sort by priority first (high -> medium -> low), then by frequency
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return (b.frequency || 1) - (a.frequency || 1);
      });
  }

  async updateContentGapFrequency(query: string): Promise<void> {
    const gap = Array.from(this.contentGaps.values())
      .find(g => g.query.toLowerCase() === query.toLowerCase());
    
    if (gap) {
      gap.frequency = (gap.frequency || 1) + 1;
      gap.updatedAt = new Date();
      this.contentGaps.set(gap.id, gap);
    }
  }

  // Utility methods for analytics and cleanup
  async getSessionCount(): Promise<number> {
    return this.sessions.size;
  }

  async getMessageCount(): Promise<number> {
    return this.messages.size;
  }

  async getActiveSessionsCount(hoursBack: number = 24): Promise<number> {
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return Array.from(this.sessions.values())
      .filter(session => (session.lastActivity?.getTime() || 0) > cutoff.getTime())
      .length;
  }

  async getRecentMessages(hoursBack: number = 24): Promise<ChatMessage[]> {
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return Array.from(this.messages.values())
      .filter(message => (message.timestamp?.getTime() || 0) > cutoff.getTime())
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
  }

  // Cleanup old data
  async cleanupOldSessions(daysBack: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const oldSessions = Array.from(this.sessions.entries())
      .filter(([_, session]) => (session.lastActivity?.getTime() || 0) < cutoff.getTime());

    // Remove old sessions and their messages
    let deletedCount = 0;
    for (const [sessionId, session] of oldSessions) {
      await this.clearSessionMessages(session.sessionId);
      this.sessions.delete(sessionId);
      deletedCount++;
    }

    return deletedCount;
  }

  async cleanupOldMessages(daysBack: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const oldMessages = Array.from(this.messages.entries())
      .filter(([_, message]) => (message.timestamp?.getTime() || 0) < cutoff.getTime());

    oldMessages.forEach(([id, _]) => this.messages.delete(id));
    return oldMessages.length;
  }
}

export const storage = new MemStorage();
