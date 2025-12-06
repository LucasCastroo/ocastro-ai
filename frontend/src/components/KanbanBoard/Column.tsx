import { motion } from 'framer-motion';
import { Task, TaskStatus } from '@/types/task';
import { TaskCard } from './TaskCard';
import { Inbox, Clock, CheckCircle2 } from 'lucide-react';

interface ColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const columnConfig: Record<TaskStatus, { icon: React.ReactNode; color: string }> = {
  entrada: {
    icon: <Inbox className="w-5 h-5" />,
    color: 'text-blue-400'
  },
  fazendo: {
    icon: <Clock className="w-5 h-5" />,
    color: 'text-yellow-400'
  },
  concluida: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: 'text-green-400'
  },
};

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export const Column = ({ id, title, tasks, onTaskClick, onDelete }: ColumnProps) => {
  const config = columnConfig[id];

  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 min-w-[280px]"
    >
      {/* Column Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
        <span className={config.color}>{config.icon}</span>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <span className="ml-auto text-sm px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {/* Tasks Container */}
      <SortableContext
        id={id}
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="space-y-3 min-h-[200px] p-2 rounded-xl bg-muted/20"
        >
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>Nenhuma tarefa</p>
            </div>
          ) : (
            tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onClick={onTaskClick}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </SortableContext>
    </motion.div>
  );
};
