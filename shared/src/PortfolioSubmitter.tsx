'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type ClassChoice = {
  portfolioBaseUrl: string;
  teacherId: string;
  subject: string;
  teacherName: string;
  classId: string;
  grade: string;
  classNo: string;
  displayName: string;
};

type TeacherChoice = {
  teacherId: string;
  subject: string;
  teacherName: string;
  classes: ClassChoice[];
};

type SubmitResult = { studentNumber: number; ok: boolean; error?: string };

const DEFAULT_PORTFOLIO_BASE_URL = 'https://snug-portfolio.vercel.app';

function parseStudentNumbers(raw: string) {
  const seen = new Set<number>();
  return raw
    .split(/[,\s]+/)
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
    .filter((n) => {
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });
}

function normalizeCatalog(raw: unknown, portfolioBaseUrl: string): TeacherChoice[] {
  const teachers = (raw as { teachers?: unknown[] } | null)?.teachers ?? [];
  return teachers
    .filter((teacher): teacher is Record<string, unknown> => !!teacher)
    .filter((teacher) => teacher.teacherId && teacher.subject && teacher.teacherName)
    .map((teacher) => ({
      teacherId: String(teacher.teacherId),
      subject: String(teacher.subject),
      teacherName: String(teacher.teacherName),
      classes: ((teacher.classes as unknown[] | undefined) ?? [])
        .filter((classSummary): classSummary is Record<string, unknown> => !!classSummary)
        .filter((classSummary) => classSummary.grade && classSummary.classNo && classSummary.classId)
        .map((classSummary) => ({
          portfolioBaseUrl,
          teacherId: String(teacher.teacherId),
          subject: String(teacher.subject),
          teacherName: String(teacher.teacherName),
          classId: String(classSummary.classId),
          grade: String(classSummary.grade),
          classNo: String(classSummary.classNo),
          displayName: String(classSummary.displayName || `${classSummary.grade}-${classSummary.classNo}`),
        })),
    }))
    .filter((teacher) => teacher.classes.length > 0);
}

async function uploadOne(params: {
  destination: ClassChoice;
  studentNumber: number;
  pngBlob: Blob;
  title: string;
  description: string;
  idempotencyPrefix: string;
  signal: AbortSignal;
}) {
  const base = params.destination.portfolioBaseUrl.replace(/\/$/, '');
  const classId = `${params.destination.grade}-${params.destination.classNo}`;
  const day = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `${params.idempotencyPrefix}-${params.destination.teacherId}-${classId}-${params.studentNumber}-${day}`;
  const file = { name: `${params.idempotencyPrefix}-${classId}-${params.studentNumber}-${day}.png`, mimeType: 'image/png', size: params.pngBlob.size };
  const sessionRes = await fetch(`${base}/api/t/${encodeURIComponent(params.destination.teacherId)}/upload-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: params.signal,
    body: JSON.stringify({ classId, studentNumber: params.studentNumber, idempotencyKey, files: [file], title: params.title }),
  });
  const session = await sessionRes.json().catch(() => ({}));
  if (!sessionRes.ok) throw new Error(session.error || `Upload session failed (${sessionRes.status})`);
  if (session.existing) return;
  if (!session.uploadUrls?.[0]) throw new Error('Upload session response missing upload URL');

  const uploadRes = await fetch(session.uploadUrls[0], {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png', 'Content-Length': String(params.pngBlob.size) },
    body: params.pngBlob,
    signal: params.signal,
  });
  const uploadText = await uploadRes.text();
  if (!uploadRes.ok) throw new Error(`Drive upload failed (${uploadRes.status})`);
  const fileId = String(JSON.parse(uploadText).id || '');
  if (!fileId) throw new Error('Drive upload response missing file id');

  const finalizeRes = await fetch(`${base}/api/t/${encodeURIComponent(params.destination.teacherId)}/upload-finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: params.signal,
    body: JSON.stringify({
      classId,
      studentNumber: params.studentNumber,
      idempotencyKey,
      type: 'image',
      driveFileIds: [fileId],
      mimeTypes: ['image/png'],
      uploadToken: session.uploadToken,
      uploadedFiles: [{ ...file, fileId }],
      title: params.title,
      description: params.description,
    }),
  });
  const finalized = await finalizeRes.json().catch(() => ({}));
  if (!finalizeRes.ok) throw new Error(finalized.error || `Finalize failed (${finalizeRes.status})`);
}

