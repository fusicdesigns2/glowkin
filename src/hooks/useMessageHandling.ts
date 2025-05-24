
import { useState } from 'react';
import { Thread, ChatMessage } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';
import { calculateTokenCosts, saveMessage } from '@/utils/chatUtils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { calculateImageCost } from '@/utils/imageUtils';

export const useMessageHandling = (
  threads: Thread[],
  setThreads: React.Dispatch<React.SetStateAction<Thread[]>>,
  currentThread: Thread | null,
  setCurrentThread: React.Dispatch<React.SetStateAction<Thread | null>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  refreshFunFact: () => void,
  threadModels: Record<string, string>,
  selectedModel: string,
  createNewThread: (projectId?: string) => Promise<Thread | null>,
  updateCredits: (newCredits: number) => void,
  userId?: string,
  credits?: number
) => {
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [imageConfirmOpen, setImageConfirmOpen] = useState(false);
  const [messageToProcess, setMessageToProcess] = useState('');

  const handleImageGeneration = async () => {
    setImageConfirmOpen(false);
    await generateImage(messageToProcess);
    setMessageToProcess('');
  };

  const handleCancelImageGeneration = () => {
    setImageConfirmOpen(false);
    sendMessageToAI(messageToProcess);
    setMessageToProcess('');
  };

  const generateImage = async (prompt: string) => {
    if (!currentThread) return;

    setIsLoading(true);
    try {
      setErrorDialogOpen(true);
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error(`Failed to generate image: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessageToAI = async (content: string) => {
    if (!userId) return;
    if (!currentThread) return;

    console.log('Starting sendMessageToAI for thread:', currentThread.id);
    console.log('Thread project_id:', currentThread.project_id);

    setIsLoading(true);
    refreshFunFact();

    const threadSystemPrompt = currentThread.system_prompt || '';
    const model = threadModels[currentThread.id] || selectedModel || 'gpt-4o-mini';

    console.log('Using model:', model);
    console.log('Thread system prompt:', threadSystemPrompt);

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: content,
      timestamp: new Date(),
      model: model,
      input_tokens: 0,
      output_tokens: 0
    };

    const messagesWithUser = [...currentThread.messages, userMessage];
    const updatedThreadWithUser: Thread = { 
      ...currentThread, 
      messages: messagesWithUser, 
      lastUpdated: new Date() 
    };

    setThreads(threads.map(thread => thread.id === currentThread.id ? updatedThreadWithUser : thread));
    setCurrentThread(updatedThreadWithUser);

    await saveMessage(
      currentThread.id,
      'user',
      content,
      model,
      0,
      0,
      0,
      0
    );

    const handleSystemPrompt = async () => {
      let finalSystemPrompt = threadSystemPrompt;
      
      if (currentThread.project_id) {
        console.log('Thread belongs to project, fetching project system prompt');
        try {
          const { data: projectData } = await supabase
            .from('projects')
            .select('system_prompt')
            .eq('id', currentThread.project_id)
            .single();
          
          console.log('Project data:', projectData);
          
          if (projectData && projectData.system_prompt) {
            if (threadSystemPrompt) {
              finalSystemPrompt = `${projectData.system_prompt}\n\n${threadSystemPrompt}`;
            } else {
              finalSystemPrompt = projectData.system_prompt;
            }
            console.log('Combined system prompt:', finalSystemPrompt);
          }
        } catch (error) {
          console.error("Error fetching project system prompt:", error);
        }
      }
      
      return finalSystemPrompt;
    };
    
    const combinedSystemPrompt = await handleSystemPrompt();

    try {
      console.log('Making OpenAI API call with combined system prompt');
      
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          messages: [
            {
              role: "system",
              content: combinedSystemPrompt || "You are a helpful assistant."
            },
            ...messagesWithUser.map(m => ({ 
              role: m.role, 
              content: m.content 
            }))
          ],
          model: model
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        toast.error(`Failed to send message: ${error.message}`);
        return;
      }

      console.log('Received response from edge function:', data);

      if (data?.choices && data.choices.length > 0) {
        const aiMessage = data.choices[0].message?.content;
        const inputTokens = data.usage?.prompt_tokens || 0;
        const outputTokens = data.usage?.completion_tokens || 0;

        console.log('Received AI response:', aiMessage);
        console.log('Token usage - input:', inputTokens, 'output:', outputTokens);

        if (aiMessage) {
          const newMessage: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: aiMessage,
            timestamp: new Date(),
            model: model,
            input_tokens: inputTokens,
            output_tokens: outputTokens
          };

          const updatedMessages = [...messagesWithUser, newMessage];
          const updatedThread: Thread = { ...currentThread, messages: updatedMessages, lastUpdated: new Date() };

          setThreads(threads.map(thread => thread.id === currentThread.id ? updatedThread : thread));
          setCurrentThread(updatedThread);

          await saveMessage(
            currentThread.id,
            'assistant',
            aiMessage,
            model,
            inputTokens,
            outputTokens,
            0,
            0
          );

          const tokenCost = calculateTokenCosts(inputTokens, outputTokens, model);
          if (credits !== undefined) {
            const newCredits = credits - tokenCost;
            updateCredits(newCredits);
          }
          
          console.log('Message handling completed successfully');
        }
      } else {
        console.error('No response from AI or unexpected format:', data);
        toast.error("No response from AI.");
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(`Failed to send message: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string, estimatedCost: number, model: string) => {
    if (!userId) return;
    if (!currentThread) return;
    if (credits === undefined || credits < estimatedCost) {
      toast.error("Insufficient credits.");
      return;
    }

    const lowerCaseContent = content.toLowerCase();
    const imageKeywords = ['image', 'draw', 'picture', 'generate', 'create', 'dall-e', 'dalle'];

    if (imageKeywords.some(keyword => lowerCaseContent.includes(keyword))) {
      setMessageToProcess(content);
      setImageConfirmOpen(true);
    } else {
      sendMessageToAI(content);
    }
  };

  return {
    sendMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    imageConfirmOpen,
    setImageConfirmOpen,
    handleImageGeneration,
    handleCancelImageGeneration
  };
};
