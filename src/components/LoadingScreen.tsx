
import React, { useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Loading } from '@/components/ui/loading';

export default function LoadingScreen() {
  const { currentFunFact, refreshFunFact } = useChat();
  
  // Change the fun fact every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshFunFact();
    }, 8000);
    
    return () => clearInterval(interval);
  }, [refreshFunFact]);
  
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] bg-maiFunFactBg">
      <div className="text-center max-w-md p-6">
        <div className="mb-8">
          <Loading size="lg" />
        </div>
        
        <h3 className="text-xl font-semibold mb-4 font-poppins">Thinking...</h3>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-amber-200">
          <h4 className="text-maiGold font-bold mb-2 text-sm">FUN FACT</h4>
          <p className="text-maiDarkText">{currentFunFact}</p>
        </div>
      </div>
    </div>
  );
}
