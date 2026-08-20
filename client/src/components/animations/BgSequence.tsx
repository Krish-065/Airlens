import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export default function BgSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const frameCount = 151;

  // Preload images
  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      // Format number to 3 digits e.g. 001
      const frameNum = i.toString().padStart(3, '0');
      img.src = `/photos/ezgif-frame-${frameNum}.jpg`;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === frameCount) {
          // Force an initial draw when all images load, just in case ScrollTrigger hasn't
          drawFrame(1, loadedImages);
        }
      };
      loadedImages.push(img);
    }
    setImages(loadedImages);
  }, []);

  const drawFrame = (frameIndex: number, imgs: HTMLImageElement[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Safety check
    if (frameIndex < 1) frameIndex = 1;
    if (frameIndex > frameCount) frameIndex = frameCount;

    const img = imgs[frameIndex - 1];
    if (img && img.complete && img.naturalWidth !== 0) {
      // Set canvas to full window size
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Calculate aspect ratio to cover the screen (like object-fit: cover)
      const hRatio = canvas.width / img.width;
      const vRatio = canvas.height / img.height;
      const ratio = Math.max(hRatio, vRatio);

      const centerShift_x = (canvas.width - img.width * ratio) / 2;
      const centerShift_y = (canvas.height - img.height * ratio) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        0, 0, img.width, img.height,
        centerShift_x, centerShift_y, img.width * ratio, img.height * ratio
      );
    }
  };

  useGSAP(() => {
    if (images.length === 0) return;

    const frame = { value: 1 };

    ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top top", // When the top of the container hits the top of the viewport
      end: "bottom bottom", // When the bottom of the container hits the bottom of the viewport
      scrub: 1, // Smooth scrubbing
      animation: gsap.to(frame, {
        value: frameCount,
        snap: "value",
        ease: "none",
        onUpdate: () => drawFrame(Math.round(frame.value), images)
      })
    });

    // Handle resize
    const handleResize = () => drawFrame(Math.round(frame.value), images);
    window.addEventListener('resize', handleResize);

    // Initial draw
    drawFrame(1, images);

    return () => window.removeEventListener('resize', handleResize);

  }, [images]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <canvas
        ref={canvasRef}
        className="bg-canvas fixed top-0 left-0 w-full h-screen pointer-events-none transition-all duration-300"
        style={{ zIndex: 0, opacity: 0.5 }}
      />
    </div>
  );
}
