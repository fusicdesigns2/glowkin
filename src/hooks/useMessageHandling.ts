
import { useState } from 'react';
import { Thread, ChatMessage } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';
import { getActiveModelCost, calculateTokenCosts, saveMessage } from '@/utils/chatUtils';
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
      // Use native fetch instead of OpenAI SDK
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          prompt: prompt,
          n: 1,
          size: "1024x1024",
        })
      });

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;

      if (imageUrl) {
        const newMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: `Here is the image you requested:\n<download-image url="${imageUrl}" prompt="${prompt}"/>`,
          timestamp: new Date(),
          model: 'dall-e-3',
          input_tokens: 0,
          output_tokens: 0
        };

        const updatedMessages = [...currentThread.messages, newMessage];
        const updatedThread: Thread = { ...currentThread, messages: updatedMessages, lastUpdated: new Date() };

        setThreads(threads.map(thread => thread.id === currentThread.id ? updatedThread : thread));
        setCurrentThread(updatedThread);

        // Save message to database
        await saveMessage(
          currentThread.id,
          'assistant',
          newMessage.content,
          'dall-e-3',
          0,
          0,
          0,
          0
        );

        // Deduct credits for image generation
        if (credits !== undefined) {
          const imageCost = await calculateImageCost();
          const newCredits = credits - imageCost;
          updateCredits(newCredits);
        }
        toast.success("Image generated successfully!");
      } else {
        toast.error("Failed to generate image.");
      }
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

    setIsLoading(true);
    refreshFunFact();

    const threadSystemPrompt = currentThread.system_prompt || '';
    const model = threadModels[currentThread.id] || selectedModel;

    // Add user message first
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

    // Save user message to database
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

    // Check if the thread belongs to a project and combine system prompts if needed
    const handleSystemPrompt = async () => {
      let finalSystemPrompt = threadSystemPrompt;
      
      if (currentThread.project_id) {
        // Fetch the project to get its system prompt
        try {
          const { data: projectData } = await supabase
            .from('projects')
            .select('system_prompt')
            .eq('id', currentThread.project_id)
            .single();
          
          if (projectData && projectData.system_prompt) {
            // Combine project and thread system prompts if both exist
            if (threadSystemPrompt) {
              finalSystemPrompt = `${projectData.system_prompt}\n\n${threadSystemPrompt}`;
            } else {
              finalSystemPrompt = projectData.system_prompt;
            }
          }
        } catch (error) {
          console.error("Error fetching project system prompt:", error);
        }
      }
      
      return finalSystemPrompt;
    };
    
    const combinedSystemPrompt = await handleSystemPrompt();

    try {
      // Use native fetch instead of OpenAI SDK
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: combinedSystemPrompt || "You are a helpful assistant."
            },
            ...messagesWithUser.map(m => ({ 
              role: m.role, 
              content: m.content 
            }))
          ]
        })
      });

      const completion = await response.json();

      if (completion.choices && completion.choices.length > 0) {
        const aiMessage = completion.choices[0].message?.content;
        const inputTokens = completion.usage?.prompt_tokens || 0;
        const outputTokens = completion.usage?.completion_tokens || 0;

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

          // Save AI message to database
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

          // Deduct credits based on token usage
          const tokenCost = calculateTokenCosts(inputTokens, outputTokens, model);
          if (credits !== undefined) {
            const newCredits = credits - tokenCost;
            updateCredits(newCredits);
          }
        }
      } else {
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
