
import { supabase } from '@/integrations/supabase/client';

const IMAGE_RELATED_KEYWORDS = [
  'image', 'picture', 'photo', 'drawing', 'illustration', 
  'generate', 'create', 'make', 'draw', 'paint',
  'artwork', 'visual', 'render', 'show me'
];

export const isImageRequest = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return IMAGE_RELATED_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

export const calculateImageCost = async (): Promise<number> => {
  const { data: modelCost } = await supabase
    .from('model_costs')
    .select('*')
    .eq('model', 'image-alpha-001')
    .eq('active', true)
    .single();
    
  return modelCost ? Math.ceil(modelCost.out_cost * modelCost.markup * 100) : 40;
};
