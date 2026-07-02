"use client";

export default function MapPage() {
  return <MapView />;
}

// Dynamic import below — keeps this file clean
import dynamic from "next/dynamic";
const MapView = dynamic(() => import("@/components/app/map-view"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-[#0a0f1e]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-white/50 text-sm font-medium tracking-wide">Loading map…</span>
      </div>
    </div>
  ),
});
