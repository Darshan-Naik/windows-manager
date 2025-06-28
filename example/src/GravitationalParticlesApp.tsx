import { useEffect, useState, useRef, type JSX } from "react";
import WindowsManager from "../../index";
import type { WindowType } from "../../index";

const manager = new WindowsManager();

// Particle system constants
const PARTICLES_PER_LINE = 150;
const PARTICLE_SPEED = 0.01; // Lower is slower
const PARTICLE_SIZE = 0.3;
const PARTICLE_SIZE_END = 0.3;
const PARTICLE_OPACITY = 1;
const PARTICLE_OPACITY_END = 0.5;
const CIRCLE_RADIUS = 10; // SVG units, adjust to match your main circle

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function GravitationalParticlesApp() {
  const [state, setState] = useState(manager.getCurrentState());
  const animationRef = useRef<number>(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    manager.addStateChangeListener((state) => {
      setState(state);
    });
  }, []);

  // Animation loop for particles
  useEffect(() => {
    let running = true;
    function animate() {
      setTick((t) => t + 1);
      if (running) animationRef.current = requestAnimationFrame(animate);
    }
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Calculate line end point based on window position relative to current window
  const calculateLineEndPoint = (otherWindow: WindowType) => {
    const currentWindow = state.thisWindow;
    const currentWindowWidth = currentWindow.innerWidth;
    const currentWindowHeight = currentWindow.innerHeight;
    const otherWindowWidth = otherWindow.innerWidth;
    const otherWindowHeight = otherWindow.innerHeight;
    const currentWindowCenterX = currentWindow.screenX + currentWindowWidth / 2;
    const currentWindowCenterY =
      currentWindow.screenY + currentWindowHeight / 2;
    const otherWindowCenterX = otherWindow.screenX + otherWindowWidth / 2;
    const otherWindowCenterY = otherWindow.screenY + otherWindowHeight / 2;
    const directionX = otherWindowCenterX - currentWindowCenterX;
    const directionY = otherWindowCenterY - currentWindowCenterY;
    if (Math.abs(directionX) < 1 && Math.abs(directionY) < 1) {
      return { x: 50, y: 50, angle: 0 };
    }
    const angle = Math.atan2(directionY, directionX);
    const screenDiagonal = Math.sqrt(100 * 100 + 100 * 100); // SVG viewBox is 100x100
    const endX = 50 + Math.cos(angle) * screenDiagonal;
    const endY = 50 + Math.sin(angle) * screenDiagonal;
    const angleDegrees = angle * (180 / Math.PI);
    return { x: endX, y: endY, angle: angleDegrees };
  };

  // Render SVG particles for each line
  const renderParticles = (endPoint: { x: number; y: number }) => {
    const particles: JSX.Element[] = [];
    for (let i = 0; i < PARTICLES_PER_LINE; i++) {
      // Seeded random for this particle
      const rand = seededRandom(i + 1000);
      const randSpeed = lerp(0.7, 1.3, seededRandom(i + 2000)); // speed multiplier
      const randSize = lerp(0.7, 1.7, rand); // size multiplier

      // Random angle for this particle's start point on the circle
      const startAngle = seededRandom(i + 3000) * 2 * Math.PI;
      const startX = 50 + Math.cos(startAngle) * CIRCLE_RADIUS;
      const startY = 50 + Math.sin(startAngle) * CIRCLE_RADIUS;

      // Particle progress along the line (0=start, 1=end)
      const phase =
        (tick * PARTICLE_SPEED * randSpeed + i / PARTICLES_PER_LINE) % 1;
      const t = Math.pow(phase, 1.7);

      // Interpolate from random circle edge to endpoint
      const x = lerp(startX, endPoint.x, t);
      const y = lerp(startY, endPoint.y, t);

      const size = lerp(PARTICLE_SIZE, PARTICLE_SIZE_END, t) * randSize;
      const opacity = lerp(PARTICLE_OPACITY, PARTICLE_OPACITY_END, t);

      particles.push(
        <circle
          key={i}
          cx={x}
          cy={y}
          r={size}
          fill="#fcd34d"
          opacity={opacity}
          style={{ filter: `blur(${lerp(0, 1.5, t)}px)` }}
        />
      );
    }
    return particles;
  };

  const renderCircleParticles = (
    count: number,
    radius: number,
    edgeOnly = false
  ) => {
    const particles: JSX.Element[] = [];
    for (let i = 0; i < count; i++) {
      // Random base angle
      const baseAngle = seededRandom(i + 5000) * 2 * Math.PI;
      // For edge particles, animate the angle
      let angle = baseAngle;
      if (edgeOnly) {
        const speed = lerp(0.2, 1.2, seededRandom(i + 6000)); // random speed
        angle += tick * 0.01 * speed;
      }
      // Random radius (for inside), fixed for edge
      const r = edgeOnly ? radius : Math.sqrt(seededRandom(i + 7000)) * radius; // sqrt for uniform distribution
      const x = 50 + Math.cos(angle) * r;
      const y = 50 + Math.sin(angle) * r;
      const size = lerp(0.1, 0.5, seededRandom(i + 8000));
      const baseOpacity = lerp(0.3, 0.8, seededRandom(i + 9000));
      const opacity = edgeOnly ? baseOpacity : Math.min(1, baseOpacity + 0.5);
      const blur = edgeOnly
        ? lerp(0, 1.2, seededRandom(i + 10000))
        : lerp(1.5, 3.5, seededRandom(i + 11000)); // more blur for inner
      particles.push(
        <circle
          key={i + (edgeOnly ? 10000 : 0)}
          cx={x}
          cy={y}
          r={size}
          fill="#fcd34d"
          opacity={opacity}
          style={{ filter: `blur(${blur}px)` }}
        />
      );
    }
    return particles;
  };

  return (
    <div className="flex flex-col gap-3 h-screen bg-black">
      <div className="h-full w-full flex gap-4 relative justify-center items-center">
        {/* SVG overlay for drawing lines and particles - positioned to cover entire screen */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id={`stretchGradient-${state.thisWindow.id}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#fcd34d" stopOpacity="1" />
              <stop offset="50%" stopColor="#fcd34d" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fcd34d" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {renderCircleParticles(20, CIRCLE_RADIUS, true)}

          {state.windows?.map((window) => {
            if (state.thisWindow.id === window.id) return null;

            const endPoint = calculateLineEndPoint(window);

            return <g key={window.id}>{renderParticles(endPoint)}</g>;
          })}
        </svg>

        <div
          className="
            size-10 rounded-full bg-amber-300 shadow-[0_0_25px_35px_rgba(252,211,77)] relative z-10 border-none
          "
        ></div>
      </div>
    </div>
  );
}

export default GravitationalParticlesApp;
