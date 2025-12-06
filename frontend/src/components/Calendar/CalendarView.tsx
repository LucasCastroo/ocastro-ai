import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Task } from '@/types/task';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarViewProps {
  tasks: Task[];
}

export const CalendarView = ({ tasks }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Preencher dias vazios no início do mês
  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array(startDayOfWeek).fill(null);

  const getTasksForDate = (date: Date) => 
    tasks.filter(task => isSameDay(task.dueDate, date));

  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return getTasksForDate(selectedDate);
  }, [selectedDate, tasks]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <motion.div 
      className="glass rounded-2xl p-6 neon-border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Calendário</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-foreground font-medium min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}
        
        {daysInMonth.map((day, index) => {
          const dayTasks = getTasksForDate(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const hasTasks = dayTasks.length > 0;

          return (
            <motion.button
              key={day.toISOString()}
              onClick={() => setSelectedDate(isSelected ? null : day)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`
                aspect-square rounded-lg flex flex-col items-center justify-center relative
                transition-all duration-200
                ${isToday ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-muted/50'}
                ${isSelected ? 'ring-2 ring-primary neon-glow' : ''}
                ${hasTasks ? 'text-foreground' : 'text-muted-foreground'}
              `}
            >
              <span className="text-sm">{format(day, 'd')}</span>
              
              {/* Task indicators */}
              {hasTasks && (
                <div className="flex gap-0.5 mt-1">
                  {dayTasks.slice(0, 3).map((task, i) => (
                    <span 
                      key={task.id} 
                      className={`w-1.5 h-1.5 rounded-full ${
                        task.priority === 'alta' ? 'bg-red-400' :
                        task.priority === 'media' ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                      style={{
                        boxShadow: `0 0 4px ${
                          task.priority === 'alta' ? 'rgb(248 113 113)' :
                          task.priority === 'media' ? 'rgb(250 204 21)' : 'rgb(74 222 128)'
                        }`
                      }}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[8px] text-muted-foreground">+{dayTasks.length - 3}</span>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected Date Tasks Panel */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-border/50 overflow-hidden"
          >
            <h4 className="text-sm font-medium text-foreground mb-3">
              Tarefas para {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </h4>
            
            {selectedDateTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa para este dia.</p>
            ) : (
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {selectedDateTasks.map(task => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 rounded-lg bg-muted/30 flex items-center gap-3"
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      task.priority === 'alta' ? 'bg-red-400' :
                      task.priority === 'media' ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{task.status}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
