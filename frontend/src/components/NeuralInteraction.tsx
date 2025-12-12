import { motion } from 'framer-motion';
import { VoiceButton } from './VoiceButton';
import { VoiceState } from '@/hooks/useVoiceInteraction';

interface NeuralInteractionProps {
  voiceState: VoiceState;
  onVoiceToggle: () => void;
  conversationHistory: Array<{ role: 'user' | 'agent'; message: string; timestamp: Date }>;
}

export const NeuralInteraction = ({
  voiceState,
  onVoiceToggle,
  conversationHistory
}: NeuralInteractionProps) => {

  const lastAgentMessage = conversationHistory.filter(m => m.role === 'agent').pop();

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-[500px]">

      {/* Central Orb / Aura Container */}
      <div className="relative mt-12 mb-20 flex items-center justify-center cursor-pointer group" onClick={onVoiceToggle}>

        {/* Audio Visualizer Waves (only visible when listening) */}
        {voiceState === 'listening' && (
          <div className="absolute flex gap-1 items-center justify-center h-52 w-full pointer-events-none z-0">
            {[...Array(16)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1.5 bg-primary/80 rounded-full"
                animate={{
                  height: [30, 80 + Math.random() * 80, 30],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 0.4 + Math.random() * 0.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.05
                }}
              />
            ))}
          </div>
        )}

        {/* Deep Glow background */}
        {/* Deep Glow background */}
        <motion.div
          className="absolute inset-0 bg-primary/40 blur-[80px] rounded-full"
          animate={{
            scale: voiceState === 'listening' ? [1, 1.3, 1] : voiceState === 'responding' ? [1, 1.1, 1] : 1,
            opacity: voiceState === 'listening' ? 0.9 : 0.5,
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* The Coded Orb (Logo Inspired) */}
        <motion.div
          className="relative z-10 w-48 h-48 md:w-64 md:h-64 flex items-center justify-center"
          animate={{
            scale: voiceState === 'responding'
              ? [1, 1.02, 1.08, 1.03, 1.06, 1.01, 1.04, 1]
              : 1,
          }}
          transition={{
            duration: 0.6,
            repeat: voiceState === 'responding' ? Infinity : 0,
            ease: "easeInOut"
          }}
        >

          {/* Outer Spinning Rings */}
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/20"
            style={{ borderTopColor: 'hsl(var(--primary))', borderRightColor: 'transparent' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-4 rounded-full border border-accent/30"
            style={{ borderBottomColor: 'hsl(var(--accent))', borderLeftColor: 'transparent' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />

          {/* Neural Core SVG */}
          <svg viewBox="0 0 200 200" className="w-full h-full p-6 drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="1" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* The "C" Shape Arc */}
            <motion.path
              d="M 160 55 A 75 75 0 1 0 160 145"
              fill="none"
              stroke="url(#grad1)"
              strokeWidth="6"
              strokeLinecap="round"
              filter="url(#glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />

            {/* Inner Neural Connections */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              {/* Central Nodes */}
              <circle cx="100" cy="100" r="5" fill="hsl(var(--primary))" />
              <circle cx="75" cy="85" r="4" fill="hsl(var(--accent))" />
              <circle cx="85" cy="125" r="4" fill="hsl(var(--accent))" />
              <circle cx="125" cy="80" r="4" fill="hsl(var(--primary))" />
              <circle cx="115" cy="120" r="4" fill="hsl(var(--primary))" />

              {/* Connecting Lines */}
              <motion.path
                d="M 100 100 L 75 85 M 100 100 L 85 125 M 100 100 L 125 80 M 100 100 L 115 120"
                stroke="white"
                strokeWidth="1.5"
                strokeOpacity="0.5"
                animate={{ strokeOpacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Connections to the C arc */}
              <path d="M 75 85 L 50 95" stroke="hsl(var(--primary))" strokeWidth="1" strokeOpacity="0.4" />
              <path d="M 125 80 L 145 50" stroke="hsl(var(--primary))" strokeWidth="1" strokeOpacity="0.4" />
              <path d="M 115 120 L 140 150" stroke="hsl(var(--primary))" strokeWidth="1" strokeOpacity="0.4" />
            </motion.g>

            {/* Pulse Circle for Voice State */}
            {(voiceState === 'listening' || voiceState === 'responding') && (
              <motion.circle
                cx="100"
                cy="100"
                r="45"
                stroke={voiceState === 'listening' ? "hsl(var(--primary))" : "hsl(var(--secondary))"}
                strokeWidth="2"
                fill="none"
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: 1.4, opacity: 0 }}
                transition={{ duration: voiceState === 'listening' ? 1.5 : 1, repeat: Infinity }}
              />
            )}
            {voiceState === 'responding' && (
              <motion.circle
                cx="100"
                cy="100"
                r="40"
                stroke="hsl(var(--accent))"
                strokeWidth="1.5"
                fill="none"
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
              />
            )}


          </svg>

          {/* Overlay Icon status - invisible click target */}
          <div className="absolute inset-0 flex items-center justify-center text-white/80 mix-blend-overlay">
            <VoiceButton voiceState={voiceState} onToggle={() => { }} minimal />
          </div>
        </motion.div>
      </div>

      {/* Live Transcription / Last Message Display */}
      <div className="h-20 flex items-center justify-center text-center px-4 max-w-lg z-20">
        {voiceState === 'thinking' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-primary animate-pulse"
          >
            <span className="text-lg font-medium">Processando...</span>
          </motion.div>
        ) : lastAgentMessage ? (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={lastAgentMessage.timestamp.toISOString()}
            className="text-lg md:text-xl text-foreground font-light leading-relaxed"
          >
            "{lastAgentMessage.message}"
          </motion.p>
        ) : (
          <p className="text-muted-foreground/50 text-sm">
            Toque no núcleo para iniciar
          </p>
        )}
      </div>

    </div >
  );
};
