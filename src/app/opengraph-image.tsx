import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Manbora — o‘zbek kitoblari, hikoyalari va mutolaa platformasi';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 82px',
        color: '#fff',
        background:
          'radial-gradient(circle at 85% 15%, rgba(245,158,11,.35), transparent 34%), linear-gradient(135deg, #052e27 0%, #065f46 55%, #78350f 100%)',
        fontFamily: 'Arial, system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: '#fde68a' }}>
        KITOB VA MUTOLAA
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', fontSize: 104, fontWeight: 900, letterSpacing: -5 }}>
          Manbora
        </div>
        <div style={{ display: 'flex', maxWidth: 920, fontSize: 38, lineHeight: 1.25 }}>
          O‘zbek tilidagi kitoblar, hikoyalar va yangi adabiy dunyo
        </div>
      </div>
      <div style={{ display: 'flex', fontSize: 26, color: '#d1fae5' }}>manbora.uz</div>
    </div>,
    size,
  );
}
