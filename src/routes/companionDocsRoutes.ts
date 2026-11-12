/**
 * Travel Document Manager, Reminders & Verified Country Travel Info Routes
 */
import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db/database.ts';
import { requireAuth, optionalAuth, AuthenticatedRequest } from './authRoutes.ts';

export const companionDocsRouter = Router();

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/json',
]);
const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5 MB

// List authenticated user's documents (metadata only — never public)
companionDocsRouter.get('/documents', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const tripId = req.query.tripId as string | undefined;

  const rows = tripId
    ? (db
        .prepare('SELECT id, trip_id, title, doc_type, reference_number, file_name, mime_type, size_bytes, notes, created_at FROM documents WHERE user_id = ? AND trip_id = ? ORDER BY created_at DESC')
        .all(userId, tripId) as any[])
    : (db
        .prepare('SELECT id, trip_id, title, doc_type, reference_number, file_name, mime_type, size_bytes, notes, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC')
        .all(userId) as any[]);

  return res.json({
    success: true,
    documents: rows.map((r) => ({
      id: r.id,
      tripId: r.trip_id,
      title: r.title,
      docType: r.doc_type,
      referenceNumber: r.reference_number,
      fileName: r.file_name,
      mimeType: r.mime_type,
      sizeBytes: r.size_bytes,
      notes: r.notes,
      createdAt: r.created_at,
    })),
  });
});

// Upload / save travel document
companionDocsRouter.post('/documents', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const title = String(req.body?.title || '').trim();
  const docType = ['ticket', 'hotel', 'itinerary', 'visa', 'insurance', 'other'].includes(req.body?.docType)
    ? req.body.docType
    : 'other';
  const referenceNumber = String(req.body?.referenceNumber || '').trim();
  const fileName = String(req.body?.fileName || '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const mimeType = String(req.body?.mimeType || 'text/plain');
  const contentBase64 = String(req.body?.contentBase64 || '');
  const notes = String(req.body?.notes || '');
  const tripId = req.body?.tripId ? String(req.body.tripId) : null;

  if (!title) {
    return res.status(400).json({ success: false, error: 'Document title is required.' });
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return res.status(400).json({ success: false, error: 'Unsupported file type. Allowed: PDF, PNG, JPEG, WEBP, TXT, JSON.' });
  }

  const sizeBytes = contentBase64 ? Buffer.byteLength(contentBase64, 'base64') : 0;
  if (sizeBytes > MAX_DOC_BYTES) {
    return res.status(400).json({ success: false, error: 'File exceeds maximum 5 MB limit.' });
  }

  const id = `doc_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO documents (id, trip_id, user_id, title, doc_type, reference_number, file_name, mime_type, size_bytes, content_base64, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, tripId, userId, title, docType, referenceNumber, fileName, mimeType, sizeBytes, contentBase64, notes, createdAt);

  return res.status(201).json({
    success: true,
    document: {
      id,
      tripId,
      title,
      docType,
      referenceNumber,
      fileName,
      mimeType,
      sizeBytes,
      notes,
      createdAt,
    },
  });
});

// Download private document (owner only)
companionDocsRouter.get('/documents/:docId/download', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const row = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.docId, req.user!.id) as any;
  if (!row) {
    return res.status(404).json({ success: false, error: 'Document not found or access denied.' });
  }
  if (!row.content_base64) {
    return res.status(404).json({ success: false, error: 'No file attachment stored for this reference.' });
  }
  const buf = Buffer.from(row.content_base64, 'base64');
  res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${row.file_name || 'document'}"`);
  return res.send(buf);
});

companionDocsRouter.delete('/documents/:docId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const result = db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(req.params.docId, req.user!.id);
  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'Document not found or access denied.' });
  }
  return res.json({ success: true });
});

// Travel Reminders
companionDocsRouter.get('/reminders', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'guest';
  const rows = db.prepare('SELECT * FROM reminders WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC').all(userId) as any[];
  return res.json({
    success: true,
    reminders: rows.map((r) => ({
      id: r.id,
      tripId: r.trip_id,
      title: r.title,
      dueDate: r.due_date,
      completed: Boolean(r.completed),
      createdAt: r.created_at,
    })),
  });
});

