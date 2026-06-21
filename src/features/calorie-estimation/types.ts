export type EditableMeal = {
  id: string;
  type: string;
  name: string;
  calories: number;
  servingDescription?: string;
  note?: string;
  calorieSource?: 'manual' | 'ai_estimated' | 'unknown';
  calorieEstimate?: {
    min: number;
    max: number;
    representative: number;
    confidence: 'low' | 'medium' | 'high';
    assumptions: string[];
    modelId: string;
    estimatedAt: string;
  };
};
