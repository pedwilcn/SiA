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
  showCrosshair?: boolean;
  connectLine?: boolean;
  badgeText?: string;
  onPickCoordinate?: (x: number, y: number) => void;
}

export function ImagePointViewer({
  src,
  alt,
  markers = [],
  showCrosshair = true,
  connectLine = false,
  badgeText,
  onPickCoordinate,
}: ImagePointViewerProps) {
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

  const validMarkers = naturalSize
    ? markers
        .filter((m) => m.x !== null && m.x !== undefined && m.y !== null && m.y !== undefined)
        .map((m) => ({
          ...m,
          leftPct: (Number(m.x) / naturalSize.w) * 100,
          topPct: (Number(m.y) / naturalSize.h) * 100,
        }))
        .filter((m) => m.leftPct >= 0 && m.leftPct <= 100 && m.topPct >= 0 && m.topPct <= 100)
    : [];

  return (
    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: '#fff' }}>
      <img
        src={src}
        alt={alt}
        onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        onClick={handleClick}
        style={{ display: 'block', maxWidth: '100%', maxHeight: 540, cursor: onPickCoordinate ? 'crosshair' : 'default' }}
      />

      {badgeText && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 10,
            color: '#c92a2a',
            fontWeight: 800,
            fontSize: 22,
            textShadow: '0 1px 2px rgba(255,255,255,0.9)',
            pointerEvents: 'none',
          }}
        >
          {badgeText}
        </div>
      )}

      {/* Linha conectora (ex: Koryo) */}
      {connectLine && validMarkers.length >= 2 && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <line
            x1={validMarkers[0].leftPct}
            y1={validMarkers[0].topPct}
            x2={validMarkers[1].leftPct}
            y2={validMarkers[1].topPct}
            stroke="#c92a2a"
            strokeWidth="0.6"
          />
        </svg>
      )}

      {/* Mira em cruz + marcador circular */}
      {validMarkers.map((m, idx) => (
        <div key={idx} style={{ pointerEvents: 'none' }}>
          {showCrosshair && idx === 0 && !connectLine && (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: `${m.leftPct}%`,
                  top: 0,
                  bottom: 0,
                  width: 1.5,
                  background: 'rgba(185, 28, 28, 0.78)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: `${m.topPct}%`,
                  left: 0,
                  right: 0,
                  height: 1.5,
                  background: 'rgba(185, 28, 28, 0.78)',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}
          <div
            title={m.label ?? `${m.x}, ${m.y}`}
            style={{
              position: 'absolute',
              left: `${m.leftPct}%`,
              top: `${m.topPct}%`,
              transform: 'translate(-50%, -50%)',
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: m.color ?? 'rgba(220, 38, 38, 0.9)',
              border: '2px solid #ffffff',
              boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.35)',
              pointerEvents: 'none',
            }}
          />
        </div>
      ))}
    </div>
  );
}
