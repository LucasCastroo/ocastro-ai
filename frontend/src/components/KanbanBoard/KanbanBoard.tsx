import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Task, TaskStatus, TaskPriority, generateMockTasks } from '@/types/task';
import { Column } from './Column';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NewTaskForm {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
}

export const KanbanBoard = () => {
  const [tasks, setTasks] = useState<Task[]>(generateMockTasks());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState<NewTaskForm>({
    title: '',
    description: '',
    priority: 'media',
    status: 'entrada',
    dueDate: new Date().toISOString().split('T')[0],
  });

  const columns: { id: TaskStatus; title: string }[] = [
    { id: 'entrada', title: 'Entrada' },
    { id: 'fazendo', title: 'Fazendo' },
    { id: 'concluida', title: 'Concluídas' },
  ];

  const getTasksByStatus = (status: TaskStatus) => 
    tasks.filter(task => task.status === status);

  const handleCreateTask = () => {
    if (!newTask.title.trim()) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description || undefined,
      priority: newTask.priority,
      status: newTask.status,
      dueDate: new Date(newTask.dueDate),
      createdAt: new Date(),
    };

    setTasks(prev => [...prev, task]);
    setNewTask({
      title: '',
      description: '',
      priority: 'media',
      status: 'entrada',
      dueDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(false);
  };

  /**
   * Função para integração com OCastro via voz
   * TODO: Conectar com useVoiceInteraction hook
   * 
   * const createTaskFromVoice = (intent: { title: string; priority?: TaskPriority; dueDate?: Date }) => {
   *   const task: Task = {
   *     id: Date.now().toString(),
   *     title: intent.title,
   *     priority: intent.priority || 'media',
   *     status: 'entrada',
   *     dueDate: intent.dueDate || new Date(),
   *     createdAt: new Date(),
   *   };
   *   setTasks(prev => [...prev, task]);
   * };
   */

  return (
    <motion.div 
      className="glass rounded-2xl p-6 neon-border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <h2 className="text-lg font-semibold text-foreground">Quadro de Tarefas</h2>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(column => (
          <Column
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={getTasksByStatus(column.id)}
          />
        ))}
      </div>

      {/* New Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-md neon-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Nova Tarefa</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Título</label>
                  <Input
                    value={newTask.title}
                    onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Digite o título da tarefa..."
                    className="bg-muted/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
                  <Textarea
                    value={newTask.description}
                    onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva a tarefa (opcional)..."
                    className="bg-muted/50 min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Prioridade</label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value: TaskPriority) => setNewTask(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger className="bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Status</label>
                    <Select
                      value={newTask.status}
                      onValueChange={(value: TaskStatus) => setNewTask(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="fazendo">Fazendo</SelectItem>
                        <SelectItem value="concluida">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Data Prevista</label>
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={e => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="bg-muted/50"
                  />
                </div>

                <Button 
                  onClick={handleCreateTask}
                  className="w-full mt-4"
                  disabled={!newTask.title.trim()}
                >
                  Criar Tarefa
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
