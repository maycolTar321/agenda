class ModernLifeOptimizer {
    constructor() {
        this.missions = JSON.parse(localStorage.getItem('z_missions')) || [];
        this.supplies = JSON.parse(localStorage.getItem('z_supplies')) || [];
        this.notes = localStorage.getItem('z_notes') || "";
        this.waterIntake = parseInt(localStorage.getItem('z_water')) || 0;
        
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.renderDashboard();
        this.renderHorizontalCalendar();
        this.renderWaterBottles();
        this.loadNotes();
        this.startNotificationEngine();
    }

    cacheDOM() {
        this.missionInput = document.getElementById('mission-input');
        this.missionTime = document.getElementById('mission-time');
        this.missionPriority = document.getElementById('mission-priority');
        this.missionsList = document.getElementById('missions-list');
        this.todayTasks = document.getElementById('today-tasks-container');
        this.notesArea = document.getElementById('notes-area');
        this.waterContainer = document.getElementById('water-bottles');
    }

    bindEvents() {
        document.getElementById('add-mission').addEventListener('click', () => this.addMission());
        document.getElementById('add-supply').addEventListener('click', () => this.addSupply());
        this.notesArea.addEventListener('input', () => this.saveNotes());
    }

    switchPage(pageId, btn) {
        document.querySelectorAll('.tab-content').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById(`page-${pageId}`).classList.remove('hidden');
        btn.classList.add('active');
        if (pageId === 'dashboard') this.renderDashboard();
    }

    // --- DASHBOARD ---
    renderDashboard() {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? "Buenos Días," : hour < 19 ? "Buenas Tardes," : "Buenas Noches,";
        document.getElementById('greeting-text').innerText = greeting;

        const today = new Date().toISOString().split('T')[0];
        const todayMissions = this.missions.filter(m => m.time.startsWith(today));
        
        if (todayMissions.length === 0) {
            this.todayTasks.innerHTML = `<p style="text-align:center; padding: 20px; color:#999;">No hay tareas para hoy.</p>`;
        } else {
            this.todayTasks.innerHTML = todayMissions.map(m => `
                <div class="task-card ${m.priority === 'S' ? 'pink' : m.priority === 'A' ? 'purple' : 'cyan'}">
                    <div class="task-details">
                        <h4>${m.text}</h4>
                        <p>${new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <input type="checkbox" ${m.completed ? 'checked' : ''} onclick="zCore.toggleMission(${m.id})" style="width:25px; height:25px; margin-left:auto;">
                </div>
            `).join('');
        }
    }

    // --- MISSIONS ---
    addMission() {
        const text = this.missionInput.value.trim();
        const time = this.missionTime.value;
        const priority = this.missionPriority.value;
        if (!text || !time) return;

        const mission = { id: Date.now(), text, time, priority, completed: false };
        this.missions.push(mission);
        this.saveMissions();
        this.renderDashboard();
        this.renderAllTasks();
        this.missionInput.value = '';
    }

    toggleMission(id) {
        const mission = this.missions.find(m => m.id === id);
        if (mission) {
            mission.completed = !mission.completed;
            this.saveMissions();
            this.renderDashboard();
            this.renderAllTasks();
        }
    }

    deleteMission(id) {
        this.missions = this.missions.filter(m => m.id !== id);
        this.saveMissions();
        this.renderAllTasks();
    }

    renderAllTasks() {
        const sorted = [...this.missions].sort((a, b) => new Date(a.time) - new Date(b.time));
        this.missionsList.innerHTML = sorted.map(m => `
            <div class="task-card" style="padding: 10px 20px;">
                <div class="task-details">
                    <h4>${m.text}</h4>
                    <p>${new Date(m.time).toLocaleString()}</p>
                </div>
                <button onclick="zCore.deleteMission(${m.id})" style="margin-left:auto; border:none; background:none; color:red;"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
    }

    saveMissions() { localStorage.setItem('z_missions', JSON.stringify(this.missions)); }

    // --- WELLNESS ---
    renderWaterBottles() {
        let html = '';
        for (let i = 1; i <= 8; i++) {
            html += `<i class="fas fa-wine-bottle ${i <= this.waterIntake ? 'filled' : ''}" 
                        onclick="zCore.toggleWater(${i})" 
                        style="font-size: 2rem; color: ${i <= this.waterIntake ? 'var(--accent)' : '#eee'}; cursor:pointer;"></i>`;
        }
        this.waterContainer.innerHTML = html;
    }

    toggleWater(num) {
        this.waterIntake = this.waterIntake === num ? num - 1 : num;
        localStorage.setItem('z_water', this.waterIntake);
        this.renderWaterBottles();
    }

    triggerOfficeChallenge(type, name) {
        alert(`Reto Completado: ${name}`);
    }

    // --- NOTES ---
    loadNotes() { this.notesArea.value = this.notes; }
    saveNotes() { this.notes = this.notesArea.value; localStorage.setItem('z_notes', this.notes); }

    // --- CALENDAR ---
    renderHorizontalCalendar() {
        const daysContainer = document.getElementById('days-strip');
        const now = new Date();
        const days = [];
        for (let i = -2; i <= 4; i++) {
            const d = new Date();
            d.setDate(now.getDate() + i);
            days.push(d);
        }
        daysContainer.innerHTML = days.map(d => `
            <div class="date-item ${d.getDate() === now.getDate() ? 'active' : ''}" onclick="zCore.selectDate(${d.getTime()})">
                <span class="day-name">${d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span>
                <span class="day-num">${d.getDate()}</span>
            </div>
        `).join('');
    }

    selectDate(ts) {
        const d = new Date(ts);
        this.missionTime.value = d.toISOString().split('T')[0] + "T09:00";
        this.switchPage('missions', document.querySelectorAll('.nav-item')[1]);
    }

    // --- NOTIFICATIONS ---
    startNotificationEngine() {
        setInterval(() => {
            const now = new Date();
            this.missions.forEach(m => {
                const mDate = new Date(m.time);
                const diff = (mDate - now) / 1000 / 60;
                if (!m.completed && diff > 0 && diff <= 1) {
                    if (Notification.permission === 'granted') {
                        new Notification("Recordatorio", { body: `Es hora de: ${m.text}` });
                    }
                }
            });
        }, 60000);
    }

    // --- DATABASE BACKUP / RESTORE ---
    exportData() {
        const data = {
            z_missions: localStorage.getItem('z_missions'),
            z_supplies: localStorage.getItem('z_supplies'),
            z_notes: localStorage.getItem('z_notes'),
            z_water: localStorage.getItem('z_water')
        };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_life_optimizer_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.z_missions) localStorage.setItem('z_missions', data.z_missions);
                if (data.z_supplies) localStorage.setItem('z_supplies', data.z_supplies);
                if (data.z_notes) localStorage.setItem('z_notes', data.z_notes);
                if (data.z_water) localStorage.setItem('z_water', data.z_water);
                
                alert("¡Datos restaurados con éxito! La página se recargará.");
                location.reload();
            } catch (err) {
                alert("Error al importar el archivo. Asegúrate de que sea un backup válido.");
            }
        };
        reader.readAsText(file);
    }

    clearAllData() {
        if (confirm("¿ESTÁS SEGURO? Esto borrará todas tus misiones, notas y suministros permanentemente.")) {
            localStorage.clear();
            location.reload();
        }
    }
}

const zCore = new ModernLifeOptimizer();
window.zCore = zCore;
