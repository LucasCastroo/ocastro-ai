export type TaskStatus = 'entrada' | 'fazendo' | 'concluida';
export type TaskPriority = 'baixa' | 'media' | 'alta';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
  createdAt: Date;
}

export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
}

// Helper function to generate mock tasks
export const generateMockTasks = (): Task[] => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return [
    {
      id: '1',
      title: 'Revisar relatório mensal',
      description: 'Verificar métricas de performance e criar apresentação',
      status: 'entrada',
      priority: 'alta',
      dueDate: today,
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'Reunião com equipe de design',
      description: 'Discutir novo layout da dashboard',
      status: 'entrada',
      priority: 'media',
      dueDate: tomorrow,
      createdAt: new Date(),
    },
    {
      id: '3',
      title: 'Implementar integração API',
      description: 'Conectar sistema com serviço de notificações',
      status: 'fazendo',
      priority: 'alta',
      dueDate: today,
      createdAt: new Date(),
    },
    {
      id: '4',
      title: 'Atualizar documentação',
      description: 'Documentar novos endpoints da API',
      status: 'fazendo',
      priority: 'baixa',
      dueDate: nextWeek,
      createdAt: new Date(),
    },
    {
      id: '5',
      title: 'Deploy versão 2.0',
      description: 'Publicar nova versão em produção',
      status: 'concluida',
      priority: 'alta',
      dueDate: new Date(today.getTime() - 86400000),
      createdAt: new Date(),
    },
    {
      id: '6',
      title: 'Configurar ambiente de testes',
      status: 'concluida',
      priority: 'media',
      dueDate: new Date(today.getTime() - 172800000),
      createdAt: new Date(),
    },
  ];
};
