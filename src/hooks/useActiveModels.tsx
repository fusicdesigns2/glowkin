
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ModelCost } from '@/types/chat';

export const useActiveModels = () => {
  return useQuery({
    queryKey: ['activeModels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_costs')
        .select('*')
        .eq('active', true)
        .order('model');

      if (error) throw error;
      
      // Convert the date string to Date object to match ModelCost type
      return data.map(model => ({
        ...model,
        date: new Date(model.date)
      })) as ModelCost[];
    }
  });
};
