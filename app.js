// ============================================
// Focus Flow - Anti-Procrastination Companion
// Main Application JavaScript
// ============================================

// ============================================
// State Management (Simulating Database)
// ============================================
const AppState = {
    tasks: JSON.parse(localStorage.getItem('focusflow_tasks')) || [],
    sessions: JSON.parse(localStorage.getItem('focusflow_sessions')) || [],
    currentTask: null,
    timerDuration: 25, // minutes
    timerRemaining: 25 * 60, // seconds
    timerRunning: false,
    timerInterval: null,
    currentQuote: {
        text: "The secret of getting ahead is getting started.",
        author: "Mark Twain"
    }
};

// Save state to localStorage
function saveState() {
    localStorage.setItem('focusflow_tasks', JSON.stringify(AppState.tasks));
    localStorage.setItem('focusflow_sessions', JSON.stringify(AppState.sessions));
}

// ============================================
// DOM Elements
// ============================================
const elements = {
    // Pages
    mainContent: document.getElementById('mainContent'),
    focusPage: document.getElementById('focusPage'),
    tasksPage: document.getElementById('tasksPage'),
    dashboardPage: document.getElementById('dashboardPage'),
    
    // Header
    greeting: document.getElementById('greeting'),
    
    // Timer
    timerDisplay: document.getElementById('timerDisplay'),
    progressRing: document.getElementById('progressRing'),
    currentTaskName: document.getElementById('currentTaskName'),
    startPauseBtn: document.getElementById('startPauseBtn'),
    startPauseText: document.getElementById('startPauseText'),
    resetBtn: document.getElementById('resetBtn'),
    skipBtn: document.getElementById('skipBtn'),
    quoteText: document.getElementById('quoteText'),
    quoteAuthor: document.getElementById('quoteAuthor'),
    
    // Tasks
    tasksList: document.getElementById('tasksList'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    
    // Dashboard
    totalSessions: document.getElementById('totalSessions'),
    totalFocusTime: document.getElementById('totalFocusTime'),
    tasksCompleted: document.getElementById('tasksCompleted'),
    currentStreak: document.getElementById('currentStreak'),
    sessionsList: document.getElementById('sessionsList'),
    
    // Modals
    addTaskModal: document.getElementById('addTaskModal'),
    closeModal: document.getElementById('closeModal'),
    taskForm: document.getElementById('taskForm'),
    taskTitle: document.getElementById('taskTitle'),
    sessionCompleteModal: document.getElementById('sessionCompleteModal'),
    sessionSummary: document.getElementById('sessionSummary'),
    modalQuote: document.getElementById('modalQuote'),
    modalQuoteAuthor: document.getElementById('modalQuoteAuthor'),
    closeSessionModal: document.getElementById('closeSessionModal'),
    
    // Navigation
    navBtns: document.querySelectorAll('.nav-btn'),
    quickActions: document.querySelectorAll('.action-card')
};

// ============================================
// Initialization
// ============================================
function init() {
    updateGreeting();
    updateDayIndicator();
    renderTasks();
    updateDashboard();
    initCharts();
    setupEventListeners();
    fetchRandomQuote();
    
    // Add demo data if empty
    if (AppState.tasks.length === 0) {
        addDemoData();
    }
}

function addDemoData() {
    const demoTasks = [
        { id: generateId(), title: 'Complete project documentation', category: 'Work', status: 'active', duration: 25, createdAt: new Date().toISOString() },
        { id: generateId(), title: 'Study JavaScript patterns', category: 'Study', status: 'active', duration: 45, createdAt: new Date().toISOString() },
        { id: generateId(), title: 'Morning meditation', category: 'Personal', status: 'completed', duration: 15, createdAt: new Date().toISOString() },
        { id: generateId(), title: 'Review pull requests', category: 'Work', status: 'active', duration: 25, createdAt: new Date().toISOString() },
    ];
    
    const demoSessions = [
        {
            id: generateId(),
            taskId: demoTasks[0].id,
            taskTitle: demoTasks[0].title,
            category: 'Work',
            startTime: new Date(Date.now() - 86400000).toISOString(),
            endTime: new Date(Date.now() - 86400000 + 1500000).toISOString(),
            durationMinutes: 25,
            motivationalMessage: "Success is not final, failure is not fatal.",
            status: 'completed'
        },
        {
            id: generateId(),
            taskId: demoTasks[1].id,
            taskTitle: demoTasks[1].title,
            category: 'Study',
            startTime: new Date(Date.now() - 172800000).toISOString(),
            endTime: new Date(Date.now() - 172800000 + 2700000).toISOString(),
            durationMinutes: 45,
            motivationalMessage: "The only way to do great work is to love what you do.",
            status: 'completed'
        },
        {
            id: generateId(),
            taskId: demoTasks[2].id,
            taskTitle: demoTasks[2].title,
            category: 'Personal',
            startTime: new Date(Date.now() - 259200000).toISOString(),
            endTime: new Date(Date.now() - 259200000 + 900000).toISOString(),
            durationMinutes: 15,
            motivationalMessage: "Peace comes from within.",
            status: 'completed'
        }
    ];
    
    AppState.tasks = demoTasks;
    AppState.sessions = demoSessions;
    saveState();
    renderTasks();
    updateDashboard();
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Navigation
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => navigateToPage(btn.dataset.page));
    });
    
    // Quick Actions
    elements.quickActions.forEach(card => {
        card.addEventListener('click', () => {
            if (card.id === 'focusTimerCard') {
                navigateToPage('focusPage');
            }
        });
    });
    
    // Timer Controls
    elements.startPauseBtn.addEventListener('click', toggleTimer);
    elements.resetBtn.addEventListener('click', resetTimer);
    elements.skipBtn.addEventListener('click', skipTimer);
    
    // Task Modal
    elements.addTaskBtn.addEventListener('click', () => openModal(elements.addTaskModal));
    elements.closeModal.addEventListener('click', () => closeModalHandler(elements.addTaskModal));
    elements.addTaskModal.addEventListener('click', (e) => {
        if (e.target === elements.addTaskModal) closeModalHandler(elements.addTaskModal);
    });
    
    // Task Form
    elements.taskForm.addEventListener('submit', handleTaskSubmit);
    
    // Category Selection
    document.querySelectorAll('.category-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Duration Selection
    document.querySelectorAll('.duration-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.duration-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Filter Buttons
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTasks(btn.dataset.category);
        });
    });
    
    // Session Complete Modal
    elements.closeSessionModal.addEventListener('click', () => {
        closeModalHandler(elements.sessionCompleteModal);
    });
    elements.sessionCompleteModal.addEventListener('click', (e) => {
        if (e.target === elements.sessionCompleteModal) {
            closeModalHandler(elements.sessionCompleteModal);
        }
    });
}

