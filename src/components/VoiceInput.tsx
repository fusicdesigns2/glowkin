
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

const VoiceInput = ({ onTranscription, disabled }: VoiceInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [hasCheckedConsent, setHasCheckedConsent] = useState(false);
  const [showMicPermission, setShowMicPermission] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    const checkConsent = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('whisper_consent')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error checking consent:', error);
          return;
        }
        
        setHasCheckedConsent(true);
        if (data && !data.whisper_consent) {
          setShowConsent(true);
        }
      } catch (error) {
        console.error('Failed to check consent status:', error);
      }
    };
    
    if (user && !hasCheckedConsent) {
      checkConsent();
    }
  }, [user, hasCheckedConsent]);

  const handleConsent = async (consent: boolean) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          whisper_consent: true,
          whisper_consent_date: consent ? new Date().toISOString() : null
        })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error saving consent:', error);
        toast({
          title: "Error",
          description: "Could not save your preference. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      setShowConsent(false);
      
      if (consent) {
        requestMicrophonePermission();
      }
    } catch (error) {
      console.error('Failed to save consent:', error);
      toast({
        title: "Error",
        description: "Could not save your preference. Please try again.",
        variant: "destructive"
      });
    }
  };

  const requestMicrophonePermission = async () => {
    setShowMicPermission(true);
  };

  const handleMicrophonePermission = async (granted: boolean) => {
    setShowMicPermission(false);
    if (granted) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        initiateCountdown();
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast({
          title: "Error",
          description: "Could not access microphone. Please check your permissions.",
          variant: "destructive"
        });
      }
    }
  };

  const initiateCountdown = () => {
    setShowCountdown(true);
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setShowCountdown(false);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

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
              const { data: modelData, error: modelError } = await supabase
                .from('model_costs')
                .select('*')
                .eq('model', 'whisper-1')
                .single();
                
              if (modelError) throw modelError;
              
              const secondsUsed = Math.ceil(recordingTime / 1000);
              const estimatedCost = modelData ? 
                (modelData.in_cost * secondsUsed * (modelData.markup || 1)) : 
                0.01 * secondsUsed; // Default fallback cost
              
              const { data, error } = await supabase.functions.invoke('voice-to-text', {
                body: { audio: base64Audio }
              });

              if (error) throw error;
              if (data.text) {
                onTranscription(data.text);
                
                try {
                  await supabase
                    .from('chat_messages')
                    .insert({
                      role: 'system',
                      content: `Voice transcription (${secondsUsed} seconds)`,
                      model: 'whisper-1',
                      input_tokens: 0,
                      output_tokens: 0,
                      credit_cost: Math.ceil(estimatedCost)
                    });
                } catch (err) {
                  console.error('Failed to log transcription usage:', err);
                }
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
      
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1000);
      }, 1000);
      setRecordingInterval(interval);
      
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
      
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      
      toast({
        title: "Processing",
        description: "Converting your speech to text...",
      });
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
      setRecordingTime(0);
    } else {
      if (!user) {
        toast({
          title: "Login required",
          description: "Please login to use the voice feature.",
          variant: "destructive"
        });
        return;
      }
      
      checkConsentAndRecord();
    }
  };

  const checkConsentAndRecord = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('whisper_consent')
        .eq('id', user?.id)
        .single();
      
      if (error) {
        console.error('Error checking consent:', error);
        setShowConsent(true);
        return;
      }
      
      if (data && data.whisper_consent) {
        requestMicrophonePermission();
      } else {
        setShowConsent(true);
      }
    } catch (error) {
      console.error('Error checking consent:', error);
      setShowConsent(true);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const ConsentDialog = () => (
    <Dialog open={showConsent} onOpenChange={setShowConsent}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>We use OpenAI Whisper transcript service</DialogTitle>
          <DialogDescription>
            Transcript costs less than $0.01 per minute. Are you happy to continue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleConsent(false)}>
            Oh, maybe not
          </Button>
          <Button onClick={() => handleConsent(true)}>
            That's cool with me
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const MicrophonePermissionDialog = () => (
    <Dialog open={showMicPermission} onOpenChange={setShowMicPermission}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Microphone access needed</DialogTitle>
          <DialogDescription>
            We need permission to use your microphone for voice recording. Please allow access when prompted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleMicrophonePermission(false)}>
            Cancel
          </Button>
          <Button onClick={() => handleMicrophonePermission(true)}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const CountdownOverlay = () => (
    <Sheet open={showCountdown}>
      <SheetContent side="bottom" className="h-40 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">Recording will start in</h3>
          <span className="text-5xl font-bold text-maiRed">{countdown}</span>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={`relative p-0 h-16 w-16 rounded-full ${
          isRecording 
            ? 'bg-red-500 animate-pulse' 
            : 'bg-amber-500 hover:bg-amber-600'
        }`}
        onClick={toggleRecording}
        disabled={disabled}
      >
        {isRecording ? (
          <MicOff className="h-10 w-10 text-white" />
        ) : (
          <Mic className="h-10 w-10 text-white" />
        )}
      </Button>
      
      {isRecording && (
        <div className="ml-2 text-sm text-white font-semibold">
          {formatTime(recordingTime)}
        </div>
      )}
      
      <ConsentDialog />
      <MicrophonePermissionDialog />
      <CountdownOverlay />
    </>
  );
};

export default VoiceInput;
