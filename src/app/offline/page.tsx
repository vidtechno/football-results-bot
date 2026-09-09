import Link from 'next/link';
import { WifiOff } from 'lucide-react';
export const metadata = { title: 'Internet aloqasi yo‘q' };
export default function OfflinePage() { return <main className="grid min-h-[70vh] place-items-center px-4 text-center"><div><WifiOff className="mx-auto h-12 w-12 text-amber-600" /><h1 className="mt-4 text-3xl font-black">Internet aloqasi yo‘q</h1><p className="mt-2 text-stone-500">Aloqa tiklangach sahifani qayta oching. Avval ko‘rilgan ochiq sahifalar mavjud bo‘lishi mumkin.</p><Link href="/" className="mt-6 inline-block rounded-xl bg-amber-600 px-5 py-3 font-bold">Qayta urinish</Link></div></main>; }
