'use client';
import { useCallback, useEffect, useRef } from 'react';
import { Award, Download, Share2, Sparkles } from 'lucide-react';

const SLOGAN = 'Har tugagan kitob — yangi dunyoning boshlanishi.';
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []; let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line); return lines.slice(0, 3);
}

export function CompletionCard({ workTitle, authorName }: { workTitle: string; authorName?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const render = useCallback(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return null;
    canvas.width = 1200; canvas.height = 630;
    const bg = ctx.createLinearGradient(0, 0, 1200, 630); bg.addColorStop(0, '#fffbeb'); bg.addColorStop(.52, '#fff7ed'); bg.addColorStop(1, '#ecfdf5');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1200, 630); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 3; ctx.strokeRect(24, 24, 1152, 582);
    ctx.fillStyle = 'rgba(217,119,6,.08)'; ctx.beginPath(); ctx.arc(1050, 80, 250, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(1120, 580, 190, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#78350f'; ctx.font = 'italic 900 48px Georgia, serif'; ctx.fillText('Manbora', 72, 82);
    ctx.fillStyle = '#b45309'; ctx.font = '700 24px Arial, sans-serif'; ctx.fillText('manbora.uz', 74, 118);
    ctx.fillStyle = '#15803d'; ctx.font = '700 25px Arial, sans-serif'; ctx.fillText('✓  MUTOLAA YAKUNLANDI', 72, 198);
    ctx.fillStyle = '#1c1917'; ctx.font = '900 62px Georgia, serif'; const titleLines = wrapText(ctx, workTitle, 840); titleLines.forEach((line, i) => ctx.fillText(line, 72, 285 + i * 70));
    const authorY = 305 + titleLines.length * 70; ctx.fillStyle = '#57534e'; ctx.font = 'italic 29px Georgia, serif'; ctx.fillText(authorName || 'Manbora muallifi', 74, authorY);
    ctx.fillStyle = '#92400e'; ctx.font = '600 25px Georgia, serif'; ctx.fillText(`“${SLOGAN}”`, 74, 538);
    ctx.fillStyle = '#78716c'; ctx.font = '600 20px Arial, sans-serif'; ctx.fillText(new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' }), 900, 574); return canvas;
  }, [authorName, workTitle]);
  useEffect(() => { render(); }, [render]);
  const download = () => { const canvas = render(); if (!canvas) return; const a = document.createElement('a'); a.download = 'manbora-mutolaa-kartasi.png'; a.href = canvas.toDataURL('image/png'); a.click(); };
  const share = async () => { const canvas = render(); if (!canvas) return; const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png')); if (!blob) return; const file = new File([blob], 'manbora-mutolaa-kartasi.png', { type: 'image/png' }); if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: workTitle, text: `${SLOGAN} manbora.uz`, files: [file] }); else download(); };
  return <section className="overflow-hidden rounded-[2rem] border border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-emerald-50 p-5 text-center text-stone-900 shadow-xl shadow-amber-900/10 sm:p-8">
    <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-amber-300 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-800"><Sparkles className="h-4 w-4" /> Mutolaa yakunlandi</div>
    <Award className="mx-auto mt-5 h-12 w-12 text-amber-600" /><h2 className="mt-2 font-serif text-2xl font-black sm:text-3xl">Asar tugadi — tabriklaymiz!</h2><p className="mx-auto mt-2 max-w-lg font-serif italic text-stone-600">“{SLOGAN}”</p>
    <canvas ref={canvasRef} aria-label={`${workTitle} asari uchun mutolaa kartasi`} className="mx-auto mt-6 h-auto w-full max-w-2xl rounded-2xl border border-amber-200 shadow-lg" /><p className="mt-3 text-xs font-black tracking-wide text-amber-800">manbora.uz</p>
    <div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={download} className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-xs font-bold text-white"><Download className="h-4 w-4" /> Yuklab olish</button><button type="button" onClick={share} className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-xs font-bold text-stone-950"><Share2 className="h-4 w-4" /> Ulashish</button></div>
  </section>;
}
