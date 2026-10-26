import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

interface ScratchPoint {
  x: number;
  y: number;
}

interface UseRealisticScratchSurfaceOptions {
  threshold?: number;
  brushRadius?: number;
  onComplete: () => void;
}

interface ScratchSurfaceApi {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  progress: number;
  isReady: boolean;
  isScratching: boolean;
  isComplete: boolean;
  handlePointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  revealAccessibly: () => void;
  resetSurface: () => void;
}

export function useRealisticScratchSurface({
  threshold = 60,
  brushRadius = 22,
  onComplete
}: UseRealisticScratchSurfaceOptions): ScratchSurfaceApi {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPointRef = useRef<ScratchPoint | null>(null);
  const progressFrameRef = useRef<number | null>(null);
  const completedCallbackRef = useRef(false);
  const scratchStartedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isScratching, setIsScratching] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const drawCoating = useCallback(() => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();

    if (!canvas || !rect || rect.width === 0 || rect.height === 0) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * pixelRatio);
    canvas.height = Math.round(rect.height * pixelRatio);

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return;
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, rect.width, rect.height);

    const baseGradient = context.createLinearGradient(0, 0, rect.width, rect.height);
    baseGradient.addColorStop(0, "#f7f8fb");
    baseGradient.addColorStop(0.18, "#c9ced7");
    baseGradient.addColorStop(0.48, "#eef1f4");
    baseGradient.addColorStop(0.72, "#aeb5c0");
    baseGradient.addColorStop(1, "#f8fafc");
    context.fillStyle = baseGradient;
    context.fillRect(0, 0, rect.width, rect.height);

    for (let i = 0; i < 120; i += 1) {
      const x = (i * 47) % rect.width;
      const y = (i * 83) % rect.height;
      const alpha = 0.08 + ((i % 7) * 0.015);
      context.fillStyle = `rgba(255,255,255,${alpha})`;
      context.beginPath();
      context.arc(x, y, 0.8 + (i % 4) * 0.45, 0, Math.PI * 2);
      context.fill();
    }

    for (let i = -rect.height; i < rect.width; i += 34) {
      context.strokeStyle = "rgba(255,255,255,0.18)";
      context.lineWidth = 8;
      context.beginPath();
      context.moveTo(i, rect.height);
      context.lineTo(i + rect.height, 0);
      context.stroke();

      context.strokeStyle = "rgba(58,69,86,0.08)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(i + 13, rect.height);
      context.lineTo(i + rect.height + 13, 0);
      context.stroke();
    }

    context.globalCompositeOperation = "source-over";
    setIsReady(true);
  }, []);

  const finishReveal = useCallback(() => {
    if (completedCallbackRef.current) {
      return;
    }

    completedCallbackRef.current = true;
    setProgress(100);
    setIsComplete(true);
    setIsScratching(false);

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    onComplete();
  }, [onComplete]);

  const calculateProgress = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });

    if (!canvas || !context || canvas.width === 0 || canvas.height === 0) {
      return;
    }

    const sampleStep = Math.max(8, Math.floor(Math.min(canvas.width, canvas.height) / 44));
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let checked = 0;
    let cleared = 0;

    for (let y = 0; y < canvas.height; y += sampleStep) {
      for (let x = 0; x < canvas.width; x += sampleStep) {
        checked += 1;
        const alpha = imageData[(y * canvas.width + x) * 4 + 3];
        if (alpha < 96) {
          cleared += 1;
        }
      }
    }

    const nextProgress = Math.min(100, Math.round((cleared / checked) * 100));
    setProgress(nextProgress);

    if (nextProgress >= threshold) {
      finishReveal();
    }
  }, [finishReveal, threshold]);

  const scheduleProgressCheck = useCallback(() => {
    if (progressFrameRef.current !== null) {
      return;
    }

    progressFrameRef.current = window.requestAnimationFrame(() => {
      progressFrameRef.current = null;
      calculateProgress();
    });
  }, [calculateProgress]);

  const getPoint = (event: ReactPointerEvent<HTMLCanvasElement>): ScratchPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const scratchLine = useCallback((from: ScratchPoint, to: ScratchPoint) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context || isComplete) {
      return;
    }

    const wobble = Math.sin((to.x + to.y) * 0.08) * 2.5;
    context.globalCompositeOperation = "destination-out";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = brushRadius * 2 + wobble;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();

    context.beginPath();
    context.arc(to.x, to.y, brushRadius + wobble, 0, Math.PI * 2);
    context.fill();

    context.globalCompositeOperation = "source-over";
    scheduleProgressCheck();
  }, [brushRadius, isComplete, scheduleProgressCheck]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (isComplete) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    scratchStartedRef.current = true;
    setIsScratching(true);

    const point = getPoint(event);
    lastPointRef.current = point;
    scratchLine(point, point);
  }, [isComplete, scratchLine]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isScratching || isComplete || !lastPointRef.current) {
      return;
    }

    event.preventDefault();
    const nextPoint = getPoint(event);
    scratchLine(lastPointRef.current, nextPoint);
    lastPointRef.current = nextPoint;
  }, [isComplete, isScratching, scratchLine]);

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    lastPointRef.current = null;
    setIsScratching(false);
    scheduleProgressCheck();
  }, [scheduleProgressCheck]);

  const revealAccessibly = useCallback(() => {
    finishReveal();
  }, [finishReveal]);

  const resetSurface = useCallback(() => {
    completedCallbackRef.current = false;
    scratchStartedRef.current = false;
    lastPointRef.current = null;
    setProgress(0);
    setIsComplete(false);
    setIsScratching(false);
    drawCoating();
  }, [drawCoating]);

  useEffect(() => {
    drawCoating();

    function handleResize() {
      if (!scratchStartedRef.current && !completedCallbackRef.current) {
        drawCoating();
      }
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (progressFrameRef.current !== null) {
        window.cancelAnimationFrame(progressFrameRef.current);
      }
    };
  }, [drawCoating]);

  return {
    canvasRef,
    progress,
    isReady,
    isScratching,
    isComplete,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    revealAccessibly,
    resetSurface
  };
}