/** 황도 12궁 카드: 별이 반짝이는 남색 배경에 별자리 선화, 카드 테두리와 아래 이름판. 세로가 가로의 1.5배. */
export function ZodiacCard({ id, name, w, faded = false }: { id: string; name: string; w: number; faded?: boolean }) {
  return (
    <div className="relative select-none" style={{ width: w, height: w * 1.5, opacity: faded ? 0.35 : 1 }}>
      <div className="absolute rounded-lg overflow-hidden pointer-events-none" style={{ inset: w * 0.03, background: 'radial-gradient(ellipse at 50% 35%, #2a3a7a 0%, #141c44 60%, #0a1024 100%)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/zodiac/${id}.webp`} alt="" draggable={false} className="absolute left-1/2 -translate-x-1/2" style={{ top: w * 0.12, width: w * 0.8, height: w * 0.8 }} />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/cards/frame.webp" alt="" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute left-0 right-0 text-center font-bold text-yellow-100 pointer-events-none leading-tight" style={{ bottom: w * 0.06, fontSize: w * 0.125, textShadow: '0 2px 4px #000' }}>{name}</div>
    </div>
  );
}
