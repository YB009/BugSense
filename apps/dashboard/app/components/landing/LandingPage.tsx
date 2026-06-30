'use client';

import {
  ArrowRight,
  BellRing,
  BookOpen,
  Braces,
  Check,
  ChevronRight,
  Clipboard,
  Code2,
  Database,
  Github,
  GitBranch,
  Linkedin,
  LockKeyhole,
  Mail,
  Menu,
  Radio,
  ServerCog,
  ShieldCheck,
  TerminalSquare,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import { buttonStyles } from '../ui/Button';
import { ThemeToggle } from '../theme/ThemeToggle';
import { BugSenseLogo } from '../ui/Logo';

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#workflow' },
  { label: 'Developers', href: '#developers' },
];

const heroSteps = [
  {
    id: 'install',
    title: 'Integration',
    short: 'Install the SDK',
    description: 'Add the BugSense SDK and scope every event to the right project key.',
    code: `npm install @bugsense/bugsense-js

import { BugSense } from '@bugsense/bugsense-js';

export const bugsense = new BugSense({
  projectId: 'proj_checkout_web',
  apiKey: 'key_live_••••',
  endpoint: 'https://api.bugsense.dev/ingest'
});`,
    status: 'SDK connected',
  },
  {
    id: 'realtime',
    title: 'Real-time analysis',
    short: 'Watch events flow',
    description: 'Stream incoming failures into ClickHouse, queues, alerts, and the live dashboard.',
    code: `POST /ingest 202 Accepted

event.level        error
event.release      2026.06.29
event.environment  production
event.route        /checkout

queue.alerts       active
stream.live_feed   online`,
    status: 'Live feed online',
  },
  {
    id: 'triage',
    title: 'Actionable insights',
    short: 'Triage grouped issues',
    description: 'Group repeated events into a single issue with stack context and AI analysis.',
    code: `Grouped issue
17 matching events
184 affected users

Likely cause:
checkout session payload is missing
before confirmation render.

Suggested fix:
guard billingSession before mapping items.`,
    status: 'Issue grouped',
  },
];

const pipelineItems = [
  ['SDK ingest', '<100ms', 'online'],
  ['Event enrichment', 'real-time', 'active'],
  ['Alert queue', '1.8s p95', 'active'],
  ['Issue grouping', 'scheduled', 'ready'],
];

const scaleStats = [
  ['100M+', 'events captured'],
  ['99.9%', 'service uptime'],
  ['12ms', 'median issue read'],
  ['5 min', 'local setup'],
];

const integrations = [
  'React',
  'Next.js',
  'Node',
  'Axios',
  'Fetch',
  'ClickHouse',
  'Redis',
  'Postgres',
  'Railway',
  'Source maps',
];

const footerSections = [
  {
    title: 'Product',
    links: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'SDK', href: 'https://www.npmjs.com/package/@bugsense/bugsense-js' },
      { label: 'Issue grouping', href: '#features' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'GitHub', href: 'https://github.com/owohd' },
      { label: 'Docs', href: 'https://www.npmjs.com/package/@bugsense/bugsense-js' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { label: 'owohdaniel09@gmail.com', href: 'mailto:owohdaniel09@gmail.com' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/' },
    ],
  },
];

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/owohd', icon: Github },
  { label: 'Email', href: 'mailto:owohdaniel09@gmail.com', icon: Mail },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/', icon: Linkedin },
];

const securityFeatures = [
  {
    icon: ShieldCheck,
    title: 'Project isolation',
    copy: 'Every app, environment, API key, event stream, and issue set stays scoped to its workspace.',
  },
  {
    icon: LockKeyhole,
    title: 'Private by design',
    copy: 'Self-host the stack and keep operational error data inside infrastructure you control.',
  },
  {
    icon: ServerCog,
    title: 'Service split',
    copy: 'API gateway, ingestion, alerting, dashboard, and storage can scale independently.',
  },
];

