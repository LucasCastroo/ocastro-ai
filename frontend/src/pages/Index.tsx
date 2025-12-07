import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NeuralInteraction } from '@/components/NeuralInteraction';
import { KanbanBoard } from '@/components/KanbanBoard/KanbanBoard';
import { CalendarView } from '@/components/Calendar/CalendarView';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useVoiceInteraction } from '@/hooks/useVoiceInteraction';
import { SendHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { StarryBackground } from '@/components/StarryBackground';
import { MouseAura } from '@/components/MouseAura';

const Index = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [inputText, setInputText] = useState('');
  const mockTasks = [];
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const {
    voiceState,
    conversationHistory,
    startListening,
    stopListening,
    simulateInteraction,
    lastIntent
  } = useVoiceInteraction();

  // Navigate based on Voice Intents
  useEffect(() => {
    if (lastIntent === 'list_today_tasks' || lastIntent === 'list_all_tasks') {
      setActiveSection('tarefas');
    }
  }, [lastIntent]);

  // State to control layout mode: 'centered' (default/voice) vs 'chat' (text interaction)
  const [isChatMode, setIsChatMode] = useState(false);

  const handleVoiceToggle = () => {
    if (voiceState === 'idle') {
      startListening();
    } else if (voiceState === 'listening') {
      stopListening();
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    setIsChatMode(true); // Switch to chat mode on text input
    simulateInteraction(inputText);
    setInputText('');
  };

  useEffect(() => {
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationHistory]);

  return (
    <div className="h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Constellation Background */}
      <StarryBackground />
      <MouseAura />

      {/* Subtle Gradient Overlay for depth */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-radial from-transparent via-background/50 to-background opacity-80" />

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-4 pb-0 relative z-10 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">

          {/* HOME SECTION */}
          {activeSection === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex-1 flex flex-col w-full h-full transition-all duration-700 ease-in-out ${isChatMode ? 'justify-between' : 'justify-center items-center'
                }`}
            >
              <div className={`flex flex-col items-center transition-all duration-700 ${isChatMode ? 'flex-shrink-0' : 'flex-1 justify-center'}`}>

                {/* Header - Dynamically positioned */}
                <motion.div
                  layout
                  className="text-center mb-2 flex-shrink-0"
                  animate={{
                    scale: isChatMode ? 0.8 : 1,
                    opacity: isChatMode ? 0.8 : 1
                  }}
                >
                  {/* Platform Logo */}
                  <div className="mt-2 mb-2 flex justify-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                      <img src="/logo.jpg" alt="OCastro Logo" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    Olá, Lucas
                  </h1>
                </motion.div>

                {/* Neural Core */}
                <motion.div
                  layout
                  className={`flex items-center justify-center w-full transition-all duration-700 ${isChatMode ? '-mt-4 scale-75' : 'mt-8 scale-100'}`}
                >
                  <NeuralInteraction
                    voiceState={voiceState}
                    onVoiceToggle={handleVoiceToggle}
                    conversationHistory={conversationHistory}
                  />
                </motion.div>
              </div>

              {/* CHAT HISTORY - Only visible in Chat Mode */}
              {isChatMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex-1 overflow-y-auto mb-4 space-y-4 px-2 min-h-0 scrollbar-thin scrollbar-thumb-white/10 pr-2 w-full max-w-4xl mx-auto"
                >
                  {conversationHistory.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user'
                          ? 'bg-primary/20 text-primary-foreground rounded-tr-none border border-primary/20'
                          : 'bg-secondary/40 text-secondary-foreground rounded-tl-none border border-white/5'
                          } backdrop-blur-sm shadow-md`}
                      >
                        <p className="text-sm md:text-base leading-relaxed">{msg.message}</p>
                        <span className="text-[10px] opacity-50 mt-1 block">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={scrollAnchorRef} />
                </motion.div>
              )}


              {/* Input Bar - Dynamically positioned */}
              <motion.div
                layout
                className={`w-full max-w-2xl mx-auto transition-all duration-700 ${isChatMode ? 'flex-shrink-0 mb-20' : 'mb-32 mt-8'}`}
              >
                <div className="relative flex gap-2">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Digite algo para o OCastro..."
                    className="h-14 pl-6 pr-14 rounded-full bg-secondary/50 border-white/5 backdrop-blur-md shadow-lg text-lg focus-visible:ring-primary/50"
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    className="absolute right-2 top-2 rounded-full w-10 h-10 bg-primary hover:bg-primary/90"
                  >
                    <SendHorizontal className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>

            </motion.div>
          )}

          {/* TASKS SECTION */}
          {activeSection === 'tarefas' && (
            <motion.div
              key="tarefas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full pt-10"
            >
              <h2 className="text-3xl font-bold mb-8 px-4">Minhas Tarefas</h2>
              <KanbanBoard />
            </motion.div>
          )}

          {/* CALENDAR SECTION */}
          {activeSection === 'calendario' && (
            <motion.div
              key="calendario"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full pt-10"
            >
              <h2 className="text-3xl font-bold mb-8 px-4">Calendário</h2>
              <div className="glass rounded-2xl p-6">
                <CalendarView tasks={mockTasks} />
              </div>
            </motion.div>
          )}

          {/* SETTINGS SECTION */}
          {activeSection === 'configuracoes' && (
            <motion.div
              key="configuracoes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full max-w-2xl mx-auto pt-10"
            >
              <h2 className="text-3xl font-bold mb-8">Configurações</h2>
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-secondary/30 border border-white/5 backdrop-blur-sm">
                  <h3 className="font-semibold text-lg mb-2">Preferências de Voz</h3>
                  <p className="text-muted-foreground">Ajuste a velocidade e o tom da resposta do assistente.</p>
                </div>
                <div className="p-6 rounded-2xl bg-secondary/30 border border-white/5 backdrop-blur-sm">
                  <h3 className="font-semibold text-lg mb-2">Conexões</h3>
                  <p className="text-muted-foreground">Gerencie as integrações com Google Calendar e outros serviços.</p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation activeSection={activeSection} onSectionChange={setActiveSection} />
    </div>
  );
};

export default Index;
