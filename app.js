// ============================================
// Focus Flow - Application JavaScript
// With MongoDB API Integration
// ============================================

// API Configuration
const API_BASE = '/api';

// Ambient Sound URLs
const SOUNDS = {
    none: null,
    rain: 'https://cdn.pixabay.com/audio/2022/05/16/audio_1b71c9e9a0.mp3',
    ocean: 'https://cdn.pixabay.com/audio/2022/06/07/audio_b9bd4170e4.mp3',
    forest: 'https://cdn.pixabay.com/audio/2022/08/31/audio_419263fc12.mp3',
    cafe: 'https://cdn.pixabay.com/audio/2022/10/18/audio_e8f5d51e49.mp3',
    night: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
    fireplace: 'https://cdn.pixabay.com/audio/2021/10/08/audio_4dbb265f14.mp3',
    lofi: 'https://cdn.pixabay.com/audio/2022/11/22/audio_733b3d71ce.mp3'
};

// Application State
const state = {
    duration: 25,
    remaining: 25 * 60,
    running: false,
    interval: null,
    mode: 'focus',
    currentLabel: localStorage.getItem('focusflow_label') || 'Study',
    currentLabelIcon: '📚',
    sessionStartTime: null,
    worldTime: null,
    timezone: null,
    currentQuote: { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    sessions: JSON.parse(localStorage.getItem('focusflow_sessions') || '[]'),
    pendingSync: JSON.parse(localStorage.getItem('focusflow_pending') || '[]'),
    currentTheme: localStorage.getItem('focusflow_theme') || 'default',
    currentSound: 'none',
    audio: null,
    volume: parseFloat(localStorage.getItem('focusflow_volume') || '0.5'),
    isPlaying: false,
    isOnline: navigator.onLine,
    backendAvailable: false
};

let weeklyChart, modeChart;

// ============================================
// MongoDB API Functions
// ============================================
async function checkBackend() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            const data = await response.json();
            if (data.mongodb === 'connected') {
                state.backendAvailable = true;
                console.log('✅ MongoDB connected');
                updateSyncStatus('synced');
                return true;
            }
        }
    } catch (error) {
        console.log('⚠️ Backend unavailable:', error.message);
    }
    state.backendAvailable = false;
    updateSyncStatus('offline');
    return false;
}

async function saveSessionToAPI(session) {
    if (!state.backendAvailable) {
        console.log('📦 Saving to pending queue (offline)');
        state.pendingSync.push(session);
        localStorage.setItem('focusflow_pending', JSON.stringify(state.pendingSync));
        return false;
    }
    
    try {
        console.log('📤 Saving session to MongoDB...');
        const response = await fetch(`${API_BASE}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(session)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Session saved to MongoDB:', data.session._id);
            updateSyncStatus('synced');
            return true;
        } else {
            throw new Error('API returned error');
        }
    } catch (error) {
        console.error('❌ MongoDB save failed:', error);
        state.pendingSync.push(session);
        localStorage.setItem('focusflow_pending', JSON.stringify(state.pendingSync));
        updateSyncStatus('offline');
        return false;
    }
}

async function fetchStatsFromAPI() {
    if (!state.backendAvailable) return null;
    
    try {
        const response = await fetch(`${API_BASE}/stats`);
        if (response.ok) {
            const data = await response.json();
            console.log('📊 Stats from MongoDB:', data);
            return data;
        }
    } catch (error) {
        console.error('Failed to fetch stats:', error);
    }
    return null;
}

async function fetchSessionsFromAPI() {
    if (!state.backendAvailable) return null;
    
    try {
        const response = await fetch(`${API_BASE}/sessions?limit=50`);
        if (response.ok) {
            const data = await response.json();
            console.log('📋 Sessions from MongoDB:', data.count);
            return data.sessions;
        }
    } catch (error) {
        console.error('Failed to fetch sessions:', error);
    }
    return null;
}

async function syncPendingSessions() {
    if (state.pendingSync.length === 0) return;
    if (!state.backendAvailable) return;
    
    console.log(`🔄 Syncing ${state.pendingSync.length} pending sessions...`);
    updateSyncStatus('syncing');
    
    const pending = [...state.pendingSync];
    state.pendingSync = [];
    
    let successCount = 0;
    for (const session of pending) {
        try {
            const response = await fetch(`${API_BASE}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(session)
            });
            
            if (response.ok) {
                successCount++;
            } else {
                state.pendingSync.push(session);
            }
        } catch {
            state.pendingSync.push(session);
        }
    }
    
    localStorage.setItem('focusflow_pending', JSON.stringify(state.pendingSync));
    updateSyncStatus(state.pendingSync.length === 0 ? 'synced' : 'offline');
    console.log(`✅ Synced ${successCount}/${pending.length} sessions`);
}

