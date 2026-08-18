'use client';

import {
  useRef,
  useState,
  useEffect,
  type MouseEvent,
  type TouchEvent,
} from "react";
import { SignatureData } from "@/lib/quotepro/types";
import { t } from "@/lib/quotepro/i18n";
import { useAppContext } from "@/lib/quotepro/context";
import { PenTool, Type } from "lucide-react";

interface SignaturePadProps {
  onSave: (data: SignatureData | undefined) => void;
  initialSignature?: SignatureData;
  clearLabel?: string;
}

export function SignaturePad({
  onSave,
  initialSignature,
  clearLabel = "Limpar",
}: SignaturePadProps) {
  const { settings } = useAppContext();
  const lang = settings.language;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTab, setActiveTab] = useState<"draw" | "type">(
    initialSignature?.type || "draw",
  );

  // Draw State
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(
    !!(initialSignature?.type === "draw" && initialSignature.dataUrl),
  );

  // Type State
  const [typedName, setTypedName] = useState(initialSignature?.typedName || "");
  const [acceptedTerms, setAcceptedTerms] = useState(
    initialSignature?.acceptedTerms || false,
  );

  useEffect(() => {
    if (
      activeTab === "draw" &&
      initialSignature?.type === "draw" &&
      initialSignature.dataUrl &&
      canvasRef.current
    ) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        ctx?.drawImage(img, 0, 0);
      };
      img.src = initialSignature.dataUrl;
    }
  }, [activeTab, initialSignature]);

  useEffect(() => {
    // Report changes upstream when typing
    if (activeTab === "type") {
      if (typedName.trim().length > 2 && acceptedTerms) {
        onSave({
          type: "type",
          typedName,
          acceptedTerms,
          timestamp: new Date().toISOString(),
        });
      } else {
        onSave(undefined);
      }
    }
  }, [typedName, acceptedTerms, activeTab, onSave]);

  const startDrawing = (
    e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>,
  ) => {
    setIsDrawing(true);
    draw(e);
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setHasDrawn(true);
      onSave({
        type: "draw",
        dataUrl,
        acceptedTerms: true,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const draw = (
    e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing && e.type !== "mousedown" && e.type !== "touchstart") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000";

    if (e.type === "mousedown" || e.type === "touchstart") {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSave(undefined);
  };

  return (
    <div className="w-full">
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("draw")}
          className={`flex items-center gap-2 py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === "draw"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <PenTool size={16} />
          {t("drawSignature", lang)}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("type")}
          className={`flex items-center gap-2 py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === "type"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Type size={16} />
          {t("typeSignature", lang)}
        </button>
      </div>

      {activeTab === "draw" && (
        <div className="flex flex-col items-center">
          <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white shadow-inner touch-none relative">
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              onMouseDown={startDrawing}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onMouseMove={draw}
              onTouchStart={startDrawing}
              onTouchEnd={endDrawing}
              onTouchMove={draw}
              className="cursor-crosshair bg-white"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-sm select-none">
                Assine aqui com o dedo ou mouse
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={clearCanvas}
            className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            {clearLabel}
          </button>
        </div>
      )}

      {activeTab === "type" && (
        <div className="space-y-4 max-w-sm mx-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("typedName", lang)}
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Digite seu nome completo"
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          {typedName && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
              <span className="font-serif italic text-2xl text-slate-800 dark:text-slate-100">
                {typedName}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="acceptTerms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
            />
            <label
              htmlFor="acceptTerms"
              className="text-sm text-slate-600 dark:text-slate-400"
            >
              {t("acceptTerms", lang)}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
