"use client";

import { LoaderOne } from "@/components/ui/unique-loader-components";

export default function RootLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-black/80">
      <LoaderOne />
    </div>
  );
}

