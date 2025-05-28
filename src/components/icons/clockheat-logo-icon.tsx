// src/components/icons/clockheat-logo-icon.tsx
import type { SVGProps } from 'react';

export function ClockHeatLogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64" // Using a 64x64 grid for easier calculations
      fill="none"
      {...props} // Spread props to allow className, width, height overrides from parent
    >
      {/* Background Rounded Square */}
      <rect width="64" height="64" rx="10" fill="#2A3B4D" /> {/* Dark Blue-Gray, similar to image */}

      {/* Clock */}
      <circle cx="23" cy="23" r="11" fill="#F0EAD6" /> {/* Cream Face */}
      {/* Clock Hands - pointing roughly to 10:10 */}
      <line x1="23" y1="23" x2="23" y2="15" stroke="#2A3B4D" strokeWidth="2.5" strokeLinecap="round" /> {/* Minute hand pointing up */}
      <line x1="23" y1="23" x2="17" y2="20" stroke="#2A3B4D" strokeWidth="2.5" strokeLinecap="round" /> {/* Hour hand pointing to 10ish */}

      {/* Simplified Heatmap Grid - L-shape */}
      {/* This is a simplified representation. For exact replication, more squares and precise coloring would be needed. */}
      {(() => {
        const s = 5.5; // square size
        const g = 1.5; // gap
        const cells = [];
        const startY = 9; // Starting Y for the vertical bar
        const horStartX = 9; // Starting X for the horizontal bar

        // Colors for the heatmap gradient (simplified)
        const heatmapColors = [
          "#63C1A8", // Teal
          "#77C8A5",
          "#8BD0A2",
          "#A0D79F",
          "#F3A66B", // Light Orange
          "#EC8C54", // Orange
          "#E46A5E", // Red-Orange
        ];

        // Vertical bar (3 columns, 7 rows)
        for (let col = 0; col < 3; col++) {
          const currentX = 38 + col * (s + g);
          for (let row = 0; row < 7; row++) {
            let colorIndex = Math.min(heatmapColors.length - 1, Math.floor(row / 1.5) + col);
            let h = s;
            // Apply bar chart effect to the rightmost columns
            if (col === 2) { // Rightmost column
              if (row === 3) h = s * 0.9;
              else if (row === 4) h = s * 0.75;
              else if (row === 5) h = s * 0.6;
              else if (row === 6) h = s * 0.4;
            } else if (col === 1) { // Middle column
              if (row === 5) h = s * 0.85;
              else if (row === 6) h = s * 0.7;
            }
            cells.push(
              <rect
                x={currentX}
                y={startY + row * (s + g) + (s - h)} // Adjust y for height change from top
                width={s}
                height={h}
                fill={heatmapColors[colorIndex]}
                key={`v-col-${col}-row-${row}`}
              />
            );
          }
        }

        // Horizontal bar (4 columns, 3 rows)
        const horStartY = 37; // Adjusted Y for bottom part
         for (let row = 0; row < 3; row++) {
          const currentY = horStartY + row * (s + g);
          for (let col = 0; col < 4; col++) {
            let colorIndex = Math.min(heatmapColors.length - 1, row + Math.floor(col / 1.5));
            let h = s;
            // Apply bar chart effect to the bottom rows towards the right
            if (row === 2) { // Bottommost row
                if (col === 1) h = s * 0.85;
                else if (col === 2) h = s * 0.7;
                else if (col === 3) h = s * 0.5;
            } else if (row === 1) { // Middle row
                if (col === 2) h = s * 0.9;
                else if (col === 3) h = s * 0.7;
            }
            cells.push(
              <rect
                x={horStartX + col * (s + g)}
                y={currentY + (s - h)} // Adjust y for height change from top
                width={s}
                height={h}
                fill={heatmapColors[colorIndex]}
                key={`h-row-${row}-col-${col}`}
              />
            );
          }
        }
        return cells;
      })()}
    </svg>
  );
}
