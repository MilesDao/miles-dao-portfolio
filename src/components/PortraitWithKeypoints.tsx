import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import portraitImg from "@/assets/portrait.png";

interface Keypoint {
  id: number;
  name: string;
  x: number;
  y: number;
}

export default function PortraitWithKeypoints() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });
  const [isInside, setIsInside] = useState(false);
  const [systemTime, setSystemTime] = useState("");

  // Update a milliseconds ticker for real-time military look
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const ms = String(now.getMilliseconds()).padStart(3, "0");
      const sec = String(now.getSeconds()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const hr = String(now.getHours()).padStart(2, "0");
      setSystemTime(`${hr}:${min}:${sec}.${ms}`);
    };
    const interval = setInterval(updateTime, 33);
    return () => clearInterval(interval);
  }, []);

  // Face Keypoints normalized to a 100x133 grid (based on 3:4 aspect ratio)
  const keypoints: Keypoint[] = [
    { id: 1, name: "L_EYEBROW_OUT", x: 48, y: 32 },
    { id: 2, name: "L_EYEBROW_IN", x: 58, y: 30.6 },
    { id: 3, name: "R_EYEBROW_IN", x: 68, y: 34.6 },
    { id: 4, name: "R_EYEBROW_OUT", x: 78, y: 37.2 },
    { id: 5, name: "L_EYE_OUT", x: 51, y: 34.6 },
    { id: 6, name: "L_EYE_PUPIL", x: 55, y: 33.3 },
    { id: 7, name: "L_EYE_IN", x: 59, y: 34.6 },
    { id: 8, name: "R_EYE_IN", x: 69, y: 38.6 },
    { id: 9, name: "R_EYE_PUPIL", x: 73, y: 39.9 },
    { id: 10, name: "R_EYE_OUT", x: 77, y: 41.2 },
    { id: 11, name: "NOSE_BRIDGE", x: 64, y: 33.3 },
    { id: 12, name: "NOSE_TIP", x: 65, y: 43.9 },
    { id: 13, name: "NOSE_L_NOSTRIL", x: 60, y: 45.2 },
    { id: 14, name: "NOSE_R_NOSTRIL", x: 70, y: 46.6 },
    { id: 15, name: "MOUTH_L_CORNER", x: 58, y: 50.5 },
    { id: 16, name: "MOUTH_UPPER_LIP", x: 64, y: 49.2 },
    { id: 17, name: "MOUTH_R_CORNER", x: 71, y: 54.5 },
    { id: 18, name: "MOUTH_LOWER_LIP", x: 64, y: 55.9 },
    { id: 19, name: "JAW_L_MID", x: 46, y: 54.5 },
    { id: 20, name: "CHIN", x: 62, y: 65.2 },
    { id: 21, name: "JAW_R_MID", x: 76, y: 57.2 },
    { id: 22, name: "L_EAR_BASE", x: 38, y: 43.9 },
    { id: 23, name: "FOREHEAD_CTR", x: 63, y: 21.3 }
  ];

  // Helper to find a keypoint by ID
  const kp = (id: number) => keypoints.find((k) => k.id === id);

  // Generate SVG lines between keypoints to form facial mesh
  const connections = [
    // Left Eyebrow
    [1, 2],
    // Right Eyebrow
    [3, 4],
    // Left Eye Contour
    [5, 6], [6, 7], [7, 5],
    // Right Eye Contour
    [8, 9], [9, 10], [10, 8],
    // Nose Bridge
    [11, 12],
    // Nose Base
    [13, 12], [12, 14], [13, 14],
    // Mouth
    [15, 16], [16, 17], [17, 18], [18, 15],
    // Jawline
    [22, 19], [19, 20], [20, 21],
    // Structural Mesh
    [2, 11], [3, 11],
    [7, 11], [8, 11],
    [12, 16],
    [13, 15], [14, 17],
    [15, 19], [17, 21],
    [18, 20],
    [5, 19], [10, 21],
    [1, 5], [4, 10],
    [23, 2], [23, 3]
  ];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Calculate 0-100 values inside the box
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 133); // relative to height viewBox scale
    setMouseCoords({ x, y: Math.min(y, 133) });
  };

  return (
    <div className="relative w-full max-w-[420px] md:max-w-[460px] lg:max-w-[490px] pr-14 pl-2 pt-2">
      {/* Outer brutalist frame header (above the viewport, aligned with viewport width) */}
      <div className="w-[calc(100%-56px)] flex justify-between items-center px-1 pb-1 font-mono text-[9px] text-neutral-500 tracking-wider">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
          <span>[SYS.FEED_ACTIVE]</span>
        </div>
        <span>{systemTime}</span>
      </div>

      {/* Viewport Wrapper Container (with border decorations outside it) */}
      <div className="relative w-[calc(100%-56px)]">
        
        {/* VIEWPORT (Overflow hidden for crop/image/scanning/svg keypoints) */}
        <div
          id="portrait-keypoint-viewport"
          ref={containerRef}
          onMouseEnter={() => {
            setIsHovered(true);
            setIsInside(true);
          }}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsInside(false);
          }}
          onMouseMove={handleMouseMove}
          className="relative w-full aspect-[3/4] bg-neutral-200 overflow-hidden group select-none cursor-crosshair border border-neutral-950"
        >
          {/* Grayscale styled portrait image */}
          <img
            id="portrait-source-image"
            src={portraitImg}
            alt="Miles Dao Portrait"
            className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-[1.10] brightness-[0.93] transition-all duration-700 group-hover:contrast-[1.20] group-hover:brightness-[0.85]"
          />

          {/* Dynamic Scanning Line */}
          <div 
            id="scanner-sweep-line"
            className="absolute left-0 w-full h-[1.5px] bg-red-500 shadow-[0_0_8px_#ef4444] pointer-events-none opacity-0 group-hover:opacity-100"
            style={{
              zIndex: 10,
            }}
          />

          {/* Interactive SVG Mesh Overlay */}
          <svg
            id="facial-keypoints-mesh-svg"
            viewBox="0 0 100 133"
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 15 }}
          >
            {/* Coordinates Grid pattern (visible on hover) */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(17,17,17,0.025)" strokeWidth="0.25" />
              </pattern>
            </defs>
            <rect width="100" height="133" fill="url(#grid)" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Mouse cursor crosshairs */}
            {isInside && (
              <g id="mouse-tracking-crosshairs" stroke="rgba(239, 68, 68, 0.2)" strokeWidth="0.3" strokeDasharray="1 1.5">
                <line x1="0" y1={mouseCoords.y} x2="100" y2={mouseCoords.y} />
                <line x1={mouseCoords.x} y1="0" x2={mouseCoords.x} y2="133" />
              </g>
            )}

            {/* Facial Mesh Lines */}
            <g 
              id="mesh-wireframe-lines" 
              stroke={isHovered ? "rgba(239, 68, 68, 0.35)" : "rgba(17, 17, 17, 0.15)"} 
              strokeWidth="0.35" 
              fill="none" 
              className="transition-colors duration-500"
            >
              {connections.map(([fromId, toId], idx) => {
                const start = kp(fromId);
                const end = kp(toId);
                if (!start || !end) return null;
                return (
                  <line
                    key={`conn-${idx}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                  />
                );
              })}
            </g>


            {/* Mesh Nodes (Keypoints) */}
            <g id="mesh-nodes">
              {keypoints.map((point) => (
                <circle
                  key={`node-${point.id}`}
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? "0.8" : "0.5"}
                  fill={isHovered ? "#ef4444" : "#111111"}
                  className="transition-all duration-300"
                  style={{
                    filter: isHovered ? "drop-shadow(0 0 2px rgba(239, 68, 68, 0.8))" : "none"
                  }}
                />
              ))}
            </g>
          </svg>

          {/* Technical Corner Brackets (internal visual detail) */}
          <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t border-l border-neutral-950/20 group-hover:border-red-500/50 transition-colors duration-300" />
          <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t border-r border-neutral-950/20 group-hover:border-red-500/50 transition-colors duration-300" />
          <div className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b border-l border-neutral-950/20 group-hover:border-red-500/50 transition-colors duration-300" />
          <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b border-r border-neutral-950/20 group-hover:border-red-500/50 transition-colors duration-300" />

          {/* Overlay HUD - Coordinate readouts inside bottom bar */}
          <div className="absolute bottom-1.5 inset-x-1.5 flex justify-between items-end px-1.5 py-1 bg-[#ebeae4]/85 backdrop-blur-xs border border-neutral-900/10 font-mono text-[8px] text-neutral-800 pointer-events-none select-none transition-opacity duration-300 opacity-90 group-hover:opacity-100">
            <div className="flex flex-col text-left">
              <span>RESOL: 768x1024 PX</span>
              <span>FOV: 54.2 DEG | GAIN: +4.2dB</span>
            </div>
            <div className="flex flex-col text-right font-bold text-neutral-950">
              {isInside ? (
                <span className="text-red-600">X: {mouseCoords.x} Y: {mouseCoords.y}</span>
              ) : (
                <span>COORD: SYNCED</span>
              )}
              <span>CONF: 99.85%</span>
            </div>
          </div>

          {/* Small badge overlay in upper right */}
          <div className="absolute top-3 right-3 font-mono text-[7px] bg-neutral-950 text-[#ebeae4] px-1 py-0.5 rounded-xs tracking-widest pointer-events-none select-none opacity-40 group-hover:opacity-90 transition-opacity duration-300">
            MD_DET_01
          </div>
        </div>

        {/* BORDER DECORATIONS (Rendered outside viewport, so lines can extend) */}
        
        {/* Horizontal extending lines */}
        <div className="absolute top-0 left-[-40px] right-[-24px] h-[1px] bg-neutral-950 pointer-events-none z-20" />
        <div className="absolute bottom-0 left-[-15px] right-[-15px] h-[1px] bg-neutral-950 pointer-events-none z-20" />
        
        {/* Vertical extending lines */}
        <div className="absolute left-0 top-[-15px] bottom-[-45px] w-[1px] bg-neutral-950 pointer-events-none z-20" />
        <div className="absolute right-0 top-[-25px] bottom-[-15px] w-[1px] bg-neutral-950 pointer-events-none z-20" />

        {/* Black Square Control Nodes at Intersections */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-neutral-950 border border-[#ebeae4] z-30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-neutral-950 border border-[#ebeae4] z-30" />
        <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-neutral-950 border border-[#ebeae4] z-30" />
        <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-neutral-950 border border-[#ebeae4] z-30" />
        <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-neutral-950 border border-[#ebeae4] z-30" />
      </div>

      {/* HUD SIDEBAR CONTENT (Rendered in the padding-right space) */}
      
      {/* Target/Frame Label and Target Crosshair Icon */}
      <div className="absolute right-0 top-2.5 flex flex-col items-end gap-1.5 font-mono text-[9px] text-neutral-500 tracking-wider">
        <span className="text-neutral-400">FRAME_26A</span>
        {/* Crosshair circular icon */}
        <div className="w-4 h-4 rounded-full border border-neutral-400/80 flex items-center justify-center relative select-none">
          <span className="absolute w-2.5 h-[1px] bg-neutral-400/80" />
          <span className="absolute h-2.5 w-[1px] bg-neutral-400/80" />
          <span className="w-1.5 h-1.5 rounded-full border border-neutral-400/40" />
        </div>
      </div>

      {/* Vertical Coordinates readout next to the right border */}
      <div className="absolute right-0 top-[35%] flex flex-col items-end gap-1 font-mono text-[9px] text-neutral-500 tracking-widest leading-none border-r border-neutral-400/50 pr-2">
        <span>21.0285° N</span>
        <span>105.8542° E</span>
      </div>
    </div>
  );
}