export function PortfolioSubmitter(props: {
  title: string;
  description: string;
  idempotencyPrefix: string;
  createPngBlob: () => Promise<Blob>;
  disabled?: boolean;
}) {
  const [catalog, setCatalog] = useState<TeacherChoice[]>([]);
  const [catalogStatus, setCatalogStatus] = useState('제출 대상을 불러오는 중입니다.');
  const [teacherId, setTeacherId] = useState('');
  const [grade, setGrade] = useState('');
  const [classNo, setClassNo] = useState('');
  const [studentNumbers, setStudentNumbers] = useState('');
  const [retryNumbers, setRetryNumbers] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const previewBlob = useRef<Blob | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const portfolioBaseUrl = DEFAULT_PORTFOLIO_BASE_URL;

  useEffect(() => {
    let ignore = false;
    fetch(`${portfolioBaseUrl}/api/public/portfolio-destinations`, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `대상 목록 오류 (${res.status})`);
        return normalizeCatalog(json, portfolioBaseUrl);
      })
      .then((next) => {
        if (ignore) return;
        setCatalog(next);
        setCatalogStatus(next.length ? '제출 대상을 선택하세요.' : '선택 가능한 제출 대상이 없습니다.');
      })
      .catch((error) => {
        if (ignore) return;
        setCatalog([]);
        setCatalogStatus(`제출 대상 목록 오류: ${error instanceof Error ? error.message : String(error)}`);
      });
    return () => { ignore = true; };
  }, [portfolioBaseUrl]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectedTeacher = catalog.find((teacher) => teacher.teacherId === teacherId);
  const grades = useMemo(() => [...new Set((selectedTeacher?.classes ?? []).map((item) => item.grade))], [selectedTeacher]);
  const classes = useMemo(() => (selectedTeacher?.classes ?? []).filter((item) => item.grade === grade), [selectedTeacher, grade]);
  const destination = classes.find((item) => item.classNo === classNo);
  const numbers = parseStudentNumbers(retryNumbers || studentNumbers);
  const ready = !!destination && numbers.length > 0 && !props.disabled;

  function resetConfirmation() {
    setConfirmed(false);
    setStatus('');
    previewBlob.current = null;
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });
  }

  async function submit() {
    if (!ready || busy || !destination) return;
    if (!confirmed) {
      setBusy(true);
      setStatus('PNG 미리보기를 만드는 중입니다.');
      try {
        const blob = await props.createPngBlob();
        previewBlob.current = blob;
        setPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
        setConfirmed(true);
        setStatus('대상과 PNG 미리보기를 확인했습니다. 한 번 더 누르면 전송합니다.');
      } catch (error) {
        setStatus(`PNG 미리보기 실패: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setBusy(false);
      }
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setStatus('제출 중입니다. 창을 닫지 마세요.');
    const blob = previewBlob.current ?? await props.createPngBlob();
    const results: SubmitResult[] = [];
    for (const studentNumber of numbers) {
      try {
        await uploadOne({ destination, studentNumber, pngBlob: blob, title: props.title, description: props.description, idempotencyPrefix: props.idempotencyPrefix, signal: controller.signal });
        results.push({ studentNumber, ok: true });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          setStatus('제출을 취소했습니다.');
          setBusy(false);
          abortRef.current = null;
          return;
        }
        results.push({ studentNumber, ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    const failed = results.filter((result) => !result.ok).map((result) => result.studentNumber);
    setRetryNumbers(failed.join(', '));
    setStatus(failed.length ? `일부만 등록되었습니다. 다시 시도할 번호: ${failed.join(', ')}` : '등록이 완료되었습니다.');
    setBusy(false);
    abortRef.current = null;
  }

  return (
    <section className="mt-5 rounded-2xl border border-white/20 bg-black/35 p-4 text-left text-white">
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-sm font-bold">과목 / 교사
          <select className="mt-1 w-full rounded-lg bg-slate-950 px-3 py-2" value={teacherId} onChange={(event) => { setTeacherId(event.target.value); setGrade(''); setClassNo(''); setRetryNumbers(''); resetConfirmation(); }}>
            <option value="">선택</option>
            {catalog.map((teacher) => <option key={teacher.teacherId} value={teacher.teacherId}>{teacher.subject} / {teacher.teacherName} ({teacher.teacherId})</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">학년
          <select className="mt-1 w-full rounded-lg bg-slate-950 px-3 py-2" value={grade} disabled={!selectedTeacher} onChange={(event) => { setGrade(event.target.value); setClassNo(''); setRetryNumbers(''); resetConfirmation(); }}>
            <option value="">선택</option>
            {grades.map((item) => <option key={item} value={item}>{item}학년</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">반
          <select className="mt-1 w-full rounded-lg bg-slate-950 px-3 py-2" value={classNo} disabled={!grade} onChange={(event) => { setClassNo(event.target.value); setRetryNumbers(''); resetConfirmation(); }}>
            <option value="">선택</option>
            {classes.map((item) => <option key={item.classId} value={item.classNo}>{item.displayName}</option>)}
          </select>
        </label>
        <label className="col-span-2 text-sm font-bold">학생 번호
          <input className="mt-1 w-full rounded-lg bg-slate-950 px-3 py-2" value={retryNumbers || studentNumbers} placeholder="7 또는 7, 8" onChange={(event) => { setStudentNumbers(event.target.value); setRetryNumbers(''); resetConfirmation(); }} />
        </label>
      </div>
      {previewUrl ? <div className="mt-3 flex items-center gap-3 text-sm text-yellow-100"><img src={previewUrl} alt="제출할 PNG 미리보기" className="max-h-32 rounded-lg border border-white/20" />PNG 미리보기</div> : null}
      <p className="mt-3 min-h-6 text-sm text-emerald-200">{status || catalogStatus}</p>
      <div className="flex gap-2">
        <button type="button" className="rounded-xl bg-sky-300 px-5 py-2 font-bold text-black disabled:opacity-50" disabled={!ready || busy} onClick={submit}>{confirmed ? '확인 후 전송' : '대상 확인'}</button>
        {busy ? <button type="button" className="rounded-xl bg-rose-300 px-5 py-2 font-bold text-black" onClick={() => abortRef.current?.abort()}>취소</button> : null}
      </div>
    </section>
  );
}
