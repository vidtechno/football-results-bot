"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Download, Sparkles, X, Image as ImageIcon, Loader2, AlertCircle, RefreshCw, BookOpen } from "lucide-react";
import QRCode from "qrcode";

export interface ShareCardWork {
  id: string;
  slug?: string;
  title: string;
  coverUrl?: string | null;
  authorPenName: string;
}

export interface ShareCardChapter {
  id: string;
  slug?: string;
  chapterNumber?: number;
  title?: string;
}

export interface ShareCardGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  work: ShareCardWork;
  chapters?: ShareCardChapter[];
  initialChapterId?: string | null;
}

export const PROMO_CARD_DIMENSIONS = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1350 },
} as const;

/**
 * Builds canonical promotional URL for works or chapters.
 * Strictly guarantees https://manbora.uz (never localhost, www, or vercel).
 */
export function buildCanonicalPromoUrl(workSlug: string, chapterSlug?: string | null): string {
  const cleanWork = workSlug.trim().replace(/^\/+|\/+$/g, '');
  if (chapterSlug && chapterSlug.trim()) {
    const cleanChap = chapterSlug.trim().replace(/^\/+|\/+$/g, '');
    return `https://manbora.uz/asarlar/${cleanWork}/${cleanChap}`;
  }
  return `https://manbora.uz/asarlar/${cleanWork}`;
}

