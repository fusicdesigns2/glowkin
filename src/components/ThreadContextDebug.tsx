
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ThreadContextDebugProps {
  threadId?: string;
}

const ThreadContextDebug: React.FC<ThreadContextDebugProps> = ({ threadId }) => {
  const [contextData, setContextData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchContextData = async () => {
    if (!threadId) {
      setError('No thread ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('context_data')
        .eq('id', threadId)
        .single();

      if (error) {
        setError(`Error fetching context data: ${error.message}`);
        toast({
          title: 'Error',
          description: `Failed to fetch thread context: ${error.message}`,
          variant: 'destructive'
        });
        return;
      }

      setContextData(data?.context_data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Exception: ${message}`);
      toast({
        title: 'Error',
        description: `Exception while fetching thread context: ${message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (threadId) {
      fetchContextData();
    }
  }, [threadId]);

  if (!threadId) {
    return <div className="text-sm text-gray-500">No thread selected</div>;
  }

  return (
    <div className="p-4 border rounded-md bg-gray-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Thread Context Debug</h3>
        <Button variant="outline" size="sm" onClick={fetchContextData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
      
      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
      
      {contextData === null ? (
        <div className="text-xs text-gray-400">Loading context data...</div>
      ) : contextData.length === 0 ? (
        <div className="text-xs text-amber-600">No context data found for this thread</div>
      ) : (
        <div className="text-xs overflow-auto max-h-40">
          <div className="font-medium mb-1">Context Data Items: {contextData.length}</div>
          <pre className="bg-gray-100 p-2 rounded text-[10px] overflow-x-auto">
            {JSON.stringify(contextData, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-2 text-[10px] text-gray-500">
        Thread ID: {threadId}
      </div>
    </div>
  );
};

export default ThreadContextDebug;