function updateSyncStatus(status) {
    const dot = document.getElementById('syncDot');
    const text = document.getElementById('syncText');
    
    switch (status) {
        case 'synced':
            dot.style.background = '#4ade80';
            text.textContent = 'Synced';
            break;
        case 'syncing':
            dot.style.background = '#fbbf24';
            text.textContent = 'Syncing...';
            break;
        case 'offline':
            dot.style.background = '#f87171';
            text.textContent = 'Local';
            break;
    }
}

// ============================================
// Ambient Effects
// ============================================
function generateEffects() {
    const rain = document.getElementById('rainContainer');
    for (let i = 0; i < 100; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = Math.random() * 100 + '%';
        drop.style.animationDuration = (0.5 + Math.random() * 0.5) + 's';
        drop.style.animationDelay = Math.random() * 2 + 's';
        rain.appendChild(drop);
    }
    
    const stars = document.getElementById('starsContainer');
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        stars.appendChild(star);
    }
    
    const fireflies = document.getElementById('firefliesContainer');
    for (let i = 0; i < 15; i++) {
        const fly = document.createElement('div');
        fly.className = 'firefly';
        fly.style.left = Math.random() * 100 + '%';
        fly.style.top = 30 + Math.random() * 50 + '%';
        fly.style.animationDelay = Math.random() * 8 + 's';
        fireflies.appendChild(fly);
    }
    
    const sparks = document.getElementById('sparksContainer');
    for (let i = 0; i < 20; i++) {
        const spark = document.createElement('div');
        spark.className = 'spark';
        spark.style.left = 30 + Math.random() * 40 + '%';
        spark.style.animationDelay = Math.random() * 4 + 's';
        sparks.appendChild(spark);
    }
}

// ============================================
// Theme & Sound
// ============================================
function setTheme(theme) {
    document.body.className = 'theme-' + theme;
    state.currentTheme = theme;
    localStorage.setItem('focusflow_theme', theme);
}

function playSound(key) {
    if (state.audio) {
        state.audio.pause();
        state.audio = null;
    }
    state.currentSound = key;
    
    const activeOption = document.querySelector(`.ambient-option[data-sound="${key}"]`);
    if (activeOption) {
        document.getElementById('ambientIcon').textContent = activeOption.querySelector('.ambient-option-icon').textContent;
        document.getElementById('ambientLabel').textContent = activeOption.querySelector('.ambient-option-label').textContent;
    }
    
    if (key === 'none' || !SOUNDS[key]) {
        state.isPlaying = false;
        document.getElementById('volumeRow').style.display = 'none';
        document.getElementById('ambientTrigger').classList.remove('playing');
        return;
    }
    
    state.audio = new Audio(SOUNDS[key]);
    state.audio.loop = true;
    state.audio.volume = state.volume;
    state.audio.play().catch(() => {});
    state.isPlaying = true;
    document.getElementById('volumeRow').style.display = 'flex';
    document.getElementById('ambientTrigger').classList.add('playing');
    localStorage.setItem('focusflow_sound', key);
}

function toggleAmbientPanel(e) {
    e.stopPropagation();
    document.getElementById('ambientPanel').classList.toggle('open');
}

function closeAmbientPanel() {
    document.getElementById('ambientPanel').classList.remove('open');
}

