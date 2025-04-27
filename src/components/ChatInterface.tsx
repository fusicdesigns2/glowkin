import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from './LoadingScreen';
import { getActiveModelCost, calculateTokenCosts } from '@/utils/chatUtils';
import { ModelCost } from '@/types/chat';
import ReactMarkdown from 'react-markdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveModels } from '@/hooks/useActiveModels';
import { useCostPrediction } from '@/hooks/useCostPrediction';
import { Menu } from 'lucide-react';

export default function ChatInterface() {
  const { currentThread, sendMessage, isLoading, getMessageCostEstimate } = useChat();
  const { user, profile } = useAuth();
  const [message, setMessage] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [modelCosts, setModelCosts] = useState<Record<string, ModelCost>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const { data: activeModels, isLoading: isLoadingModels } = useActiveModels();
  const { predictedCost, predictionDate } = useCostPrediction(selectedModel, message);

  useEffect(() => {
    if (activeModels && activeModels.length > 0) {
      const cheapestModel = [...activeModels].sort((a, b) => a.out_cost - b.out_cost)[0];
      setSelectedModel(cheapestModel.model);
    }
  }, [activeModels]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentThread?.messages]);

  useEffect(() => {
    if (message.trim()) {
      const cost = getMessageCostEstimate(message);
      setEstimatedCost(cost);
    } else {
      setEstimatedCost(0);
    }
  }, [message, getMessageCostEstimate]);

  useEffect(() => {
    const fetchModelCosts = async () => {
      if (!currentThread?.messages) return;
      
      const costs: Record<string, ModelCost> = {};
      for (const msg of currentThread.messages) {
        if (msg.role === 'assistant' && msg.model && !costs[msg.model]) {
          const cost = await getActiveModelCost(msg.model);
          if (cost) {
            costs[msg.model] = cost;
          }
        }
      }
      setModelCosts(costs);
    };

    fetchModelCosts();
  }, [currentThread?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !profile) return;
    
    if (!selectedModel && activeModels && activeModels.length > 0) {
      await sendMessage(message.trim(), estimatedCost, activeModels[0].model);
    } else {
      await sendMessage(message.trim(), estimatedCost, selectedModel);
    }
    setMessage('');
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <Card className="w-full max-w-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Join Mai Mai</h2>
          <p className="mb-6 text-gray-700">
            Sign in or create an account to start chatting with our AI. 
            New users get 5 free credits!
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => window.location.href = "/login"}>
              Log in
            </Button>
            <Button className="bg-maiRed hover:bg-red-600" onClick={() => window.location.href = "/register"}>
              Sign up
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col h-[80vh]">
      <div className="flex-grow overflow-auto p-4 bg-[#0000FF]/5 flex">
        <div className="flex-grow pr-5">
          {currentThread?.messages && currentThread.messages.length > 0 ? (
            <div className="space-y-4">
              {currentThread.messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-[#0000FF]/50 text-black font-bold rounded-tr-none' 
                        : 'bg-white border border-gray-200 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <ReactMarkdown 
                      className="prose prose-sm max-w-none" 
                      components={{
                        p: ({node, ...props}) => (
                          <p className="my-4" {...props} />
                        ),
                        img: ({node, ...props}) => (
                          <img 
                            {...props} 
                            className="max-w-full rounded-lg shadow-sm" 
                            alt={props.alt || 'Generated image'} 
                          />
                        )
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    
                    <div className={`text-xs mt-1 flex items-center gap-2 flex-wrap ${
                      msg.role === 'user' 
                        ? 'text-black' 
                        : 'text-gray-500'
                    }`}>
                      {msg.role === 'assistant' && (
                        <>
                          <Badge variant="secondary" className="text-xs">
                            {msg.model || 'unknown model'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            in: {msg.input_tokens || 0} / out: {msg.output_tokens || 0} tokens
                          </Badge>
                          {msg.model && modelCosts[msg.model] && (
                            <Badge variant="outline" className="text-xs">
                              cost: ${(calculateTokenCosts(
                                msg.input_tokens || 0,
                                msg.output_tokens || 0,
                                modelCosts[msg.model]
                              )).toFixed(10)}
                            </Badge>
                          )}
                        </>
                      )}
                      <span className="text-black">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <h3 className="text-xl font-semibold mb-2">Welcome to Mai Mai!</h3>
              <p className="mb-4">Ask me anything, and I'll do my best to help.</p>
              <p className="text-sm">You have {profile?.credits} credits available</p>
            </div>
          )}
        </div>
        <div className="w-[5px] bg-[#403E43]"></div>
      </div>

      <div className="p-4 bg-[#403E43]">
        <form onSubmit={handleSendMessage} className="flex flex-col space-y-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <Textarea
            placeholder="Ask your question..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px] resize-none bg-white text-black border-gray-700 focus:ring-white/20" 
          />
          
          <div className="flex justify-between items-center">
            <div className="text-sm space-y-1">
              {estimatedCost > 0 && (
                <span className={`${profile && profile.credits >= estimatedCost ? 'text-gray-300' : 'text-red-500'}`}>
                  Estimated cost: <strong>{estimatedCost} credits</strong>
                  {profile && profile.credits < estimatedCost && ' (insufficient credits)'}
                </span>
              )}
              {predictedCost !== null && (
                <div className="text-gray-300 text-xs">
                  Average cost for {selectedModel}: {predictedCost} credits
                  {predictionDate && (
                    <span className="ml-1">
                      (predicted on {predictionDate.toLocaleDateString()})
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
                disabled={isLoadingModels}
              >
                <SelectTrigger className="w-[300px] bg-white text-black border-gray-700">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {activeModels?.map((model) => (
                    <SelectItem key={model.model} value={model.model}>
                      {model.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                type="submit" 
                className="bg-maiRed hover:bg-red-600"
                disabled={!message.trim() || !profile || profile.credits < estimatedCost || !selectedModel}
              >
                Send
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
