import { Home, Calendar, CheckSquare, Settings } from 'lucide-react';
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
    activeSection: string;
    onSectionChange: (section: string) => void;
}

export const BottomNavigation = ({ activeSection, onSectionChange }: BottomNavigationProps) => {
    const items = [
        { id: 'home', icon: Home, label: 'Início' },
        { id: 'tarefas', icon: CheckSquare, label: 'Tarefas' },
        { id: 'calendario', icon: Calendar, label: 'Agenda' },
        { id: 'configuracoes', icon: Settings, label: 'Ajustes' },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-lg border border-white/10 rounded-full px-6 py-3 shadow-2xl z-50 flex items-center gap-8 mb-6">
            {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                    <button
                        key={item.id}
                        onClick={() => onSectionChange(item.id)}
                        className={cn(
                            "relative flex flex-col items-center gap-1 transition-all duration-300",
                            isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                        {isActive && (
                            <span className="absolute -bottom-8 text-[10px] font-medium tracking-wide animate-in fade-in slide-in-from-bottom-2">
                                {item.label}
                            </span>
                        )}

                        {/* Active Glow */}
                        {isActive && (
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full -z-10" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
