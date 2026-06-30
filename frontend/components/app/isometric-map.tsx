'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Box, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';

// Animated glowing path that flows toward the destination
const GlowingPath = ({ points }: { points: [number, number, number][] }) => {
  const lineRef = useRef<any>(null);

  // Calculate approximate path length to scale the shimmer appropriately
  const pathLength = useMemo(() => {
    let len = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1][0] - points[i][0];
      const dy = points[i + 1][1] - points[i][1];
      const dz = points[i + 1][2] - points[i][2];
      len += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    return len;
  }, [points]);

  useFrame((_, delta) => {
    if (lineRef.current?.material) {
      // Fast sweeping motion toward the destination
      lineRef.current.material.dashOffset -= delta * 12;
    }
  });

  if (points.length < 2) return null;

  // The highlight (shimmer) length
  const dashSize = Math.max(1, pathLength * 0.05); // Shimmer length
  // The gap is large so the shimmer looks like a discrete moving pulse
  const gapSize = Math.max(12, pathLength * 0.85);

  return (
    <group>
      {/* Base track: continuous solid green line (progress bar base) */}
      <Line
        points={points}
        color="#a20000"
        lineWidth={18}
        transparent
        opacity={0.8}
      />
      {/* Pulse track: bright sweeping shimmer (leading edge glow) */}
      <Line
        ref={lineRef}
        points={points}
        color="#fdfdfd"
        lineWidth={18}
        transparent
        opacity={0.8}
        dashed
        dashSize={dashSize}
        gapSize={gapSize}
      />
    </group>
  );
};

// Pulsing destination marker
const DestinationMarker = ({ position, label }: { position: [number, number, number], label: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + 0.3 + Math.sin(t * 3) * 0.2;
    }
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.3);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(t * 2) * 0.2;
    }
  });

  return (
    <group>
      {/* Pulsing ring on the ground */}
      <mesh ref={ringRef} position={[position[0], 0.05, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.9, 32]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Floating marker */}
      <mesh ref={meshRef} position={position}>
        <octahedronGeometry args={[0.3]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
      </mesh>
      {/* Label */}
      <Text
        position={[position[0], position[1] + 1.5, position[2]]}
        fontSize={0.5}
        color="#22c55e"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        📍 {label}
      </Text>
    </group>
  );
};

interface NavigationMapProps {
  path: number[][];         // Array of [x, y, z] world coordinates
  path_ids?: string[];      // Array of node IDs in the path
  directions?: string;      // Optional directions text
  nodes: any[];             // All nodes from the map
  buildings: any;           // Building positions/sizes
  edges?: any[];            // Edges to render all connections
  destination: string;      // Destination label
  onClose?: () => void;     // Close callback
  isStandalone?: boolean;   // Standalone mode for 3d-map page
}

const getRoomTheme = (label: string = '') => {
  const lower = label.toLowerCase();
  if (lower.includes('lecture')) return { color: '#3b82f6', icon: '👨‍🏫' };
  if (lower.includes('lab')) return { color: '#8b5cf6', icon: '🔬' };
  if (lower.includes('washroom')) {
    if (lower.includes('female')) return { color: '#1e3a8a', icon: '🚺' };
    if (lower.includes('male')) return { color: '#3b82f6', icon: '🚹' };
    return { color: '#0ea5e9', icon: '🚻' };
  }
  if (lower.includes('office') || lower.includes('director') || lower.includes('department') || lower.includes('division')) return { color: '#f59e0b', icon: '💼' };
  if (lower.includes('staircase')) return { color: '#64748b', icon: '🪜' };
  if (lower.includes('exit')) return { color: '#ef4444', icon: '🚪' };
  if (lower.includes('desk') || lower.includes('evaluator')) return { color: '#10b981', icon: '💁' };
  return { color: '#475569', icon: '📍' }; // default
};

