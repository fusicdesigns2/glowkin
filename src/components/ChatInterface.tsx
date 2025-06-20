import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from './LoadingScreen';
import VoiceInput from './VoiceInput';
import { getActiveModelCost, calculateTokenCosts } from '@/utils/chatUtils';
import { ModelCost, KeyInfo } from '@/types/chat';
import ReactMarkdown from 'react-markdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveModels } from '@/hooks/useActiveModels';
import { useCostPrediction } from '@/hooks/useCostPrediction';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon, Download, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import ImageDownload from './ImageDownload';
import KeyInfoDisplay from './KeyInfoDisplay';
import ProjectThreadSystemPrompt from './ProjectThreadSystemPrompt';

export default function ChatInterface() {
  const { 
    currentThread, 
    sendMessage, 
    isLoading, 
    getMessageCostEstimate,
    setSelectedModel
  } = useChat();
  const { user, profile } = useAuth();
  const [message, setMessage] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [modelCosts, setModelCosts] = useState<Record<string, ModelCost>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: activeModels, isLoading: isLoadingModels } = useActiveModels();
  const [selectedModelState, setSelectedModelState] = useState<string>('');
  const [textareaHeight, setTextareaHeight] = useState<string>('100px');
  const { predictedCost, predictionDate } = useCostPrediction(selectedModelState, message);
  const [showKeyInfo, setShowKeyInfo] = useState<Record<string, boolean>>({});
  
  // Check if this is a new thread with no messages
  const isNewThread = currentThread?.messages?.length === 0;

  useEffect(() => {
    if (activeModels && activeModels.length > 0 && !selectedModelState) {
      const cheapestModel = [...activeModels].sort((a, b) => a.out_cost - b.out_cost)[0];
      setSelectedModelState(cheapestModel.model);
      setSelectedModel(cheapestModel.model);
    }
  }, [activeModels, setSelectedModel, selectedModelState]);

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [currentThread?.messages]);

  useEffect(() => {
    const estimateCost = async () => {
      if (message.trim()) {
        try {
          const cost = await getMessageCostEstimate(message, selectedModelState);
          setEstimatedCost(cost);
        } catch (error) {
          console.error("Error estimating cost:", error);
          setEstimatedCost(0);
        }
      } else {
        setEstimatedCost(0);
      }
    };

    estimateCost();
  }, [message, getMessageCostEstimate, selectedModelState]);

  useEffect(() => {
    const fetchModelCosts = async () => {
      if (!currentThread?.messages) return;
      
      const costs: Record<string, ModelCost> = {};
      for (const msg of currentThread.messages) {
        if (msg.role === 'assistant' && msg.model && !costs[msg.model]) {
          const cost = await getActiveModelCost(msg.model);
          if (cost) {
            costs[msg.model] = {
              ...cost,
              date: new Date(cost.date),
              prediction_date: cost.prediction_date ? new Date(cost.prediction_date) : undefined
            };
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
    
    if (!selectedModelState && activeModels && activeModels.length > 0) {
      await sendMessage(message.trim(), estimatedCost, activeModels[0].model);
    } else {
      await sendMessage(message.trim(), estimatedCost, selectedModelState);
    }
    setMessage('');
  };

  const handleVoiceInput = (transcription: string) => {
    setMessage(transcription);
  };

  const handleModelChange = (model: string) => {
    setSelectedModelState(model);
    setSelectedModel(model);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !isLoading && profile && profile.credits >= estimatedCost) {
        handleSendMessage(e);
      }
    }
  };

  // Toggle display of key info for a specific message
  const toggleKeyInfo = (messageId: string) => {
    setShowKeyInfo(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  // Handle textarea resizing
  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Automatically adjust textarea height based on content
    const textarea = e.target;
    textarea.style.height = 'auto'; // Reset height to recalculate
    textarea.style.height = `${Math.max(100, Math.min(300, textarea.scrollHeight))}px`;
    setMessage(e.target.value);
  };

  // Custom renderer to handle the download-image tag in markdown
  const customRenderers = {
    p: ({node, ...props}: any) => (
      <p className={`my-4 ${props.className || ''}`} {...props} />
    ),
    img: ({node, ...props}: any) => (
      <img 
        {...props} 
        className="max-w-full rounded-lg shadow-sm" 
        alt={props.alt || 'Generated image'} 
      />
    ),
    // Process custom download-image tags
    element: ({node, ...props}: any) => {
      if (node.tagName === 'download-image') {
        const url = node.properties.url;
        const prompt = node.properties.prompt;
        return <ImageDownload imageUrl={url} prompt={prompt} />;
      }
      return <>{props.children}</>;
    }
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
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-auto p-4 bg-[#403E43]">
        <div className="flex-grow">
          {currentThread?.messages && currentThread.messages.length > 0 ? (
            <div className="space-y-4">
              {currentThread.messages.map((msg) => {
                // Process the message content to replace download-image tags
                let processedContent = msg.content;
                const downloadImageMatch = processedContent.match(/<download-image url="([^"]+)" prompt="([^"]+)"\/>/);
                
                if (downloadImageMatch) {
                  const [fullMatch, imageUrl, prompt] = downloadImageMatch;
                  // Keep the image but remove the tag for rendering
                  processedContent = processedContent.replace(fullMatch, '');
                }
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user' 
                          ? 'bg-sidebar-accent text-black rounded-tr-none' 
                          : 'bg-white border border-gray-200 rounded-tl-none shadow-sm'
                      }`}
                    >
                      <ReactMarkdown 
                        className="prose prose-sm max-w-none" 
                        components={customRenderers}
                      >
                        {processedContent}
                      </ReactMarkdown>
                      
                      {/* Extract and render the download button if needed */}
                      {msg.content.includes('<download-image') && (
                        <div className="mt-2">
                          {msg.content.match(/<download-image url="([^"]+)" prompt="([^"]+)"\/>/g)?.map((tag, index) => {
                            const urlMatch = tag.match(/url="([^"]+)"/);
                            const promptMatch = tag.match(/prompt="([^"]+)"/);
                            
                            if (urlMatch && promptMatch) {
                              return (
                                <ImageDownload 
                                  key={index}
                                  imageUrl={urlMatch[1]} 
                                  prompt={promptMatch[1]} 
                                />
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                      
                      <div className={`text-xs mt-1 flex items-center gap-2 flex-wrap ${
                        msg.role === 'user' 
                          ? 'text-gray-500' 
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
                                cost: ${calculateTokenCosts(
                                  msg.input_tokens || 0,
                                  msg.output_tokens || 0,
                                  msg.model
                                ).toFixed(10)}
                              </Badge>
                            )}
                            {msg.summary && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-help inline-flex items-center">
                                      <InfoIcon className="h-3 w-3 mr-1" />
                                      <span className="text-xs">Summary available</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">{msg.summary}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </>
                        )}
                        <span className="text-xs">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                        
                        {/* Key Info Button - only for user messages with keyInfo */}
                        {msg.role === 'user' && msg.keyInfo && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 p-1 text-xs flex items-center" 
                            onClick={() => toggleKeyInfo(msg.id)}
                          >
                            <MessageSquareText className="h-3 w-3 mr-1" />
                            {showKeyInfo[msg.id] ? 'Hide Details' : 'Show Details'}
                          </Button>
                        )}
                      </div>

                      {/* Display Key Info when expanded */}
                      {msg.keyInfo && showKeyInfo[msg.id] && (
                        <div className="mt-2 p-2 bg-gray-100 rounded-md text-xs border border-gray-300">
                          <KeyInfoDisplay keyInfo={msg.keyInfo} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-300">
              <h3 className="text-xl font-semibold mb-2">Welcome to Mai Mai!</h3>
              <p className="mb-4">Ask me anything, and I'll do my best to help.</p>
              {currentThread?.system_prompt && (
                <div className="mb-4 p-3 bg-blue-900/30 rounded-lg max-w-xl">
                  <p className="text-sm text-gray-200 font-medium mb-1">System Prompt:</p>
                  {currentThread.project_id ? (
                    <div className="space-y-2">
                      <ProjectThreadSystemPrompt threadId={currentThread.id} />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-300">{currentThread.system_prompt}</p>
                  )}
                </div>
              )}
              <p className="text-sm">You have {profile?.credits} credits available</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-[#403E43] border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="flex flex-col space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-grow relative">
              <Textarea
                placeholder="Ask your question... (Press Enter to send)"
                value={message}
                onChange={handleTextareaResize}
                onKeyDown={handleKeyDown}
                className={`min-h-[${textareaHeight}] resize-y bg-white text-black border-gray-700 focus:ring-white/20 pr-20`}
                style={{ height: textareaHeight, maxHeight: '300px' }}
              />
              <div className="absolute bottom-2 right-2">
                <VoiceInput
                  onTranscription={handleVoiceInput}
                  disabled={isLoading}
                />
              </div>
            </div>
            <Select
              value={selectedModelState}
              onValueChange={handleModelChange}
              disabled={isLoadingModels}
            >
              <SelectTrigger className="w-[250px] bg-white text-black border-gray-700">
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
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm space-y-1">
              {estimatedCost > 0 && (
                <span className={`${profile && profile.credits >= estimatedCost ? 'text-gray-300' : 'text-red-500'}`}>
                  Estimated cost: <strong>{estimatedCost} credits</strong>
                  {profile && profile.credits < estimatedCost && ' (insufficient credits)'}
                </span>
              )}
              {predictedCost !== null && (
                <div className="text-white/70 text-xs">
                  Average cost for {selectedModelState}: {predictedCost} credits
                  {predictionDate && (
                    <span className="ml-1">
                      (predicted on {predictionDate.toLocaleDateString()})
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                type="submit" 
                className="bg-maiRed hover:bg-red-600"
                disabled={!message.trim() || !profile || profile.credits < estimatedCost || !selectedModelState}
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
