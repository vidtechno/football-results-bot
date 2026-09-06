"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Download, Sparkles, X, Image as ImageIcon } from "lucide-react";
import QRCode from "qrcode";

interface ShareCardGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  work: {
    id: string;
    slug?: string;
    title: string;
    coverUrl?: string | null;
    authorPenName: string;
  };
}

export function ShareCardGenerator({
  isOpen,
  onClose,
  work,
}: ShareCardGeneratorProps) {
  const [format, setFormat] = useState<"story" | "post">("story");
  const [quote, setQuote] = useState<string>(
    "Har bir sahifada yangi hayot va unutilmas tuyg‘ular..."
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawCard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isStory = format === "story";
    const width = isStory ? 1080 : 1200;
    const height = isStory ? 1920 : 628;

    canvas.width = width;
    canvas.height = height;

    // Background Gradient: Deep sophisticated slate/espresso gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "#1A1715");
    bgGradient.addColorStop(0.5, "#241F1C");
    bgGradient.addColorStop(1, "#12100E");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative subtle accent glows
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

    // Brand Header
    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 38px 'Playfair Display', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("MANBORA", width / 2, isStory ? 150 : 65);

    ctx.fillStyle = "#A8A29E";
    ctx.font = "500 22px system-ui, sans-serif";
    ctx.fillText(
      "O‘zbek adabiyoti va hikoyalari platformasi",
      width / 2,
      isStory ? 195 : 98
    );

    // Generate canonical QR code for this work
    const canonicalUrl = `https://manbora.uz/asarlar/${work.slug || work.id}`;
    let qrImg: HTMLImageElement | null = null;
    try {
      const qrDataUrl = await QRCode.toDataURL(canonicalUrl, {
        width: 320,
        margin: 1,
        color: {
          dark: "#1A1715",
          light: "#FFFFFF",
        },
      });
      qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise((resolve) => {
        qrImg!.onload = resolve;
        qrImg!.onerror = resolve;
      });
    } catch (e) {
      console.error("QR Code generation error:", e);
    }

    // Render Cover Image (or styled placeholder)
    const renderCoverAndDetails = (img?: HTMLImageElement) => {
      const coverW = isStory ? 440 : 250;
      const coverH = isStory ? 620 : 360;
      const coverX = isStory ? (width - coverW) / 2 : 100;
      const coverY = isStory ? 260 : 150;

      // Drop shadow for cover
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 20;

      if (img) {
        ctx.drawImage(img, coverX, coverY, coverW, coverH);
      } else {
        ctx.fillStyle = "#38322E";
        ctx.fillRect(coverX, coverY, coverW, coverH);
        ctx.fillStyle = "#EAE5DD";
        ctx.font = "bold 28px serif";
        ctx.textAlign = "center";
        ctx.fillText(work.title, coverX + coverW / 2, coverY + coverH / 2);
      }
      ctx.restore();

      // Border around cover
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 3;
      ctx.strokeRect(coverX, coverY, coverW, coverH);

      // Typography / Details
      if (isStory) {
        // Story Layout (1080x1920)
        ctx.textAlign = "center";

        // Title
        ctx.fillStyle = "#FAF8F5";
        ctx.font = "bold 52px 'Playfair Display', Georgia, serif";
        ctx.fillText(work.title, width / 2, 950, 920);

        // Author
        ctx.fillStyle = "#F59E0B";
        ctx.font = "bold 32px system-ui, sans-serif";
        ctx.fillText(`Muallif: ${work.authorPenName}`, width / 2, 1010);

        // Quote Box
        if (quote.trim()) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
          ctx.beginPath();
          ctx.roundRect(120, 1070, 840, 240, 24);
          ctx.fill();
          ctx.strokeStyle = "rgba(217, 119, 6, 0.3)";
          ctx.stroke();

          ctx.fillStyle = "#EAE5DD";
          ctx.font = "italic 30px Georgia, serif";
          ctx.fillText(`“${quote.trim()}”`, width / 2, 1190, 760);
        }

        // Canonical QR Code Badge (Story footer)
        const qrCardW = 540;
        const qrCardH = 220;
        const qrCardX = (width - qrCardW) / 2;
        const qrCardY = 1430;

        ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
        ctx.beginPath();
        ctx.roundRect(qrCardX, qrCardY, qrCardW, qrCardH, 28);
        ctx.fill();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (qrImg) {
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.roundRect(qrCardX + 24, qrCardY + 20, 180, 180, 18);
          ctx.fill();
          ctx.drawImage(qrImg, qrCardX + 32, qrCardY + 28, 164, 164);
        }

        // QR Text info
        ctx.textAlign = "left";
        ctx.fillStyle = "#F59E0B";
        ctx.font = "bold 26px system-ui, sans-serif";
        ctx.fillText("Hoziroq o‘qing", qrCardX + 230, qrCardY + 70);

        ctx.fillStyle = "#FAF8F5";
        ctx.font = "500 21px system-ui, sans-serif";
        ctx.fillText("Kamerangizni qarating", qrCardX + 230, qrCardY + 110);

        ctx.fillStyle = "#D6D3D1";
        ctx.font = "600 20px monospace";
        ctx.fillText("manbora.uz", qrCardX + 230, qrCardY + 155);

        // Footer note
        ctx.textAlign = "center";
        ctx.fillStyle = "#78716C";
        ctx.font = "500 22px system-ui, sans-serif";
        ctx.fillText("Manbora — o‘zbek adabiyoti va hikoyalari platformasi", width / 2, 1780);
      } else {
        // Horizontal Post Layout (1200x628)
        const textX = 390;
        ctx.textAlign = "left";

        // Title
        ctx.fillStyle = "#FAF8F5";
        ctx.font = "bold 40px 'Playfair Display', Georgia, serif";
        ctx.fillText(work.title, textX, 220, 480);

        // Author
        ctx.fillStyle = "#F59E0B";
        ctx.font = "bold 24px system-ui, sans-serif";
        ctx.fillText(`Muallif: ${work.authorPenName}`, textX, 265);

        // Quote
        if (quote.trim()) {
          ctx.fillStyle = "#D6D3D1";
          ctx.font = "italic 22px Georgia, serif";
          ctx.fillText(`“${quote.trim()}”`, textX, 335, 480);
        }

        // Reading URL badge
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.roundRect(textX, 445, 340, 56, 16);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.fillText("manbora.uz da mutolaa qiling", textX + 24, 480);

        // QR Code Card on Right Side
        const qrX = 920;
        const qrY = 160;
        const qrW = 200;
        const qrH = 260;

        ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
        ctx.beginPath();
        ctx.roundRect(qrX, qrY, qrW, qrH, 20);
        ctx.fill();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (qrImg) {
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.roundRect(qrX + 20, qrY + 20, 160, 160, 14);
          ctx.fill();
          ctx.drawImage(qrImg, qrX + 26, qrY + 26, 148, 148);
        }

        ctx.textAlign = "center";
        ctx.fillStyle = "#FAF8F5";
        ctx.font = "bold 15px system-ui, sans-serif";
        ctx.fillText("Kamerani qarating", qrX + qrW / 2, qrY + 206);

        ctx.fillStyle = "#F59E0B";
        ctx.font = "bold 14px monospace";
        ctx.fillText("manbora.uz", qrX + qrW / 2, qrY + 232);
      }
    };

    if (work.coverUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => renderCoverAndDetails(img);
      img.onerror = () => renderCoverAndDetails();
      img.src = work.coverUrl;
    } else {
      renderCoverAndDetails();
    }
  }, [format, quote, work]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(drawCard, 50);
    }
  }, [isOpen, drawCard]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${work.title.replace(/\s+/g, "_")}_${format}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-stone-900 text-stone-100 rounded-3xl shadow-2xl border border-stone-800 p-5 sm:p-7 my-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-base sm:text-lg font-bold">
              Ijtimoiy tarmoqlar uchun promo-karta yaratish
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls */}
          <div className="lg:col-span-5 space-y-4 text-xs">
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
                    1200 × 628 (1.91:1)
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-300 mb-1.5">
                Asardan iqtibos yoki jozibali jumla:
              </label>
              <textarea
                rows={4}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="Kitobdan eng ta’sirli jumlani kiriting..."
                className="w-full p-3 rounded-xl border border-stone-800 bg-stone-950 text-stone-100 placeholder-stone-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleDownload}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>PNG rasm sifatida yuklab olish</span>
            </button>
          </div>

          {/* Canvas Live Preview */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-stone-950/80 rounded-2xl p-4 border border-stone-800/80 overflow-hidden">
            <span className="text-[11px] font-semibold text-stone-500 mb-3 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Jonli ko‘rinish
            </span>
            <div className="max-h-[460px] overflow-hidden flex items-center justify-center rounded-xl shadow-2xl border border-stone-800">
              <canvas
                ref={canvasRef}
                className={`w-auto max-h-[440px] object-contain rounded-lg`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