// ============================================
// Time & World Time API
// ============================================
async function fetchWorldTime() {
    try {
        const r = await fetch('https://worldtimeapi.org/api/ip');
        const d = await r.json();
        state.worldTime = new Date(d.datetime);
        state.timezone = d.abbreviation;
        document.getElementById('timezone').textContent = d.abbreviation;
    } catch {
        state.worldTime = new Date();
        document.getElementById('timezone').textContent = 'Local';
    }
    updateTimeDisplay();
}

function updateTimeDisplay() {
    const now = state.worldTime || new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function updateGreeting() {
    const h = (state.worldTime || new Date()).getHours();
    document.getElementById('greeting').textContent = 
        h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
}

function updateDayIndicator() {
    const d = (state.worldTime || new Date()).getDay();
    document.querySelectorAll('.week-indicator .day').forEach(el => 
        el.classList.toggle('active', +el.dataset.day === d)
    );
}

// ============================================
// Timer Functions
// ============================================
function startTimer() {
    state.running = true;
    state.sessionStartTime = new Date(state.worldTime || new Date());
    updateButtonUI();
    state.interval = setInterval(() => {
        if (state.remaining > 0) {
            state.remaining--;
            updateTimerDisplay();
        } else {
            completeSession();
        }
    }, 1000);
}

function pauseTimer() {
    state.running = false;
    clearInterval(state.interval);
    updateButtonUI();
}

function resetTimer() {
    pauseTimer();
    state.remaining = state.duration * 60;
    state.sessionStartTime = null;
    document.getElementById('timerRing').classList.remove('complete');
    updateTimerDisplay();
}

async function completeSession() {
    pauseTimer();
    document.getElementById('timerRing').classList.add('complete');
    
    // Update world time
    await fetchWorldTime();
    const end = new Date(state.worldTime || new Date());
    const start = state.sessionStartTime || new Date(end.getTime() - state.duration * 60000);
    
    // Fetch new quote
    await fetchQuote();

    // Create session object
    const session = {
        mode: state.mode,
        label: state.currentLabel,
        labelIcon: state.currentLabelIcon,
        durationMinutes: state.duration,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        timezone: state.timezone || 'UTC',
        motivationalMessage: state.currentQuote.text,
        messageAuthor: state.currentQuote.author,
        status: 'completed'
    };

    // Save to localStorage (always, as backup)
    state.sessions.push(session);
    localStorage.setItem('focusflow_sessions', JSON.stringify(state.sessions));
    
    // Save to MongoDB
    await saveSessionToAPI(session);
    
    // Update UI
    await updateDashboard();
    showModal(session, start, end);

    // Reset timer after delay
    setTimeout(() => {
        document.getElementById('timerRing').classList.remove('complete');
        state.remaining = state.duration * 60;
        updateTimerDisplay();
    }, 500);
}

function setMode(mode) {
    if (state.running) return;
    state.mode = mode;
    const cfg = { focus: [25, 'Focus Time'], break: [5, 'Short Break'], longbreak: [15, 'Long Break'] };
    [state.duration, document.getElementById('timerLabel').textContent] = cfg[mode];
    state.remaining = state.duration * 60;
    document.querySelectorAll('.duration-btn').forEach(b => 
        b.classList.toggle('active', +b.dataset.minutes === state.duration)
    );
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const m = Math.floor(state.remaining / 60);
    const s = state.remaining % 60;
    document.getElementById('timerDisplay').textContent = 
        `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const progress = (state.duration * 60 - state.remaining) / (state.duration * 60);
    document.getElementById('progressRing').style.strokeDashoffset = 565.48 * (1 - progress);
}

function updateButtonUI() {
    document.getElementById('playIcon').classList.toggle('hidden', state.running);
    document.getElementById('pauseIcon').classList.toggle('hidden', !state.running);
    document.getElementById('startPauseText').textContent = state.running ? 'Pause' : 'Start';
    document.getElementById('startPauseBtn').classList.toggle('running', state.running);
    document.querySelectorAll('.duration-btn').forEach(b => b.disabled = state.running);
    // Disable label selector when running
    document.getElementById('labelSelector')?.classList.toggle('disabled', state.running);
}

// ============================================
// Quote (via backend proxy to avoid CORS)
// ============================================
async function fetchQuote() {
    try {
        // 先尝试通过后端代理获取
        let response = await fetch(`${API_BASE}/quote`);
        
        // 如果后端不可用，尝试直接访问（可能会有 CORS 问题）
        if (!response.ok) {
            response = await fetch('https://zenquotes.io/api/random');
        }
        
        const data = await response.json();
        if (data?.[0]) {
            state.currentQuote = { text: data[0].q, author: data[0].a };
            document.getElementById('quoteText').textContent = `"${data[0].q}"`;
            document.getElementById('quoteAuthor').textContent = `— ${data[0].a}`;
            console.log('📜 New quote loaded');
        }
    } catch (e) {
        console.log('Using fallback quote');
        // 使用本地备用 quotes
        const fallbackQuotes = [
            { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
            { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
            { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
            { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
            { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
            { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" }
        ];
        const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        state.currentQuote = randomQuote;
        document.getElementById('quoteText').textContent = `"${randomQuote.text}"`;
        document.getElementById('quoteAuthor').textContent = `— ${randomQuote.author}`;
    }
}

// ============================================
// Navigation
// ============================================
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
    if (pageId === 'dashboardPage') {
        updateDashboard();
        updateCharts();
    }
}

// ============================================
// Dashboard
// ============================================
async function updateDashboard() {
    // Try MongoDB first
    const apiStats = await fetchStatsFromAPI();
    
    if (apiStats && apiStats.success) {
        // Use MongoDB data
        document.getElementById('statTodaySessions').textContent = apiStats.todaySessions || 0;
        document.getElementById('statTodayMinutes').textContent = (apiStats.todayMinutes || 0) + 'm';
        document.getElementById('statTotalSessions').textContent = apiStats.totalSessions || 0;
        document.getElementById('statStreak').textContent = apiStats.streak || 0;
        
        // Get sessions for charts
        const sessions = await fetchSessionsFromAPI();
        if (sessions && sessions.length > 0) {
            state.sessions = sessions;
            localStorage.setItem('focusflow_sessions', JSON.stringify(sessions));
        }
    } else {
        // Fallback to localStorage
        const today = new Date().toDateString();
        const focus = state.sessions.filter(s => s.mode === 'focus');
        const todayS = focus.filter(s => new Date(s.startTime).toDateString() === today);
        
        document.getElementById('statTodaySessions').textContent = todayS.length;
        document.getElementById('statTodayMinutes').textContent = todayS.reduce((a, s) => a + s.durationMinutes, 0) + 'm';
        document.getElementById('statTotalSessions').textContent = focus.length;
        document.getElementById('statStreak').textContent = calcLocalStreak();
    }
    
    renderDailyBreakdown();
    renderSessionsList();
}

function calcLocalStreak() {
    const focus = state.sessions.filter(s => s.mode === 'focus');
    if (!focus.length) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dates = [...new Set(focus.map(s => {
        const d = new Date(s.startTime);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }))].sort((a, b) => b - a);
    
    let streak = 0;
    let check = today.getTime();
    
    for (const d of dates) {
        if (d === check || d === check - 86400000) {
            streak++;
            check = d;
        } else {
            break;
        }
    }
    return streak;
}

function renderDailyBreakdown() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    start.setHours(0, 0, 0, 0);
    
    const data = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const mins = state.sessions
            .filter(s => s.mode === 'focus' && new Date(s.startTime).toDateString() === date.toDateString())
            .reduce((a, s) => a + s.durationMinutes, 0);
        data.push({ day: days[i], mins, isToday: date.toDateString() === today.toDateString() });
    }
    
    const max = Math.max(...data.map(d => d.mins), 60);
    document.getElementById('dailyBreakdown').innerHTML = data.map(d => `
        <div class="day-column">
            <div class="day-bar-container">
                <div class="day-bar" style="height:${(d.mins / max) * 100}%"></div>
            </div>
            <span class="day-label" style="${d.isToday ? 'color:var(--text-primary);font-weight:600' : ''}">${d.day}</span>
            <span class="day-value">${d.mins}m</span>
        </div>
    `).join('');
}

function renderSessionsList() {
    const recent = [...state.sessions].reverse().slice(0, 8);
    
    if (!recent.length) {
        document.getElementById('sessionsList').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p>No sessions yet</p>
            </div>
        `;
        return;
    }
    
    const icons = { focus: '🎯', break: '☕', longbreak: '🌙' };
    document.getElementById('sessionsList').innerHTML = recent.map(s => {
        const d = new Date(s.startTime);
        const labelDisplay = s.label ? `<span class="session-label-badge">${s.labelIcon || '📌'} ${s.label}</span>` : '';
        return `
            <div class="session-item">
                <div class="session-info">
                    <span class="session-mode">
                        ${icons[s.mode] || '🎯'} ${s.mode}
                        <span class="session-badge">${s.durationMinutes}m</span>
                        ${labelDisplay}
                    </span>
                    <span class="session-time">
                        ${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                    </span>
                </div>
                <span class="session-duration">${s.durationMinutes}m</span>
            </div>
        `;
    }).join('');
}

