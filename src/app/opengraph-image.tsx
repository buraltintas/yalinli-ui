import { ImageResponse } from 'next/og';

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
        backgroundColor: '#f6f2e9',
        padding: 64,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 40,
            backgroundColor: '#f3f8f3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
          }}
        >
          <svg width='96' height='96' viewBox='0 0 64 64' aria-hidden='true'>
            <defs>
              <linearGradient id='leaf' x1='0' y1='0' x2='1' y2='1'>
                <stop offset='0%' stopColor='#36a67d' />
                <stop offset='100%' stopColor='#1d7c60' />
              </linearGradient>
              <linearGradient id='ground' x1='0' y1='0' x2='1' y2='0'>
                <stop offset='0%' stopColor='#8ecf7b' />
                <stop offset='100%' stopColor='#66b567' />
              </linearGradient>
            </defs>
            <rect x='2' y='2' width='60' height='60' rx='16' fill='#f3f8f3' />
            <path
              d='M6 45c8-5 14-6 20-3 5 2 9 2 14 0 6-3 12-2 18 3v10H6z'
              fill='url(#ground)'
            />
            <rect x='30' y='26' width='4' height='20' rx='2' fill='#72553a' />
            <circle cx='32' cy='20' r='12' fill='url(#leaf)' />
            <circle cx='24' cy='24' r='7' fill='#4ab087' />
            <circle cx='40' cy='24' r='7' fill='#2f9e73' />
            <path
              d='M17 42h30'
              stroke='#5c7a5e'
              strokeWidth='2.5'
              strokeLinecap='round'
            />
            <circle cx='18' cy='42' r='3' fill='#5c7a5e' />
            <circle cx='46' cy='42' r='3' fill='#5c7a5e' />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 64, fontWeight: 700, color: '#1e2b26' }}>
            Yalınlı İçin
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#4a5a52',
              marginTop: 12,
              maxWidth: 720,
            }}
          >
            Yalınlı Mahallesi sorun, çözüm ve sosyal paylaşım platformu
          </div>
        </div>
      </div>
      <div style={{ fontSize: 26, color: '#1d7c60', fontWeight: 600 }}>
        yalinli.org
      </div>
    </div>,
    {
      width: size.width,
      height: size.height,
    },
  );
}
