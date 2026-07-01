"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  Save,
  MapPin,
  Layers,
  PlusCircle,
  Link,
  Edit,
  Trash2,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

interface Node2D {
  id: string;
  x: number;
  z: number;
  building: "building_1" | "building_2";
  label: string;
  size?: [number, number, number];
  type?: "room" | "waypoint";
}

interface Edge2D {
  id: string;
  source: string;
  target: string;
  visible?: boolean;
}

interface Building2D {
  position: [number, number, number];
  size: [number, number];
  color: string;
  name: string;
  removed_cells?: string[];
}

export default function MapBuilder2D() {
  const [nodes, setNodes] = useState<Node2D[]>([]);
  const [edges, setEdges] = useState<Edge2D[]>([]);
  const [mode, setMode] = useState<
    | "add_node"
    | "add_waypoint"
    | "add_edge"
    | "edit_room"
    | "edit_building"
    | "cell_remover"
  >("add_node");

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<
    "building_1" | "building_2" | null
  >(null);

  const [buildings, setBuildings] = useState<
    Record<"building_1" | "building_2", Building2D>
  >({
    building_1: {
      position: [-5, 0, -1],
      size: [10, 15],
      color: "#ffffff",
      name: "Building 1",
    },
    building_2: {
      position: [10, 0, -1],
      size: [20, 16],
      color: "#ffffff",
      name: "Building 2",
    },
  });

  const [currentFloor, setCurrentFloor] = useState<string>("floor_1");

  // Pan and zoom states for editing canvas
  const [zoom, setZoom] = useState(1.2);
  const [pan, setPan] = useState({ x: 100, y: 50 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Drag states for nodes/buildings
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [draggingBuildingId, setDraggingBuildingId] = useState<
    "building_1" | "building_2" | null
  >(null);
  const dragStartSVG = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Load map data from API
  const fetchMapData = useCallback(() => {
    fetch(`/api/map?floor=${currentFloor}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
        if (data.buildings) setBuildings(data.buildings);
      })
      .catch(console.error);
  }, [currentFloor]);

  useEffect(() => {
    fetchMapData();
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSelectedBuildingId(null);
  }, [currentFloor, fetchMapData]);

  // Save map data to API
  const handleSave = async () => {
    try {
      await fetch(`/api/map?floor=${currentFloor}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges, buildings, format: "3d" }), // maintain format tag
      });
      alert(
        `Map successfully saved to ${currentFloor.replace("_", " ").toUpperCase()}!`,
      );
    } catch (e) {
      alert("Error saving map data.");
    }
  };

  // Keyboard Delete support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId) {
          setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
          setEdges((prev) =>
            prev.filter(
              (edge) =>
                edge.source !== selectedNodeId &&
                edge.target !== selectedNodeId,
            ),
          );
          setSelectedNodeId(null);
        } else if (selectedEdgeId) {
          setEdges((prev) => prev.filter((edge) => edge.id !== selectedEdgeId));
          setSelectedEdgeId(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, selectedEdgeId]);

  // ── Coordinates and Mapping ──
  // Compute viewport bounds
  const boundingBox = useMemo(() => {
    let minX = -15,
      maxX = 25,
      minZ = -15,
      maxZ = 20;
    const bVals = Object.values(buildings || {});
    if (bVals.length > 0) {
      let tempMinX = Infinity,
        tempMaxX = -Infinity,
        tempMinZ = Infinity,
        tempMaxZ = -Infinity;
      bVals.forEach((b) => {
        if (!b || !b.position || !b.size) return;
        const bx = b.position[0],
          bz = b.position[2];
        const hw = b.size[0] / 2,
          hh = b.size[1] / 2;
        tempMinX = Math.min(tempMinX, bx - hw);
        tempMaxX = Math.max(tempMaxX, bx + hw);
        tempMinZ = Math.min(tempMinZ, bz - hh);
        tempMaxZ = Math.max(tempMaxZ, bz + hh);
      });
      if (tempMinX !== Infinity && tempMaxX !== -Infinity) {
        minX = tempMinX;
        maxX = tempMaxX;
        minZ = tempMinZ;
        maxZ = tempMaxZ;
      }
    }
    return { minX: minX - 4, maxX: maxX + 4, minZ: minZ - 4, maxZ: maxZ + 4 };
  }, [buildings]);

  const SVG_W = 1000;
  const SVG_H = 650;
  const PAD = 50;

  const scale = useMemo(() => {
    const wW = boundingBox.maxX - boundingBox.minX;
    return (SVG_W - 2 * PAD) / wW;
  }, [boundingBox]);

  // Map world x, z -> SVG x, y
  const toSVG = useCallback(
    (wx: number, wz: number): [number, number] => [
      PAD + (wx - boundingBox.minX) * scale,
      PAD + (wz - boundingBox.minZ) * scale,
    ],
    [boundingBox, scale],
  );

  // Map SVG x, y -> world x, z
  const toWorld = useCallback(
    (sx: number, sy: number): [number, number] => [
      boundingBox.minX + (sx - PAD) / scale,
      boundingBox.minZ + (sy - PAD) / scale,
    ],
    [boundingBox, scale],
  );

  // Helper to translate cursor coordinates using SVG CTM
  const getSVGCoords = (e: React.MouseEvent<any> | React.PointerEvent<any>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const transformed = point.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  // Color categories for nodes
  const getNodeColor = (label: string, isSel: boolean) => {
    if (isSel) return "#ef4444"; // Red for selected

    const lower = (label || "").toLowerCase();
    if (lower.includes("lab") || lower.includes("laboratory")) return "#3b82f6"; // Blue
    if (
      lower.includes("lecture") ||
      lower.includes("hall") ||
      lower.includes("auditorium")
    )
      return "#f97316"; // Orange
    if (lower.includes("washroom") || lower.includes("toilet"))
      return "#14b8a6"; // Teal
    if (
      lower.includes("office") ||
      lower.includes("room") ||
      lower.includes("division") ||
      lower.includes("department")
    )
      return "#8b5cf6"; // Purple
    if (lower.includes("stair") || lower.includes("elevator")) return "#eab308"; // Yellow
    if (
      lower.includes("entrance") ||
      lower.includes("exit") ||
      lower.includes("front desk")
    )
      return "#22c55e"; // Green

    return "#4b5563"; // Slate
  };

  // ── Mouse / Touch dragging and click actions ──

  const handleSVGPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Left click only
    if (e.button !== 0) return;

    // Check if we are panning (Middle click or Spacebar key drag)
    if (mode === "edit_building" && selectedBuildingId) return;
    if (mode === "edit_room" && selectedNodeId) return;

    setIsPanning(true);
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleSVGPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svgCoords = getSVGCoords(e);

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
    } else if (draggingNodeId) {
      // Dragging node
      const dx = (svgCoords.x - dragStartSVG.current.x) / scale;
      const dz = (svgCoords.y - dragStartSVG.current.y) / scale;

      // Snapping node relative pos to nearest 0.5 units
      const nextX = Math.round((dragStartPos.current.x + dx) * 2) / 2;
      const nextZ = Math.round((dragStartPos.current.y + dz) * 2) / 2;

      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNodeId ? { ...n, x: nextX, z: nextZ } : n,
        ),
      );
    } else if (draggingBuildingId) {
      // Dragging building
      const dx = (svgCoords.x - dragStartSVG.current.x) / scale;
      const dz = (svgCoords.y - dragStartSVG.current.y) / scale;

      const nextX = Math.round(dragStartPos.current.x + dx);
      const nextZ = Math.round(dragStartPos.current.y + dz);

      setBuildings((prev) => ({
        ...prev,
        [draggingBuildingId]: {
          ...prev[draggingBuildingId],
          position: [nextX, 0, nextZ],
        },
      }));
    }
  };

  const handleSVGPointerUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setDraggingBuildingId(null);
  };

  // Click on building grid
  const handleGridClick = (
    e: React.MouseEvent<any>,
    bId: "building_1" | "building_2",
  ) => {
    if (draggingNodeId || draggingBuildingId || isPanning) return;
    e.stopPropagation();

    const svgCoords = getSVGCoords(e);
    const [wx, wz] = toWorld(svgCoords.x, svgCoords.y);
    const b = buildings[bId];

    // Compute relative local coordinates on the building grid
    const localX = Math.round(wx - b.position[0]);
    const localZ = Math.round(wz - b.position[2]);

    if (mode === "cell_remover") {
      const cellKey = `${localX},${localZ}`;
      setBuildings((prev) => {
        const currentBuilding = prev[bId];
        const removed = currentBuilding.removed_cells || [];
        const nextRemoved = removed.includes(cellKey)
          ? removed.filter((c) => c !== cellKey)
          : [...removed, cellKey];
        return {
          ...prev,
          [bId]: {
            ...currentBuilding,
            removed_cells: nextRemoved,
          },
        };
      });
      return;
    }

    if (mode === "edit_building") {
      setSelectedBuildingId(bId);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      return;
    }

    if (mode === "add_node" || mode === "add_waypoint") {
      // Verify collision at cell
      if (
        nodes.some(
          (n) => n.x === localX && n.z === localZ && n.building === bId,
        )
      )
        return;

      if (mode === "add_node") {
        const label = prompt(
          "Enter Room Label name (e.g. Dean Office, Lab 4):",
        );
        if (label) {
          setNodes((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              x: localX,
              z: localZ,
              building: bId,
              label,
              type: "room",
              size: [1, 1.5, 1],
            },
          ]);
        }
      } else {
        setNodes((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            x: localX,
            z: localZ,
            building: bId,
            label: "Waypoint",
            type: "waypoint",
          },
        ]);
      }
    }
  };

  // Click on node
  const handleNodePointerDown = (
    e: React.PointerEvent<any>,
    nodeId: string,
  ) => {
    e.stopPropagation();
    const svgCoords = getSVGCoords(e);

    if (mode === "edit_room") {
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
      setSelectedBuildingId(null);

      // Start drag node
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setDraggingNodeId(nodeId);
        dragStartSVG.current = { x: svgCoords.x, y: svgCoords.y };
        dragStartPos.current = { x: node.x, y: node.z };
      }
    } else if (mode === "add_edge") {
      if (!selectedNodeId) {
        setSelectedNodeId(nodeId);
      } else {
        if (selectedNodeId !== nodeId) {
          // Check duplicate path
          const exists = edges.some(
            (edge) =>
              (edge.source === selectedNodeId && edge.target === nodeId) ||
              (edge.source === nodeId && edge.target === selectedNodeId),
          );
          if (!exists) {
            setEdges((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                source: selectedNodeId,
                target: nodeId,
              },
            ]);
          }
        }
        setSelectedNodeId(null);
      }
    }
  };

  // Click on building boundary for dragging
  const handleBuildingBorderPointerDown = (
    e: React.PointerEvent<any>,
    bId: "building_1" | "building_2",
  ) => {
    if (mode !== "edit_building") return;
    e.stopPropagation();
    setSelectedBuildingId(bId);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);

    const svgCoords = getSVGCoords(e);
    const b = buildings[bId];
    setDraggingBuildingId(bId);
    dragStartSVG.current = { x: svgCoords.x, y: svgCoords.y };
    dragStartPos.current = { x: b.position[0], y: b.position[2] };
  };

  // Node position helper (world space)
  const getNodePositionWorld = (node: Node2D): [number, number] => {
    const b = buildings[node.building] || { position: [0, 0, 0] };
    return [b.position[0] + (node.x ?? 0), b.position[2] + (node.z ?? 0)];
  };

  return (
    <div className="flex flex-col h-screen bg-[#111827] text-white font-sans">
      {/* ── TOP CONTROL BAR ── */}
      <div className="bg-[#1f2937] px-6 py-4 flex items-center justify-between border-b border-gray-800 shadow-md">
        <div className="flex items-center gap-4">
          <Layers className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold tracking-tight">
            2D Schematic Map Builder
          </h1>
          <select
            className="bg-[#374151] border border-gray-700 rounded-lg px-3 py-1.5 font-bold outline-none focus:border-blue-500 text-white cursor-pointer"
            value={currentFloor}
            onChange={(e) => setCurrentFloor(e.target.value)}
          >
            <option value="floor_1">Floor 1</option>
            <option value="floor_2">Floor 2</option>
            <option value="floor_3">Floor 3</option>
            <option value="floor_4">Floor 4</option>
            <option value="basement">Basement</option>
            <option value="outdoor">Outdoor Campus</option>
          </select>
        </div>

        <div className="flex gap-2.5">
          <button
            className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all ${
              mode === "add_node"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            onClick={() => {
              setMode("add_node");
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
          >
            <PlusCircle className="w-4 h-4" />+ Room
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all ${
              mode === "add_waypoint"
                ? "bg-teal-600 text-white shadow-lg"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            onClick={() => {
              setMode("add_waypoint");
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
          >
            <MapPin className="w-4 h-4" />
            📍 Waypoint
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all ${
              mode === "add_edge"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            onClick={() => {
              setMode("add_edge");
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
          >
            <Link className="w-4 h-4" />↗ Connect Path
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all ${
              mode === "edit_room"
                ? "bg-rose-600 text-white shadow-lg"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            onClick={() => {
              setMode("edit_room");
              setSelectedBuildingId(null);
            }}
          >
            <Edit className="w-4 h-4" />
            📦 Edit Items
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all ${
              mode === "edit_building"
                ? "bg-amber-600 text-white shadow-lg"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            onClick={() => {
              setMode("edit_building");
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
          >
            <Move className="w-4 h-4" />
            🏗️ Edit Buildings
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all ${
              mode === "cell_remover"
                ? "bg-red-600 text-white shadow-lg animate-pulse"
                : "bg-gray-700 hover:bg-gray-600 text-red-400"
            }`}
            onClick={() => {
              setMode("cell_remover");
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
              setSelectedBuildingId(null);
            }}
          >
            <Trash2 className="w-4 h-4" />
            🗑️ Cell Remover
          </button>

          <div className="w-px bg-gray-800 mx-2" />

          {/* Clear all navigation (waypoints + edges) */}
          <button
            onClick={() => {
              if (
                !confirm(
                  "Remove ALL waypoints and edges from this floor? Rooms are kept. This cannot be undone until you save.",
                )
              )
                return;
              setNodes((prev) => prev.filter((n) => n.type !== "waypoint"));
              setEdges([]);
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            className="px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 bg-orange-900 hover:bg-orange-700 text-orange-300 border border-orange-700 transition-all"
            title="Remove all waypoints and edges — rooms stay intact"
          >
            <Trash2 className="w-4 h-4" />
            Clear Nav
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg font-bold bg-green-500 hover:bg-green-600 text-white shadow-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Map
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE AREA ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* SVG Drawing Canvas */}
        <div className="flex-1 relative border-r border-gray-800 bg-[#0f172a] overflow-hidden select-none">
          {/* Zoom & Navigation Help overlay */}
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg text-xs border border-gray-800 z-10 space-y-1">
            <p className="text-gray-300">
              Mode:{" "}
              <b className="text-blue-400 font-bold uppercase">
                {mode.replace("_", " ")}
              </b>
            </p>
            <p className="text-gray-400">
              Drag canvas to pan · Use mouse wheel to zoom
            </p>
          </div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={`w-full h-full ${mode === "cell_remover" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
            onPointerDown={handleSVGPointerDown}
            onPointerMove={handleSVGPointerMove}
            onPointerUp={handleSVGPointerUp}
            onPointerLeave={handleSVGPointerUp}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Defs */}
            <defs>
              <pattern
                id="grid-dots"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="1" fill="#1e293b" />
              </pattern>
            </defs>

            {/* Grid dot background */}
            <rect width={SVG_W} height={SVG_H} fill="url(#grid-dots)" />

            {/* Transforming group representing pan & zoom */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* 1. Draw Building Outlines (Clickable Grids) */}
              {(
                Object.keys(buildings) as Array<"building_1" | "building_2">
              ).map((bId) => {
                const b = buildings[bId];
                const isSelected =
                  selectedBuildingId === bId && mode === "edit_building";

                // Building boundary coordinates in SVG
                const [sx, sy] = toSVG(
                  b.position[0] - b.size[0] / 2,
                  b.position[2] - b.size[1] / 2,
                );
                const w = b.size[0] * scale;
                const h = b.size[1] * scale;

                return (
                  <g key={bId}>
                    {/* Building Area grid background */}
                    <rect
                      x={sx}
                      y={sy}
                      width={w}
                      height={h}
                      rx={6}
                      fill="#ffffff"
                      stroke={isSelected ? "#f59e0b" : "#374151"}
                      strokeWidth={isSelected ? 3 : 1.5}
                      strokeDasharray={isSelected ? "none" : "6 4"}
                      onClick={(e) => handleGridClick(e, bId)}
                      onPointerDown={(e) =>
                        handleBuildingBorderPointerDown(e, bId)
                      }
                      className="cursor-pointer hover:stroke-blue-400 transition-colors"
                    />

                    {/* Internal building cell grid lines */}
                    <path
                      d={Array.from({ length: Math.round(b.size[0]) })
                        .map((_, i) => `M ${sx + i * scale} ${sy} v ${h}`)
                        .concat(
                          Array.from({ length: Math.round(b.size[1]) }).map(
                            (_, i) => `M ${sx} ${sy + i * scale} h ${w}`,
                          ),
                        )
                        .join(" ")}
                      fill="none"
                      stroke="#f3f4f6"
                      strokeWidth={0.5}
                      className="pointer-events-none"
                    />

                    {/* Render removed cells as shaded/empty spots */}
                    {(b.removed_cells || []).map((cellKey) => {
                      const [cx, cz] = cellKey.split(",").map(Number);
                      const wx = b.position[0] + cx;
                      const wz = b.position[2] + cz;
                      const [csx, csy] = toSVG(wx - 0.5, wz - 0.5);
                      const cellSize = scale;
                      return (
                        <rect
                          key={cellKey}
                          x={csx}
                          y={csy}
                          width={cellSize}
                          height={cellSize}
                          fill="#0f172a"
                          stroke="#1e293b"
                          strokeWidth={0.5}
                          onClick={(e) => handleGridClick(e, bId)}
                          className="cursor-pointer"
                        />
                      );
                    })}

                    {/* Building Name Label */}
                    <text
                      x={sx + 10}
                      y={sy + 20}
                      fill="#9ca3af"
                      fontSize={11}
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      className="pointer-events-none"
                    >
                      {b.name.toUpperCase()}
                    </text>
                  </g>
                );
              })}

              {/* 2. Draw Edges (Path Connections) */}
              {edges.map((edge) => {
                const srcNode = nodes.find((n) => n.id === edge.source);
                const tgtNode = nodes.find((n) => n.id === edge.target);
                if (!srcNode || !tgtNode) return null;

                const [x1, y1] = toSVG(...getNodePositionWorld(srcNode));
                const [x2, y2] = toSVG(...getNodePositionWorld(tgtNode));
                const isSelected =
                  selectedEdgeId === edge.id && mode === "edit_room";

                return (
                  <line
                    key={edge.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isSelected ? "#ef4444" : "#ef4444"}
                    strokeWidth={isSelected ? 5 : 2.5}
                    strokeDasharray={edge.visible === false ? "3 3" : "none"}
                    className="cursor-pointer hover:stroke-yellow-400 transition-colors"
                    onClick={(e) => {
                      if (mode === "edit_room") {
                        e.stopPropagation();
                        setSelectedEdgeId(edge.id);
                        setSelectedNodeId(null);
                        setSelectedBuildingId(null);
                      }
                    }}
                    onDoubleClick={(e) => {
                      if (mode === "edit_room") {
                        e.stopPropagation();
                        setEdges((prev) =>
                          prev.filter((ed) => ed.id !== edge.id),
                        );
                        setSelectedEdgeId(null);
                      }
                    }}
                  />
                );
              })}

              {/* 3. Draw Nodes (Rooms & Waypoints) */}
              {nodes.map((node) => {
                const [x, y] = toSVG(...getNodePositionWorld(node));
                const isSelected =
                  selectedNodeId === node.id &&
                  (mode === "edit_room" || mode === "add_edge");

                if (node.type === "waypoint") {
                  // Waypoint circle marker
                  return (
                    <circle
                      key={node.id}
                      cx={x}
                      cy={y}
                      r={6}
                      fill={isSelected ? "#ef4444" : "#14b8a6"}
                      stroke="white"
                      strokeWidth={1.5}
                      className="cursor-pointer hover:scale-125 transition-transform"
                      onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setNodes((prev) =>
                          prev.filter((n) => n.id !== node.id),
                        );
                        setEdges((prev) =>
                          prev.filter(
                            (ed) =>
                              ed.source !== node.id && ed.target !== node.id,
                          ),
                        );
                        setSelectedNodeId(null);
                      }}
                    />
                  );
                }

                // Room block
                const w = node.size?.[0] || 1;
                const h = node.size?.[2] || 1;
                const rx = x - (w * scale) / 2;
                const ry = y - (h * scale) / 2;
                const pw = w * scale;
                const ph = h * scale;

                return (
                  <g key={node.id}>
                    <rect
                      x={rx}
                      y={ry}
                      width={pw}
                      height={ph}
                      rx={3}
                      fill={getNodeColor(node.label, isSelected)}
                      stroke={isSelected ? "#ffffff" : "#d1d5db"}
                      strokeWidth={isSelected ? 2 : 1}
                      className="cursor-pointer hover:stroke-yellow-400 transition-colors"
                      onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setNodes((prev) =>
                          prev.filter((n) => n.id !== node.id),
                        );
                        setEdges((prev) =>
                          prev.filter(
                            (ed) =>
                              ed.source !== node.id && ed.target !== node.id,
                          ),
                        );
                        setSelectedNodeId(null);
                      }}
                    />
                    <text
                      x={x}
                      y={y}
                      fill="white"
                      fontSize={8}
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="pointer-events-none select-none"
                    >
                      {node.label.substring(0, 12)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Floating Canvas Action buttons */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(8, z * 1.25))}
              className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center hover:bg-gray-700 text-white"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z / 1.25))}
              className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center hover:bg-gray-700 text-white"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoom(1.2);
                setPan({ x: 100, y: 50 });
              }}
              className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center hover:bg-gray-700 text-white"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── SIDEBAR PANEL FOR EDITING PROPERTIES ── */}
        <div className="w-[300px] bg-[#1f2937] p-5 flex flex-col gap-5 border-l border-gray-800">
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
              Item Editor
            </h2>
            <div className="h-px bg-gray-800 w-full" />
          </div>

          {/* Edit Building Mode */}
          {mode === "edit_building" && selectedBuildingId && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-amber-500">
                Building Settings
              </h3>
              <div>
                <label className="text-xs text-gray-400 uppercase font-semibold">
                  Building Name
                </label>
                <input
                  type="text"
                  value={buildings[selectedBuildingId].name}
                  onChange={(e) =>
                    setBuildings({
                      ...buildings,
                      [selectedBuildingId]: {
                        ...buildings[selectedBuildingId],
                        name: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-semibold">
                    Width (X)
                  </label>
                  <input
                    type="number"
                    value={buildings[selectedBuildingId].size[0]}
                    onChange={(e) =>
                      setBuildings({
                        ...buildings,
                        [selectedBuildingId]: {
                          ...buildings[selectedBuildingId],
                          size: [
                            Number(e.target.value),
                            buildings[selectedBuildingId].size[1],
                          ],
                        },
                      })
                    }
                    className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-semibold">
                    Depth (Z)
                  </label>
                  <input
                    type="number"
                    value={buildings[selectedBuildingId].size[1]}
                    onChange={(e) =>
                      setBuildings({
                        ...buildings,
                        [selectedBuildingId]: {
                          ...buildings[selectedBuildingId],
                          size: [
                            buildings[selectedBuildingId].size[0],
                            Number(e.target.value),
                          ],
                        },
                      })
                    }
                    className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-semibold">
                    Pos X
                  </label>
                  <input
                    type="number"
                    value={buildings[selectedBuildingId].position[0]}
                    onChange={(e) =>
                      setBuildings({
                        ...buildings,
                        [selectedBuildingId]: {
                          ...buildings[selectedBuildingId],
                          position: [
                            Number(e.target.value),
                            buildings[selectedBuildingId].position[1],
                            buildings[selectedBuildingId].position[2],
                          ],
                        },
                      })
                    }
                    className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-semibold">
                    Pos Z
                  </label>
                  <input
                    type="number"
                    value={buildings[selectedBuildingId].position[2]}
                    onChange={(e) =>
                      setBuildings({
                        ...buildings,
                        [selectedBuildingId]: {
                          ...buildings[selectedBuildingId],
                          position: [
                            buildings[selectedBuildingId].position[0],
                            buildings[selectedBuildingId].position[1],
                            Number(e.target.value),
                          ],
                        },
                      })
                    }
                    className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Edit Items Mode */}
          {mode === "edit_room" && selectedNodeId && (
            <div className="space-y-4">
              {(() => {
                const node = nodes.find((n) => n.id === selectedNodeId);
                if (!node) return null;
                const size = node.size || [1, 1.5, 1];
                const isWaypoint = node.type === "waypoint";

                return (
                  <>
                    <h3 className="text-lg font-bold text-rose-500">
                      {isWaypoint ? "Waypoint Settings" : "Room Settings"}
                    </h3>

                    <div>
                      <label className="text-xs text-gray-400 uppercase font-semibold">
                        Name Label
                      </label>
                      <input
                        type="text"
                        value={node.label}
                        onChange={(e) =>
                          setNodes(
                            nodes.map((n) =>
                              n.id === node.id
                                ? { ...n, label: e.target.value }
                                : n,
                            ),
                          )
                        }
                        className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 uppercase font-semibold">
                          Rel X
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={node.x}
                          onChange={(e) =>
                            setNodes(
                              nodes.map((n) =>
                                n.id === node.id
                                  ? { ...n, x: Number(e.target.value) }
                                  : n,
                              ),
                            )
                          }
                          className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 uppercase font-semibold">
                          Rel Z
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={node.z}
                          onChange={(e) =>
                            setNodes(
                              nodes.map((n) =>
                                n.id === node.id
                                  ? { ...n, z: Number(e.target.value) }
                                  : n,
                              ),
                            )
                          }
                          className="w-full bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none"
                        />
                      </div>
                    </div>

                    {!isWaypoint && (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-400 uppercase font-semibold">
                            Width
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={size[0]}
                            onChange={(e) =>
                              setNodes(
                                nodes.map((n) =>
                                  n.id === node.id
                                    ? {
                                        ...n,
                                        size: [
                                          Number(e.target.value),
                                          size[1],
                                          size[2],
                                        ],
                                      }
                                    : n,
                                ),
                              )
                            }
                            className="w-full bg-[#111827] border border-gray-700 rounded-lg px-2 py-2 text-xs mt-1 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 uppercase font-semibold">
                            Height
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={size[1]}
                            onChange={(e) =>
                              setNodes(
                                nodes.map((n) =>
                                  n.id === node.id
                                    ? {
                                        ...n,
                                        size: [
                                          size[0],
                                          Number(e.target.value),
                                          size[2],
                                        ],
                                      }
                                    : n,
                                ),
                              )
                            }
                            className="w-full bg-[#111827] border border-gray-700 rounded-lg px-2 py-2 text-xs mt-1 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 uppercase font-semibold">
                            Depth
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={size[2]}
                            onChange={(e) =>
                              setNodes(
                                nodes.map((n) =>
                                  n.id === node.id
                                    ? {
                                        ...n,
                                        size: [
                                          size[0],
                                          size[1],
                                          Number(e.target.value),
                                        ],
                                      }
                                    : n,
                                ),
                              )
                            }
                            className="w-full bg-[#111827] border border-gray-700 rounded-lg px-2 py-2 text-xs mt-1 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete this ${isWaypoint ? "waypoint" : "room"}?`,
                          )
                        ) {
                          setNodes(nodes.filter((n) => n.id !== node.id));
                          setEdges(
                            edges.filter(
                              (ed) =>
                                ed.source !== node.id && ed.target !== node.id,
                            ),
                          );
                          setSelectedNodeId(null);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Item
                    </button>
                  </>
                );
              })()}
            </div>
          )}

          {/* Edit Path Connections */}
          {mode === "edit_room" && selectedEdgeId && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-indigo-400">
                Path Connection
              </h3>
              <p className="text-xs text-gray-400">
                You have selected a path edge linking two nodes.
              </p>

              <button
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow"
                onClick={() => {
                  setEdges(edges.filter((ed) => ed.id !== selectedEdgeId));
                  setSelectedEdgeId(null);
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete Path
              </button>
            </div>
          )}

          {/* Cell Remover Mode Info */}
          {mode === "cell_remover" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-red-500 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Corridor Eraser Active
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Click directly on any white <b>Building Grid Cell</b> to erase
                it and shape custom building corridors.
              </p>
              <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-800 pt-3">
                Clicking an erased (dark) cell will restore it back. Room items
                and waypoints are protected and cannot be deleted in this mode.
              </p>
            </div>
          )}

          {/* Default Help Text — Navigation Workflow Guide */}
          {!selectedNodeId &&
            !selectedEdgeId &&
            !selectedBuildingId &&
            mode !== "cell_remover" && (
              <div className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-blue-400">
                  Navigation Path Guide
                </h3>

                <div className="space-y-3">
                  <div className="bg-[#0f172a] rounded-xl p-3 border border-gray-800">
                    <p className="font-bold text-teal-400 mb-1">
                      Step 1 — Add Waypoints
                    </p>
                    <p className="text-gray-400 leading-relaxed">
                      Click <b className="text-white">📍 Waypoint</b> mode, then
                      click inside the building grid along corridors. Place them
                      at every junction and turn point.
                    </p>
                  </div>

                  <div className="bg-[#0f172a] rounded-xl p-3 border border-gray-800">
                    <p className="font-bold text-indigo-400 mb-1">
                      Step 2 — Connect Paths
                    </p>
                    <p className="text-gray-400 leading-relaxed">
                      Click <b className="text-white">↗ Connect Path</b> mode.
                      Click one waypoint/room, then click another to draw an
                      edge between them.
                    </p>
                    <p className="text-gray-500 mt-1">
                      Connect waypoints along the corridor, then connect rooms
                      to their nearest corridor waypoint.
                    </p>
                  </div>

                  <div className="bg-[#0f172a] rounded-xl p-3 border border-gray-800">
                    <p className="font-bold text-green-400 mb-1">
                      Step 3 — Save
                    </p>
                    <p className="text-gray-400 leading-relaxed">
                      Click <b className="text-white">Save Map</b>. The
                      navigation engine reloads automatically.
                    </p>
                  </div>

                  <div className="bg-[#0f172a] rounded-xl p-3 border border-red-900">
                    <p className="font-bold text-orange-400 mb-1">Clear Nav</p>
                    <p className="text-gray-400 leading-relaxed">
                      Removes all waypoints and edges, keeps all rooms. Use to
                      start fresh on this floor.
                    </p>
                  </div>

                  <div className="bg-[#0f172a] rounded-xl p-3 border border-gray-800">
                    <p className="font-bold text-gray-300 mb-1">Tips</p>
                    <ul className="text-gray-500 space-y-1 leading-relaxed list-disc list-inside">
                      <li>Double-click a waypoint or room to delete it</li>
                      <li>Double-click an edge to delete it</li>
                      <li>
                        In <b className="text-white">Edit Items</b> mode, drag
                        any node to reposition it
                      </li>
                      <li>Waypoints show as small teal dots</li>
                      <li>
                        Rooms must connect to at least 1 waypoint for navigation
                        to work
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
