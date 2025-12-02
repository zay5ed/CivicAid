export interface Incident {
    id?: string;
    description: string;
    location: { lat: number; lng: number };
    severity: 'RED' | 'YELLOW' | 'GREEN';
    status: 'OPEN' | 'ASSIGNED' | 'RESOLVED';
    reporter_id: string;
    created_at: any;
    ai_analysis?: {
      summary: string;
      hazards: string[];
      responder_tips: string[];
    };
  }