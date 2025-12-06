import { useState, useCallback } from 'react';

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
}

/**
 * Hook para gerenciar interação por voz com o agente OCastro.
 * 
 * Pontos de integração:
 * - Implementar Web Speech API em startListening/stopListening
 * - Conectar com API do OCastro para processar comandos de voz
 * - Adicionar síntese de voz para respostas do agente
 */
export const useVoiceInteraction = (): VoiceInteractionReturn => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [lastAgentMessage, setLastAgentMessage] = useState('');
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'agent'; message: string; timestamp: Date }>
  >([]);

  /**
   * Inicia a captura de voz.
   * 
   * TODO: Integrar com Web Speech API
   * ```
   * const recognition = new webkitSpeechRecognition();
   * recognition.continuous = false;
   * recognition.lang = 'pt-BR';
   * recognition.onresult = (event) => {
   *   const transcript = event.results[0][0].transcript;
   *   processVoiceCommand(transcript);
   * };
   * recognition.start();
   * ```
   */
  const startListening = useCallback(() => {
    setVoiceState('listening');
    
    // Simulação: após 3 segundos, muda para "thinking"
    setTimeout(() => {
      const mockUserMessage = 'Criar uma nova tarefa para revisar o código';
      setLastUserMessage(mockUserMessage);
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', message: mockUserMessage, timestamp: new Date() }
      ]);
      setVoiceState('thinking');
      
      // Após "processar", responde
      setTimeout(() => {
        const mockAgentResponse = 'Tarefa "Revisar código" criada com sucesso na coluna Entrada. Defini prioridade média e data para hoje.';
        setLastAgentMessage(mockAgentResponse);
        setConversationHistory(prev => [
          ...prev,
          { role: 'agent', message: mockAgentResponse, timestamp: new Date() }
        ]);
        setVoiceState('responding');
        
        // Volta para idle após responder
        setTimeout(() => {
          setVoiceState('idle');
        }, 2000);
      }, 1500);
    }, 3000);
  }, []);

  const stopListening = useCallback(() => {
    setVoiceState('idle');
    // TODO: Parar Web Speech API recognition
  }, []);

  /**
   * Simula uma interação completa para testes.
   * 
   * TODO: Substituir por integração real com API do OCastro
   * ```
   * const response = await fetch('/api/ocastro/process', {
   *   method: 'POST',
   *   body: JSON.stringify({ message: userMessage }),
   * });
   * const data = await response.json();
   * // data.intent: 'create_task' | 'move_task' | 'list_tasks' | etc.
   * // data.response: string
   * ```
   */
  const simulateInteraction = useCallback((userMessage: string) => {
    setVoiceState('thinking');
    setLastUserMessage(userMessage);
    setConversationHistory(prev => [
      ...prev,
      { role: 'user', message: userMessage, timestamp: new Date() }
    ]);

    setTimeout(() => {
      const responses = [
        'Entendido! Vou organizar isso para você.',
        'Tarefa adicionada ao seu quadro.',
        'Pronto! O calendário foi atualizado.',
        'Certo, movendo a tarefa para a próxima coluna.',
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      setLastAgentMessage(randomResponse);
      setConversationHistory(prev => [
        ...prev,
        { role: 'agent', message: randomResponse, timestamp: new Date() }
      ]);
      setVoiceState('responding');

      setTimeout(() => setVoiceState('idle'), 2000);
    }, 1500);
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
  };
};
