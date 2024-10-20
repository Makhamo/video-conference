import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
});

// Define the User model
const User = sequelize.define('User', {
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('admin', 'patient', 'doctor'), 
        allowNull: false,
        defaultValue: 'patient',
    },
    phoneNumber: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other'), 
        allowNull: false,
    },
    marketingConsent: {
        type: DataTypes.TINYINT,
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
    },
    createdBy: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isActive: {
        type: DataTypes.TINYINT,
        allowNull: false,
    },
    updatedDate: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW,
        onUpdate: Sequelize.NOW,
    },
    updatedBy: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    deletedDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    deletedBy: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    resetPasswordToken: {
        type: DataTypes.STRING,
    },
    resetPasswordExpiresAt: {
        type: DataTypes.DATE,
    },
    verificationToken: {
        type: DataTypes.STRING,
    },
    verificationTokenExpiresAt: {
        type: DataTypes.DATE,
    },
}, 
{ 
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedDate',
});

// Export the User model
export default User;
