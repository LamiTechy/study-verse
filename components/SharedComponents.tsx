export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="var(--accent)" fillOpacity=".14"/>
      <rect width="32" height="32" rx="9" stroke="var(--accent)" strokeOpacity=".35" fill="none"/>
      <path d="M9 11.5h14M9 16h9M9 20.5h11.5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="24" cy="20.5" r="3.5" fill="var(--accent)" fillOpacity=".9"/>
      <circle cx="24" cy="20.5" r="1.5" fill="#fff" fillOpacity=".9"/>
    </svg>
  );
}

export function Spinner({ size = 16, color = "var(--accent)" }: { size?: number; color?: string }) {
  return (
    <span style={{ display:"inline-block", width:size, height:size, border:`1.5px solid ${color}30`, borderTopColor:color, borderRadius:"50%", animation:"spin 0.75s linear infinite", flexShrink:0 }} />
  );
}