// ============================================
// Charts (Chart.js)
// ============================================
function initCharts() {
    weeklyChart = new Chart(document.getElementById('weeklyChart'), {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(255,255,255,0.5)',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'rgba(255,255,255,0.6)' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.6)' }
                }
            }
        }
    });
    
    modeChart = new Chart(document.getElementById('modeChart'), {
        type: 'doughnut',
        data: {
            labels: ['Focus', 'Break', 'Long'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(130,170,227,0.7)',
                    'rgba(170,227,130,0.7)',
                    'rgba(227,170,130,0.7)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } }
                }
            },
            cutout: '65%'
        }
    });
}

function updateCharts() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1);
    start.setHours(0, 0, 0, 0);
    
    const weekly = [0, 0, 0, 0, 0, 0, 0];
    state.sessions.filter(s => s.mode === 'focus').forEach(s => {
        const d = new Date(s.startTime);
        if (d >= start) {
            weekly[(d.getDay() + 6) % 7] += s.durationMinutes;
        }
    });
    weeklyChart.data.datasets[0].data = weekly;
    weeklyChart.update();

    const modes = { focus: 0, break: 0, longbreak: 0 };
    state.sessions.forEach(s => {
        if (modes.hasOwnProperty(s.mode)) {
            modes[s.mode] += s.durationMinutes;
        }
    });
    modeChart.data.datasets[0].data = [modes.focus, modes.break, modes.longbreak];
    modeChart.update();
}

