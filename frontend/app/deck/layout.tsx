/**
 * Deck route layout
 *
 * No scroll needed — the deck engine captures wheel/touch events directly.
 * We just need a full-screen container that sits above the root layout.
 */
export default function DeckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      id="deck-scroll-root"
      className="fixed inset-0 overflow-hidden bg-black"
      style={{ zIndex: 9999 }}
    >
      {children}
    </div>
  );
}
