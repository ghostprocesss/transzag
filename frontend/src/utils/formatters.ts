export function formatAddress(addr?: string | null, len: number = 6): string {
  if (!addr) return '0x0000...0000';
  if (addr.length <= len * 2 + 2) return addr;
  return `${addr.slice(0, len + 2)}...${addr.slice(-len)}`;
}

export function formatTimestamp(ts?: number | null): string {
  if (!ts) return 'N/A';
  const d = new Date(ts * 1000);
  return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

export function formatTimeAgo(ts?: number | null): string {
  if (!ts) return 'N/A';
  const sec = Math.floor(Date.now() / 1000 - ts);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function formatAmount(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function getSeverityColor(sev: string): { text: string; bg: string; border: string } {
  switch (sev) {
    case 'PRIORITY_REVIEW':
      return { text: 'text-[#ffb000]', bg: 'bg-[#ffb000]/10', border: 'border-[#ffb000]/40' };
    case 'REVIEW_RECOMMENDED':
      return { text: 'text-[#00f0ff]', bg: 'bg-[#00f0ff]/10', border: 'border-[#00f0ff]/40' };
    default:
      return { text: 'text-[#5a8a6e]', bg: 'bg-[#5a8a6e]/10', border: 'border-[#5a8a6e]/40' };
  }
}