// ============================================
// Modal
// ============================================
function showModal(session, start, end) {
    document.getElementById('sessionSummary').textContent = 
        `You ${state.mode === 'focus' ? 'focused' : 'rested'} for ${session.durationMinutes} minutes`;
    document.getElementById('sessionTimeInfo').textContent = 
        `${start.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} — ${end.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
    document.getElementById('modalQuote').textContent = `"${state.currentQuote.text}"`;
    document.getElementById('modalQuoteAuthor').textContent = `— ${state.currentQuote.author}`;
    document.getElementById('sessionModal').classList.add('active');
}

function closeModal() {
    document.getElementById('sessionModal').classList.remove('active');
}

// ============================================
// Event Setup
// ============================================
function setupEvents() {
    document.getElementById('startPauseBtn').onclick = () => state.running ? pauseTimer() : startTimer();
    document.getElementById('resetBtn').onclick = resetTimer;
    
    document.querySelectorAll('.duration-btn').forEach(b => {
        b.onclick = () => {
            if (state.running) return;
            document.querySelectorAll('.duration-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            state.duration = +b.dataset.minutes;
            state.remaining = state.duration * 60;
            updateTimerDisplay();
        };
    });
    
    document.querySelectorAll('.mode-card').forEach(c => {
        c.onclick = () => {
            if (state.running) return;
            document.querySelectorAll('.mode-card').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
            setMode(c.dataset.mode);
        };
    });
    
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.onclick = () => navigateTo(b.dataset.page);
    });
    
    document.getElementById('closeModalBtn').onclick = closeModal;
    document.getElementById('sessionModal').onclick = e => {
        if (e.target.id === 'sessionModal') closeModal();
    };

    document.getElementById('ambientTrigger').onclick = toggleAmbientPanel;
    document.getElementById('ambientPanel').onclick = e => e.stopPropagation();
    document.addEventListener('click', closeAmbientPanel);
    
    document.querySelectorAll('.ambient-option').forEach(c => {
        c.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.ambient-option').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
            setTheme(c.dataset.theme);
            playSound(c.dataset.sound);
        };
    });
    
    document.getElementById('volumeSlider').oninput = e => {
        state.volume = e.target.value / 100;
        if (state.audio) state.audio.volume = state.volume;
        localStorage.setItem('focusflow_volume', state.volume);
    };
    
    // Label selector events
    document.querySelectorAll('.label-btn').forEach(btn => {
        btn.onclick = () => {
            if (state.running) return;
            document.querySelectorAll('.label-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentLabel = btn.dataset.label;
            state.currentLabelIcon = btn.textContent.trim().split(' ')[0]; // Get emoji
            document.getElementById('currentLabelDisplay').textContent = btn.textContent.trim();
            document.getElementById('customLabelInput').value = '';
            localStorage.setItem('focusflow_label', state.currentLabel);
        };
    });
    
    // Custom label input
    document.getElementById('addCustomLabel').onclick = () => {
        const input = document.getElementById('customLabelInput');
        const value = input.value.trim();
        if (value && !state.running) {
            document.querySelectorAll('.label-btn').forEach(b => b.classList.remove('active'));
            state.currentLabel = value;
            state.currentLabelIcon = '🏷️';
            document.getElementById('currentLabelDisplay').textContent = `🏷️ ${value}`;
            localStorage.setItem('focusflow_label', value);
        }
    };
    
    document.getElementById('customLabelInput').onkeypress = e => {
        if (e.key === 'Enter') {
            document.getElementById('addCustomLabel').click();
        }
    };
    
    // Online/Offline detection
    window.addEventListener('online', async () => {
        console.log('🌐 Online');
        state.isOnline = true;
        await checkBackend();
        await syncPendingSessions();
    });
    
    window.addEventListener('offline', () => {
        console.log('📴 Offline');
        state.isOnline = false;
        state.backendAvailable = false;
        updateSyncStatus('offline');
    });
}

// ============================================
// Initialize Application
// ============================================
async function init() {
    console.log('🚀 Focus Flow starting...');
    
    generateEffects();
    setTheme(state.currentTheme);
    document.getElementById('volumeSlider').value = state.volume * 100;
    
    document.querySelectorAll('.ambient-option').forEach(c => {
        if (c.dataset.theme === state.currentTheme && c.dataset.sound === 'none') {
            c.classList.add('active');
            document.getElementById('ambientIcon').textContent = c.querySelector('.ambient-option-icon').textContent;
            document.getElementById('ambientLabel').textContent = c.querySelector('.ambient-option-label').textContent;
        } else {
            c.classList.remove('active');
        }
    });

    // Check backend connection
    console.log('🔌 Checking backend...');
    await checkBackend();
    
    // Sync pending sessions
    if (state.backendAvailable && state.pendingSync.length > 0) {
        await syncPendingSessions();
    }

    await fetchWorldTime();
    updateGreeting();
    updateDayIndicator();
    updateTimerDisplay();
    fetchQuote();
    initCharts();
    await updateDashboard();
    setupEvents();

    // Time update interval
    setInterval(() => {
        if (state.worldTime) {
            state.worldTime = new Date(state.worldTime.getTime() + 1000);
        }
        updateTimeDisplay();
    }, 1000);
    
    setInterval(fetchWorldTime, 5 * 60 * 1000);
    setInterval(updateGreeting, 60000);
    
    // Periodic backend check
    setInterval(async () => {
        if (state.isOnline && !state.backendAvailable) {
            await checkBackend();
            if (state.backendAvailable) {
                await syncPendingSessions();
            }
        }
    }, 30000);
    
    console.log('✅ Focus Flow ready!');
}

document.addEventListener('DOMContentLoaded', init);