export default function NavigationMap({ path = [], path_ids = [], nodes = [], buildings = {}, edges = [], destination = 'Destination', onClose, isStandalone = false }: Partial<NavigationMapProps>) {
  const [visible, setVisible] = useState(false);
  const [currentFloor, setCurrentFloor] = useState<string>('');

  const availableFloors = useMemo(() => {
    return Array.from(new Set(nodes.map(n => n.floor).filter(Boolean))).sort();
  }, [nodes]);

  const floorSequence = useMemo(() => {
    if (!path_ids || path_ids.length === 0) return availableFloors;
    const seq: string[] = [];
    path_ids.forEach(id => {
      const node = nodes.find(n => n.id === id);
      if (node?.floor && seq[seq.length - 1] !== node.floor) {
        seq.push(node.floor);
      }
    });
    return seq.length > 0 ? seq : availableFloors;
  }, [path_ids, nodes, availableFloors]);

  useEffect(() => {
    if (floorSequence.length > 0 && !currentFloor) {
      setCurrentFloor(floorSequence[0] as string);
    }
  }, [floorSequence, currentFloor]);

  useEffect(() => {
    // Animate in
    setTimeout(() => setVisible(true), 50);

    if (!isStandalone) {
      // Auto-dismiss after 20 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onClose?.(), 400);
      }, 20000);

      return () => clearTimeout(timer);
    }
  }, [onClose, isStandalone]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 400);
  };

  const pathPoints = useMemo(() => {
    if (!path || !path_ids) return [];
    const points: [number, number, number][] = [];
    for (let i = 0; i < path.length; i++) {
      const pId = path_ids[i];
      const node = nodes.find(n => n.id === pId);
      if (node && node.floor === currentFloor) {
        points.push([path[i][0], 0.3, path[i][2]]);
      }
    }
    return points;
  }, [path, path_ids, nodes, currentFloor]);

  const destNode = useMemo(() => {
    return nodes.find((n: any) => n.label?.toLowerCase() === destination.toLowerCase() && n.type !== 'waypoint');
  }, [nodes, destination]);

  const buildingEntries = useMemo(() => {
    return Object.entries(buildings || {}).filter(([_, b]: [string, any]) => !b.floor || b.floor === currentFloor) as [string, any][];
  }, [buildings, currentFloor]);

  const floorNodes = useMemo(() => {
    return nodes.filter(n => n.floor === currentFloor && n.type !== 'waypoint');
  }, [nodes, currentFloor]);

  return (
    <div
      className={isStandalone
        ? `w-full h-full bg-[#0F172A] flex flex-col items-center justify-center transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`
        : `fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`
      }
      onClick={isStandalone ? undefined : handleClose}
    >
      {/* Header */}
      {!isStandalone && (
        <div className="absolute top-6 left-0 right-0 flex justify-center z-10" onClick={(e) => e.stopPropagation()}>
          <div className="bg-gray-900/90 border border-gray-700 rounded-2xl px-8 py-4 flex items-center gap-4 shadow-2xl">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white text-lg font-bold">Navigating to: {destination}</span>
            <button onClick={handleClose} className="ml-4 text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
          </div>
        </div>
      )}

      {/* Floor Switcher */}
      {!isStandalone && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
          <div className="text-slate-300 text-xs font-bold text-center uppercase tracking-widest mb-1">Navigation Route</div>
          {floorSequence.map((f, idx) => {
            let badge = '';
            if (idx === 0 && floorSequence.length > 1) badge = '🏁 Start';
            else if (idx === floorSequence.length - 1 && floorSequence.length > 1) badge = '📍 Dest';
            else if (floorSequence.length > 1) badge = '⬇️ Next';

            return (
              <button
                key={`${f}-${idx}`}
                onClick={(e) => { e.stopPropagation(); setCurrentFloor(f as string); }}
                className={`relative px-5 py-3 rounded-2xl font-bold shadow-2xl border-2 transition-all duration-300 flex flex-col items-center ${currentFloor === f
                  ? 'bg-blue-600 border-blue-400 text-white scale-110'
                  : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700 hover:scale-105'
                  }`}
              >
                {(f as string).replace('floor_', 'Floor ')}
                {badge && <span className={`text-[10px] mt-1 opacity-90 ${currentFloor === f ? 'text-blue-100' : 'text-slate-400'}`}>{badge}</span>}

                {/* Connector line for sequence visual */}
                {idx < floorSequence.length - 1 && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-slate-600" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 3D Canvas */}
      <div className="w-full h-full" onClick={(e) => e.stopPropagation()}>
        <Canvas shadows orthographic camera={{ position: [20, 20, 20], zoom: 35 }}>
          <React.Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
            <pointLight position={[0, 5, 0]} intensity={0.5} color="#ef4444" distance={15} />

            {/* Building Grids */}
            {buildingEntries.map(([bId, b]) => (
              <group key={bId} position={b.position}>
                {/* Floor Cells (skipping removed cells) */}
                {Array.from({ length: Math.round(b.size[0] || 1) }).map((_, c) =>
                  Array.from({ length: Math.round(b.size[1] || 1) }).map((_, r) => {
                    const cellId = `${c}_${r}`;
                    if (b.removed_cells?.includes(cellId)) return null;
                    const cx = c - b.size[0] / 2 + 0.5;
                    const cz = r - b.size[1] / 2 + 0.5;
                    return (
                      <mesh key={cellId} position={[cx, -0.5, cz]} receiveShadow>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshStandardMaterial color={b.color} />
                      </mesh>
                    );
                  })
                )}
                <Text position={[0, 0.02, b.size[1] / 2 + 0.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.7} color={b.color} fontWeight="bold" textAlign="center">
                  {b.name.replace(' ', '\n')}
                </Text>
              </group>
            ))}

            {/* Room Blocks */}
            {floorNodes.map((node: any, index: number) => {
              const size = node.size || [1, 1, 1];
              const isDestination = node.label?.toLowerCase() === destination.toLowerCase();
              const theme = getRoomTheme(node.label);
              const boxColor = isDestination ? '#22c55e' : theme.color;

              // Elevate ALL labels and alternate heights to prevent crossing
              const staggerHeight = 1.0 + (index % 2) * 0.8;
              const textY = size[1] / 2 + staggerHeight;

              return (
                <group key={node.id} position={[node.world[0], size[1] / 2, node.world[2]]}>
                  <Box args={size} castShadow>
                    <meshStandardMaterial
                      color={boxColor}
                      emissive={isDestination ? '#22c55e' : '#000000'}
                      emissiveIntensity={isDestination ? 0.3 : 0}
                    />
                  </Box>

                  {/* Connecting Line and Arrow for ALL items */}
                  <group>
                    <Line points={[[0, size[1] / 2, 0], [0, textY, 0]]} color="#ffffff" opacity={0.4} transparent lineWidth={1.5} />
                    <mesh position={[0, size[1] / 2 + 0.1, 0]} rotation={[Math.PI, 0, 0]}>
                      <coneGeometry args={[0.06, 0.2, 8]} />
                      <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
                    </mesh>
                  </group>

                  <Text position={[0, textY, 0]} fontSize={0.28} color="#ffffff" anchorX="center" anchorY="bottom" fontWeight="bold" textAlign="center" lineHeight={1.1}>
                    {`${theme.icon} ${node.label.replace(' ', '\n')}`}
                  </Text>
                </group>
              );
            })}

            {/* Glowing Animated Path */}
            {pathPoints.length >= 2 && <GlowingPath points={pathPoints} />}

            {/* All Edges and Waypoints are hidden as requested */}
            {destNode && destNode.floor === currentFloor && (
              <DestinationMarker
                position={[destNode.world[0], destNode.world[1], destNode.world[2]]}
                label={destination}
              />
            )}

            <OrbitControls
              enableZoom={true}
              enablePan={true}
              maxPolarAngle={Math.PI / 2 - 0.1}
              target={isStandalone ? [4, 0, -4] : [0, 0, 0]}
            />
          </React.Suspense>
        </Canvas>
      </div>

      {/* Bottom hint */}
      {!isStandalone && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
          <p className="text-gray-400 text-sm">Tap anywhere to close • Auto-closes in 20 seconds</p>
        </div>
      )}
    </div>
  );
}