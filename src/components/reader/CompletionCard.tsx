'use client';
import { useRef, useState } from 'react';
import { Award, Download, Share2 } from 'lucide-react';

export function CompletionCard({ workTitle, authorName }: { workTitle: string; authorName?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const render = () => {
    const canvas = canvasRef.current; if (!canvas) return null;
    canvas.width = 1200; canvas.height = 630; const ctx = canvas.getContext('2d'); if (!ctx) return null;
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630); gradient.addColorStop(0, '#fffbeb'); gradient.addColorStop(1, '#fef3c7'); ctx.fillStyle = gradient; ctx.fillRect(0,0,1200,630);
    ctx.fillStyle = '#b45309'; ctx.font = '900 42px Georgia'; ctx.fillText('MANBORA', 80, 90);
    ctx.fillStyle = '#1c1917'; ctx.font = '700 34px sans-serif'; ctx.fillText('Men bu asarni tugatdim', 80, 190);
    const title = workTitle.length > 42 ? `${workTitle.slice(0, 42)}…` : workTitle; ctx.font = '900 64px Georgia'; ctx.fillText(title, 80, 300);
    ctx.font = '400 28px sans-serif'; ctx.fillStyle = '#57534e'; ctx.fillText(authorName || 'Manbora muallifi', 80, 355);
    ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.arc(1030, 260, 92, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '900 82px sans-serif'; ctx.fillText('✓', 998, 290);
    ctx.font = '600 24px sans-serif'; ctx.fillStyle = '#78716c'; ctx.fillText(new Date().toLocaleDateString('uz-UZ'), 80, 535); setReady(true); return canvas;
  };
  const download = () => { const canvas = render(); if (!canvas) return; const link = document.createElement('a'); link.download = 'manbora-mutolaa.png'; link.href = canvas.toDataURL('image/png'); link.click(); };
  const share = async () => { const canvas = render(); if (!canvas) return; const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve)); if (!blob) return; const file = new File([blob], 'manbora-mutolaa.png', { type: 'image/png' }); if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: workTitle, text: 'Men bu asarni Manbora’da tugatdim!', files: [file] }); else download(); };
  return <section className="rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-center text-stone-900"><Award className="mx-auto h-10 w-10 text-amber-600" /><h2 className="mt-2 text-2xl font-black">Asar tugadi — tabriklaymiz!</h2><p className="mt-2 text-sm text-stone-600">Mutolaa kartasini saqlang yoki do‘stlaringiz bilan ulashing.</p><canvas ref={canvasRef} className={ready ? 'mx-auto mt-4 h-auto w-full max-w-lg rounded-xl shadow-sm' : 'hidden'} /><div className="mt-5 flex justify-center gap-3"><button type="button" onClick={download} className="flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white"><Download className="h-4 w-4" /> Yuklab olish</button><button type="button" onClick={share} className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold"><Share2 className="h-4 w-4" /> Ulashish</button></div></section>;
}
