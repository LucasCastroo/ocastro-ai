import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NeuralInteraction } from '@/components/NeuralInteraction';
import { KanbanBoard } from '@/components/KanbanBoard/KanbanBoard';
import { CalendarView } from '@/components/Calendar/CalendarView';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useVoiceInteraction } from '@/hooks/useVoiceInteraction';
import { generateMockTasks } from '@/types/task';
import { SendHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { StarryBackground } from '@/components/StarryBackground';
import { MouseAura } from '@/components/MouseAura';

const Index = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [inputText, setInputText] = useState('');
  const mockTasks = generateMockTasks();

  const {
    voiceState,
    conversationHistory,
    startListening,
    stopListening,
  } = useVoiceInteraction();

  const handleVoiceToggle = () => {
    if (voiceState === 'idle') {
      startListening();
    } else if (voiceState === 'listening') {
      stopListening();
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    // Here we would call the actual API text endpoint
    console.log("Sending text:", inputText);
    setInputText('');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Constellation Background */}
      <StarryBackground />
      <MouseAura />

      {/* Subtle Gradient Overlay for depth */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-radial from-transparent via-background/50 to-background opacity-80" />

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-8 pb-32 relative z-10">
        <AnimatePresence mode="wait">

          {/* HOME SECTION */}
          {activeSection === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col justify-center items-center max-w-4xl mx-auto"
            >
              <div className="text-center mb-12">
                {/* Platform Logo */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-6 flex justify-center"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                    <img src="/logo.jpg" alt="OCastro Logo" className="w-full h-full object-cover" />
                  </div>
                </motion.div>

                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  Olá, Lucas
                </h1>
                <p className="text-muted-foreground text-lg">
                  Como posso ajudar você hoje?
                </p>
              </div>

              {/* Neural Core */}
              <div className="flex-1 flex items-center justify-center w-full mb-12">
                <NeuralInteraction
                  voiceState={voiceState}
                  onVoiceToggle={handleVoiceToggle}
                  conversationHistory={conversationHistory}
                />
              </div>

              {/* Input Bar */}
              <div className="w-full max-w-2xl mx-auto mt-auto">
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
              </div>
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
