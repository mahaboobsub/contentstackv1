import { spawn } from 'child_process';
import { promisify } from 'util';

export class MCPService {
  private apiKey: string;
  private deliveryToken: string;
  private managementToken: string;
  private environment: string;
  private launchProjectId: string;

  constructor() {
    this.apiKey = process.env.CONTENTSTACK_API_KEY || '';
    this.deliveryToken = process.env.CONTENTSTACK_DELIVERY_TOKEN || '';
    this.managementToken = process.env.CONTENTSTACK_MANAGEMENT_TOKEN || '';
    this.environment = process.env.CONTENTSTACK_ENVIRONMENT || 'development';
    this.launchProjectId = process.env.CONTENTSTACK_LAUNCH_PROJECT_ID || '';
  }

  async fetch_content(content_type: string, query?: string): Promise<any[]> {
    if (!this.apiKey || !this.deliveryToken) {
      console.warn('Contentstack credentials not configured, returning demo data');
      return this.getDemoContent(content_type, query);
    }

    try {
      const result = await this.executeMCPCommand('fetch_content', {
        content_type,
        query,
        environment: this.environment,
        api_key: this.apiKey,
        delivery_token: this.deliveryToken
      });
      
      return result?.entries || [];
    } catch (error) {
      console.error('MCP fetch_content error:', error);
      return this.getDemoContent(content_type, query);
    }
  }

  async search_content(query: string, content_types?: string[]): Promise<any[]> {
    if (!this.apiKey || !this.deliveryToken) {
      console.warn('Contentstack credentials not configured, returning demo data');
      return this.getDemoSearchResults(query, content_types);
    }

    try {
      const result = await this.executeMCPCommand('search_content', {
        query,
        content_types,
        environment: this.environment,
        api_key: this.apiKey,
        delivery_token: this.deliveryToken
      });
      
      return result?.entries || [];
    } catch (error) {
      console.error('MCP search_content error:', error);
      return this.getDemoSearchResults(query, content_types);
    }
  }

  async create_draft_content(content_type: string, title: string, data: any): Promise<any> {
    if (!this.apiKey || !this.managementToken) {
      console.warn('Contentstack management credentials not configured, returning demo response');
      return {
        uid: `demo_${Date.now()}`,
        title,
        content_type,
        data,
        status: 'draft'
      };
    }

    try {
      const result = await this.executeMCPCommand('create_draft_content', {
        content_type,
        title,
        data,
        environment: this.environment,
        api_key: this.apiKey,
        management_token: this.managementToken
      });
      
      return result;
    } catch (error) {
      console.error('MCP create_draft_content error:', error);
      return {
        uid: `demo_${Date.now()}`,
        title,
        content_type,
        data,
        status: 'draft',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeMCPCommand(command: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const child = spawn('npx', ['-y', '@contentstack/mcp', command, JSON.stringify(params)], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse MCP response: ${parseError instanceof Error ? parseError.message : 'Parse error'}`));
          }
        } else {
          reject(new Error(`MCP command failed: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private getDemoContent(content_type: string, query?: string): any[] {
    const demoData = {
      tours: [
        {
          uid: 'tour_italy_rome',
          title: 'Rome City Tour',
          description: 'Explore the eternal city with our comprehensive Rome city tour. Visit the Colosseum, Vatican City, and historic landmarks.',
          price: 89,
          duration: '8 hours',
          location: 'Rome, Italy',
          highlights: ['Colosseum', 'Vatican Museums', 'Sistine Chapel', 'Roman Forum'],
          content: 'Experience the best of Rome in a full day tour. Our expert guides will take you through ancient Roman history, renaissance art, and modern Italian culture.'
        },
        {
          uid: 'tour_italy_venice',
          title: 'Venice Canals Experience',
          description: 'Navigate the romantic waterways of Venice with our gondola tour and walking experience.',
          price: 120,
          duration: '6 hours', 
          location: 'Venice, Italy',
          highlights: ['Gondola Ride', 'St. Marks Square', 'Doge\'s Palace', 'Rialto Bridge'],
          content: 'Discover Venice\'s unique architecture and rich maritime history. Includes gondola ride, guided walking tour, and traditional Venetian lunch.'
        },
        {
          uid: 'tour_italy_tuscany',
          title: 'Tuscany Wine Trail',
          description: 'Sample the finest Tuscan wines while exploring charming countryside villages and vineyards.',
          price: 150,
          duration: '10 hours',
          location: 'Tuscany, Italy',
          highlights: ['Wine Tasting', 'Vineyard Tours', 'Chianti Region', 'Traditional Lunch'],
          content: 'A perfect day trip through Tuscany\'s wine country. Visit family-owned vineyards, learn about wine making, and enjoy authentic Tuscan cuisine.'
        }
      ],
      hotels: [
        {
          uid: 'hotel_rome_luxury',
          title: 'Luxury Rome Hotel',
          description: 'Five-star accommodation in the heart of Rome',
          price: 250,
          location: 'Rome, Italy'
        }
      ],
      guides: [
        {
          uid: 'guide_italy_travel',
          title: 'Italy Travel Guide',
          description: 'Complete guide to traveling in Italy',
          content: 'Everything you need to know about visiting Italy, from best times to visit to local customs.'
        }
      ],
      blogs: [
        {
          uid: 'blog_italy_food',
          title: 'Best Italian Food Experiences',
          description: 'Guide to authentic Italian cuisine',
          content: 'Discover the best restaurants, local dishes, and food experiences across Italy.'
        }
      ]
    };

    const contentTypeData = demoData[content_type as keyof typeof demoData] || [];
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      return contentTypeData.filter(item => 
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        ((item as any).content && (item as any).content.toLowerCase().includes(lowerQuery))
      );
    }
    
    return contentTypeData;
  }

  private getDemoSearchResults(query: string, content_types?: string[]): any[] {
    const searchTypes = content_types || ['tours', 'hotels', 'guides', 'blogs'];
    let results: any[] = [];

    for (const type of searchTypes) {
      const typeResults = this.getDemoContent(type, query);
      results = results.concat(typeResults.map(item => ({ ...item, content_type: type })));
    }

    return results;
  }
}

export const mcpService = new MCPService();