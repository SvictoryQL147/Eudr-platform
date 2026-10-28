export default function MapLegend() {
  const items = [
    ["#22c55e", "Low risk"],
    ["#f59e0b", "Needs evidence"],
    ["#ef4444", "High risk / invalid"],
    ["#a8a29e", "Not screened"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map(([c, l]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border" style={{ background: c, borderColor: c }} /> {l}
        </span>
      ))}
    </div>
  );
}
