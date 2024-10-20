import express from 'express';
import { 

    login, 
   
    logout, 
 
    checkAuth, 
    
} from '../controllers/userAuth.controller.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

router.get('/check-auth', verifyToken, checkAuth);
router.post('/login', login);
router.post('/logout', logout);

export default router;
