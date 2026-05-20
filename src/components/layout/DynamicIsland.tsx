'use client';

import { useDynamicIsland } from '@/context/DynamicIslandContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Bell, Sparkles, MessageSquare, CheckCircle, Radio, BookOpen } from 'lucide-react';

export default function DynamicIsland() {
  const { activeMessage } = useDynamicIsland();

  if (!activeMessage) return null;

  return (
    <div className="fixed top-2 left-0 right-0 z-[200] flex justify-center pointer-events-none px-4 md:px-0">
      <div 
        className={cn(
          "bg-black text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-3 p-1.5 pr-5 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu",
          "rounded-[28px] border border-white/10 backdrop-blur-xl",
          "animate-in slide-in-from-top-8 fade-in zoom-in-95",
          activeMessage ? "w-auto max-w-[90vw] min-w-[180px]" : "w-10 h-10 opacity-0"
        )}
      >
        <div className="relative flex-shrink-0">
          {activeMessage.image ? (
            <Avatar className="h-9 w-9 border border-white/20">
              <AvatarImage src={activeMessage.image} />
              <AvatarFallback className="bg-primary/20 text-[10px] font-bold">DV</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
              {activeMessage.type === 'notification' && <Bell className="h-4 w-4" />}
              {activeMessage.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {activeMessage.type === 'info' && <Sparkles className="h-4 w-4" />}
              {!activeMessage.type && <Sparkles className="h-4 w-4" />}
            </div>
          )}
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-black animate-pulse" />
        </div>

        <div className="flex flex-col min-w-0 py-1">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white/90 leading-tight truncate">
            {activeMessage.title}
          </p>
          {activeMessage.description && (
            <p className="text-[10px] font-bold text-white/50 leading-tight truncate mt-0.5">
              {activeMessage.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
