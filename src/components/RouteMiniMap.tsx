import React, { useMemo } from 'react';
import { TrackPoint, PhaseType } from '../types/workout';

interface RouteMiniMapProps {
  trackPoints?: TrackPoint[];
  width?: number;
  height?: number;
  className?: string;
}

export const RouteMiniMap: React.FC<RouteMiniMapProps> = ({
  trackPoints = [],
  width = 320,
  height = 180,
  className = '',
}) => {
  // Color configuration by phase
  const getPhaseColor = (phase: PhaseType): string => {
    switch (phase) {
      case 'high_intensity':
        return '#EF4444'; // Red / Orange (Tiro Forte)
      case 'low_intensity':
        return '#10B981'; // Emerald Green (Trote)
      case 'walk':
        return '#06B6D4'; // Cyan (Caminhada)
      case 'warmup':
        return '#F59E0B'; // Amber (Aquecimento)
      case 'rest':
      default:
        return '#94A3B8'; // Slate (Descanso)
    }
  };

  // Convert GPS (lat, lng) to SVG 2D Canvas coordinate space with bounding box normalization
  const pathSegments = useMemo(() => {
    if (!trackPoints || trackPoints.length < 2) return [];

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const pt of trackPoints) {
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lng < minLng) minLng = pt.lng;
      if (pt.lng > maxLng) maxLng = pt.lng;
    }

    const padding = 22; // Inner margin so points never touch the border
    const usableW = width - padding * 2;
    const usableH = height - padding * 2;

    const latSpan = Math.max(0.0001, maxLat - minLat);
    const lngSpan = Math.max(0.0001, maxLng - minLng);

    // Keep aspect ratio
    const scale = Math.min(usableW / lngSpan, usableH / latSpan);
    const offsetX = padding + (usableW - lngSpan * scale) / 2;
    const offsetY = padding + (usableH - latSpan * scale) / 2;

    // Projected 2D points (Lat goes UP in reality, so inverted on Y)
    const projected = trackPoints.map((pt) => ({
      x: offsetX + (pt.lng - minLng) * scale,
      y: height - (offsetY + (pt.lat - minLat) * scale),
      phase: pt.phase,
      speedKmh: pt.speedKmh,
    }));

    // Generate line segments between consecutive points with respective phase color
    const segments: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      phase: PhaseType;
      color: string;
      strokeWidth: number;
    }[] = [];

    for (let i = 0; i < projected.length - 1; i++) {
      const p1 = projected[i];
      const p2 = projected[i + 1];
      const phase = p2.phase || p1.phase;
      const isHigh = phase === 'high_intensity';

      segments.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        phase,
        color: getPhaseColor(phase),
        strokeWidth: isHigh ? 4 : 3,
      });
    }

    return { segments, startPoint: projected[0], endPoint: projected[projected.length - 1] };
  }, [trackPoints, width, height]);

  if (!trackPoints || trackPoints.length < 2 || !pathSegments || !('segments' in pathSegments)) {
    return (
      <div
        style={{ width: '100%', height }}
        className={`flex flex-col items-center justify-center rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-500 text-xs font-semibold ${className}`}
      >
        <span>Trajeto GPS curto ou indisponível</span>
      </div>
    );
  }

  const { segments, startPoint, endPoint } = pathSegments;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-950 border border-slate-800/80 shadow-inner ${className}`}>
      {/* Background Subtle Grid / Coordinate lines */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block select-none"
        style={{ maxHeight: height }}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1E293B" strokeWidth="0.5" strokeOpacity="0.4" />
          </pattern>
        </defs>

        <rect width={width} height={height} fill="#090D16" />
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Trail segments with phase coloring */}
        {segments.map((seg, idx) => (
          <line
            key={idx}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke={seg.color}
            strokeWidth={seg.strokeWidth}
            strokeLinecap="round"
            strokeOpacity={seg.phase === 'high_intensity' ? 1.0 : 0.85}
          />
        ))}

        {/* Start Marker (Green pin) */}
        {startPoint && (
          <g>
            <circle cx={startPoint.x} cy={startPoint.y} r="6" fill="#10B981" />
            <circle cx={startPoint.x} cy={startPoint.y} r="3" fill="#FFFFFF" />
          </g>
        )}

        {/* End Marker (Checkered / Red pin) */}
        {endPoint && (
          <g>
            <circle cx={endPoint.x} cy={endPoint.y} r="7" fill="#EF4444" />
            <circle cx={endPoint.x} cy={endPoint.y} r="3" fill="#FFFFFF" />
          </g>
        )}
      </svg>

      {/* Trajectory Legend Overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800/90 text-[10px] font-bold">
          <div className="flex items-center gap-1 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
            <span>Tiro Forte</span>
          </div>

          <div className="flex items-center gap-1 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
            <span>Trote / Recuperação</span>
          </div>

          <div className="flex items-center gap-1 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
            <span>Aquec.</span>
          </div>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800/90 text-[10px] font-mono font-bold text-slate-300">
          {trackPoints.length} pts GPS
        </div>
      </div>
    </div>
  );
};
