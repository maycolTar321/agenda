class ZCoreMobile {
    constructor() {
        this.missions = JSON.parse(localStorage.getItem('z_missions')) || [];
        this.supplies = JSON.parse(localStorage.getItem('z_supplies')) || [];
        this.notes = localStorage.getItem('z_notes') || "";
        this.powerLevel = parseInt(localStorage.getItem('z_power')) || 9000;
        this.waterIntake = parseInt(localStorage.getItem('z_water')) || 0;
        this.currentMonthOffset = 0;
        
        this.sounds = {
            click: 'https://www.myinstants.com/media/sounds/dbz-teleport.mp3',
            complete: 'https://www.myinstants.com/media/sounds/goku-ultra-instinct-theme.mp3',
            delete: 'https://www.myinstants.com/media/sounds/dbz-hit.mp3',
            alarm: 'https://www.myinstants.com/media/sounds/goku-teleport.mp3'
        };

        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.setGreeting();
        this.renderMissions();
        this.renderSupplies();
        this.renderHorizontalCalendar();
        this.renderWaterBottles();
        this.updatePowerDisplay();
        this.updateAnalytics();
        this.loadNotes();
        this.startNotificationEngine();
        this.checkNotificationsPermission();
    }

    cacheDOM() {
        this.missionInput = document.getElementById('mission-input');
        this.missionTime = document.getElementById('mission-time');
        this.missionPriority = document.getElementById('mission-priority');
        this.missionsList = document.getElementById('missions-list');
        this.supplyInput = document.getElementById('supply-input');
        this.suppliesList = document.getElementById('supplies-list');
        this.notesArea = document.getElementById('notes-area');
        this.powerBar = document.getElementById('power-bar');
        this.powerValue = document.getElementById('power-value');
        this.overlay = document.getElementById('completion-overlay');
        this.timerDisplay = document.getElementById('timer');
        this.waterContainer = document.getElementById('water-bottles');
    }

    bindEvents() {
        document.getElementById('add-mission').addEventListener('click', () => this.addMission());
        document.getElementById('add-supply').addEventListener('click', () => this.addSupply());
        document.getElementById('start-timer').addEventListener('click', () => this.toggleTimer());
        document.getElementById('reset-timer').addEventListener('click', () => this.resetTimer());
        this.notesArea.addEventListener('input', () => this.saveNotes());
        
        // Timer properties
        this.timerInterval = null;
        this.timerSeconds = 1500;
    }

    // --- NAVIGATION ---
    switchPage(pageId, btn) {
        this.playSound('click');
        
        // Hide all pages
        document.querySelectorAll('.tab-content').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        
        // Show target page
        document.getElementById(`page-${pageId}`).classList.remove('hidden');
        btn.classList.add('active');
        
        // Toggle calendar section if on missions
        const calendarSec = document.getElementById('calendar-section');
        if (pageId === 'missions') calendarSec.classList.remove('hidden');
        else calendarSec.classList.add('hidden');

        if (pageId === 'dashboard') this.updateDashboardPreview();
    }

    playSound(type) {
        const audio = new Audio(this.sounds[type]);
        audio.volume = 0.3;
        audio.play().catch(() => {});
    }

    setGreeting() {
        const hour = new Date().getHours();
        const greetingEl = document.getElementById('user-greeting');
        let text = "BUENAS NOCHES";
        if (hour >= 5 && hour < 12) text = "BUENOS DÍAS";
        else if (hour >= 12 && hour < 19) text = "BUENAS TARDES";
        greetingEl.innerText = `${text}, GUERRERO Z`;
    }

    // --- MISSIONS ---
    addMission() {
        const text = this.missionInput.value.trim();
        const time = this.missionTime.value;
        const priority = this.missionPriority.value;
        
        if (!text || !time) {
            this.playSound('delete');
            alert("¡ERROR! Falta nombre o fecha.");
            return;
        }

        this.playSound('click');
        const mission = { id: Date.now(), text, time, priority, completed: false, notified: false };
        this.missions.push(mission);
        this.saveMissions();
        this.renderMissions();
        this.updateAnalytics();
        
        this.missionInput.value = '';
        this.missionTime.value = '';
    }

    toggleMission(id) {
        const mission = this.missions.find(m => m.id === id);
        if (mission) {
            mission.completed = !mission.completed;
            if (mission.completed) {
                this.playSound('complete');
                this.triggerEpicCompletion();
                this.increasePower(mission.priority === 'S' ? 1000 : 500);
            } else {
                this.playSound('click');
            }
            this.saveMissions();
            this.renderMissions();
            this.updateAnalytics();
        }
    }

    deleteMission(id) {
        this.playSound('delete');
        this.missions = this.missions.filter(m => m.id !== id);
        this.saveMissions();
        this.renderMissions();
        this.updateAnalytics();
    }

    renderMissions() {
        const sorted = [...this.missions].sort((a, b) => new Date(a.time) - new Date(b.time));
        this.missionsList.innerHTML = sorted.map(m => `
            <li class="task-item ${m.completed ? 'completed' : ''}" id="mission-${m.id}">
                <div class="task-info" onclick="zCore.toggleMission(${m.id})">
                    <span class="task-time-label"><i class="far fa-clock"></i> ${new Date(m.time).toLocaleString()}</span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fas ${m.completed ? 'fa-check-circle' : 'fa-circle'}" style="color: var(--secondary)"></i>
                        <span class="priority priority-${m.priority}">${m.priority}</span>
                        <strong>${m.text}</strong>
                    </div>
                </div>
                <button class="btn-delete" onclick="zCore.deleteMission(${m.id})"><i class="fas fa-trash"></i></button>
            </li>
        `).join('');
        document.getElementById('mission-count').innerText = this.missions.filter(m => !m.completed).length;
    }

    saveMissions() { localStorage.setItem('z_missions', JSON.stringify(this.missions)); }

    // --- DASHBOARD ---
    updateDashboardPreview() {
        const pending = this.missions.filter(m => !m.completed).sort((a, b) => new Date(a.time) - new Date(b.time));
        const preview = document.getElementById('next-mission-preview');
        if (pending.length > 0) {
            const next = pending[0];
            preview.innerHTML = `<strong>${next.text}</strong><br><small>${new Date(next.time).toLocaleTimeString()}</small>`;
        } else {
            preview.innerText = "¡Todo despejado! No hay enemigos a la vista.";
        }
    }

    // --- EPIC COMPLETION ---
    triggerEpicCompletion() {
        this.overlay.classList.remove('hidden');
        setTimeout(() => { this.overlay.classList.add('hidden'); }, 4000);
    }

    // --- OFFICE CHALLENGES ---
    triggerOfficeChallenge(type, name) {
        this.playSound('click');
        this.increasePower(250);
        this.notify("¡RETO COMPLETADO!", `Has logrado: ${name}. +250 Poder.`);
        if (type === 'water') this.addWater();
    }

    // --- WATER TRACKER ---
    renderWaterBottles() {
        let html = '';
        for (let i = 1; i <= 8; i++) {
            html += `<i class="fas fa-bottle-water bottle ${i <= this.waterIntake ? 'filled' : ''}" onclick="zCore.toggleWater(${i})"></i>`;
        }
        this.waterContainer.innerHTML = html;
    }

    toggleWater(num) {
        this.playSound('click');
        if (this.waterIntake === num) this.waterIntake--;
        else this.waterIntake = num;
        localStorage.setItem('z_water', this.waterIntake);
        this.renderWaterBottles();
        this.increasePower(50);
    }

    addWater() {
        if (this.waterIntake < 8) {
            this.waterIntake++;
            localStorage.setItem('z_water', this.waterIntake);
            this.renderWaterBottles();
        }
    }

    // --- NOTES ---
    loadNotes() { this.notesArea.value = this.notes; }
    saveNotes() { this.notes = this.notesArea.value; localStorage.setItem('z_notes', this.notes); }
    clearNotes() { 
        this.playSound('delete');
        if (confirm("¿Borrar notas?")) { this.notesArea.value = ""; this.saveNotes(); } 
    }

    addNoteBullet(type) {
        this.playSound('click');
        const start = this.notesArea.selectionStart;
        const end = this.notesArea.selectionEnd;
        const prefix = type === 'number' ? '1. ' : '• ';
        const text = this.notesArea.value;
        this.notesArea.value = text.substring(0, start) + prefix + text.substring(start, end) + text.substring(end);
        this.notesArea.focus();
        this.saveNotes();
    }

    // --- ANALYTICS ---
    updateAnalytics() {
        const completed = this.missions.filter(m => m.completed).length;
        const total = this.missions.length;
        const ratio = total === 0 ? 0 : (completed / total) * 100;
        document.getElementById('completed-total').innerText = completed;
        document.getElementById('bar-energy').style.height = `${Math.min(ratio + 20, 100)}%`;
        document.getElementById('bar-focus').style.height = `${Math.min(ratio * 1.2, 100)}%`;
        document.getElementById('bar-power').style.height = `${Math.min((this.powerLevel / 50000) * 100, 100)}%`;
        
        let rank = "HUMANO";
        if (this.powerLevel > 15000) rank = "SUPER SAIYAN";
        if (this.powerLevel > 30000) rank = "DIOS AZUL";
        if (this.powerLevel > 50000) rank = "ULTRA INSTINTO";
        document.getElementById('current-rank').innerText = rank;
    }

    // --- NOTIFICATIONS ---
    startNotificationEngine() {
        setInterval(() => {
            const now = new Date();
            this.missions.forEach(m => {
                const mDate = new Date(m.time);
                const diff = (mDate - now) / 1000 / 60;
                if (!m.notified && !m.completed && diff > 0 && diff <= 1) {
                    this.playSound('alarm');
                    this.notify("¡ATENCIÓN GUERRERO!", `Es hora de: ${m.text}`);
                    m.notified = true;
                    this.saveMissions();
                }
            });
        }, 30000);
    }

    checkNotificationsPermission() { if ('Notification' in window) { Notification.requestPermission(); } }
    notify(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: 'android-assets/icon-192.png' });
        }
    }

    increasePower(amount) {
        this.powerLevel += amount;
        this.updatePowerDisplay();
        this.updateAnalytics();
        localStorage.setItem('z_power', this.powerLevel);
    }

    updatePowerDisplay() {
        const percentage = Math.min((this.powerLevel / 50000) * 100, 100);
        this.powerBar.style.width = `${percentage}%`;
        this.powerValue.innerText = this.powerLevel.toLocaleString();
    }

    // --- CALENDAR ---
    renderHorizontalCalendar() {
        const now = new Date();
        const daysContainer = document.getElementById('days-strip');
        const monthLabel = document.getElementById('current-month');
        const displayDate = new Date(now.getFullYear(), now.getMonth() + this.currentMonthOffset, 1);
        const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
        monthLabel.innerText = `${months[displayDate.getMonth()]} ${displayDate.getFullYear()}`;
        const days = [];
        const numDays = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= numDays; i++) { days.push(new Date(displayDate.getFullYear(), displayDate.getMonth(), i)); }
        daysContainer.innerHTML = days.map(d => `
            <div class="day-card ${this.isSameDay(d, now) ? 'active' : ''}" onclick="zCore.selectDay(${d.getTime()})">
                <div class="day-name">${d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</div>
                <div class="day-num">${d.getDate()}</div>
            </div>
        `).join('');
    }

    selectDay(timestamp) {
        this.playSound('click');
        const date = new Date(timestamp);
        document.getElementById('mission-time').value = date.toISOString().split('T')[0] + "T09:00";
    }

    changeMonth(dir) { this.playSound('click'); this.currentMonthOffset += dir; this.renderHorizontalCalendar(); }
    isSameDay(d1, d2) { return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate(); }

    // --- SUPPLIES & TIMER ---
    addSupply() { 
        const text = this.supplyInput.value.trim(); 
        if (text) { 
            this.playSound('click');
            this.supplies.push({ id: Date.now(), text, completed: false }); 
            this.saveSupplies(); this.renderSupplies(); this.supplyInput.value = ''; 
        }
    }
    toggleSupply(id) { 
        this.playSound('click');
        const item = this.supplies.find(s => s.id === id); 
        if (item) { item.completed = !item.completed; this.saveSupplies(); this.renderSupplies(); } 
    }
    deleteSupply(id) { 
        this.playSound('delete');
        this.supplies = this.supplies.filter(s => s.id !== id); 
        this.saveSupplies(); this.renderSupplies(); 
    }
    renderSupplies() {
        this.suppliesList.innerHTML = this.supplies.map(s => `<li class="task-item ${s.completed ? 'completed' : ''}"><div onclick="zCore.toggleSupply(${s.id})"><i class="fas ${s.completed ? 'fa-check-square' : 'fa-square'}"></i> <span>${s.text}</span></div><button class="btn-delete" onclick="zCore.deleteSupply(${s.id})"><i class="fas fa-trash"></i></button></li>`).join('');
    }
    saveSupplies() { localStorage.setItem('z_supplies', JSON.stringify(this.supplies)); }

    toggleTimer() {
        this.playSound('click');
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
        else { this.timerInterval = setInterval(() => { this.timerSeconds--; this.updateTimerDisplay(); if (this.timerSeconds <= 0) { clearInterval(this.timerInterval); this.timerInterval = null; this.playSound('alarm'); this.increasePower(2000); this.resetTimer(); } }, 1000); }
    }
    resetTimer() { this.playSound('delete'); clearInterval(this.timerInterval); this.timerInterval = null; this.timerSeconds = 1500; this.updateTimerDisplay(); }
    updateTimerDisplay() {
        const mins = Math.floor(this.timerSeconds / 60); const secs = this.timerSeconds % 60;
        this.timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

const zCore = new ZCoreMobile();
window.zCore = zCore;
