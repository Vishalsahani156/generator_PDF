import { Router } from 'express';
import { listUsers, setUserDisabled } from '../controllers/adminUsersController.js';
import adminProtect from '../middleware/adminAuthMiddleware.js';

const router = Router();

router.use(adminProtect);

router.get('/', listUsers);
router.patch('/:id/disabled', setUserDisabled);

export default router;

