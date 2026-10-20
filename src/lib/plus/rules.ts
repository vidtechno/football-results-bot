// Manbora Plus qoidalari — kodda yagona manba (SQL tomoni: migrations/050 va 052).
// Batafsil: docs/access-rules.md

type WorkAccessShape = { access_type?: string | null; is_plus?: boolean | null };

/** Plus bo'lmagan va to'liq bepul asar: hamma boblar hammaga ochiq. */
export function isWorkFullyFree(work: WorkAccessShape): boolean {
  return work.access_type === 'free' && !work.is_plus;
}

/** Plus asarida 1-bob obunasiz ham hammaga ochiq (tanishuv uchun). */
export function isPlusFreePreviewChapter(
  work: Pick<WorkAccessShape, 'is_plus'>,
  chapterNumber: number | string | null | undefined,
): boolean {
  return Boolean(work.is_plus) && Number(chapterNumber) === 1;
}
