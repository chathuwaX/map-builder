import { DeckScrollContainer } from "@/components/app/deck/deck-scroll-container";

export default function DeckPage() {
  return (
    <DeckScrollContainer>
      <Floor1 />
      <Floor2 />
      <Floor3 />
      <Floor4 />
      <Floor5 />
    </DeckScrollContainer>
  );
}

// ─── Floor Definitions ────────────────────────────────────────────────────────

function Floor1() {
  return (
    <div className="w-[min(90vw,900px)] h-[min(85vh,700px)] rounded-3xl overflow-hidden relative shadow-2xl select-none bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex flex-col items-center justify-center gap-6 p-10 text-white border border-white/10">
      {/* Decorative blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-700/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

      <FloorBadge label="Floor 01" />
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-center leading-tight">
        Welcome to the
        <br />
        <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
          Deck.
        </span>
      </h1>
      <p className="text-white/60 text-lg text-center max-w-md">
        Scroll down to move through the floors. Each card rises from behind as
        the current one falls away.
      </p>
      <div className="mt-4 flex items-center gap-2 text-white/40 text-sm animate-bounce">
        <span>↓</span>
        <span>Scroll to continue</span>
        <span>↓</span>
      </div>
    </div>
  );
}

function Floor2() {
  const stats = [
    { label: "Active Users", value: "124K" },
    { label: "Events Today", value: "38" },
    { label: "Avg Response", value: "1.2s" },
  ];

  return (
    <div className="w-[min(90vw,900px)] h-[min(85vh,700px)] rounded-3xl overflow-hidden relative shadow-2xl select-none bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex flex-col items-center justify-center gap-8 p-10 text-white border border-white/10">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" />

      <FloorBadge label="Floor 02" />
      <h2 className="text-4xl md:text-5xl font-bold text-center">
        Live{" "}
        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Dashboard
        </span>
      </h2>

      <div className="grid grid-cols-3 gap-4 w-full">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col items-center gap-2 backdrop-blur-sm"
          >
            <span className="text-3xl md:text-4xl font-bold text-cyan-300">
              {s.value}
            </span>
            <span className="text-xs text-white/50 uppercase tracking-widest text-center">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <p className="text-white/40 text-sm text-center">
        Real-time metrics update every 5 seconds
      </p>
    </div>
  );
}

function Floor3() {
  const features = [
    {
      icon: "🗺️",
      title: "Indoor Navigation",
      desc: "Multi-floor wayfinding with sub-meter accuracy",
    },
    {
      icon: "🤖",
      title: "AI Concierge",
      desc: "Voice-powered assistant with context awareness",
    },
    {
      icon: "📍",
      title: "Live Positioning",
      desc: "Track assets and visitors across all floors",
    },
    {
      icon: "🔒",
      title: "Access Control",
      desc: "Face-recognition gated zones with audit logs",
    },
  ];

  return (
    <div className="w-[min(90vw,900px)] h-[min(85vh,700px)] rounded-3xl overflow-hidden relative shadow-2xl select-none bg-gradient-to-br from-[#0d2137] via-[#0a3d2e] to-[#0d2137] flex flex-col items-center justify-center gap-8 p-10 text-white border border-white/10">
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

      <FloorBadge label="Floor 03" />
      <h2 className="text-4xl md:text-5xl font-bold text-center">
        Core{" "}
        <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          Features
        </span>
      </h2>

      <div className="grid grid-cols-2 gap-4 w-full">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl bg-white/5 border border-white/10 p-5 flex items-start gap-4 backdrop-blur-sm hover:bg-white/10 transition-colors"
          >
            <span className="text-2xl">{f.icon}</span>
            <div>
              <p className="font-semibold text-sm">{f.title}</p>
              <p className="text-white/50 text-xs mt-1">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Floor4() {
  const floors = [
    { label: "Floor 1", rooms: 12, color: "bg-amber-400" },
    { label: "Floor 2", rooms: 15, color: "bg-orange-400" },
    { label: "Floor 3", rooms: 9, color: "bg-rose-400" },
    { label: "Floor 4", rooms: 7, color: "bg-pink-400" },
  ];

  return (
    <div className="w-[min(90vw,900px)] h-[min(85vh,700px)] rounded-3xl overflow-hidden relative shadow-2xl select-none bg-gradient-to-br from-[#2d1b00] via-[#3d2200] to-[#1a0f00] flex flex-col items-center justify-center gap-8 p-10 text-white border border-white/10">
      <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

      <FloorBadge label="Floor 04" />
      <h2 className="text-4xl md:text-5xl font-bold text-center">
        Building{" "}
        <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
          Overview
        </span>
      </h2>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        {floors.map((f, i) => (
          <div key={f.label} className="flex items-center gap-4">
            <span className="text-white/40 text-xs w-16">{f.label}</span>
            <div className="flex-1 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden">
              <div
                className={`h-full ${f.color} rounded-full opacity-80 transition-all`}
                style={{ width: `${(f.rooms / 15) * 100}%` }}
              />
            </div>
            <span className="text-white/60 text-xs w-12 text-right">
              {f.rooms} rooms
            </span>
          </div>
        ))}
      </div>

      <p className="text-white/40 text-sm">48 rooms across 4 floors mapped</p>
    </div>
  );
}

function Floor5() {
  return (
    <div className="w-[min(90vw,900px)] h-[min(85vh,700px)] rounded-3xl overflow-hidden relative shadow-2xl select-none bg-gradient-to-br from-[#1a0030] via-[#2d0050] to-[#0a0020] flex flex-col items-center justify-center gap-8 p-10 text-white border border-white/10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(147,51,234,0.15)_0%,_transparent_70%)] pointer-events-none" />

      <FloorBadge label="Floor 05" />

      {/* Big icon */}
      <div className="text-7xl">🚀</div>

      <h2 className="text-4xl md:text-5xl font-bold text-center">
        You&apos;ve reached the{" "}
        <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          top floor.
        </span>
      </h2>

      <p className="text-white/50 text-lg text-center max-w-md">
        Scroll back up to revisit any floor. The stack works in both directions.
      </p>

      <div className="flex gap-4 mt-2">
        <button className="px-6 py-3 rounded-full bg-white/10 border border-white/20 text-sm font-medium hover:bg-white/20 transition-colors backdrop-blur-sm">
          Explore Map
        </button>
        <button className="px-6 py-3 rounded-full bg-purple-600 text-sm font-medium hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/50">
          Get Started
        </button>
      </div>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function FloorBadge({ label }: { label: string }) {
  return (
    <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-mono text-white/60 uppercase tracking-widest backdrop-blur-sm">
      {label}
    </div>
  );
}
