'use client';

import * as React from "react";
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

interface XScrollProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {}

export default function XScroll({ children, className, ...props }: XScrollProps) {
  return (
    <div className="flex">
      <ScrollArea className={cn('w-full flex-1', className)} {...props}>
        {children}
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

