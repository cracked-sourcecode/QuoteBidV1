import { Router } from 'express';
import { startSignup } from './signupStage';
import { updateSignupState } from './signupState';

const router = Router();

router.post('/start', startSignup);
router.patch('/state', updateSignupState);

export default router;
