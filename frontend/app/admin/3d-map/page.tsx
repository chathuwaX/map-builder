"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

// Dynamically import to avoid SSR issues with SVG animations
const NavigationMap = dynamic(() => import("@/components/app/isometric-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-[#F5F7FA]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500 font-medium">
          Loading Navigation Map…
        </span>
      </div>
    </div>
  ),
});

function ErrorFallback({ error }: FallbackProps) {
  const err = error as Error;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 p-8 text-red-900 z-50 absolute inset-0">
      <h2 className="text-2xl font-bold mb-4">
        Something went wrong rendering the Map:
      </h2>
      <pre className="text-sm bg-white p-4 rounded shadow overflow-auto max-w-3xl whitespace-pre-wrap">
        {err.message}
      </pre>
      <pre className="text-xs bg-gray-100 p-4 rounded shadow overflow-auto max-w-3xl mt-4 whitespace-pre-wrap">
        {err.stack}
      </pre>
    </div>
  );
}

export default function NavigationViewer() {
  const [mapData, setMapData] = useState<{
    nodes: any[];
    buildings: any;
    edges: any[];
  } | null>(null);
  const [floor, setFloor] = useState("floor_1");

  useEffect(() => {
    fetch(`/api/map?floor=${floor}`)
      .then((res) => res.json())
      .then((data) => {
        const buildings = data.buildings || {};
        const edges = data.edges || [];
        const nodes = (data.nodes || []).map((n: any) => {
          const b = buildings[n.building] || { position: [0, 0, 0] };
          return {
            ...n,
            world: [b.position[0] + n.x, 0, b.position[2] + n.z],
          };
        });
        setMapData({ nodes, buildings, edges });
      })
      .catch((err) => console.error("Failed to load map data", err));
  }, [floor]);

  return (
    <div className="w-full h-screen relative flex flex-col bg-[#0F172A]">
      <div className="absolute top-4 left-4 z-10 bg-slate-800/80 p-3 rounded-xl border border-slate-700 backdrop-blur-sm shadow-xl flex items-center gap-3">
        <span className="text-slate-300 font-medium text-sm">
          Select Floor:
        </span>
        <select
          className="bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm outline-none"
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
        >
          <option value="floor_1">Floor 1</option>
          <option value="floor_2">Floor 2</option>
          <option value="floor_3">Floor 3</option>
          <option value="floor_4">Floor 4</option>
        </select>
      </div>

      {!mapData ? (
        <div className="w-full flex-1 flex items-center justify-center text-slate-400">
          Loading floor data...
        </div>
      ) : (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <NavigationMap
            nodes={mapData.nodes}
            buildings={mapData.buildings}
            edges={mapData.edges}
            isStandalone={true}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
