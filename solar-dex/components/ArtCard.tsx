/**
 * 그림 카드: 배경 그림 + 카드 테두리 + 아래 이름판. 세로가 가로의 1.5배이고 글자 크기는 가로에 비례한다.
 * `chips`는 그림 아래쪽에 겹쳐 보이는 작은 설명(예: 행성의 크기 비교 값).
 */
export function ArtCard({ art, name, w, chips = [], faded = false }: { art: string; name: string; w: number; chips?: string[]; faded?: boolean }) {
  return (
    <div className="relative select-none" style={{ width: w, height: w * 1.5, opacity: faded ? 0.35 : 1 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art} alt="" draggable={false} className="absolute pointer-events-none rounded-lg object-cover" style={{ inset: w * 0.03, width: w * 0.94, height: w * 1.44 }} />
      {chips.length > 0 && (
        <div className="absolute left-0 right-0 flex flex-col items-center gap-0.5 pointer-events-none" style={{ bottom: w * 0.27 }}>
          {chips.map((c, i) => <div key={i} className="rounded bg-black/65 text-white font-bold px-1.5" style={{ fontSize: w * 0.085 }}>{c}</div>)}
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/planetcards/frame.webp" alt="" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute left-0 right-0 text-center font-bold text-yellow-100 pointer-events-none leading-tight px-1" style={{ bottom: w * 0.05, fontSize: w * (name.length > 6 ? 0.1 : 0.14), textShadow: '0 2px 4px #000' }}>{name}</div>
    </div>
  );
}
