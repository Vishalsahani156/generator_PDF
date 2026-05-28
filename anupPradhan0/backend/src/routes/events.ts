import { Router } from 'express';
import {
  bulkCreateEvents,
  createEvent,
  deleteEvent,
  downloadEventsPdf,
  listEvents,
  voiceExtract,
} from '../controllers/eventsController';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { audioUpload } from '../lib/upload';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(listEvents));
router.post('/', asyncHandler(createEvent));
router.post('/bulk', asyncHandler(bulkCreateEvents));
router.post('/voice', audioUpload.single('audio'), asyncHandler(voiceExtract));
router.get('/pdf', asyncHandler(downloadEventsPdf));
router.delete('/:id', asyncHandler(deleteEvent));

export default router;
