"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-full bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

const ScrollAreaPrimitive = React.lazy(() => import("@radix-ui/react-scroll-area").then(mod => ({ default: mod.Root })));
const ScrollAreaViewport = React.lazy(() => import("@radix-ui/react-scroll-area").then(mod => ({ default: mod.Viewport })));
const ScrollAreaScrollbar = React.lazy(() => import("@radix-ui/react-scroll-area").then(mod => ({ default: mod.Scrollbar })));
const ScrollAreaThumb = React.lazy(() => import("@radix-ui/react-scroll-area").then(mod => ({ default: mod.Thumb })));

const ScrollBar = React.forwardRef<
  React.ElementRef<"div">,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }
>(({ className, orientation = "vertical", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  />
))
ScrollBar.displayName = "ScrollBar"


// New Animated Tabs
interface AnimatedTabsProps {
  tabs: { value: string; label: string, icon?: React.ReactNode }[];
  activeTab: string;
  className?: string;
}

const AnimatedTabs: React.FC<AnimatedTabsProps> = ({ tabs, activeTab, className }) => {
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    const activeTabIndex = tabs.findIndex(tab => tab.value === activeTab);
    const activeTabElement = tabsRef.current[activeTabIndex];
    if (activeTabElement) {
      setIndicatorStyle({
        left: activeTabElement.offsetLeft,
        width: activeTabElement.offsetWidth,
      });
      
      // Ensure the active tab is visible in scroll area if it overflows
      activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab, tabs]);

  return (
    <TabsList ref={containerRef} className={cn("relative inline-flex items-center rounded-full bg-muted p-1 text-muted-foreground w-max flex-shrink-0", className)}>
      {tabs.map((tab, i) => (
        <TabsTrigger
          key={tab.value}
          ref={el => tabsRef.current[i] = el}
          value={tab.value}
          className="relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 sm:px-5 py-2 text-[11px] sm:text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground gap-2 flex-shrink-0"
        >
          {tab.icon}
          {tab.label}
        </TabsTrigger>
      ))}
       <div
        className="absolute left-0 h-[calc(100%-8px)] rounded-full bg-background shadow-md transition-all duration-300 ease-in-out"
        style={indicatorStyle}
      />
    </TabsList>
  );
};


export { Tabs, TabsList, TabsTrigger, TabsContent, AnimatedTabs, ScrollBar };
