require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/focusflow';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

const sessionSchema = new mongoose.Schema({
    mode: { type: String, enum: ['focus', 'break', 'longbreak'], default: 'focus' },
    label: { type: String, default: '' },
    labelIcon: { type: String, default: '📌' },
    durationMinutes: { type: Number, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    timezone: { type: String, default: 'UTC' },
    motivationalMessage: String,
    messageAuthor: String,
    status: { type: String, enum: ['completed', 'interrupted'], default: 'completed' },
    createdAt: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', sessionSchema);

// GET all sessions
app.get('/api/sessions', async (req, res) => {
    try {
        const { limit = 50, mode } = req.query;
        let query = {};
        if (mode) query.mode = mode;
        const sessions = await Session.find(query).sort({ startTime: -1 }).limit(parseInt(limit));
        res.json({ success: true, count: sessions.length, sessions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST new session
app.post('/api/sessions', async (req, res) => {
    try {
        const session = new Session({
            mode: req.body.mode,
            label: req.body.label || '',
            labelIcon: req.body.labelIcon || '📌',
            durationMinutes: req.body.durationMinutes,
            startTime: new Date(req.body.startTime),
            endTime: new Date(req.body.endTime),
            timezone: req.body.timezone,
            motivationalMessage: req.body.motivationalMessage,
            messageAuthor: req.body.messageAuthor,
            status: req.body.status
        });
        await session.save();
        console.log('✅ Session saved:', session._id, '| Label:', session.label);
        res.status(201).json({ success: true, session });
    } catch (error) {
        console.error('❌ Save error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE session
app.delete('/api/sessions/:id', async (req, res) => {
    try {
        const session = await Session.findByIdAndDelete(req.params.id);
        if (!session) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET stats
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
        const streak = await calculateStreak();
        
        res.json({
            success: true,
            todaySessions: todaySessionsCount,
            todayMinutes,
            totalSessions,
            streak
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

async function calculateStreak() {
    try {
        const sessions = await Session.find({ mode: 'focus' }).sort({ startTime: -1 }).select('startTime');
        if (sessions.length === 0) return 0;

        const dates = [...new Set(sessions.map(s => {
            const d = new Date(s.startTime);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }))].sort((a, b) => b - a);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let streak = 0, checkDate = today.getTime();
        
        for (const date of dates) {
            if (date === checkDate || date === checkDate - 86400000) {
                streak++;
                checkDate = date;
            } else break;
        }
        return streak;
    } catch { return 0; }
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Quote proxy (to avoid CORS issues)
app.get('/api/quote', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://zenquotes.io/api/random');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        // Fallback quotes
        const fallbackQuotes = [
            { q: "The secret of getting ahead is getting started.", a: "Mark Twain" },
            { q: "Focus on being productive instead of busy.", a: "Tim Ferriss" },
            { q: "The way to get started is to quit talking and begin doing.", a: "Walt Disney" },
            { q: "Don't watch the clock; do what it does. Keep going.", a: "Sam Levenson" },
            { q: "It's not about having time, it's about making time.", a: "Unknown" },
            { q: "Start where you are. Use what you have. Do what you can.", a: "Arthur Ashe" },
            { q: "The only way to do great work is to love what you do.", a: "Steve Jobs" },
            { q: "Success is the sum of small efforts repeated day in and day out.", a: "Robert Collier" }
        ];
        const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        res.json([randomQuote]);
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Focus Flow running on http://localhost:${PORT}`);
});

module.exports = app;