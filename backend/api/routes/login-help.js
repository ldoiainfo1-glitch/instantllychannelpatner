const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Application = require('../models/Application');
const bcrypt = require('bcryptjs');

/**
 * Check if user account exists
 * POST /api/check-user-account
 */
router.post('/check-user-account', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone || !/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number'
            });
        }

        // Check if user account exists
        const user = await User.findOne({ phone: phone });

        if (user) {
            // User account exists - generate password from name
            const nameForPassword = user.name.replace(/\s+/g, '');
            const password = nameForPassword.substring(0, 4).toUpperCase().padEnd(4, 'X');

            return res.json({
                accountExists: true,
                phone: user.phone,
                password: password,
                name: user.name
            });
        }

        // Check if application exists
        const application = await Application.findOne({
            'applicantInfo.phone': phone,
            status: 'approved'
        });

        if (application) {
            return res.json({
                accountExists: false,
                applicationExists: true,
                phone: phone,
                name: application.applicantInfo.name,
                position: application.position,
                approvalDate: application.approvedDate
            });
        }

        // No application found
        return res.json({
            accountExists: false,
            applicationExists: false
        });

    } catch (error) {
        console.error('Error checking user account:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while checking account'
        });
    }
});

/**
 * Auto-create user account from approved application
 * POST /api/auto-create-user-account
 */
router.post('/auto-create-user-account', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone || !/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ phone: phone });
        if (existingUser) {
            const nameForPassword = existingUser.name.replace(/\s+/g, '');
            const password = nameForPassword.substring(0, 4).toUpperCase().padEnd(4, 'X');

            return res.json({
                success: true,
                alreadyExists: true,
                phone: existingUser.phone,
                password: password,
                message: 'Account already exists'
            });
        }

        // Find approved application
        const application = await Application.findOne({
            'applicantInfo.phone': phone,
            status: 'approved'
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'No approved application found for this phone number'
            });
        }

        // Generate password from name
        const name = application.applicantInfo.name;
        const nameForPassword = name.replace(/\s+/g, '');
        const password = nameForPassword.substring(0, 4).toUpperCase().padEnd(4, 'X');

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Prepare photo data with proper format
        let photoData = null;
        if (application.applicantInfo.photo) {
            photoData = application.applicantInfo.photo;
            // Ensure proper data URI format
            if (!photoData.startsWith('data:image')) {
                const imageType = photoData.startsWith('/9j/') ? 'jpeg' : 'png';
                photoData = `data:image/${imageType};base64,${photoData}`;
            }
        }

        // Create new user with all data from application
        const newUser = new User({
            name: name,
            phone: phone,
            email: application.applicantInfo.email || '',
            password: hashedPassword,
            loginId: phone,
            personCode: `PC${Date.now()}`,
            photo: photoData,
            profilePhoto: photoData,
            credits: 0,
            cashCredits: 0,
            extraCredits: 0,
            creditsHistory: [],
            commissionBalance: 0,
            commissionHistory: [],
            hasReceivedInitialCredits: false,
            isVerified: true,
            documents: application.documents || {},
            referralCode: application.referralCode || '',
            referredBy: application.referredBy || '',
            address: application.applicantInfo.address || '',
            city: application.applicantInfo.city || '',
            state: application.applicantInfo.state || '',
            pincode: application.applicantInfo.pincode || '',
            createdAt: new Date(),
            lastLogin: null
        });

        await newUser.save();

        // Update application with user ID
        application.userId = newUser._id;
        await application.save();

        console.log(`✅ Auto-created user account for ${phone} - Password: ${password}`);

        return res.json({
            success: true,
            phone: phone,
            password: password,
            userId: newUser._id.toString(),
            message: 'Account created successfully with all application data'
        });

    } catch (error) {
        console.error('Error creating user account:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating account'
        });
    }
});

module.exports = router;
