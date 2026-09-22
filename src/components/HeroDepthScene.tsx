import React, { useRef } from 'react';
import { CalendarDays, Link2, ShoppingBag } from 'lucide-react';

interface HeroDepthSceneProps {
  isRtl?: boolean;
  labels: { links: string; bookings: string; products: string };
}

/**
 * A lightweight, semantic 3D layer for the hero. It uses CSS perspective rather
 * than a WebGL scene because these are simple UI primitives, not model content.
 * The phone remains the interactive focal point; this layer only reinforces the
 * product story and has no interaction dependency.
 */
export const HeroDepthScene: React.FC<HeroDepthSceneProps> = ({ isRtl = false, labels }) => {
  const sceneRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const scene = sceneRef.current;
    if (!scene || event.pointerType === 'touch') return;

    const bounds = scene.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    scene.style.setProperty('--scene-rotate-x', `${(-y * 3).toFixed(2)}deg`);
    scene.style.setProperty('--scene-rotate-y', `${(x * (isRtl ? -3 : 3)).toFixed(2)}deg`);
  };

  const resetPointer = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.style.setProperty('--scene-rotate-x', '0deg');
    scene.style.setProperty('--scene-rotate-y', '0deg');
  };

  return (
    <div
      ref={sceneRef}
      aria-hidden="true"
      className="raloa-hero-depth pointer-events-auto absolute inset-[-18%] hidden sm:block"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <div className="raloa-depth-orbit raloa-depth-orbit-one" />
      <div className="raloa-depth-orbit raloa-depth-orbit-two" />

      <div className="raloa-depth-node raloa-depth-node-links">
        <Link2 className="h-4 w-4" strokeWidth={2.2} />
        <span>{labels.links}</span>
      </div>
      <div className="raloa-depth-node raloa-depth-node-bookings">
        <CalendarDays className="h-4 w-4" strokeWidth={2.2} />
        <span>{labels.bookings}</span>
      </div>
      <div className="raloa-depth-node raloa-depth-node-products">
        <ShoppingBag className="h-4 w-4" strokeWidth={2.2} />
        <span>{labels.products}</span>
      </div>
    </div>
  );
};