// ============================================
// Navigation
// ============================================
function navigateToPage(pageId) {
    // Update pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    // Update nav buttons
    elements.navBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
    
    // Update charts if going to dashboard
    if (pageId === 'dashboardPage') {
        updateDashboard();
        updateCharts();
    }
}

// ============================================
// Timer Functions
// ============================================
function toggleTimer() {
    if (AppState.timerRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (!AppState.currentTask) {
        // If no task selected, show tasks page
        showNotification('Please select a task first');
        navigateToPage('tasksPage');
        return;
    }
    
    AppState.timerRunning = true;
    AppState.sessionStartTime = new Date();
    updateTimerUI();
    
    AppState.timerInterval = setInterval(() => {
        if (AppState.timerRemaining > 0) {
            AppState.timerRemaining--;
            updateTimerDisplay();
        } else {
            completeSession();
        }
    }, 1000);
}

function pauseTimer() {
    AppState.timerRunning = false;
    clearInterval(AppState.timerInterval);
    updateTimerUI();
}

function resetTimer() {
    pauseTimer();
    AppState.timerRemaining = AppState.timerDuration * 60;
    updateTimerDisplay();
}

function skipTimer() {
    if (AppState.timerRunning || AppState.timerRemaining < AppState.timerDuration * 60) {
        completeSession();
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(AppState.timerRemaining / 60);
    const seconds = AppState.timerRemaining % 60;
    elements.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update progress ring
    const totalSeconds = AppState.timerDuration * 60;
    const progress = (totalSeconds - AppState.timerRemaining) / totalSeconds;
    const circumference = 2 * Math.PI * 90;
    const offset = circumference * (1 - progress);
    elements.progressRing.style.strokeDashoffset = offset;
}

function updateTimerUI() {
    const playIcon = elements.startPauseBtn.querySelector('.play-icon');
    const pauseIcon = elements.startPauseBtn.querySelector('.pause-icon');
    
    if (AppState.timerRunning) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        elements.startPauseText.textContent = 'Pause';
        elements.startPauseBtn.classList.add('active');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        elements.startPauseText.textContent = 'Start';
        elements.startPauseBtn.classList.remove('active');
    }
}

async function completeSession() {
    pauseTimer();
    
    const endTime = new Date();
    const startTime = AppState.sessionStartTime || new Date(endTime - (AppState.timerDuration * 60 * 1000));
    const actualDuration = Math.round((AppState.timerDuration * 60 - AppState.timerRemaining) / 60);
    
    // Fetch a new motivational quote
    await fetchRandomQuote();
    
    // Create session record
    const session = {
        id: generateId(),
        taskId: AppState.currentTask?.id,
        taskTitle: AppState.currentTask?.title || 'Focus Session',
        category: AppState.currentTask?.category || 'Personal',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes: actualDuration > 0 ? actualDuration : AppState.timerDuration,
        motivationalMessage: AppState.currentQuote.text,
        status: 'completed'
    };
    
    AppState.sessions.push(session);
    saveState();
    
    // Show completion modal
    elements.sessionSummary.textContent = `You focused for ${session.durationMinutes} minutes`;
    elements.modalQuote.textContent = `"${AppState.currentQuote.text}"`;
    elements.modalQuoteAuthor.textContent = `— ${AppState.currentQuote.author}`;
    openModal(elements.sessionCompleteModal);
    
    // Reset timer
    AppState.timerRemaining = AppState.timerDuration * 60;
    updateTimerDisplay();
    updateDashboard();
}

// ============================================
// Task Functions
// ============================================
function renderTasks(filter = 'all') {
    const filteredTasks = filter === 'all' 
        ? AppState.tasks 
        : AppState.tasks.filter(task => task.category === filter);
    
    if (filteredTasks.length === 0) {
        elements.tasksList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>No tasks yet. Add your first task!</p>
            </div>
        `;
        return;
    }
    
    elements.tasksList.innerHTML = filteredTasks.map(task => `
        <div class="task-item ${task.status === 'completed' ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-checkbox" onclick="toggleTaskStatus('${task.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
            <div class="task-info">
                <span class="task-title">${escapeHtml(task.title)}</span>
                <div class="task-meta">
                    <span class="task-category ${task.category}">${task.category}</span>
                    <span class="task-duration">${task.duration || 25} min</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn focus-btn" onclick="startFocusOnTask('${task.id}')" title="Start Focus">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                </button>
                <button class="task-action-btn delete-btn" onclick="deleteTask('${task.id}')" title="Delete">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function handleTaskSubmit(e) {
    e.preventDefault();
    
    const title = elements.taskTitle.value.trim();
    const category = document.querySelector('.category-option.active').dataset.value;
    const duration = parseInt(document.querySelector('.duration-option.active').dataset.value);
    
    if (!title) return;
    
    const task = {
        id: generateId(),
        title,
        category,
        status: 'active',
        duration,
        createdAt: new Date().toISOString()
    };
    
    AppState.tasks.unshift(task);
    saveState();
    renderTasks();
    
    // Reset form and close modal
    elements.taskForm.reset();
    document.querySelectorAll('.category-option').forEach(b => b.classList.remove('active'));
    document.querySelector('.category-option[data-value="Study"]').classList.add('active');
    document.querySelectorAll('.duration-option').forEach(b => b.classList.remove('active'));
    document.querySelector('.duration-option[data-value="25"]').classList.add('active');
    closeModalHandler(elements.addTaskModal);
    
    showNotification('Task created successfully!');
}

function toggleTaskStatus(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (task) {
        task.status = task.status === 'completed' ? 'active' : 'completed';
        task.updatedAt = new Date().toISOString();
        saveState();
        renderTasks();
        updateDashboard();
    }
}

function deleteTask(taskId) {
    AppState.tasks = AppState.tasks.filter(t => t.id !== taskId);
    saveState();
    renderTasks();
    showNotification('Task deleted');
}

function startFocusOnTask(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (task) {
        AppState.currentTask = task;
        AppState.timerDuration = task.duration || 25;
        AppState.timerRemaining = AppState.timerDuration * 60;
        
        elements.currentTaskName.textContent = task.title;
        updateTimerDisplay();
        navigateToPage('focusPage');
    }
}

// ============================================
// Dashboard Functions
// ============================================
function updateDashboard() {
    // Calculate stats
    const totalSessionsCount = AppState.sessions.length;
    const totalMinutes = AppState.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const completedTasksCount = AppState.tasks.filter(t => t.status === 'completed').length;
    const streak = calculateStreak();
    
    // Update stat cards
    elements.totalSessions.textContent = totalSessionsCount;
    elements.totalFocusTime.textContent = formatDuration(totalMinutes);
    elements.tasksCompleted.textContent = completedTasksCount;
    elements.currentStreak.textContent = streak;
    
    // Render recent sessions
    renderRecentSessions();
}

function calculateStreak() {
    if (AppState.sessions.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sessionDates = [...new Set(
        AppState.sessions.map(s => {
            const date = new Date(s.startTime);
            date.setHours(0, 0, 0, 0);
            return date.getTime();
        })
    )].sort((a, b) => b - a);
    
    let streak = 0;
    let currentDate = today.getTime();
    
    for (const date of sessionDates) {
        if (date === currentDate || date === currentDate - 86400000) {
            streak++;
            currentDate = date;
        } else {
            break;
        }
    }
    
    return streak;
}

function formatDuration(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function renderRecentSessions() {
    const recentSessions = AppState.sessions.slice(-5).reverse();
    
    if (recentSessions.length === 0) {
        elements.sessionsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏱️</div>
                <p>No sessions yet. Start your first focus session!</p>
            </div>
        `;
        return;
    }
    
    elements.sessionsList.innerHTML = recentSessions.map(session => {
        const date = new Date(session.startTime);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        
        return `
            <div class="session-item">
                <div class="session-info">
                    <span class="session-task">${escapeHtml(session.taskTitle)}</span>
                    <span class="session-time">${dateStr} at ${timeStr}</span>
                </div>
                <span class="session-duration">${session.durationMinutes}m</span>
            </div>
        `;
    }).join('');
}

// ============================================
// Charts
// ============================================
let weeklyChart, categoryChart;

function initCharts() {
    const weeklyCtx = document.getElementById('weeklyChart');
    const categoryCtx = document.getElementById('categoryChart');
    
    // Weekly Focus Time Chart
    weeklyChart = new Chart(weeklyCtx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Focus Time (min)',
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: { family: 'Nunito' }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: { family: 'Nunito' }
                    }
                }
            }
        }
    });
    
    // Category Distribution Chart
    categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: ['Study', 'Work', 'Personal'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(130, 170, 227, 0.7)',
                    'rgba(227, 170, 130, 0.7)',
                    'rgba(170, 227, 130, 0.7)'
                ],
                borderColor: [
                    'rgba(130, 170, 227, 1)',
                    'rgba(227, 170, 130, 1)',
                    'rgba(170, 227, 130, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        font: { family: 'Nunito', size: 12 },
                        padding: 16
                    }
                }
            },
            cutout: '60%'
        }
    });
    
    updateCharts();
}

function updateCharts() {
    // Calculate weekly data
    const weeklyData = getWeeklyData();
    weeklyChart.data.datasets[0].data = weeklyData;
    weeklyChart.update();
    
    // Calculate category data
    const categoryData = getCategoryData();
    categoryChart.data.datasets[0].data = categoryData;
    categoryChart.update();
}

function getWeeklyData() {
    const data = [0, 0, 0, 0, 0, 0, 0];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    
    AppState.sessions.forEach(session => {
        const sessionDate = new Date(session.startTime);
        if (sessionDate >= startOfWeek) {
            const dayIndex = (sessionDate.getDay() + 6) % 7; // Convert to Mon=0
            data[dayIndex] += session.durationMinutes;
        }
    });
    
    return data;
}

function getCategoryData() {
    const categories = { Study: 0, Work: 0, Personal: 0 };
    
    AppState.sessions.forEach(session => {
        if (categories.hasOwnProperty(session.category)) {
            categories[session.category] += session.durationMinutes;
        }
    });
    
    return [categories.Study, categories.Work, categories.Personal];
}

// ============================================
// API Functions
// ============================================
async function fetchRandomQuote() {
    try {
        const response = await fetch('https://zenquotes.io/api/random');
        const data = await response.json();
        
        if (data && data[0]) {
            AppState.currentQuote = {
                text: data[0].q,
                author: data[0].a
            };
            
            // Update quote displays
            elements.quoteText.textContent = `"${AppState.currentQuote.text}"`;
            elements.quoteAuthor.textContent = `— ${AppState.currentQuote.author}`;
        }
    } catch (error) {
        console.log('Using default quote');
        // Keep existing quote on error
    }
}

async function getCurrentTime() {
    try {
        const response = await fetch('http://worldtimeapi.org/api/ip');
        const data = await response.json();
        return new Date(data.datetime);
    } catch (error) {
        return new Date();
    }
}

// ============================================
// UI Helpers
// ============================================
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    
    if (hour >= 5 && hour < 12) greeting = 'Morning';
    else if (hour >= 12 && hour < 17) greeting = 'Afternoon';
    else if (hour >= 17 && hour < 21) greeting = 'Evening';
    else greeting = 'Night';
    
    elements.greeting.textContent = greeting;
}

function updateDayIndicator() {
    const today = new Date().getDay();
    document.querySelectorAll('.week-indicator .day').forEach(day => {
        day.classList.remove('active');
        if (parseInt(day.dataset.day) === today) {
            day.classList.add('active');
        }
    });
}

function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModalHandler(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function showNotification(message) {
    // Simple notification - could be enhanced with a toast component
    console.log(message);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Initialize App
// ============================================
document.addEventListener('DOMContentLoaded', init);

// Expose functions to global scope for inline event handlers
window.toggleTaskStatus = toggleTaskStatus;
window.deleteTask = deleteTask;
window.startFocusOnTask = startFocusOnTask;