import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { Task, TaskStatus, TaskPriority, generateMockTasks } from '@/types/task';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/tasks', {
        headers: headers
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const mappedTasks: Task[] = data.map((t: any) => ({
            id: t.id.toString(),
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            dueDate: new Date(t.due_date + 'T12:00:00'),
            createdAt: new Date(t.created_at)
          }));
          setTasks(mappedTasks);
        }
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`http://localhost:5000/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status })
      });
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) {
      setActiveId(null);
      return;
    }

    let newStatus: TaskStatus | null = null;

    if (columns.some(c => c.id === over.id)) {
      newStatus = over.id as TaskStatus;
    } else {
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (newStatus && newStatus !== activeTask.status) {
      setTasks(prev => prev.map(t =>
        t.id === activeTask.id ? { ...t, status: newStatus! } : t
      ));
      updateTaskStatus(activeTask.id, newStatus);
    }

    setActiveId(null);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

    // We should ideally call API here but user wanted drag n drop mainly. 
    // For consistency let's add it to local state.
    setTasks(prev => [...prev, task]);

    // TODO: Implement actual create API call

    setNewTask({
      title: '',
      description: '',
      priority: 'media',
      status: 'entrada',
      dueDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(false);
  };

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleUpdateTask = async (task: Task) => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload = {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        due_date: task.dueDate.toISOString().split('T')[0]
      };

      const response = await fetch(`http://localhost:5000/api/tasks/${task.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? task : t));
        setIsEditModalOpen(false);
        setEditingTask(null);
      }
    } catch (e) {
      console.error("Failed to update task", e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setIsEditModalOpen(false);
        setEditingTask(null);
      }
    } catch (e) {
      console.error("Failed to delete task", e);
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={getTasksByStatus(column.id)}
              onTaskClick={handleTaskClick}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="opacity-80 rotate-2 cursor-grabbing w-[280px]">
              <TaskCard task={activeTask} index={0} onClick={() => { }} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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

        {/* Edit Task Modal */}
        {isEditModalOpen && editingTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setIsEditModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-md neon-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Editar Tarefa</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Título</label>
                  <Input
                    value={editingTask.title}
                    onChange={e => setEditingTask(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                    placeholder="Digite o título da tarefa..."
                    className="bg-muted/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
                  <Textarea
                    value={editingTask.description || ''}
                    onChange={e => setEditingTask(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                    placeholder="Descreva a tarefa..."
                    className="bg-muted/50 min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Prioridade</label>
                    <Select
                      value={editingTask.priority}
                      onValueChange={(value: TaskPriority) => setEditingTask(prev => prev ? ({ ...prev, priority: value }) : null)}
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
                      value={editingTask.status}
                      onValueChange={(value: TaskStatus) => setEditingTask(prev => prev ? ({ ...prev, status: value }) : null)}
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
                    value={editingTask.dueDate ? editingTask.dueDate.toISOString().split('T')[0] : ''}
                    onChange={e => setEditingTask(prev => prev ? ({ ...prev, dueDate: new Date(e.target.value + 'T12:00:00') }) : null)}
                    className="bg-muted/50"
                  />
                </div>

                <div className="flex gap-4 mt-4">
                  <Button
                    onClick={() => handleDeleteTask(editingTask.id)}
                    variant="destructive"
                    className="flex-1"
                  >
                    Excluir
                  </Button>
                  <Button
                    onClick={() => handleUpdateTask(editingTask)}
                    className="flex-1"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
