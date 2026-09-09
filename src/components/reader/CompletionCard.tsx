'use client';
import { useCallback, useEffect, useRef } from 'react';
import { Award, Download, Share2, Sparkles } from 'lucide-react';

const SLOGAN = 'Bir kitob yopildi, tafakkurda yangi sahifa ochildi.';
const SIGNATURE = 'Mutolaa Manbora bilan davom etadi · manbora.uz';
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []; let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line); return lines.slice(0, 3);
}

function loadCover(src?: string | null) {
  if (!src) return Promise.resolve<HTMLImageElement | null>(null);
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image(); image.crossOrigin = 'anonymous'; image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = src;
  });
}

export function CompletionCard({ workTitle, authorName, coverUrl }: { workTitle: string; authorName?: string | null; coverUrl?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const render = useCallback(async () => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return null;
    canvas.width = 1200; canvas.height = 630;
    const bg = ctx.createLinearGradient(0, 0, 1200, 630); bg.addColorStop(0, '#fffbeb'); bg.addColorStop(.52, '#fff7ed'); bg.addColorStop(1, '#ecfdf5');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1200, 630); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 3; ctx.strokeRect(24, 24, 1152, 582);
    ctx.fillStyle = 'rgba(217,119,6,.08)'; ctx.beginPath(); ctx.arc(1050, 80, 250, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(1120, 580, 190, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#78350f'; ctx.font = 'italic 900 48px Georgia, serif'; ctx.fillText('Manbora', 72, 82);
    ctx.fillStyle = '#b45309'; ctx.font = '700 24px Arial, sans-serif'; ctx.fillText('manbora.uz', 74, 118);
    ctx.fillStyle = '#15803d'; ctx.font = '700 25px Arial, sans-serif'; ctx.fillText('✓  MUTOLAA YAKUNLANDI', 72, 198);
    const cover = await loadCover(coverUrl);
    ctx.save(); ctx.shadowColor = 'rgba(28,25,23,.28)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 14; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(862, 145, 258, 344, 18); ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.roundRect(875, 158, 232, 318, 11); ctx.clip();
    if (cover) { const scale = Math.max(232 / cover.width, 318 / cover.height); const w = cover.width * scale; const h = cover.height * scale; ctx.drawImage(cover, 875 + (232 - w) / 2, 158 + (318 - h) / 2, w, h); }
    else { const fallback = ctx.createLinearGradient(875,158,1107,476); fallback.addColorStop(0,'#92400e'); fallback.addColorStop(1,'#166534'); ctx.fillStyle=fallback; ctx.fillRect(875,158,232,318); ctx.fillStyle='#fff7ed'; ctx.textAlign='center'; ctx.font='900 72px Georgia'; ctx.fillText('M',991,340); ctx.textAlign='left'; }
    ctx.restore(); ctx.strokeStyle='#f59e0b'; ctx.lineWidth=4; ctx.beginPath(); ctx.roundRect(875,158,232,318,11); ctx.stroke();
    const titleSize = workTitle.length > 45 ? 45 : 54; const titleGap = titleSize + 9;
    ctx.fillStyle = '#1c1917'; ctx.font = `900 ${titleSize}px Georgia, serif`; const titleLines = wrapText(ctx, workTitle, 700); titleLines.forEach((line, i) => ctx.fillText(line, 72, 275 + i * titleGap));
    const authorY = Math.min(455, 300 + titleLines.length * titleGap); ctx.fillStyle = '#57534e'; ctx.font = 'italic 27px Georgia, serif'; ctx.fillText(authorName || 'Manbora muallifi', 74, authorY);
    ctx.fillStyle = '#92400e'; ctx.font = '600 24px Georgia, serif'; ctx.fillText(`“${SLOGAN}”`, 74, 530);
    ctx.fillStyle = '#57534e'; ctx.font = '700 19px Arial, sans-serif'; ctx.fillText(SIGNATURE, 74, 574); return canvas;
  }, [authorName, coverUrl, workTitle]);
  useEffect(() => { render(); }, [render]);
  const download = async () => { const canvas = await render(); if (!canvas) return; const a = document.createElement('a'); a.download = 'manbora-mutolaa-kartasi.png'; a.href = canvas.toDataURL('image/png'); a.click(); };
  const share = async () => { const canvas = await render(); if (!canvas) return; const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png')); if (!blob) return; const file = new File([blob], 'manbora-mutolaa-kartasi.png', { type: 'image/png' }); if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: workTitle, text: `${SLOGAN} ${SIGNATURE}`, files: [file] }); else await download(); };
  return <section className="overflow-hidden rounded-[2rem] border border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-emerald-50 p-5 text-center text-stone-900 shadow-xl shadow-amber-900/10 sm:p-8">
    <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-amber-300 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-800"><Sparkles className="h-4 w-4" /> Mutolaa yakunlandi</div>
    <Award className="mx-auto mt-5 h-12 w-12 text-amber-600" /><h2 className="mt-2 font-serif text-2xl font-black sm:text-3xl">Asar tugadi — tabriklaymiz!</h2><p className="mx-auto mt-2 max-w-lg font-serif italic text-stone-600">“{SLOGAN}”</p>
    <canvas ref={canvasRef} aria-label={`${workTitle} asari uchun mutolaa kartasi`} className="mx-auto mt-6 h-auto w-full max-w-2xl rounded-2xl border border-amber-200 shadow-lg" /><p className="mt-3 text-xs font-black tracking-wide text-amber-800">{SIGNATURE}</p>
    <div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={download} className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-xs font-bold text-white"><Download className="h-4 w-4" /> Yuklab olish</button><button type="button" onClick={share} className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-xs font-bold text-stone-950"><Share2 className="h-4 w-4" /> Ulashish</button></div>
  </section>;
}
