# ContentIQ Chat Platform

## Overview

ContentIQ is a full-stack AI chat assistant platform designed for content management systems, particularly Contentstack. The application provides an embeddable chat widget with real-time analytics, multi-provider LLM support, and content gap analysis. Built as a monorepo with TypeScript, the platform combines a React frontend with an Express.js backend and integrates with external services through MCP (Model Context Protocol) for content operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript running on Vite for development
- **UI Components**: Radix UI primitives with shadcn/ui component system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: EventSource for server-sent events, WebSocket support for chat functionality

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints with WebSocket support for real-time features
- **Session Management**: In-memory storage with planned database integration
- **Development**: Hot module replacement through Vite integration

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema**: Comprehensive schema for users, chat sessions, messages, content gaps, and analytics
- **Connection**: Neon Database serverless PostgreSQL
- **Caching**: Redis for query caching and session storage (planned Python services)
- **Session Storage**: Browser localStorage for chat history persistence

### Authentication and Authorization
- **User Management**: Basic user system with username/password authentication
- **Session Handling**: Session-based authentication with unique session identifiers
- **Access Control**: Role-based permissions for admin functions (analytics, content approval)

### External Service Integrations

#### Content Management (MCP Integration)
- **Contentstack Integration**: Direct integration through MCP (Model Context Protocol)
- **Content Operations**: Fetch content, search across content types, create draft content
- **Environment Support**: Configurable environments (development, production)
- **Token Management**: Separate delivery and management tokens for different operations

#### AI/LLM Services
- **Multi-Provider Support**: Groq as primary provider, OpenAI as fallback
- **Streaming Responses**: Real-time response streaming for better user experience
- **Content-Aware Responses**: Context injection from CMS content for relevant answers
- **Analytics Integration**: Response time tracking and success rate monitoring

#### Analytics and Monitoring
- **Real-time Analytics**: Query tracking, response time monitoring, success rate analysis
- **Content Gap Detection**: Automatic identification of missing content based on user queries
- **Trend Analysis**: Query pattern analysis and content performance metrics
- **Export Capabilities**: Analytics data export functionality

### Deployment and Infrastructure
- **Containerization**: Docker support with multi-stage builds
- **Environment Configuration**: Comprehensive environment variable management
- **Development Tools**: Hot reloading, error overlays, and development banners
- **Build Process**: Vite for frontend bundling, esbuild for backend compilation
- **Static Assets**: Separate handling of static assets and public files

### Widget SDK
- **Embeddable Widget**: Standalone JavaScript SDK for website integration
- **Configuration Options**: Customizable themes, positioning, and behavior
- **Cross-Origin Support**: CORS configuration for multi-domain deployment
- **Event System**: Custom event handling for widget interactions

The architecture emphasizes modularity, type safety, and real-time capabilities while maintaining clear separation between frontend presentation, backend logic, and external service integrations.