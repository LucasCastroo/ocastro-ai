import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, Search, User } from 'lucide-react';

interface HeaderProps {
  userName?: string;
  agentMessage?: string;
}

const agentPhrases = [
  'Pronto para organizar seu dia.',
  'Vamos alcançar seus objetivos juntos.',
  'Seu assistente está online e pronto.',
  'Que tal começarmos com as prioridades?',
  'Estou aqui para ajudar você a ser mais produtivo.',
];

export const Header = ({ userName = 'Usuário', agentMessage }: HeaderProps) => {
  const today = new Date();
  const randomPhrase = agentMessage || agentPhrases[Math.floor(Math.random() * agentPhrases.length)];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass border-b border-border/30 px-6 py-4"
    >
      <div className="flex items-center justify-between">
        {/* Left: Greeting */}
        <div>
          <motion.h2 
            className="text-2xl font-semibold text-foreground"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            Olá, <span className="text-primary neon-text">{userName}</span>
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mt-1"
          >
            <span className="text-muted-foreground">
              {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-primary/80 italic text-sm">"{randomPhrase}"</span>
          </motion.div>
        </div>

        {/* Right: Actions */}
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Search */}
          <button className="p-3 rounded-xl glass hover:neon-border transition-all duration-200 text-muted-foreground hover:text-foreground">
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button className="relative p-3 rounded-xl glass hover:neon-border transition-all duration-200 text-muted-foreground hover:text-foreground">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
          </button>

          {/* Profile */}
          <button className="flex items-center gap-3 p-2 pr-4 rounded-xl glass hover:neon-border transition-all duration-200">
            <div className="w-8 h-8 rounded-lg gradient-neon flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground hidden md:block">{userName}</span>
          </button>
        </motion.div>
      </div>
    </motion.header>
  );
};