companionDocsRouter.post('/reminders', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const title = String(req.body?.title || '').trim();
  if (!title) {
    return res.status(400).json({ success: false, error: 'Reminder title is required.' });
  }
  const id = `rem_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  const dueDate = String(req.body?.dueDate || '');
  const tripId = req.body?.tripId ? String(req.body.tripId) : null;
  const userId = req.user?.id || 'guest';

  db.prepare(
    'INSERT INTO reminders (id, trip_id, user_id, title, due_date, completed, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
  ).run(id, tripId, userId, title, dueDate, createdAt);

  return res.status(201).json({
    success: true,
    reminder: { id, tripId, title, dueDate, completed: false, createdAt },
  });
});

companionDocsRouter.patch('/reminders/:id', (req: Request, res: Response) => {
  const completed = req.body?.completed ? 1 : 0;
  db.prepare('UPDATE reminders SET completed = ? WHERE id = ?').run(completed, req.params.id);
  return res.json({ success: true });
});

companionDocsRouter.delete('/reminders/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM reminders WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// Official emergency numbers & government visa portal links (verified references only)
const COUNTRY_OFFICIAL_INFO: Record<
  string,
  {
    country: string;
    emergency: { police: string; ambulance: string; fire: string; universal?: string };
    visaPortalUrl: string;
    visaNote: string;
    phrases: Array<{ english: string; local: string; pronunciation: string }>;
  }
> = {
  india: {
    country: 'India',
    emergency: { police: '100', ambulance: '108', fire: '101', universal: '112' },
    visaPortalUrl: 'https://indianvisaonline.gov.in/',
    visaNote: 'Verify e-Visa eligibility and entry rules on the official Government of India Bureau of Immigration portal.',
    phrases: [
      { english: 'Hello / Greetings', local: 'नमस्ते / నమస్కారం', pronunciation: 'Namaste / Namaskaram' },
      { english: 'Thank you', local: 'धन्यवाद / ధన్యవాదాలు', pronunciation: 'Dhanyavaad / Dhanyavaadaalu' },
      { english: 'How much does this cost?', local: 'यह कितने का है?', pronunciation: 'Yah kitne ka hai?' },
      { english: 'Where is the train station?', local: 'रेलवे स्टेशन कहाँ है?', pronunciation: 'Railway station kahan hai?' },
    ],
  },
  france: {
    country: 'France',
    emergency: { police: '17', ambulance: '15', fire: '18', universal: '112' },
    visaPortalUrl: 'https://france-visas.gouv.fr/',
    visaNote: 'Check Schengen visa / ETIAS requirements on the official France-Visas government portal.',
    phrases: [
      { english: 'Hello', local: 'Bonjour', pronunciation: 'Bohn-zhoor' },
      { english: 'Thank you', local: 'Merci beaucoup', pronunciation: 'Mehr-see boh-koo' },
      { english: 'Excuse me', local: 'Excusez-moi', pronunciation: 'Ex-kyoo-zay mwah' },
      { english: 'Where is the metro?', local: 'Où est le métro ?', pronunciation: 'Oo eh luh may-tro?' },
    ],
  },
  japan: {
    country: 'Japan',
    emergency: { police: '110', ambulance: '119', fire: '119' },
    visaPortalUrl: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
    visaNote: 'Verify visa exemptions and Visit Japan Web customs rules on the Ministry of Foreign Affairs of Japan website.',
    phrases: [
      { english: 'Hello', local: 'こんにちは', pronunciation: 'Konnichiwa' },
      { english: 'Thank you', local: 'ありがとうございます', pronunciation: 'Arigatou gozaimasu' },
      { english: 'Excuse me', local: 'すみません', pronunciation: 'Sumimasen' },
      { english: 'Where is the station?', local: '駅はどこですか？', pronunciation: 'Eki wa doko desu ka?' },
    ],
  },
  italy: {
    country: 'Italy',
    emergency: { police: '113', ambulance: '118', fire: '115', universal: '112' },
    visaPortalUrl: 'https://vistoperitalia.esteri.it/home/en',
    visaNote: 'Verify Schengen entry requirements on the official Italian Ministry of Foreign Affairs visa portal.',
    phrases: [
      { english: 'Hello', local: 'Buongiorno', pronunciation: 'Bwohn-johr-noh' },
      { english: 'Thank you', local: 'Grazie', pronunciation: 'Graht-syeh' },
      { english: 'Excuse me', local: 'Mi scusi', pronunciation: 'Mee skoo-zee' },
      { english: 'The bill, please', local: 'Il conto, per favore', pronunciation: 'Eel kohn-toh, pehr fah-voh-reh' },
    ],
  },
};

companionDocsRouter.get('/travel-info/country', (req: Request, res: Response) => {
  const q = String(req.query.country || 'india').trim().toLowerCase();
  const key = Object.keys(COUNTRY_OFFICIAL_INFO).find((k) => q.includes(k)) || 'india';
  return res.json({
    success: true,
    info: COUNTRY_OFFICIAL_INFO[key],
    disclaimer: 'Always confirm current visa/entry rules on the linked official government portal before travel.',
  });
});

