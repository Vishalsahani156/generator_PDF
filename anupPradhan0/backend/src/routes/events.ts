import { Router } from 'express';
import {
  createEvent,
  deleteEvent,
  downloadEventsPdf,
  listEvents,
} from '../controllers/eventsController';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(listEvents));
router.post('/', asyncHandler(createEvent));
router.get('/pdf', asyncHandler(downloadEventsPdf));
router.delete('/:id', asyncHandler(deleteEvent));

export default router;
