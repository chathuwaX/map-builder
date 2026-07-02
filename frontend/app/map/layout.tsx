export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0f1e] overflow-hidden">
      {children}
    </div>
  );
}
