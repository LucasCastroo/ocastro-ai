import { motion } from 'framer-motion';
import { Calendar, Flag } from 'lucide-react';
import { Task, TaskPriority } from '@/types/task';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Trash2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  index: number;
  onClick: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  alta: { label: 'Alta', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  media: { label: 'Média', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  baixa: { label: 'Baixa', color: 'text-green-400', bgColor: 'bg-green-500/20' },
};

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as React from "react";

export const TaskCard = ({ task, index, onClick, onDelete }: TaskCardProps) => {
  const priority = priorityConfig[task.priority];
  const isOverdue = task.dueDate < new Date() && task.status !== 'concluida';
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      setShowConfirmDialog(true);
    }
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(task.id);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => onClick(task)}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ scale: 1.02, y: -2 }}
        className="glass rounded-xl p-4 cursor-pointer active:cursor-grabbing group hover:neon-border transition-all duration-300 touch-none relative"
      >
        {/* Quick Delete Button */}
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all z-10"
            title="Excluir tarefa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Priority Badge */}
        <div className="flex items-center justify-between mb-3 pr-6">
          <span className={`text-xs px-2 py-1 rounded-full ${priority.bgColor} ${priority.color} flex items-center gap-1`}>
            <Flag className="w-3 h-3" />
            {priority.label}
          </span>
          {task.status === 'concluida' && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
              ✓ Concluída
            </span>
          )}
          {task.status === 'fazendo' && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
              ▶ Em Andamento
            </span>
          )}
          {task.status === 'entrada' && (
            <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">
              ⏳ Pendente
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

      {/* Custom Delete Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a tarefa "{task.title}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={(e) => { e.stopPropagation(); setShowConfirmDialog(false); }}>Cancelar</Button>
            <Button variant="destructive" onClick={(e) => { e.stopPropagation(); confirmDelete(); }}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
