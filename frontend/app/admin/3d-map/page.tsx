'use client';

import dynamic from 'next/dynamic';

// Dynamically import to avoid SSR issues with SVG animations
const NavigationMap = dynamic(
  () => import('@/components/app/isometric-map'),
  { ssr: false, loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-[#F5F7FA]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500 font-medium">Loading Navigation Map…</span>
      </div>
    </div>
  )}
);

export default function NavigationViewer() {
  return (
    <div className="w-full h-screen">
      <NavigationMap />
    </div>
  );
}
