import { BugSenseLogo } from './components/ui/Logo';

export default function RootLoading() {
  return (
    <div className="loading-shell relative overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.05),transparent_28%)]" />
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-6 shadow-[0_0_24px_rgba(255,255,255,0.06)]">
          <BugSenseLogo animated className="text-zinc-100" size={80} />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-zinc-500">
          Initializing BugSense...
        </p>
      </div>
    </div>
  );
}
