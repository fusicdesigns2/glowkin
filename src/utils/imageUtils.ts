
import { supabase } from '@/integrations/supabase/client';

const IMAGE_RELATED_KEYWORDS = [
  'image', 'picture', 'photo', 'drawing', 'illustration', 
  'generate', 'create', 'make', 'draw', 'paint',
  'artwork', 'visual', 'render', 'show me',
  'dall-e', 'dalle', 'AI image'
];

export const isImageRequest = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  
  // Check for direct image creation phrases
  if (lowerText.includes('create an image') || 
      lowerText.includes('generate an image') || 
      lowerText.includes('make an image') ||
      lowerText.includes('draw') ||
      lowerText.includes('show me a picture') ||
      lowerText.includes('visualize')) {
    return true;
  }
  
  // Count how many image-related keywords appear in the text
  const keywordMatches = IMAGE_RELATED_KEYWORDS.filter(keyword => 
    lowerText.includes(keyword)
  ).length;
  
  // If multiple image keywords are present, it's likely an image request
  return keywordMatches >= 2;
};

export const calculateImageCost = async (): Promise<number> => {
  try {
    const { data: modelCost, error } = await supabase
      .from('model_costs')
      .select('*')
      .eq('model', 'image-alpha-001')
      .eq('active', true)
      .single();
      
    if (error) {
      console.error('Error fetching image cost:', error);
      return 40; // Default fallback cost
    }
      
    return modelCost ? Math.ceil(modelCost.out_cost * modelCost.markup * 100) : 40;
  } catch (error) {
    console.error('Exception in calculateImageCost:', error);
    return 40; // Default fallback cost
  }
};
