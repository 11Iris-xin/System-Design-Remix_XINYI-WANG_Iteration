

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/focusflow';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));


const sessionSchema = new mongoose.Schema({
    mode: {
        type: String,
        enum: ['focus', 'break', 'longbreak'],
        default: 'focus'
    },
    durationMinutes: {
        type: Number,
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    timezone: {
        type: String,
        default: 'UTC'
    },
    motivationalMessage: {
        type: String
    },
    messageAuthor: {
        type: String
    },
    status: {
        type: String,
        enum: ['completed', 'interrupted'],
        default: 'completed'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Session = mongoose.model('Session', sessionSchema);

app.get('/api/sessions', async (req, res) => {
    try {
        const { limit = 50, mode, startDate, endDate } = req.query;
        
        let query = {};
        
        if (mode) {
            query.mode = mode;
        }
        
        if (startDate || endDate) {
            query.startTime = {};
            if (startDate) query.startTime.$gte = new Date(startDate);
            if (endDate) query.startTime.$lte = new Date(endDate);
        }
        
        const sessions = await Session.find(query)
            .sort({ startTime: -1 })
            .limit(parseInt(limit));
        
        res.json({
            success: true,
            count: sessions.length,
            sessions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/sessions', async (req, res) => {
    try {
        const {
            mode,
            durationMinutes,
            startTime,
            endTime,
            timezone,
            motivationalMessage,
            messageAuthor,
            status
        } = req.body;
        
        const session = new Session({
            mode,
            durationMinutes,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            timezone,
            motivationalMessage,
            messageAuthor,
            status
        });
        
        await session.save();
        
        res.status(201).json({
            success: true,
            session
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});


app.get('/api/sessions/:id', async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        res.json({
            success: true,
            session
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.delete('/api/sessions/:id', async (req, res) => {
    try {
        const session = await Session.findByIdAndDelete(req.params.id);
        
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Session deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/stats', async (req, res) => {
    try {

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        

        const todaySessions = await Session.find({
            mode: 'focus',
            startTime: { $gte: today, $lt: tomorrow }
        });
        
        const todaySessionsCount = todaySessions.length;
        const todayMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
        
        const totalSessions = await Session.countDocuments({ mode: 'focus' });
        
        const totalTimeResult = await Session.aggregate([
            { $match: { mode: 'focus' } },
            { $group: { _id: null, totalMinutes: { $sum: '$durationMinutes' } } }
        ]);
        const totalMinutes = totalTimeResult[0]?.totalMinutes || 0;
        
        const streak = await calculateStreak();

        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
        
        const weeklyData = await Session.aggregate([
            {
                $match: {
                    mode: 'focus',
                    startTime: { $gte: weekStart }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: '$startTime' },
                    totalMinutes: { $sum: '$durationMinutes' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const categoryData = await Session.aggregate([
            {
                $group: {
                    _id: '$mode',
                    totalMinutes: { $sum: '$durationMinutes' },
                    count: { $sum: 1 }
                }
            }
        ]);
        
        res.json({
            success: true,
            todaySessions: todaySessionsCount,
            todayMinutes,
            totalSessions,
            totalMinutes,
            streak,
            weeklyData,
            categoryData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

async function calculateStreak() {
    try {
        const sessions = await Session.find({ mode: 'focus' })
            .sort({ startTime: -1 })
            .select('startTime');
        
        if (sessions.length === 0) return 0;

        const dates = [...new Set(sessions.map(s => {
            const d = new Date(s.startTime);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }))].sort((a, b) => b - a);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let streak = 0;
        let checkDate = today.getTime();
        
        for (const date of dates) {
            if (date === checkDate) {
                streak++;
                checkDate -= 86400000; // Previous day
            } else if (date === checkDate - 86400000) {
                streak++;
                checkDate = date;
            } else {
                break;
            }
        }
        
        return streak;
    } catch (error) {
        return 0;
    }
}

app.get('/api/weekly', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 6);
        
        const dailyData = await Session.aggregate([
            {
                $match: {
                    mode: 'focus',
                    startTime: { $gte: weekStart }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$startTime' }
                    },
                    totalMinutes: { $sum: '$durationMinutes' },
                    sessions: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        res.json({
            success: true,
            weekStart: weekStart.toISOString(),
            weekEnd: today.toISOString(),
            dailyData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║     Focus Flow Server Running! 🧘         ║
╠═══════════════════════════════════════════╣
║  Local:  http://localhost:${PORT}            ║
║  MongoDB: ${MONGODB_URI.substring(0, 30)}...  ║
╚═══════════════════════════════════════════╝
    `);
});

module.exports = app;