'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from 'recharts';
import { ClientChart } from './ClientChart';

export function TrendSparkline({
  color = 'hsl(var(--info))',
  data,
}: {
  color?: string;
  data: Array<{ value: number }>;
}) {
  const gradientId = `gradient-${color.replace(/[^a-z0-9]/gi, '')}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;
      setReady(width > 0 && height > 0);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="mt-4 min-w-0 w-full"
      ref={containerRef}
      style={{ width: '100%', minWidth: 0, minHeight: 64, height: 64 }}
    >
      {ready ? (
        <ClientChart height={64}>
          <ResponsiveContainer width="100%" height={64}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                fillOpacity={1}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ClientChart>
      ) : null}
    </div>
  );
}
