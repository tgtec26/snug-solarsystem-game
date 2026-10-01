/** 별 모양(채움은 현재 글자색). 별점·피날레에 쓴다. 글자 기호 대신 SVG를 쓴다. */
export function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.3L12 17.8 5.7 21.5l1.7-7.3L2 9.5l7.1-.6z" />
    </svg>
  );
}
