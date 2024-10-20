import dotenv from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/userAuthentication.model.js';
import generateTokenAndSetCookie from '../utils/generateTokenAndSetCookie.js';


// Load environment variables
dotenv.config();

const DBname = process.env.DB_NAME;
const DBuser = process.env.DB_USER;
const DBpassword = process.env.DB_PASSWORD;

const sequelize = new Sequelize(DBname, DBuser, DBpassword, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
});

// Login
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        const isPasswordValid = await bcryptjs.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        if (user.isActive !== 1) {
            return res.status(400).json({ success: false, message: "Account not active. Please contact admin." });
        }

        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        generateTokenAndSetCookie(res, user.userId);
        console.log(req.userId);
        user.lastLogin = new Date();
        user.verificationToken = verificationToken;
        user.verificationTokenExpiresAt = new Date(Date.now() + 3600000);

        await user.save();

        res.status(200).json({
            success: true,
            message: "Logged in successfully",
            user: {
                userId: user.userId,
                email: user.email,
                role: user.role,
                lastLogin: user.lastLogin
            },
            verificationToken
        });
    } catch (error) {
        console.log("Error in login ", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// Logout (by deleting cookies)
const logout = async (req, res) => {
    res.clearCookie("token");
    res.status(200).json({ success: true, message: "Logged out successfully" });
};

// Checking if the user is authenticated
const checkAuth = async (req, res) => {
    console.log(req.userId);
    try {
        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        console.log(req.userId);
        console.log("Error in checkAuth ", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export {
    login,
    logout,
    checkAuth
};
