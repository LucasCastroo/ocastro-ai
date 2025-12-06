import { motion } from 'framer-motion';
import { Calendar, Flag } from 'lucide-react';
import { Task, TaskPriority } from '@/types/task';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  index: number;
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  alta: { label: 'Alta', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  media: { label: 'Média', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  baixa: { label: 'Baixa', color: 'text-green-400', bgColor: 'bg-green-500/20' },
};

export const TaskCard = ({ task, index }: TaskCardProps) => {
  const priority = priorityConfig[task.priority];
  const isOverdue = task.dueDate < new Date() && task.status !== 'concluida';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="glass rounded-xl p-4 cursor-grab active:cursor-grabbing group hover:neon-border transition-all duration-300"
      // Estrutura para drag-and-drop
      // TODO: Integrar com react-beautiful-dnd ou @dnd-kit
      // draggable="true"
      // onDragStart={(e) => handleDragStart(e, task.id)}
    >
      {/* Priority Badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs px-2 py-1 rounded-full ${priority.bgColor} ${priority.color} flex items-center gap-1`}>
          <Flag className="w-3 h-3" />
          {priority.label}
        </span>
        {task.status === 'concluida' && (
          <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
            ✓ Concluída
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="font-medium text-foreground mb-2 group-hover:text-primary transition-colors">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Due Date */}
      <div className={`flex items-center gap-2 text-xs ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
        <Calendar className="w-3 h-3" />
        <span>
          {format(task.dueDate, "d 'de' MMM", { locale: ptBR })}
          {isOverdue && ' (Atrasada)'}
        </span>
      </div>
    </motion.div>
  );
};

/**
 * Funções para integração com comandos de voz do OCastro:
 * 
 * export const createTaskFromVoice = (command: string): Partial<Task> => {
 *   // Implementar parsing do comando de voz
 *   // Ex: "criar tarefa revisar código com prioridade alta para amanhã"
 *   return {
 *     title: extractTitle(command),
 *     priority: extractPriority(command),
 *     dueDate: extractDate(command),
 *     status: 'entrada',
 *   };
 * };
 * 
 * export const moveTaskFromVoice = (intent: { taskId: string; targetStatus: TaskStatus }) => {
 *   // Implementar movimentação de tarefa via voz
 *   // Ex: "mover tarefa revisar código para fazendo"
 * };
 */
