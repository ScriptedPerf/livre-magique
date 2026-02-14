
import React, { useRef, useEffect, useState } from 'react';

interface TracingCanvasProps {
    letter: string;
    color: string;
    onComplete?: () => void;
}

const TracingCanvas: React.FC<TracingCanvasProps> = ({ letter, color, onComplete }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const strokeDistance = useRef(0);

    // Track state in refs for use in event listeners
    const isDrawingRef = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawBackground(ctx, canvas.width, canvas.height);
        strokeDistance.current = 0;

        // Manual event listeners for touch with passive: false to allow preventDefault
        const handleTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            setIsDrawing(true);
            isDrawingRef.current = true;
            const pos = getCoordinates(e);
            lastPos.current = pos;
        };

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            if (!isDrawingRef.current) return;
            drawAction(e);
        };

        const handleTouchEnd = (e: TouchEvent) => {
            // e.preventDefault(); // Don't prevent default on end to allow clicks elsewhere
            setIsDrawing(false);
            isDrawingRef.current = false;
            stopDrawingAction();
        };

        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, [letter]);

    const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.clearRect(0, 0, width, height);

        // Draw guide lines
        ctx.strokeStyle = '#fbcfe8';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Letter/Shape template
        const isSymbol = letter.length > 1 || !/[A-Z]/.test(letter);
        const fontSize = isSymbol ? 200 : 260;

        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw the filled character (very light)
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(letter, width / 2, height / 2 + 20);

        // Template outline
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.strokeText(letter, width / 2, height / 2 + 20);
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();

        // Handle touches (native or react)
        let clientX, clientY;
        if ('touches' in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent) => {
        setIsDrawing(true);
        isDrawingRef.current = true;
        const pos = getCoordinates(e);
        lastPos.current = pos;
    };

    const stopDrawingAction = () => {
        lastPos.current = null;
        // Simple heuristic: if they drew enough, assume success
        if (strokeDistance.current > 300) {
            if (onComplete) onComplete();
            strokeDistance.current = 0;
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        isDrawingRef.current = false;
        stopDrawingAction();
    };

    const drawAction = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pos = getCoordinates(e);

        if (lastPos.current) {
            const dx = pos.x - lastPos.current.x;
            const dy = pos.y - lastPos.current.y;
            strokeDistance.current += Math.sqrt(dx * dx + dy * dy);
        }

        ctx.lineWidth = 28;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#ec4899'; // Magic pink

        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(236, 72, 153, 0.4)';

        ctx.beginPath();
        if (lastPos.current) {
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
        }
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        ctx.shadowBlur = 0;
        lastPos.current = pos;
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        drawAction(e);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawBackground(ctx, canvas.width, canvas.height);
        strokeDistance.current = 0;
    };

    return (
        <div className="flex flex-col items-center gap-6 w-full">
            <div className="relative bg-white rounded-[3rem] shadow-inner overflow-hidden border-8 border-pink-100 cursor-none w-full max-w-[350px]">
                <canvas
                    ref={canvasRef}
                    width={350}
                    height={450}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ touchAction: 'none' }}
                    className="cursor-crosshair w-full h-auto block"
                />
            </div>
            <button
                onClick={clearCanvas}
                className="px-10 py-4 bg-pink-100 hover:bg-pink-200 text-pink-600 rounded-full font-black text-xl transition-all transform active:scale-95 shadow-md flex items-center gap-2"
            >
                <span>Effacer</span>
                <span className="text-2xl">↺</span>
            </button>
        </div>
    );
};

export default TracingCanvas;
