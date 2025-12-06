import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import { VoiceState } from '@/hooks/useVoiceInteraction';

interface VoiceButtonProps {
  voiceState: VoiceState;
  onToggle: () => void;
  minimal?: boolean;
}

export const VoiceButton = ({ voiceState, onToggle, minimal = false }: VoiceButtonProps) => {
  const getIcon = () => {
    switch (voiceState) {
      case 'listening':
        return <Mic className="w-8 h-8" />;
      case 'thinking':
        return <Loader2 className="w-8 h-8 animate-spin" />;
      case 'responding':
        return <Volume2 className="w-8 h-8" />;
      default:
        return <MicOff className="w-8 h-8" />;
    }
  };

  const getLabel = () => {
    switch (voiceState) {
      case 'listening':
        return 'Ouvindo...';
      case 'thinking':
        return 'Processando...';
      case 'responding':
        return 'Respondendo...';
      default:
        return 'Clique para falar';
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        onClick={onToggle}
        disabled={voiceState === 'thinking' || voiceState === 'responding'}
        className={`relative rounded-full flex items-center justify-center text-primary transition-all duration-300 disabled:opacity-50 ${minimal ? 'w-full h-full bg-transparent' : 'w-20 h-20 glass neon-border'
          }`}
        whileHover={{ scale: minimal ? 1 : 1.05 }}
        whileTap={{ scale: minimal ? 1 : 0.95 }}
        animate={{
          boxShadow: minimal ? 'none' : (voiceState === 'listening'
            ? '0 0 40px hsl(var(--primary) / 0.8), 0 0 80px hsl(var(--primary) / 0.4)'
            : voiceState === 'responding'
              ? '0 0 30px hsl(var(--accent) / 0.6), 0 0 60px hsl(var(--accent) / 0.3)'
              : '0 0 20px hsl(var(--primary) / 0.3)'),
        }}
      >
        {/* Ripple effect when listening - only if NOT minimal or if we simply want ripples even in minimal? 
            Let's keep ripples for non-minimal. If minimal, the orb handles visuals.
        */}
        {voiceState === 'listening' && !minimal && (
          <>
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-primary"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-primary"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}

        {/* Icon - Hide icon in minimal mode if we just want it to be a click area wrapper 
           BUT user code showed icon inside an overlay div in NeuralInteraction.
           Let's keep icon but maybe make it subtle or just render it standard.
        */}
        <motion.div
          className={minimal ? "opacity-0 hover:opacity-100 transition-opacity" : ""}
          animate={{
            scale: voiceState === 'listening' ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 0.5,
            repeat: voiceState === 'listening' ? Infinity : 0,
          }}
        >
          {getIcon()}
        </motion.div>
      </motion.button>

      {!minimal && (
        <motion.span
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={voiceState}
        >
          {getLabel()}
        </motion.span>
      )}
    </div>
  );
};
