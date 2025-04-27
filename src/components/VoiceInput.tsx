
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

const VoiceInput = ({ onTranscription, disabled }: VoiceInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onload = async () => {
          if (typeof reader.result === 'string') {
            const base64Audio = reader.result.split(',')[1];
            try {
              const { data, error } = await supabase.functions.invoke('voice-to-text', {
                body: { audio: base64Audio }
              });

              if (error) throw error;
              if (data.text) {
                onTranscription(data.text);
              }
            } catch (error) {
              console.error('Transcription error:', error);
              toast({
                title: "Error",
                description: "Failed to transcribe audio. Please try again.",
                variant: "destructive"
              });
            }
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak now... Click the button again to stop recording.",
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check your permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      toast({
        title: "Processing",
        description: "Converting your speech to text...",
      });
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`${isRecording ? 'text-red-500 animate-pulse' : ''}`}
      onClick={toggleRecording}
      disabled={disabled}
    >
      {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
    </Button>
  );
};

export default VoiceInput;
