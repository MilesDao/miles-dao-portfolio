import React, { useEffect, useRef, useState } from "react";

export default function WireframeSphere() {
  const [rotation, setRotation] = useState({ x: 0.3, y: 0.8 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Slowly rotate automatically
      setRotation((prev) => ({
        x: prev.x + 0.15 * delta + mouseRef.current.y * 0.25 * delta,
        y: prev.y + 0.3 * delta + mouseRef.current.x * 0.25 * delta,
      }));

      // Attenuate user hover impact slowly
      mouseRef.current.x *= 0.95;
      mouseRef.current.y *= 0.95;

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
    mouseRef.current = { x, y };
  };

  // Generate sphere projection paths
  const width = 160;
  const height = 110;
  const cx = width / 2;
  const cy = height / 2;
  const rx_size = 54; // horizontal radius on ellipsoid
  const ry_size = 32; // vertical radius on ellipsoid
  const rz_size = 40; // depth radius on ellipsoid

  const renderPaths = () => {
    const paths: string[] = [];
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);

    const project = (x3d: number, y3d: number, z3d: number) => {
      // Rotation X
      const y1 = y3d * cosX - z3d * sinX;
      const z1 = y3d * sinX + z3d * cosX;
      // Rotation Y
      const x2 = x3d * cosY + z1 * sinY;
      const z2 = -x3d * sinY + z1 * cosY;

      // Perspective scale factor
      const perspective = 300;
      const scale = perspective / (perspective + z2);

      return {
        x: cx + x2 * scale,
        y: cy + y1 * scale,
        z: z2,
      };
    };

    // 1. Generate latitude rings (horizontal bands)
    const latCount = 8;
    for (let i = 1; i < latCount; i++) {
      const lat = -Math.PI / 2 + (Math.PI * i) / latCount;
      const ringY = ry_size * Math.sin(lat);
      const ringRad = Math.cos(lat);

      let d = "";
      const steps = 36;
      for (let j = 0; j <= steps; j++) {
        const lon = (2 * Math.PI * j) / steps;
        const pt = project(
          rx_size * ringRad * Math.cos(lon),
          ringY,
          rz_size * ringRad * Math.sin(lon)
        );

        if (j === 0) d += `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        else d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      }
      paths.push(d);
    }

    // 2. Generate longitude ribs (vertical bands running pole to pole)
    const lonCount = 10;
    for (let i = 0; i < lonCount; i++) {
      const lon = (Math.PI * i) / lonCount;
      let d = "";
      const steps = 36;
      for (let j = 0; j <= steps; j++) {
        const lat = -Math.PI / 2 + (Math.PI * j) / steps;
        const ringRad = Math.cos(lat);
        const pt = project(
          rx_size * ringRad * Math.cos(lon),
          ry_size * Math.sin(lat),
          rz_size * ringRad * Math.sin(lon)
        );

        if (j === 0) d += `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        else d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      }
      paths.push(d);
    }

    return paths;
  };

  return (
    <div
      id="wireframe-sphere-container"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-40 h-28 cursor-grab active:cursor-grabbing flex items-center justify-center select-none"
    >
      <svg
        id="wireframe-sphere-svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-neutral-900 opacity-65 hover:opacity-90 transition-opacity duration-300"
      >
        <g id="wireframe-lines" fill="none" stroke="currentColor" strokeWidth="0.5">
          {renderPaths().map((pathData, idx) => (
            <path key={idx} d={pathData} />
          ))}
        </g>
      </svg>
    </div>
  );
}
