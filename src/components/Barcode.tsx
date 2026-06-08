import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  id: string;
  vertical?: boolean;
  width?: number;
  height?: number;
  value?: string;
}

export default function Barcode({ 
  id, 
  vertical = false, 
  width = 120, 
  height = 24, 
  value = "fb.com/milesdao13" 
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Code 128 width calculation: 11 modules per char + 22 (start/check) + 13 (stop)
  const totalModules = 11 * (value.length + 2) + 13;

  useEffect(() => {
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128B",
          displayValue: false,
          background: "transparent",
          lineColor: "currentColor",
          height: height,
          width: 2, // width of a single bar module in px
          margin: 0,
        });

        // Remove the fixed attributes added by JsBarcode to allow flexible CSS scaling
        svgRef.current.removeAttribute("width");
        svgRef.current.removeAttribute("height");
      } catch (err) {
        console.error("Barcode generation error:", err);
      }
    }
  }, [value, height]);

  if (vertical) {
    return (
      <div 
        id={id} 
        className="inline-block cursor-pointer hover:opacity-100 transition-opacity w-full h-full" 
        style={{ transform: "rotate(-90deg)", transformOrigin: "bottom left" }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${totalModules * 2} ${height}`}
          preserveAspectRatio="none"
          className="text-neutral-900 opacity-80 w-full h-full"
        />
      </div>
    );
  }

  return (
    <div id={id} className="inline-block overflow-hidden cursor-pointer hover:opacity-100 transition-opacity w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${totalModules * 2} ${height}`}
        preserveAspectRatio="none"
        className="text-neutral-950 opacity-80 w-full h-full"
        style={{ width: width, height: height }}
      />
    </div>
  );
}
