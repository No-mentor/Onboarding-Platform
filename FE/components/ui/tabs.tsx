'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: 'underline' | 'segment';
  }
>(({ className, variant = 'underline', ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center rounded-md transition-colors duration-base',
      variant === 'segment' &&
        'bg-surface-sunk border-0 p-1 h-10 rounded-[10px]',
      variant === 'underline' && 'border-b border-border',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    variant?: 'underline' | 'segment';
  }
>(({ className, variant = 'underline', ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'relative inline-flex items-center justify-center font-semibold ' +
      'transition-colors duration-fast px-4 text-[13.5px] ' +
      'text-body disabled:cursor-not-allowed disabled:opacity-50',
      variant === 'underline' &&
        'pb-3 pt-2 border-b-2 border-transparent ' +
        'data-[state=active]:border-primary data-[state=active]:text-text ' +
        'data-[state=inactive]:text-body',
      variant === 'segment' &&
        'h-[30px] rounded-[7px] m-1 px-3 ' +
        'data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-[0_1px_2px_rgba(20,20,25,0.07)] ' +
        'data-[state=inactive]:text-body',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-2', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
