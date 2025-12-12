import { useState, useCallback, useRef } from 'react';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'responding';

interface VoiceInteractionReturn {
  voiceState: VoiceState;
  isListening: boolean;
  isThinking: boolean;
  isResponding: boolean;
  lastUserMessage: string;
  lastAgentMessage: string;
  conversationHistory: Array<{ role: 'user' | 'agent'; message: string; timestamp: Date }>;
  startListening: () => void;
  stopListening: () => void;
  simulateInteraction: (userMessage: string) => void;
  lastIntent: string | null;
  lastData: any | null;
  voiceId: string;
  setVoiceId: (id: string) => void;
}

export const useVoiceInteraction = (): VoiceInteractionReturn => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [lastAgentMessage, setLastAgentMessage] = useState('');
  const [lastIntent, setLastIntent] = useState<string | null>(null);
  const [lastData, setLastData] = useState<any | null>(null);
  const [voiceId, setVoiceId] = useState<string>('pt-BR-AntonioNeural'); // Default
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'agent'; message: string; timestamp: Date }>
  >([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const playAudioResponse = (base64Audio: string) => {
    try {
      setVoiceState('responding');
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audio.onended = () => {
        setVoiceState('idle');
      };
      audio.play();
    } catch (e) {
      console.error("Error playing audio", e);
      setVoiceState('idle');
    }
  };

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setVoiceState('thinking');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Prepare Form Data
        const formData = new FormData();
        formData.append('audio', audioBlob, 'command.webm');
        formData.append('voiceId', voiceId);

        try {
          // Get token from storage (assuming standard storage key)
          const token = localStorage.getItem('token');
          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          // In dev environment, we might need to proxy or use full URL
          const response = await fetch('http://localhost:5000/api/voice/command', {
            method: 'POST',
            headers: headers,
            body: formData,
          });

          // Handle response
          const data = await response.json();

          // 1. Play Audio (Priority: even on error, if audio exists, play it)
          if (data.audio_base64) {
            playAudioResponse(data.audio_base64);
          } else {
            setVoiceState('idle');
          }

          // 2. Update Context/UI
          if (data.success) {
            // Update History on success
            if (data.transcription) {
              setLastUserMessage(data.transcription);
              setConversationHistory(prev => [
                ...prev,
                { role: 'user', message: data.transcription, timestamp: new Date() }
              ]);
            }

            if (data.message) {
              setLastAgentMessage(data.message);
              setConversationHistory(prev => [
                ...prev,
                { role: 'agent', message: data.message, timestamp: new Date() }
              ]);
            }

            if (data.intent) setLastIntent(data.intent);
            if (data.data) setLastData(data.data);
          } else {
            // Handle error messages
            console.warn("Backend reported failure:", data.message);
            if (data.message) {
              setLastAgentMessage(data.message);
            }
          }

        } catch (error) {
          console.error("Error sending audio:", error);
          setVoiceState('idle');
        }

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setVoiceState('listening');

    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Não foi possível acessar o microfone. Verifique suas permissões.");
      setVoiceState('idle');
    }
  }, [voiceId]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // State change to 'thinking' happens in onstop
    }
  }, []);

  const simulateInteraction = useCallback(async (userMessage: string) => {
    setVoiceState('thinking');
    setLastUserMessage(userMessage);

    // Optimistic UI update
    setConversationHistory(prev => [
      ...prev,
      { role: 'user', message: userMessage, timestamp: new Date() }
    ]);

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/voice/command', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ text: userMessage, voiceId }),
      });

      const data = await response.json();

      if (data.message) {
        setLastAgentMessage(data.message);
        setConversationHistory(prev => [
          ...prev,
          { role: 'agent', message: data.message, timestamp: new Date() }
        ]);

        if (data.intent) setLastIntent(data.intent);
        if (data.data) setLastData(data.data);

        if (data.audio_base64) {
          playAudioResponse(data.audio_base64);
        } else {
          setVoiceState('idle');
        }
      }
    } catch (error) {
      console.error("Text command error", error);
      setVoiceState('idle');
    }
  }, []);

  return {
    voiceState,
    isListening: voiceState === 'listening',
    isThinking: voiceState === 'thinking',
    isResponding: voiceState === 'responding',
    lastUserMessage,
    lastAgentMessage,
    conversationHistory,
    startListening,
    stopListening,
    simulateInteraction,
    lastIntent,
    lastData,
    voiceId,
    setVoiceId
  };
};
