import { ExternalLink, Calendar, MapPin, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ContentCardProps {
  content: {
    title?: string;
    description?: string;
    image?: string;
    price?: string;
    location?: string;
    category?: string;
    date?: string;
    url?: string;
  };
}

export function ContentCard({ content }: ContentCardProps) {
  const {
    title = "Untitled Content",
    description = "No description available",
    image,
    price,
    location,
    category,
    date,
    url
  } = content;

  return (
    <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow" data-testid={`content-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {image && (
        <img 
          src={image} 
          alt={title}
          className="w-full h-24 object-cover"
          loading="lazy"
        />
      )}
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h5 className="font-medium text-foreground text-sm line-clamp-2">{title}</h5>
            {category && (
              <Badge variant="secondary" className="ml-2 text-xs">{category}</Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-3">
              {location && (
                <span className="flex items-center" data-testid="content-location">
                  <MapPin className="h-3 w-3 mr-1" />
                  {location}
                </span>
              )}
              {date && (
                <span className="flex items-center" data-testid="content-date">
                  <Calendar className="h-3 w-3 mr-1" />
                  {date}
                </span>
              )}
            </div>
            
            {price && (
              <span className="flex items-center font-medium text-primary" data-testid="content-price">
                <DollarSign className="h-3 w-3 mr-1" />
                {price}
              </span>
            )}
          </div>
          
          {url && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => window.open(url, '_blank')}
              data-testid="button-view-details"
            >
              View Details <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
