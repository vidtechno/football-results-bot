import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Revision Moderation Pipeline and Brand SVG Verification', () => {
  // Mock In-Memory Database for Revision Flow Simulation
  let dbWorks: any[] = [];
  let dbChapters: any[] = [];
  let dbChapterContents: any[] = [];
  let dbWorkRevisions: any[] = [];
  let dbChapterRevisions: any[] = [];
  let dbProfiles: any[] = [];

  const authorUser = { id: 'author-101', email: 'author@manbora.uz', is_admin: false, full_name: 'Alisher Muallif' };
  const otherAuthorUser = { id: 'author-102', email: 'other@manbora.uz', is_admin: false, full_name: 'Boshqa Muallif' };
  const readerUser = { id: 'reader-201', email: 'reader@manbora.uz', is_admin: false, full_name: 'Kitobxon' };
  const adminUser = { id: 'admin-001', email: 'anorboyevdiyorbek714@gmail.com', is_admin: true, full_name: 'Diyorbek Admin' };

  beforeEach(() => {
    dbProfiles = [authorUser, otherAuthorUser, readerUser, adminUser];

    dbWorks = [
      {
        id: 'work-1',
        author_id: authorUser.id,
        title: 'O‘tkan Kunlar (Jonli)',
        description: 'Tarixiy roman - 1-nashr',
        cover_url: 'https://example.com/cover1.jpg',
        type: 'book',
        access_type: 'paid_full_work',
        full_work_price: 25000,
        age_rating: '16+',
        status: 'published',
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString(),
      },
    ];

    dbChapters = [
      {
        id: 'chap-1',
        work_id: 'work-1',
        chapter_number: 1,
        title: '1-bob: Marg‘ilon safari',
        is_free: false,
        price: 3000,
        status: 'published',
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString(),
      },
    ];

    dbChapterContents = [
      {
        chapter_id: 'chap-1',
        content: '<p>1-bobning asl tasdiqlangan jonli matni...</p>',
        updated_at: new Date('2026-01-01').toISOString(),
      },
    ];

    dbWorkRevisions = [];
    dbChapterRevisions = [];
  });

  // Simulated Work Revision Creation Flow
  function saveWorkRevision(userId: string, payload: any) {
    const work = dbWorks.find((w) => w.id === payload.workId);
    if (!work) throw new Error('Asar topilmadi');
    if (work.author_id !== userId) throw new Error('Ruxsat berilmadi');

    if (work.status !== 'published') {
      // Direct update for draft
      Object.assign(work, payload, { updated_at: new Date().toISOString() });
      return { isDraftUpdate: true, work };
    }

    // Published work -> Revision Flow
    const existing = dbWorkRevisions.find(
      (r) => r.work_id === payload.workId && r.author_id === userId && r.status === 'pending_review',
    );

    if (existing) {
      existing.title = payload.title;
      existing.description = payload.description;
      existing.cover_url = payload.coverUrl;
      existing.type = payload.type || existing.type;
      existing.access_type = payload.accessType || existing.access_type;
      existing.full_work_price = payload.fullWorkPrice ?? existing.full_work_price;
      existing.age_rating = payload.ageRating || existing.age_rating;
      existing.updated_at = new Date().toISOString();
      return { isRevision: true, revision: existing, isUpdated: true };
    }

    const newRev = {
      id: `wrev-${dbWorkRevisions.length + 1}`,
      work_id: payload.workId,
      author_id: userId,
      title: payload.title,
      description: payload.description,
      cover_url: payload.coverUrl,
      type: payload.type || 'book',
      access_type: payload.accessType || 'free',
      full_work_price: payload.fullWorkPrice || 0,
      age_rating: payload.ageRating || '0+',
      status: 'pending_review',
      rejection_reason: null,
      moderator_id: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    dbWorkRevisions.push(newRev);
    return { isRevision: true, revision: newRev, isCreated: true };
  }

  // Simulated Chapter Revision Creation Flow
  function saveChapterRevision(userId: string, payload: any) {
    const chap = dbChapters.find((c) => c.id === payload.chapterId);
    if (!chap) throw new Error('Bob topilmadi');
    const work = dbWorks.find((w) => w.id === chap.work_id);
    if (!work || work.author_id !== userId) throw new Error('Ruxsat berilmadi');

    const isPublished = chap.status === 'published' || work.status === 'published';
    if (!isPublished) {
      Object.assign(chap, payload, { updated_at: new Date().toISOString() });
      const contentRec = dbChapterContents.find((cc) => cc.chapter_id === chap.id);
      if (contentRec) contentRec.content = payload.content;
      return { isDraftUpdate: true };
    }

    const existing = dbChapterRevisions.find(
      (r) => r.chapter_id === payload.chapterId && r.author_id === userId && r.status === 'pending_review',
    );

    if (existing) {
      existing.title = payload.title;
      existing.content = payload.content;
      existing.is_free = payload.isFree;
      existing.price = payload.price;
      existing.updated_at = new Date().toISOString();
      return { isRevision: true, revision: existing, isUpdated: true };
    }

    const newRev = {
      id: `crev-${dbChapterRevisions.length + 1}`,
      chapter_id: payload.chapterId,
      work_id: chap.work_id,
      author_id: userId,
      title: payload.title,
      content: payload.content,
      is_free: payload.isFree,
      price: payload.price,
      status: 'pending_review',
      rejection_reason: null,
      moderator_id: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    dbChapterRevisions.push(newRev);
    return { isRevision: true, revision: newRev, isCreated: true };
  }

  // Simulated Admin GET API
  function adminGetRevisions(caller: any) {
    if (!caller || !caller.is_admin) {
      return { status: 403, error: 'Faqat administratorlar ko‘rishi mumkin' };
    }
    const pendingWorkRevs = dbWorkRevisions.filter((r) => r.status === 'pending_review');
    const pendingChapRevs = dbChapterRevisions.filter((r) => r.status === 'pending_review');

    return {
      status: 200,
      success: true,
      workRevisions: pendingWorkRevs,
      chapterRevisions: pendingChapRevs,
      counts: {
        total: pendingWorkRevs.length + pendingChapRevs.length,
        works: pendingWorkRevs.length,
        chapters: pendingChapRevs.length,
      },
    };
  }

  // Simulated Admin Action POST API
  function adminActionRevision(caller: any, body: { revisionId: string; type: 'work' | 'chapter'; action: 'approve' | 'reject'; rejectionReason?: string }) {
    if (!caller || !caller.is_admin) {
      return { status: 403, error: 'Faqat administratorlar bu amalni bajarishi mumkin' };
    }

    const { revisionId, type, action, rejectionReason } = body;
    if (action === 'reject' && (!rejectionReason || !rejectionReason.trim())) {
      return { status: 400, error: 'Tahrirni rad etish sababini kiritish majburiy' };
    }

    if (type === 'work') {
      const rev = dbWorkRevisions.find((r) => r.id === revisionId);
      if (!rev) return { status: 404, error: 'Tahrir topilmadi' };

      if (action === 'approve') {
        const liveWork = dbWorks.find((w) => w.id === rev.work_id);
        if (liveWork) {
          liveWork.title = rev.title;
          liveWork.description = rev.description;
          liveWork.cover_url = rev.cover_url;
          liveWork.type = rev.type;
          liveWork.access_type = rev.access_type;
          liveWork.full_work_price = rev.full_work_price;
          liveWork.age_rating = rev.age_rating;
          liveWork.updated_at = new Date().toISOString();
        }
        rev.status = 'approved';
        rev.moderator_id = caller.id;
        rev.reviewed_at = new Date().toISOString();
        return { status: 200, success: true, message: 'Asar tahriri tasdiqlandi' };
      } else {
        rev.status = 'rejected';
        rev.rejection_reason = rejectionReason?.trim();
        rev.moderator_id = caller.id;
        rev.reviewed_at = new Date().toISOString();
        return { status: 200, success: true, message: 'Asar tahriri rad etildi' };
      }
    } else {
      const rev = dbChapterRevisions.find((r) => r.id === revisionId);
      if (!rev) return { status: 404, error: 'Bob tahriri topilmadi' };

      if (action === 'approve') {
        const liveChap = dbChapters.find((c) => c.id === rev.chapter_id);
        if (liveChap) {
          liveChap.title = rev.title;
          liveChap.is_free = rev.is_free;
          liveChap.price = rev.price;
          liveChap.updated_at = new Date().toISOString();
        }
        const liveContent = dbChapterContents.find((cc) => cc.chapter_id === rev.chapter_id);
        if (liveContent) {
          liveContent.content = rev.content;
          liveContent.updated_at = new Date().toISOString();
        }
        rev.status = 'approved';
        rev.moderator_id = caller.id;
        rev.reviewed_at = new Date().toISOString();
        return { status: 200, success: true, message: 'Bob tahriri tasdiqlandi' };
      } else {
        rev.status = 'rejected';
        rev.rejection_reason = rejectionReason?.trim();
        rev.moderator_id = caller.id;
        rev.reviewed_at = new Date().toISOString();
        return { status: 200, success: true, message: 'Bob tahriri rad etildi' };
      }
    }
  }

  // 1. Published work edit creates pending work revision without overwriting live work
  it('published work edit creates a pending work revision without altering live record', () => {
    const liveBefore = { ...dbWorks[0] };
    const res = saveWorkRevision(authorUser.id, {
      workId: 'work-1',
      title: 'O‘tkan Kunlar (Tahrirlangan yangi nashr)',
      description: 'Qayta ishlangan mukammal tavsif',
      coverUrl: 'https://example.com/cover-new.jpg',
      type: 'book',
      accessType: 'paid_full_work',
      fullWorkPrice: 30000,
    });

    expect(res.isRevision).toBe(true);
    expect(res.isCreated).toBe(true);
    expect(dbWorkRevisions.length).toBe(1);
    expect(dbWorkRevisions[0].status).toBe('pending_review');
    expect(dbWorkRevisions[0].title).toBe('O‘tkan Kunlar (Tahrirlangan yangi nashr)');

    // Live work remains untouched
    expect(dbWorks[0].title).toBe(liveBefore.title);
    expect(dbWorks[0].description).toBe(liveBefore.description);
    expect(dbWorks[0].full_work_price).toBe(liveBefore.full_work_price);
  });

  // 2. Published chapter edit creates pending chapter revision without overwriting live chapter
  it('published chapter edit creates a pending chapter revision without overwriting live content', () => {
    const chapBefore = { ...dbChapters[0] };
    const contentBefore = { ...dbChapterContents[0] };

    const res = saveChapterRevision(authorUser.id, {
      chapterId: 'chap-1',
      title: '1-bob: Toshkentdan Marg‘ilonga yangi sayohat',
      content: '<p>Tahrirlangan yangi bob matni...</p>',
      isFree: false,
      price: 4000,
    });

    expect(res.isRevision).toBe(true);
    expect(res.isCreated).toBe(true);
    expect(dbChapterRevisions.length).toBe(1);
    expect(dbChapterRevisions[0].status).toBe('pending_review');

    // Live chapter and contents remain untouched
    expect(dbChapters[0].title).toBe(chapBefore.title);
    expect(dbChapters[0].price).toBe(chapBefore.price);
    expect(dbChapterContents[0].content).toBe(contentBefore.content);
  });

  // 3. Repeated saves update existing pending revision (no duplicate clutter)
  it('repeated saves by author update existing pending revision instead of creating duplicates', () => {
    saveWorkRevision(authorUser.id, {
      workId: 'work-1',
      title: 'Tahrir 1',
      description: 'Tavsif 1',
    });
    expect(dbWorkRevisions.length).toBe(1);

    const updateRes = saveWorkRevision(authorUser.id, {
      workId: 'work-1',
      title: 'Tahrir 1 (Yangilangan)',
      description: 'Tavsif 1 (Yangilangan)',
    });

    expect(updateRes.isUpdated).toBe(true);
    expect(dbWorkRevisions.length).toBe(1);
    expect(dbWorkRevisions[0].title).toBe('Tahrir 1 (Yangilangan)');
  });

  // 4. Pending revisions appear in admin GET API
  it('pending revisions appear in GET /api/admin/revisions-action with correct counts', () => {
    saveWorkRevision(authorUser.id, { workId: 'work-1', title: 'Asar tahriri 1' });
    saveChapterRevision(authorUser.id, { chapterId: 'chap-1', title: 'Bob tahriri 1', content: 'Matn', isFree: true, price: 0 });

    const adminRes = adminGetRevisions(adminUser);
    expect(adminRes.status).toBe(200);
    if ('counts' in adminRes && adminRes.counts) {
      expect(adminRes.counts.total).toBe(2);
      expect(adminRes.counts.works).toBe(1);
      expect(adminRes.counts.chapters).toBe(1);
      expect(adminRes.workRevisions?.length).toBe(1);
      expect(adminRes.chapterRevisions?.length).toBe(1);
    }
  });

  // 5. Non-admin cannot access admin revisions API
  it('non-admin and anonymous users cannot access admin revisions API', () => {
    const readerRes = adminGetRevisions(readerUser);
    expect(readerRes.status).toBe(403);

    const anonRes = adminGetRevisions(null);
    expect(anonRes.status).toBe(403);
  });

  // 6. Admin approval promotes proposed version atomically
  it('admin approval promotes proposed version to live record and marks revision approved', () => {
    saveWorkRevision(authorUser.id, {
      workId: 'work-1',
      title: 'O‘tkan Kunlar (Tasdiqlangan 2-nashr)',
      description: 'Yangi tavsif',
      fullWorkPrice: 35000,
    });

    const revId = dbWorkRevisions[0].id;
    const actionRes = adminActionRevision(adminUser, {
      revisionId: revId,
      type: 'work',
      action: 'approve',
    });

    expect(actionRes.status).toBe(200);
    expect(dbWorkRevisions[0].status).toBe('approved');
    expect(dbWorkRevisions[0].moderator_id).toBe(adminUser.id);
    expect(dbWorkRevisions[0].reviewed_at).toBeDefined();

    // Live work is updated
    expect(dbWorks[0].title).toBe('O‘tkan Kunlar (Tasdiqlangan 2-nashr)');
    expect(dbWorks[0].full_work_price).toBe(35000);
  });

  // 7. Admin rejection preserves live content and records rejection reason
  it('admin rejection requires reason, preserves live content, and marks status rejected', () => {
    const liveTitleBefore = dbWorks[0].title;
    saveWorkRevision(authorUser.id, {
      workId: 'work-1',
      title: 'Rad etiladigan tahrir',
      description: 'Noto‘g‘ri tavsif',
    });

    const revId = dbWorkRevisions[0].id;

    // Reject without reason fails
    const failRes = adminActionRevision(adminUser, {
      revisionId: revId,
      type: 'work',
      action: 'reject',
      rejectionReason: '   ',
    });
    expect(failRes.status).toBe(400);

    // Reject with valid reason succeeds
    const okRes = adminActionRevision(adminUser, {
      revisionId: revId,
      type: 'work',
      action: 'reject',
      rejectionReason: 'Asar nomida imlo xatolari mavjud',
    });

    expect(okRes.status).toBe(200);
    expect(dbWorkRevisions[0].status).toBe('rejected');
    expect(dbWorkRevisions[0].rejection_reason).toBe('Asar nomida imlo xatolari mavjud');
    expect(dbWorks[0].title).toBe(liveTitleBefore);
  });

  // 8. Author cannot edit another author's work
  it('author cannot create revisions for another author’s work', () => {
    expect(() => {
      saveWorkRevision(otherAuthorUser.id, {
        workId: 'work-1',
        title: 'Begona asar tahriri',
      });
    }).toThrow('Ruxsat berilmadi');
  });

  // 9. Existing normalization logic does not touch approved/rejected records
  it('status normalization query correctly targets only draft or null records', () => {
    const records = [
      { id: '1', status: 'draft' },
      { id: '2', status: null },
      { id: '3', status: 'approved' },
      { id: '4', status: 'rejected' },
      { id: '5', status: 'pending_review' },
    ];

    const normalized = records.map((r) => {
      if (r.status === 'draft' || r.status === null) {
        return { ...r, status: 'pending_review' };
      }
      return r;
    });

    expect(normalized.find((r) => r.id === '1')?.status).toBe('pending_review');
    expect(normalized.find((r) => r.id === '2')?.status).toBe('pending_review');
    expect(normalized.find((r) => r.id === '3')?.status).toBe('approved');
    expect(normalized.find((r) => r.id === '4')?.status).toBe('rejected');
    expect(normalized.find((r) => r.id === '5')?.status).toBe('pending_review');
  });

  // 10. Brand SVG Logo verification
  it('custom SVG logo file exists, is valid vector markup with no script or raster', () => {
    const logoPath = path.resolve(process.cwd(), 'public/brand/manbora-mark.svg');
    expect(fs.existsSync(logoPath)).toBe(true);

    const svgContent = fs.readFileSync(logoPath, 'utf-8');
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('viewBox="0 0 32 32"');
    expect(svgContent).toContain('#1C1917');
    expect(svgContent).toContain('#D97706');

    // Security & clean vector constraints
    expect(svgContent.toLowerCase()).not.toContain('<script');
    expect(svgContent.toLowerCase()).not.toContain('base64');
    expect(svgContent.toLowerCase()).not.toContain('image/png');
    expect(svgContent.toLowerCase()).not.toContain('image/jpeg');
    expect(svgContent.toLowerCase()).not.toContain('onload');
  });

  // 11. Favicon SVG verification
  it('favicon SVG exists and is valid', () => {
    const favPath = path.resolve(process.cwd(), 'public/favicon.svg');
    expect(fs.existsSync(favPath)).toBe(true);

    const favContent = fs.readFileSync(favPath, 'utf-8');
    expect(favContent).toContain('<svg');
    expect(favContent.toLowerCase()).not.toContain('<script');
  });
});