const setupTabs = [
  {
    id: 'install',
    label: 'Install',
    code: `pnpm add @bugsense/bugsense-js`,
  },
  {
    id: 'configure',
    label: 'Configure',
    code: `export const bugsense = new BugSense({
  projectId: 'proj_your_project_id',
  apiKey: 'key_your_project_key',
  endpoint: 'https://bugsenseapi-gateway-production.up.railway.app/ingest',
  environment: 'production'
});`,
  },
  {
    id: 'deploy',
    label: 'Deploy',
    code: `void bugsense.captureMessage('BugSense smoke test connected');

// Then open the dashboard:
// Projects -> Live events -> Grouping -> Issues`,
  },
];

const testimonials = [
  {
    quote:
      'BugSense gives us a clear path from raw frontend errors to grouped issues without needing to wire together three separate tools.',
    name: 'Engineering lead',
    team: 'React commerce team',
    outcome: '90%',
    label: 'noise reduction',
  },
  {
    quote:
      'The live feed and grouping workflow made production regressions easier to explain during release reviews.',
    name: 'Platform owner',
    team: 'Internal SaaS team',
    outcome: '10x',
    label: 'faster triage',
  },
];

type GlobePoint = {
  x: number;
  y: number;
  z: number;
  char: string;
  dot: boolean;
};

const rotatingWords = ['reach users', 'become noise', 'hide context', 'slow releases'];

function ThreeDOrbitalGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return undefined;
    }

    const drawingCanvas = canvas;
    const drawingContext = context;
    let points = buildGlobePoints(720);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frameId = 0;
    let width = 0;
    let height = 0;
    let angleY = 0;
    let angleX = 0.12;

    function resizeCanvas() {
      const parent = drawingCanvas.parentElement;
      const rect = parent?.getBoundingClientRect() ?? drawingCanvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      drawingCanvas.width = Math.floor(width * ratio);
      drawingCanvas.height = Math.floor(height * ratio);
      drawingCanvas.style.width = `${width}px`;
      drawingCanvas.style.height = `${height}px`;
      drawingContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      points = buildGlobePoints(Math.min(width, height) * 0.36);
    }

    function handleMouseMove(event: MouseEvent) {
      mouseRef.current.targetX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.targetY = (event.clientY / window.innerHeight) * 2 - 1;
    }

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(drawingCanvas.parentElement ?? drawingCanvas);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    resizeCanvas();

    function render() {
      drawingContext.clearRect(0, 0, width, height);
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.045;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.045;

      if (!reduceMotion.matches) {
        angleY += 0.0018 + mouseRef.current.x * 0.004;
      }

      angleX = 0.12 + mouseRef.current.y * 0.34;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const centerX = width * 0.62;
      const centerY = height * 0.48;
      const fov = 680;
      const baseColor = document.documentElement.dataset.theme === 'light' ? '15, 23, 42' : '226, 232, 240';

      points
        .map((point) => {
          const rotatedX = point.x * cosY - point.z * sinY;
          const rotatedZ = point.x * sinY + point.z * cosY;
          const tiltedY = point.y * cosX - rotatedZ * sinX;
          const tiltedZ = point.y * sinX + rotatedZ * cosX;
          const scale = fov / (fov + tiltedZ);
          const depthAlpha = Math.max(0.05, Math.min(0.52, (fov - tiltedZ) / (fov * 1.55)));

          return {
            x: rotatedX * scale + centerX,
            y: tiltedY * scale + centerY,
            scale,
            alpha: depthAlpha,
            char: point.char,
            dot: point.dot,
            z: tiltedZ,
          };
        })
        .sort((a, b) => b.z - a.z)
        .forEach((item) => {
          if (item.x < -24 || item.x > width + 24 || item.y < -24 || item.y > height + 24) {
            return;
          }

          drawingContext.fillStyle = `rgba(${baseColor}, ${item.alpha})`;

          if (item.dot) {
            drawingContext.beginPath();
            drawingContext.arc(item.x, item.y, Math.max(0.8, 1.8 * item.scale), 0, Math.PI * 2);
            drawingContext.fill();
            return;
          }

          drawingContext.font = `600 ${Math.max(7, Math.round(12 * item.scale))}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
          drawingContext.textAlign = 'center';
          drawingContext.textBaseline = 'middle';
          drawingContext.fillText(item.char, item.x, item.y);
        });

      frameId = window.requestAnimationFrame(render);
    }

    render();

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return <canvas aria-hidden="true" className="landing-orbital-globe absolute inset-0 z-0 pointer-events-none" ref={canvasRef} />;
}

function buildGlobePoints(radius: number): GlobePoint[] {
  const chars = ['T', 'l', '0', '1', '+', '|', '.', '.', '.', 'r', 'u'];
  const points: GlobePoint[] = [];
  let seed = 42;

  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  for (let ring = -7; ring <= 7; ring += 1) {
    const latitude = (ring / 8) * (Math.PI / 2);
    const ringRadius = Math.cos(latitude) * radius;
    const y = Math.sin(latitude) * radius;
    const count = Math.max(10, Math.round(22 * Math.cos(latitude)) + 8);

    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const jitter = (random() - 0.5) * 9;

      points.push({
        x: Math.cos(angle) * (ringRadius + jitter),
        y: y + (random() - 0.5) * 8,
        z: Math.sin(angle) * (ringRadius + jitter),
        char: chars[Math.floor(random() * chars.length)],
        dot: random() > 0.58,
      });
    }
  }

  for (let index = 0; index < 76; index += 1) {
    const phi = Math.acos(-1 + (2 * index) / 76);
    const theta = Math.sqrt(76 * Math.PI) * phi;

    points.push({
      x: radius * Math.cos(theta) * Math.sin(phi),
      y: radius * Math.sin(theta) * Math.sin(phi),
      z: radius * Math.cos(phi),
      char: chars[Math.floor(random() * chars.length)],
      dot: random() > 0.48,
    });
  }

  return points;
}

function RotatingHeroWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % rotatingWords.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <span className="landing-rotating-word relative inline-flex h-[1.08em] overflow-hidden align-bottom">
      <span className="landing-word-slide inline-block border-b-[0.08em] border-current" key={rotatingWords[index]}>
        {rotatingWords[index]}
      </span>
    </span>
  );
}

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 18);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="landing-page min-h-screen overflow-hidden bg-background text-foreground">
      <header className="fixed inset-x-0 top-4 z-50 px-4 sm:px-6">
        <nav
          className={cn(
            'mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border px-4 shadow-none backdrop-blur-xl transition-all duration-300 sm:px-5',
            scrolled
              ? 'border-border bg-background/82 shadow-panel'
              : 'border-border/45 bg-background/58',
          )}
        >
          <Link className="flex items-center gap-3" href="/" aria-label="BugSense home">
            <span className="grid size-8 place-items-center rounded-full border border-border bg-panel-strong text-info shadow-glow">
              <BugSenseLogo animated size={19} />
            </span>
            <span className="text-base font-semibold tracking-[0]">BugSense</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            {navItems.map((item) => (
              <a className="transition-colors hover:text-foreground" href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <Link className={buttonStyles({ size: 'sm', variant: 'ghost' })} href="/login">
              Sign in
            </Link>
            <Link className={buttonStyles({ size: 'sm' })} href="/signup">
              Start free
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <button
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-panel-strong text-foreground md:hidden"
            onClick={() => setMobileOpen((value) => !value)}
            type="button"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </nav>

        {mobileOpen ? (
          <div className="mx-auto mt-3 max-w-6xl rounded-3xl border border-border bg-background/92 px-4 py-4 shadow-panel backdrop-blur-xl md:hidden">
            <div className="grid gap-3">
              {navItems.map((item) => (
                <a
                  className="rounded-xl border border-border bg-panel px-4 py-3 text-sm text-muted-foreground"
                  href={item.href}
                  key={item.href}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="flex items-center gap-2 pt-2">
                <ThemeToggle />
                <Link className={buttonStyles({ className: 'flex-1', variant: 'secondary' })} href="/login">
                  Sign in
                </Link>
                <Link className={buttonStyles({ className: 'flex-1' })} href="/signup">
                  Start free
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <HeroWorkflow />
      <PipelineSection />
      <ScaleStats />
      <IntegrationsMarquee />
      <SecuritySection />
      <DeveloperSetup />
      <Testimonials />
      <LandingFooter />
    </main>
  );
}

function HeroWorkflow() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = heroSteps[activeIndex];

  return (
    <section id="workflow" className="landing-band-dark landing-hero relative overflow-hidden px-5 pb-16 pt-28 sm:px-8 lg:pb-24 lg:pt-32">
      <div className="landing-grid absolute inset-0" />
      <ThreeDOrbitalGlobe />
      <div className="landing-scan absolute inset-x-0 top-0 h-40" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(34rem,1.1fr)] lg:items-center">
        <div className="landing-rise">
          <h1 className="max-w-3xl text-balance text-4xl font-bold leading-[1.02] tracking-[0] text-foreground sm:text-5xl lg:text-6xl xl:text-[4.25rem]">
            Stop production failures before they <RotatingHeroWord />
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            BugSense captures JavaScript failures, streams them live, groups
            repeated crashes, and keeps diagnosis close to the code that broke.
          </p>

          <div className="mt-7 grid gap-3">
            {heroSteps.map((step, index) => (
              <button
                className={cn(
                  'group grid gap-1.5 rounded-2xl border p-3.5 text-left transition-all duration-200 sm:p-4',
                  activeIndex === index
                    ? 'border-info/35 bg-info/10 shadow-glow'
                    : 'border-border bg-panel/70 hover:border-border-strong hover:bg-panel-strong',
                )}
                key={step.id}
                onClick={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                type="button"
              >
                <span className="flex items-center justify-between gap-4">
                  <span className="font-mono text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
                    Step {index + 1}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                </span>
                <span className="text-lg font-semibold tracking-[0] text-foreground sm:text-xl">{step.title}</span>
                <span className="text-sm leading-5 text-muted-foreground sm:leading-6">{step.description}</span>
              </button>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link className={buttonStyles({ size: 'lg' })} href="/dashboard">
              Open dashboard
              <ArrowRight className="size-4" />
            </Link>
            <a
              className={buttonStyles({ size: 'lg', variant: 'secondary' })}
              href="https://www.npmjs.com/package/@bugsense/bugsense-js"
              rel="noreferrer"
              target="_blank"
            >
              <BookOpen className="size-4" />
              View SDK docs
            </a>
          </div>
        </div>

        <div className="landing-terminal landing-rise relative overflow-hidden rounded-2xl border border-border bg-panel/92 shadow-panel backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-error/80" />
              <span className="size-2.5 rounded-full bg-warning/80" />
              <span className="size-2.5 rounded-full bg-success/80" />
            </div>
            <span className="font-mono text-xs text-muted-foreground">{active.status}</span>
          </div>
          <div className="grid gap-px bg-border md:grid-cols-[13rem_minmax(0,1fr)]">
            <aside className="hidden bg-panel-strong p-5 md:block">
              <div className="mb-5 flex items-center gap-2 text-sm font-medium text-foreground">
                <Radio className="size-4 text-info" />
                Workflow
              </div>
              <div className="grid gap-2">
                {heroSteps.map((step, index) => (
                  <button
                    className={cn(
                      'rounded-xl px-3 py-2 text-left text-sm transition-colors',
                      activeIndex === index
                        ? 'bg-info/10 text-foreground'
                        : 'text-muted-foreground hover:bg-panel hover:text-foreground',
                    )}
                    key={step.id}
                    onClick={() => setActiveIndex(index)}
                    type="button"
                  >
                    {step.short}
                  </button>
                ))}
              </div>
            </aside>
            <div className="bg-panel p-5">
              <div className="mb-5 flex items-start justify-between gap-5">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                    BugSense runtime
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[0] text-foreground">
                    {active.title}
                  </h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                  <span className="size-2 rounded-full bg-success animate-pulse-soft" />
                  active
                </span>
              </div>
              <pre className="min-h-[24rem] overflow-x-auto rounded-2xl border border-border bg-black/45 p-5 font-mono text-sm leading-7 text-zinc-100">
                <code>{active.code}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PipelineSection() {
  return (
    <section id="features" className="landing-band-light border-y border-border px-5 py-20 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard icon={Zap} label="Ingest throughput" value="1M+" detail="events per day capacity" />
          <MetricCard icon={Database} label="Query latency" value="100ms" detail="common issue reads" />
          <MetricCard icon={BellRing} label="Alert delivery" value="1.8s" detail="p95 queue latency" />
          <MetricCard icon={GitBranch} label="Grouping pass" value="Nightly" detail="plus manual runs" />
        </div>

        <div className="rounded-2xl border border-border bg-panel p-6 shadow-panel">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                Data flow
              </p>
              <h2 className="mt-1 text-3xl font-semibold tracking-[0] text-foreground">
                System pipeline status
              </h2>
            </div>
            <span className="hidden rounded-full border border-success/25 bg-success/10 px-3 py-1.5 text-xs font-medium text-success sm:inline-flex">
              all systems operational
            </span>
          </div>
          <div className="grid gap-3">
            {pipelineItems.map(([label, speed, state]) => (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-panel-strong p-4" key={label}>
                <div className="flex items-center gap-3">
                  <span className="size-2 rounded-full bg-success animate-pulse-soft" />
                  <span className="font-medium text-foreground">{label}</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-foreground">{speed}</p>
                  <p className="text-xs capitalize text-muted-foreground">{state}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ScaleStats() {
  return (
    <section className="landing-band-dark px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-4xl font-semibold leading-tight tracking-[0] text-foreground sm:text-5xl">
            Built for production scale without losing triage clarity.
          </h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
          {scaleStats.map(([value, label]) => (
            <div className="bg-panel p-6" key={label}>
              <p className="text-5xl font-semibold tracking-[0] text-foreground">{value}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IntegrationsMarquee() {
  const row = useMemo(() => [...integrations, ...integrations], []);

  return (
    <section className="landing-band-light px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-border bg-panel py-4 shadow-panel">
        <div className="landing-marquee">
          <div className="landing-marquee-track">
            {row.map((name, index) => (
              <span
                className="mx-2 inline-flex h-12 min-w-36 items-center justify-center rounded-xl border border-border bg-panel-strong px-5 text-sm font-medium text-muted-foreground"
                key={`${name}-${index}`}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section className="landing-band-dark border-y border-border px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div>
            <h2 className="text-4xl font-semibold leading-tight tracking-[0] text-foreground sm:text-5xl">
              Trust model that matches engineering reality.
            </h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              BugSense keeps workspace boundaries explicit and remains practical
              for teams that want observability without sending everything away.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {securityFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <article className="rounded-2xl border border-border bg-panel p-5 transition-colors hover:border-info/35 hover:bg-panel-strong" key={feature.title}>
                  <Icon className="mb-10 size-5 text-info" />
                  <h3 className="text-xl font-semibold tracking-[0] text-foreground">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {['Self-hostable', 'Project-scoped keys', 'Source map aware', 'Internal service token', 'Postgres workspaces'].map((badge) => (
            <span className="rounded-full border border-border bg-panel px-3 py-1.5 text-xs font-medium text-muted-foreground" key={badge}>
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function DeveloperSetup() {
  const [activeId, setActiveId] = useState(setupTabs[0].id);
  const [copied, setCopied] = useState(false);
  const active = setupTabs.find((tab) => tab.id === activeId) ?? setupTabs[0];

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="developers" className="landing-band-light px-5 py-20 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <h2 className="text-4xl font-semibold leading-tight tracking-[0] text-foreground sm:text-5xl">
            Developer setup stays small.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Install the SDK, configure a project-scoped key, and send a smoke
            test through the same ingest path production events use.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              [Code2, 'Code-native SDK snippets in every project.'],
              [TerminalSquare, 'Local stack starts with pnpm infra:up.'],
              [Braces, 'Events stay readable as JSON all the way in.'],
            ].map(([Icon, text]) => {
              const SetupIcon = Icon as typeof Code2;
              return (
                <div className="flex items-center gap-3 text-sm text-muted-foreground" key={text as string}>
                  <SetupIcon className="size-4 text-info" />
                  <span>{text as string}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-panel">
          <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {setupTabs.map((tab) => (
                <button
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    active.id === tab.id
                      ? 'bg-info/10 text-foreground'
                      : 'text-muted-foreground hover:bg-panel-strong hover:text-foreground',
                  )}
                  key={tab.id}
                  onClick={() => setActiveId(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-panel-strong px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              onClick={copyCode}
              type="button"
            >
              {copied ? <Check className="size-4 text-success" /> : <Clipboard className="size-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="min-h-[22rem] overflow-x-auto bg-black/45 p-6 font-mono text-sm leading-7 text-zinc-100">
            <code>{active.code}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="landing-band-dark border-y border-border px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-semibold tracking-[0] text-foreground">Built for teams shipping JavaScript.</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {testimonials.map((testimonial) => (
            <article className="grid overflow-hidden rounded-2xl border border-border bg-panel shadow-panel sm:grid-cols-[1fr_13rem]" key={testimonial.quote}>
              <div className="p-6">
                <p className="text-lg leading-8 text-foreground">"{testimonial.quote}"</p>
                <div className="mt-6 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{testimonial.name}</p>
                  <p>{testimonial.team}</p>
                </div>
              </div>
              <div className="border-t border-border bg-info/10 p-6 sm:border-l sm:border-t-0">
                <p className="text-5xl font-semibold tracking-[0] text-foreground">{testimonial.outcome}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{testimonial.label}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="landing-band-light px-4 pb-6 pt-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[92rem] overflow-hidden rounded-[1.75rem] border border-border shadow-panel">
        <div className="landing-footer-top px-8 pb-20 pt-24 sm:px-10 lg:px-12 lg:pb-28">
          <div className="grid gap-10 md:grid-cols-3 lg:gap-16">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="font-mono text-sm uppercase tracking-[0.12em] opacity-60">{section.title}</h3>
                <div className="mt-8 grid gap-5">
                  {section.links.map((item) => (
                    <a
                      className="w-fit max-w-full break-words text-2xl font-semibold leading-none tracking-[0] transition-opacity hover:opacity-60 sm:text-3xl"
                      href={item.href}
                      key={item.label}
                      rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-footer-bottom flex flex-col gap-8 px-8 py-8 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <Link className="flex w-fit items-center gap-3" href="/" aria-label="BugSense home">
            <span className="grid size-10 place-items-center rounded-full border border-current/20 text-info">
              <BugSenseLogo animated size={24} />
            </span>
            <span className="text-2xl font-semibold tracking-[0]">BugSense</span>
          </Link>

          <p className="text-sm font-medium">© 2026 BugSense - All Rights Reserved</p>

          <div className="flex items-center gap-4">
            {socialLinks.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  aria-label={item.label}
                  className="grid size-10 place-items-center rounded-full transition-colors hover:bg-current/10"
                  href={item.href}
                  key={item.label}
                  rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                >
                  <Icon className="size-5" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCta() {
  return (
    <footer className="px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-border bg-panel shadow-panel">
        <div className="grid gap-px bg-border lg:grid-cols-[1fr_0.8fr]">
          <div className="bg-panel p-8 sm:p-10">
            <h2 className="max-w-2xl text-4xl font-semibold leading-tight tracking-[0] text-foreground sm:text-5xl">
              Ready to catch what matters before users report it?
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Open the dashboard, create a project, copy the SDK snippet, and
              watch the first event arrive live.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className={buttonStyles({ size: 'lg' })} href="/signup">
                Start free
                <ArrowRight className="size-4" />
              </Link>
              <a
                className={buttonStyles({ size: 'lg', variant: 'secondary' })}
                href="https://www.npmjs.com/package/@bugsense/bugsense-js"
                rel="noreferrer"
                target="_blank"
              >
                View SDK docs
              </a>
            </div>
          </div>

          <div className="bg-panel-strong p-8 sm:p-10">
            <div className="grid grid-cols-2 gap-8 text-sm">
              {[
                ['Product', 'Dashboard', 'Projects', 'Issues'],
                ['Developers', 'SDK', 'Source maps', 'Ingest API'],
                ['Company', 'Live demo', 'Roadmap', 'Changelog'],
                ['Legal', 'Privacy', 'Security', 'License'],
              ].map(([title, ...items]) => (
                <div key={title}>
                  <h3 className="font-medium text-foreground">{title}</h3>
                  <div className="mt-3 grid gap-2 text-muted-foreground">
                    {items.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-col gap-3 border-t border-border pt-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>© 2026 BugSense</span>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                <span className="size-2 rounded-full bg-success" />
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function MetricCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: typeof Zap;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-panel">
      <Icon className="mb-10 size-5 text-info" />
      <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-[0] text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}
