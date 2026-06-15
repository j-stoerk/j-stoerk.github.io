import { useEffect, useRef } from "react";

interface AnimationSimulatorProps {
  animationType: 'orbital' | 'timeline' | 'reaction' | 'geometry' | 'matrix' | 'dna_helix';
  isActive: boolean;
}

export default function AnimationSimulator({ animationType, isActive }: AnimationSimulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || 400);
    let height = (canvas.height = canvas.offsetHeight || 600);

    // Track resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          width = canvas.width = entry.contentRect.width;
          height = canvas.height = entry.contentRect.height;
        }
      }
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    let frame = 0;

    // Set up particles or state for specific animations
    const particles: Array<{ x: number; y: number; vx: number; vy: number; r: number; color: string; alpha: number }> = [];

    if (animationType === "reaction") {
      for (let i = 0; i < 35; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          r: Math.random() * 4 + 2,
          color: i % 2 === 0 ? "#10b981" : "#3b82f6",
          alpha: Math.random() * 0.5 + 0.3,
        });
      }
    }

    const render = () => {
      if (!isActive) {
        // Render a frozen snapshot or simple background if not active to save battery
        ctx.fillStyle = "#0c0c0c";
        ctx.fillRect(0, 0, width, height);

        // draw static visual representation
        ctx.strokeStyle = "rgba(254, 44, 85, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 80, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", width / 2, height / 2 + 130);
        return;
      }

      frame++;
      ctx.clearRect(0, 0, width, height);

      // Deep dark background
      ctx.fillStyle = "#0c0c0c";
      ctx.fillRect(0, 0, width, height);

      // Grid helper lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      switch (animationType) {
        case "orbital": {
          // Centered gravitational object (Black hole or Sun)
          const centerX = width / 2;
          const centerY = height / 2 - 40;

          // Glowing force field
          const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 150);
          grad.addColorStop(0, "rgba(254, 44, 85, 0.2)");
          grad.addColorStop(0.4, "rgba(124, 58, 237, 0.05)");
          grad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
          ctx.fill();

          // Black hole center
          ctx.fillStyle = "#000000";
          ctx.strokeStyle = "rgba(254, 44, 85, 0.6)";
          ctx.lineWidth = 3;
          ctx.shadowColor = "#fe2c55";
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 25 + Math.sin(frame * 0.05) * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0; // reset

          // Orbital bands
          const orbits = [70, 110, 160];
          orbits.forEach((r, idx) => {
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.15 - idx * 0.03})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
            ctx.stroke();

            // Planet/Object
            const speed = (0.02 / (idx + 1)) * (idx % 2 === 0 ? 1 : -1);
            const angle = frame * speed;
            const px = centerX + r * Math.cos(angle);
            const py = centerY + r * Math.sin(angle);

            ctx.fillStyle = idx === 0 ? "#fe2c55" : idx === 1 ? "#a78bfa" : "#38bdf8";
            ctx.beginPath();
            ctx.arc(px, py, 4 + idx, 0, Math.PI * 2);
            ctx.fill();

            // Trace path emitter
            ctx.strokeStyle = idx === 0 ? "rgba(254, 44, 85, 0.3)" : "rgba(167, 139, 250, 0.2)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(centerX + r * Math.cos(angle - speed * 15), centerY + r * Math.sin(angle - speed * 15));
            ctx.stroke();
          });
          break;
        }

        case "timeline": {
          // Historical Milestone Nodes scrolling upwards
          const scrollY = (frame * 0.5) % height;
          ctx.strokeStyle = "rgba(217, 119, 6, 0.2)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(width / 2, 0);
          ctx.lineTo(width / 2, height);
          ctx.stroke();

          const years = [
            { year: "48 BC", text: "Caesar Fought" },
            { year: "391 AD", text: "Decree of Theodosius" },
            { year: "642 AD", text: "Final Scroll Lost" },
            { year: "2026 AD", text: "LearnTok Created" }
          ];

          years.forEach((item, index) => {
            const y = ((index * (height / years.length)) + scrollY) % height;

            // Draw connecting bars
            ctx.fillStyle = "#d97706";
            ctx.beginPath();
            ctx.arc(width / 2, y, 7, 0, Math.PI * 2);
            ctx.fill();

            // Node visual box
            ctx.fillStyle = "rgba(30, 41, 59, 0.6)";
            ctx.strokeStyle = "rgba(217, 119, 6, 0.4)";
            ctx.lineWidth = 1;
            const isLeft = index % 2 === 0;
            const boxX = isLeft ? width / 2 - 130 : width / 2 + 15;
            ctx.fillRect(boxX, y - 20, 115, 38);
            ctx.strokeRect(boxX, y - 20, 115, 38);

            // Year details text
            ctx.fillStyle = "#f59e0b";
            ctx.font = "bold 11px monospace";
            ctx.textAlign = "left";
            ctx.fillText(item.year, boxX + 8, y - 6);

            ctx.fillStyle = "#e2e8f0";
            ctx.font = "9px sans-serif";
            ctx.fillText(item.text, boxX + 8, y + 10);
          });
          break;
        }

        case "dna_helix": {
          // Double helix rotates gracefully
          const centerX = width / 2;
          const numNodes = 18;
          const spacing = height / (numNodes + 2);

          for (let i = 0; i <= numNodes; i++) {
            const y = spacing * (i + 1);
            const angle = frame * 0.02 + i * 0.35;
            const amp = width * 0.25;

            const x1 = centerX + Math.sin(angle) * amp;
            const x2 = centerX - Math.sin(angle) * amp;

            const rSize = (Math.cos(angle) + 1) * 3 + 2; // perspective depth size

            // Connecting link
            ctx.strokeStyle = `rgba(16, 185, 129, ${Math.abs(Math.sin(angle)) * 0.3 + 0.1})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();

            // Strands nodes
            ctx.fillStyle = "#10b981";
            ctx.beginPath();
            ctx.arc(x1, y, rSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#3b82f6";
            ctx.beginPath();
            ctx.arc(x2, y, rSize, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case "geometry": {
          // Intertwined vector geometric loops
          const cx = width / 2;
          const cy = height / 2 - 30;
          const size = 110 + Math.sin(frame * 0.01) * 15;

          ctx.strokeStyle = "rgba(14, 165, 233, 0.25)";
          ctx.lineWidth = 1.5;

          // Outer rotating cube/hexagon
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = frame * 0.005 + (i * Math.PI) / 3;
            const x = cx + size * Math.cos(angle);
            const y = cy + size * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();

          // Connective node details to center
          for (let i = 0; i < 6; i++) {
            const angle = frame * 0.005 + (i * Math.PI) / 3;
            const x = cx + size * Math.cos(angle);
            const y = cy + size * Math.sin(angle);

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x, y);
            ctx.stroke();

            // Glowing index points
            ctx.fillStyle = "#0ea5e9";
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
          }

          // Inner circular orbit
          ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
          ctx.beginPath();
          ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        case "reaction": {
          // Physics collision molecular system
          particles.forEach((p, idx) => {
            // Update kinematics
            p.x += p.vx;
            p.y += p.vy;

            // Wall bounce
            if (p.x - p.r < 0 || p.x + p.r > width) p.vx = -p.vx;
            if (p.y - p.r < 0 || p.y + p.r > height) p.vy = -p.vy;

            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Connections
            for (let j = idx + 1; j < particles.length; j++) {
              const p2 = particles[j];
              const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
              if (dist < 90) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist / 90) * 0.15})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
              }
            }
          });
          break;
        }

        default: {
          // Falling technical matrix code binary columns
          ctx.fillStyle = "rgba(254, 44, 85, 0.15)";
          ctx.font = "11px monospace";
          ctx.textAlign = "center";
          for (let col = 0; col < width; col += 30) {
            const val = Math.floor(Math.random() * 2);
            const scrollY = (frame * 1.5 + col * 2) % height;
            ctx.fillText(val.toString(), col, scrollY);
          }
          break;
        }
      }

      // Continuous loop
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [animationType, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none rounded-3xl"
      style={{ filter: "brightness(0.7) contrast(1.1)" }}
    />
  );
}
