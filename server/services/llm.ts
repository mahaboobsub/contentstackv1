import OpenAI from 'openai';

interface LLMProvider {
  generate(messages: any[], stream: boolean): AsyncGenerator<any>;
}

class GroqProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async *generate(messages: any[], stream: boolean) {
    try {
      if (stream) {
        const response = await this.client.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages,
          stream: true,
          temperature: 0.7,
        }) as AsyncIterable<any>;

        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          yield {
            chunk: content,
            done: false,
            provider: 'groq'
          };
        }
        yield { chunk: '', done: true, provider: 'groq' };
      } else {
        const response = await this.client.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages,
          stream: false,
          temperature: 0.7,
        }) as any;
        
        const content = response.choices[0]?.message?.content || '';
        yield {
          chunk: content,
          done: true,
          provider: 'groq'
        };
      }
    } catch (error) {
      console.error('Groq error:', error);
      throw error;
    }
  }
}

class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async *generate(messages: any[], stream: boolean) {
    try {
      if (stream) {
        const response = await this.client.chat.completions.create({
          model: 'gpt-4',
          messages,
          stream: true,
          temperature: 0.7,
        }) as AsyncIterable<any>;

        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          yield {
            chunk: content,
            done: false,
            provider: 'openai'
          };
        }
        yield { chunk: '', done: true, provider: 'openai' };
      } else {
        const response = await this.client.chat.completions.create({
          model: 'gpt-4',
          messages,
          stream: false,
          temperature: 0.7,
        }) as any;
        
        const content = response.choices[0]?.message?.content || '';
        yield {
          chunk: content,
          done: true,
          provider: 'openai'
        };
      }
    } catch (error) {
      console.error('OpenAI error:', error);
      throw error;
    }
  }
}

class AnthropicProvider implements LLMProvider {
  async *generate(messages: any[], stream: boolean) {
    // Anthropic integration placeholder - will implement when API key is available
    yield {
      chunk: 'Anthropic provider not configured yet. Please set ANTHROPIC_API_KEY.',
      done: true,
      provider: 'anthropic'
    };
  }
}

export class LLMService {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProvider = 'groq';

  constructor() {
    // Initialize providers based on available API keys
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (groqKey) {
      this.providers.set('groq', new GroqProvider(groqKey));
    }
    if (openaiKey) {
      this.providers.set('openai', new OpenAIProvider(openaiKey));
    }
    if (anthropicKey) {
      this.providers.set('anthropic', new AnthropicProvider());
    }

    // Set default to first available provider
    if (this.providers.has('groq')) {
      this.defaultProvider = 'groq';
    } else if (this.providers.has('openai')) {
      this.defaultProvider = 'openai';
    } else if (this.providers.has('anthropic')) {
      this.defaultProvider = 'anthropic';
    }
  }

  async *generate_response(messages: any[], content_context?: any[], stream = false, provider?: string) {
    const startTime = Date.now();
    
    // Enhance messages with content context
    const enhancedMessages = this.enhanceMessagesWithContext(messages, content_context || []);
    
    // Determine provider to use
    const selectedProvider = provider || this.defaultProvider;
    const llmProvider = this.providers.get(selectedProvider);

    if (!llmProvider) {
      yield {
        chunk: `LLM provider '${selectedProvider}' not available. Please configure API keys.`,
        done: true,
        error: true,
        response_time_ms: Date.now() - startTime
      };
      return;
    }

    try {
      // Try primary provider
      for await (const chunk of llmProvider.generate(enhancedMessages, stream)) {
        if (chunk.done) {
          chunk.response_time_ms = Date.now() - startTime;
        }
        yield chunk;
      }
    } catch (error) {
      console.warn(`${selectedProvider} failed, trying fallback`);
      
      // Try fallback provider
      const fallbackProvider = selectedProvider === 'groq' ? 'openai' : 'groq';
      const fallback = this.providers.get(fallbackProvider);
      
      if (fallback) {
        try {
          for await (const chunk of fallback.generate(enhancedMessages, stream)) {
            if (chunk.done) {
              chunk.response_time_ms = Date.now() - startTime;
            }
            yield chunk;
          }
          return;
        } catch (fallbackError) {
          console.error(`Fallback ${fallbackProvider} also failed:`, fallbackError);
        }
      }

      // All providers failed
      yield {
        chunk: "I'm sorry, I'm experiencing technical difficulties. Please try again later.",
        done: true,
        error: true,
        response_time_ms: Date.now() - startTime
      };
    }
  }

  async analyze_content_gap(query: string, available_content: any[]) {
    // Simple content gap analysis
    const isGap = available_content.length === 0;
    
    return {
      is_gap: isGap,
      query,
      suggested_content_type: isGap ? this.suggestContentType(query) : null,
      confidence: isGap ? 0.8 : 0.2
    };
  }

  private enhanceMessagesWithContext(messages: any[], contentContext: any[]) {
    if (contentContext.length === 0) {
      return messages;
    }

    // Add context to the system message
    const contextText = contentContext
      .map(item => `Title: ${item.title}\nContent: ${item.content || item.description}`)
      .join('\n\n');

    const systemMessage = {
      role: 'system',
      content: `You are a helpful AI assistant with access to the following content from our CMS. Use this information to provide accurate, relevant answers:

${contextText}

Please provide helpful, accurate responses based on this content. If the question relates to tours, travel, or our services, reference the relevant content above.`
    };

    return [systemMessage, ...messages];
  }

  private suggestContentType(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('tour') || lowerQuery.includes('travel') || lowerQuery.includes('italy') || lowerQuery.includes('vacation')) {
      return 'tours';
    } else if (lowerQuery.includes('hotel') || lowerQuery.includes('accommodation')) {
      return 'hotels';
    } else if (lowerQuery.includes('guide') || lowerQuery.includes('help') || lowerQuery.includes('how to')) {
      return 'guides';
    } else if (lowerQuery.includes('blog') || lowerQuery.includes('article')) {
      return 'blogs';
    } else {
      return 'faqs';
    }
  }
}

export const llmService = new LLMService();