
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ModelCost } from '@/types/chat';

export const useCostPrediction = (model: string, messageContent: string = '') => {
  const [predictedCost, setPredictedCost] = useState<number | null>(null);
  const [predictionDate, setPredictionDate] = useState<Date | null>(null);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const formatPredictedCost = (cost: number | null) => {
    if (cost === null) return null;
    return Number(cost.toFixed(4)); // Round to 4 decimal places
  };

  useEffect(() => {
    const fetchPrediction = async () => {
      if (!model) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('model_costs')
        .select('predicted_cost, prediction_date')
        .eq('model', model)
        .eq('active', true)
        .single();

      if (error) {
        console.error('Error fetching prediction:', error);
        setIsLoading(false);
        return;
      }

      setPredictedCost(formatPredictedCost(data.predicted_cost));
      setPredictionDate(new Date(data.prediction_date));
      setIsLoading(false);

      // Check if prediction needs update (if prediction_date is not today)
      const today = new Date();
      const predDate = new Date(data.prediction_date);
      if (predDate.toDateString() !== today.toDateString()) {
        setNeedsUpdate(true);
        await updatePrediction(model);
      }
    };

    fetchPrediction();
  }, [model]);

  const updatePrediction = async (modelName: string) => {
    // Get the last 1000 messages for this model
    const { data: messages, error: fetchError } = await supabase
      .from('chat_messages')
      .select('credit_cost')
      .eq('model', modelName)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (fetchError) {
      console.error('Error fetching messages:', fetchError);
      return;
    }

    if (!messages.length) return;

    // Calculate average cost
    const totalCost = messages.reduce((sum, msg) => sum + (msg.credit_cost || 0), 0);
    const averageCost = Math.ceil(totalCost / messages.length);

    // Update the model_costs table
    const { error: updateError } = await supabase
      .from('model_costs')
      .update({
        predicted_cost: formatPredictedCost(averageCost),
        prediction_date: new Date().toISOString()
      })
      .eq('model', modelName)
      .eq('active', true);

    if (updateError) {
      console.error('Error updating prediction:', updateError);
      return;
    }

    setPredictedCost(formatPredictedCost(averageCost));
    setPredictionDate(new Date());
    setNeedsUpdate(false);
  };

  return {
    predictedCost,
    predictionDate,
    needsUpdate,
    isLoading
  };
};
