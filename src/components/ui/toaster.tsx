"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles, Bell, CheckCircle, Info, AlertCircle } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        // Support for Dynamic Island style payloads (image/icon)
        // @ts-ignore
        const image = props.image;
        // @ts-ignore
        const icon = props.icon;
        // @ts-ignore
        const type = props.type;

        const renderVisualNode = () => {
          if (image) {
            return (
              <Avatar className="h-9 w-9 border border-white/20 flex-shrink-0">
                <AvatarImage src={image} />
                <AvatarFallback className="bg-primary/20 text-[10px] font-bold">DV</AvatarFallback>
              </Avatar>
            );
          }

          const IconNode = () => {
            if (icon) return icon;
            if (props.variant === 'destructive') return <AlertCircle className="h-4 w-4" />;
            if (type === 'success') return <CheckCircle className="h-4 w-4" />;
            if (type === 'notification') return <Bell className="h-4 w-4" />;
            return <Sparkles className="h-4 w-4" />;
          };

          return (
            <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white/80 border border-white/10 flex-shrink-0">
              <IconNode />
            </div>
          );
        };

        return (
          <Toast key={id} {...props}>
            <div className="flex items-center gap-3 min-w-0">
              {renderVisualNode()}
              <div className="flex flex-col min-w-0">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="truncate max-w-[200px] mt-0.5">
                    {description}
                  </ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