export function ShareCardGenerator({
  isOpen,
  onClose,
  work,
  chapters = [],
  initialChapterId = null,
}: ShareCardGeneratorProps) {
  const [format, setFormat] = useState<"story" | "post">("story");
  const [cardType, setCardType] = useState<"work" | "chapter">(
    initialChapterId && chapters.some((c) => c.id === initialChapterId) ? "chapter" : "work"
  );
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    initialChapterId || (chapters.length > 0 ? chapters[0].id : "")
  );
  const [quote, setQuote] = useState<string>(
    "Har bir sahifada yangi hayot va unutilmas tuyg‘ular..."
  );
  const [isGenerating, setIsGenerating] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId);

  const canonicalUrl = buildCanonicalPromoUrl(
    work.slug || work.id,
    cardType === "chapter" && selectedChapter
      ? selectedChapter.slug || `${selectedChapter.chapterNumber}`
      : null
  );

  const drawCard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsGenerating(true);
    setIsReady(false);
    setGenerateError(null);

    const isStory = format === "story";
    const { width, height } = PROMO_CARD_DIMENSIONS[format];

    canvas.width = width;
    canvas.height = height;

    try {
      // 1. Background Gradient: Deep sophisticated slate/espresso gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, "#1A1715");
      bgGradient.addColorStop(0.5, "#241F1C");
      bgGradient.addColorStop(1, "#12100E");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Decorative subtle accent glows
      const radial = ctx.createRadialGradient(
        width / 2,
        height * 0.35,
        100,
        width / 2,
        height * 0.35,
        width * 0.6
      );
      radial.addColorStop(0, "rgba(217, 119, 6, 0.15)");
      radial.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);

      // 3. Brand Header
      ctx.fillStyle = "#F59E0B";
      ctx.font = "800 38px Inter, Arial, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MANBORA", width / 2, isStory ? 150 : 65);

      ctx.fillStyle = "#A8A29E";
      ctx.font = "500 22px system-ui, sans-serif";
      ctx.fillText(
        "O‘zbek adabiyoti va hikoyalari platformasi",
        width / 2,
        isStory ? 195 : 98
      );

      // 4. Generate canonical QR code with high contrast and quiet zone (margin: 4)
      const qrDataUrl = await QRCode.toDataURL(canonicalUrl, {
        width: isStory ? 360 : 280,
        margin: 4, // 4-module quiet zone ensures standard QR scanner compliance
        errorCorrectionLevel: "M",
        color: {
          dark: "#1A1715",
          light: "#FFFFFF",
        },
      });

      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error("QR-kod yuklanmadi"));
      });

      // 5. Load cover image if available
      let coverImg: HTMLImageElement | null = null;
      if (work.coverUrl) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = work.coverUrl;
          await new Promise<void>((resolve) => {
            img.onload = () => {
              coverImg = img;
              resolve();
            };
            img.onerror = () => resolve(); // fallback to placeholder if cover load fails
          });
        } catch {
          coverImg = null;
        }
      }

      // 6. Layout-specific drawing
      if (isStory) {
        // Story Layout (1080x1920)
        const coverW = 440;
        const coverH = 620;
        const coverX = (width - coverW) / 2;
        const coverY = 260;

        // Shadow for cover
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 20;

        if (coverImg) {
          ctx.drawImage(coverImg, coverX, coverY, coverW, coverH);
        } else {
          ctx.fillStyle = "#38322E";
          ctx.fillRect(coverX, coverY, coverW, coverH);
          ctx.fillStyle = "#EAE5DD";
          ctx.font = "800 28px Inter, Arial, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(work.title, coverX + coverW / 2, coverY + coverH / 2);
        }
        ctx.restore();

        // Border around cover
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 3;
        ctx.strokeRect(coverX, coverY, coverW, coverH);

        // Title
        ctx.fillStyle = "#FAF8F5";
        ctx.font = "800 44px Inter, Arial, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(work.title, width / 2, 940, 920);

        // Chapter Subtitle if "Yangi bob"
        if (cardType === "chapter" && selectedChapter) {
          ctx.fillStyle = "#38BDF8";
          ctx.font = "bold 28px system-ui, sans-serif";
          ctx.fillText(
            `Yangi bob: ${selectedChapter.chapterNumber}-bob. ${selectedChapter.title || ""}`,
            width / 2,
            990,
            900
          );
        }

        // Author
        ctx.fillStyle = "#F59E0B";
        ctx.font = "bold 30px system-ui, sans-serif";
        ctx.fillText(`Muallif: ${work.authorPenName}`, width / 2, cardType === "chapter" ? 1035 : 1000);

        // Quote Box
        if (quote.trim()) {
          const quoteY = cardType === "chapter" ? 1075 : 1060;
          ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
          ctx.beginPath();
          ctx.roundRect(120, quoteY, 840, 220, 24);
          ctx.fill();
          ctx.strokeStyle = "rgba(217, 119, 6, 0.3)";
          ctx.stroke();

          ctx.fillStyle = "#EAE5DD";
          ctx.font = "italic 600 28px Inter, Arial, system-ui, sans-serif";
          ctx.fillText(`“${quote.trim()}”`, width / 2, quoteY + 115, 760);
        }

        // Canonical QR Code Badge (Story footer, safe zone 1400 - 1650)
        const qrCardW = 560;
        const qrCardH = 230;
        const qrCardX = (width - qrCardW) / 2;
        const qrCardY = 1400;

        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.roundRect(qrCardX, qrCardY, qrCardW, qrCardH, 28);
        ctx.fill();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // White card background for QR with quiet zone
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(qrCardX + 24, qrCardY + 20, 190, 190, 20);
        ctx.fill();
        ctx.drawImage(qrImg, qrCardX + 24, qrCardY + 20, 190, 190);

        // QR Text info
        ctx.textAlign = "left";
        ctx.fillStyle = "#F59E0B";
        ctx.font = "bold 26px system-ui, sans-serif";
        ctx.fillText(cardType === "chapter" ? "Bobni o‘qing" : "Hoziroq o‘qing", qrCardX + 240, qrCardY + 75);

        ctx.fillStyle = "#FAF8F5";
        ctx.font = "500 21px system-ui, sans-serif";
        ctx.fillText("Kamerangizni qarating", qrCardX + 240, qrCardY + 115);

        ctx.fillStyle = "#D6D3D1";
        ctx.font = "600 20px monospace";
        ctx.fillText("manbora.uz", qrCardX + 240, qrCardY + 160);

        // Footer note
        ctx.textAlign = "center";
        ctx.fillStyle = "#78716C";
        ctx.font = "500 22px system-ui, sans-serif";
        ctx.fillText("Manbora — o‘zbek adabiyoti va hikoyalari platformasi", width / 2, 1780);
      } else {
        // Telegram / social feed portrait layout (1080x1350, 4:5)
        const coverW = 300;
        const coverH = 450;
        const coverX = 80;
        const coverY = 230;

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 35;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 15;

        if (coverImg) {
          ctx.drawImage(coverImg, coverX, coverY, coverW, coverH);
        } else {
          ctx.fillStyle = "#38322E";
          ctx.fillRect(coverX, coverY, coverW, coverH);
          ctx.fillStyle = "#EAE5DD";
          ctx.font = "800 24px Inter, Arial, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(work.title, coverX + coverW / 2, coverY + coverH / 2);
        }
        ctx.restore();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 2;
        ctx.strokeRect(coverX, coverY, coverW, coverH);

        const textX = 430;
        ctx.textAlign = "left";

        // Title
        ctx.fillStyle = "#FAF8F5";
        ctx.font = "800 44px Inter, Arial, system-ui, sans-serif";
        ctx.fillText(work.title, textX, 300, 570);

        // Chapter Subtitle if "Yangi bob"
        if (cardType === "chapter" && selectedChapter) {
          ctx.fillStyle = "#38BDF8";
          ctx.font = "bold 22px system-ui, sans-serif";
          ctx.fillText(
            `Yangi bob: ${selectedChapter.chapterNumber}-bob. ${selectedChapter.title || ""}`,
            textX,
            350,
            570
          );
        }

        // Author
        ctx.fillStyle = "#F59E0B";
        ctx.font = "bold 24px system-ui, sans-serif";
        ctx.fillText(`Muallif: ${work.authorPenName}`, textX, cardType === "chapter" ? 405 : 365, 570);

        // Quote
        if (quote.trim()) {
          ctx.fillStyle = "#D6D3D1";
          ctx.font = "italic 600 23px Inter, Arial, system-ui, sans-serif";
          ctx.fillText(`“${quote.trim()}”`, textX, cardType === "chapter" ? 485 : 455, 570);
        }

        // Reading URL badge
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.roundRect(textX, 610, 440, 58, 14);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.fillText("manbora.uz da mutolaa qiling", textX + 22, 648);

        // Large QR area with an intact quiet zone for reliable phone scanning.
        const qrX = 80;
        const qrY = 790;
        const qrW = 920;
        const qrH = 390;

        ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
        ctx.beginPath();
        ctx.roundRect(qrX, qrY, qrW, qrH, 20);
        ctx.fill();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // White card with quiet zone
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(qrX + 35, qrY + 35, 300, 300, 20);
        ctx.fill();
        ctx.drawImage(qrImg, qrX + 45, qrY + 45, 280, 280);

        ctx.textAlign = "left";
        ctx.fillStyle = "#FAF8F5";
        ctx.font = "bold 30px system-ui, sans-serif";
        ctx.fillText(cardType === "chapter" ? "Bobni o‘qing" : "Hoziroq o‘qing", qrX + 390, qrY + 130);

        ctx.fillStyle = "#A8A29E";
        ctx.font = "500 21px system-ui, sans-serif";
        ctx.fillText("Telefon kamerasini QR-kodga qarating", qrX + 390, qrY + 180);

        ctx.fillStyle = "#F59E0B";
        ctx.font = "bold 24px monospace";
        ctx.fillText("manbora.uz", qrX + 390, qrY + 235);

        ctx.fillStyle = "#78716C";
        ctx.font = "500 20px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Manbora — o‘zbek adabiyoti va hikoyalari platformasi", width / 2, 1270);
      }

      setIsReady(true);
    } catch (err: any) {
      console.error("Promo-karta yaratishda xatolik:", err);
      setGenerateError(err?.message || "Promo-kartani generatsiya qilishda xatolik yuz berdi");
    } finally {
      setIsGenerating(false);
    }
  }, [format, quote, work, cardType, selectedChapter, canonicalUrl]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(drawCard, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, drawCard]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isReady || isGenerating) return;

    const link = document.createElement("a");
    const suffix = cardType === "chapter" && selectedChapter ? `bob-${selectedChapter.chapterNumber}` : "asar";
    link.download = `manbora-${work.slug || "promo"}-${suffix}-${format}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-3xl p-6 text-stone-100 shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-base sm:text-lg font-bold">
              Ijtimoiy tarmoqlar uchun promo-karta yaratish
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            {/* Card Type Selector (Asar vs Yangi bob) */}
            {chapters.length > 0 && (
              <div>
                <label className="block font-bold text-stone-300 mb-1.5">
                  Karta turi:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCardType("work")}
                    className={`p-2.5 rounded-xl border font-bold text-center transition ${
                      cardType === "work"
                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                        : "border-stone-800 bg-stone-800/60 text-stone-400 hover:border-stone-700"
                    }`}
                  >
                    Asar promo-kartasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardType("chapter")}
                    className={`p-2.5 rounded-xl border font-bold text-center transition ${
                      cardType === "chapter"
                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                        : "border-stone-800 bg-stone-800/60 text-stone-400 hover:border-stone-700"
                    }`}
                  >
                    Yangi bob kartasi
                  </button>
                </div>
              </div>
            )}

            {/* Chapter Picker if chapter card type */}
            {cardType === "chapter" && chapters.length > 0 && (
              <div>
                <label className="block font-bold text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>Bobni tanlang:</span>
                </label>
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-800 bg-stone-950 text-stone-100 focus:border-amber-500 focus:outline-none font-medium text-xs"
                >
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.chapterNumber}-bob: {ch.title || "Nomsiz bob"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Format Selector */}
            <div>
              <label className="block font-bold text-stone-300 mb-1.5">
                Formatni tanlang:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat("story")}
                  className={`p-3 rounded-2xl border font-bold text-center transition ${
                    format === "story"
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-stone-800 bg-stone-800/60 text-stone-400 hover:border-stone-700"
                  }`}
                >
                  Instagram Story
                  <span className="block text-[10px] font-normal text-stone-500 mt-0.5">
                    1080 × 1920 (9:16)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("post")}
                  className={`p-3 rounded-2xl border font-bold text-center transition ${
                    format === "post"
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-stone-800 bg-stone-800/60 text-stone-400 hover:border-stone-700"
                  }`}
                >
                  Telegram / Post
                  <span className="block text-[10px] font-normal text-stone-500 mt-0.5">
                    1080 × 1350 (4:5)
                  </span>
                </button>
              </div>
            </div>

            {/* Target URL Preview */}
            <div className="p-3 rounded-xl bg-stone-950/90 border border-stone-800/90">
              <span className="block text-[11px] font-bold text-stone-400 mb-0.5">
                QR-kod yo‘naltirilgan manzil:
              </span>
              <span className="block text-[11px] font-mono text-amber-400 truncate">
                {canonicalUrl}
              </span>
            </div>

            {/* Quote Input */}
            <div>
              <label className="block font-bold text-stone-300 mb-1.5">
                Asardan iqtibos yoki jozibali jumla:
              </label>
              <textarea
                rows={3}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="Kitobdan eng ta’sirli jumlani kiriting..."
                className="w-full p-3 rounded-xl border border-stone-800 bg-stone-950 text-stone-100 placeholder-stone-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Error Message */}
            {generateError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-[11px]">{generateError}</span>
                </div>
                <button
                  type="button"
                  onClick={drawCard}
                  className="px-2.5 py-1 rounded-lg bg-red-900 hover:bg-red-800 text-white text-[10px] font-bold flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Qayta</span>
                </button>
              </div>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={!isReady || isGenerating}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition active:scale-98"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Karta chizilmoqda...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>PNG rasm sifatida yuklab olish</span>
                </>
              )}
            </button>
          </div>

          {/* Canvas Live Preview */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-stone-950/80 rounded-2xl p-4 border border-stone-800/80 overflow-hidden relative min-h-[460px]">
            <span className="text-[11px] font-semibold text-stone-500 mb-3 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Jonli ko‘rinish {isGenerating && <Loader2 className="w-3 h-3 animate-spin text-amber-500 ml-1" />}
            </span>
            <div className="max-h-[460px] overflow-hidden flex items-center justify-center rounded-xl shadow-2xl border border-stone-800 relative">
              <canvas
                ref={canvasRef}
                className="w-auto max-h-[440px] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
