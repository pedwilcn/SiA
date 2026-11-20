import { useState } from 'react';

interface PointMarker {
  x?: number | null;
  y?: number | null;
  label?: string;
  color?: string;
}

interface ImagePointViewerProps {
  src?: string | null;
  alt: string;
  markers?: PointMarker[];
  onPickCoordinate?: (x: number, y: number) => void;
}

export function ImagePointViewer({ src, alt, markers = [], onPickCoordinate }: ImagePointViewerProps) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  if (!src) {
    return (
      <div style={{ padding: 24, textAlign: 'center', background: 'var(--surface-alt)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13 }}>
        Sem imagem vinculada
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!onPickCoordinate || !naturalSize) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * naturalSize.w);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * naturalSize.h);
    onPickCoordinate(x, y);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <img
        src={src}
        alt={alt}
        onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        onClick={handleClick}
        style={{ display: 'block', maxWidth: '100%', maxHeight: 440, cursor: onPickCoordinate ? 'crosshair' : 'default' }}
      />
      {naturalSize &&
        markers.map((m, idx) => {
          if (m.x === null || m.x === undefined || m.y === null || m.y === undefined) return null;
          const leftPct = (m.x / naturalSize.w) * 100;
          const topPct = (m.y / naturalSize.h) * 100;
          if (leftPct < 0 || leftPct > 100 || topPct < 0 || topPct > 100) return null;
          return (
            <div
              key={idx}
              title={m.label ?? `${m.x}, ${m.y}`}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: 'translate(-50%, -50%)',
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: m.color ?? 'rgba(220, 38, 38, 0.85)',
                border: '2px solid #ffffff',
                boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.3)',
                pointerEvents: 'none',
              }}
            />
          );
        })}
    </div>
  );
}
