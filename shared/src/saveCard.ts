import { toPng } from 'html-to-image';

/** 결과 카드(요소)를 PNG로 내려받는다. 실패해도 게임은 계속된다. */
export async function cardBlob(el: HTMLElement): Promise<Blob> {
  const url = await toPng(el, { pixelRatio: 2, backgroundColor: '#0a0f25', filter: n => !(n as HTMLElement).dataset?.noCapture });
  const res = await fetch(url);
  return await res.blob();
}

export async function saveCard(el: HTMLElement, filename: string): Promise<boolean> {
  try {
    const blob = await cardBlob(el);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
