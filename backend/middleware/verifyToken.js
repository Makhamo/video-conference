import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized - no token provided" });

    try {
        console.log("userId:", req.userId);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("userId:", req.userId);
        if (!decoded) return res.status(401).json({ success: false, message: "Unauthorized - invalid token" });
        console.log("userId:", req.userId);
        
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.log("Error in verifyToken ", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export default verifyToken;
