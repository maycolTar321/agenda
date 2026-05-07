class ZCore {
    constructor() {
        this.missions = JSON.parse(localStorage.getItem('z_missions')) || [];
        this.supplies = JSON.parse(localStorage.getItem('z_supplies')) || [];
        this.powerLevel = parseInt(localStorage.getItem('z_power')) || 0;
        this.isUltraInstinct = false;
        
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.setGreeting();
        this.renderMissions();
        this.renderSupplies();
        this.updatePowerDisplay();
        this.renderHorizontalCalendar();
        this.checkNotificationsPermission();
        
        // Timer properties
        this.timerInterval = null;
        this.timerSeconds = 1500; // 25 min
    }

    setGreeting() {
        const hour = new Date().getHours();
        const greetingEl = document.getElementById('user-greeting');
        let text = "BUENAS NOCHES";
        if (hour >= 5 && hour < 12) text = "BUENOS DÍAS";
        else if (hour >= 12 && hour < 19) text = "BUENAS TARDES";
        greetingEl.innerText = `${text}, GUERRERO Z`;
    }

    cacheDOM() {
        this.missionInput = document.getElementById('mission-input');
        this.missionPriority = document.getElementById('mission-priority');
        this.missionsList = document.getElementById('missions-list');
        this.supplyInput = document.getElementById('supply-input');
        this.suppliesList = document.getElementById('supplies-list');
        this.powerBar = document.getElementById('power-bar');
        this.powerValue = document.getElementById('power-value');
        this.timerDisplay = document.getElementById('timer');
        this.uiOverlay = document.getElementById('ui-overlay');
    }

    bindEvents() {
        document.getElementById('add-mission').addEventListener('click', () => this.addMission());
        document.getElementById('add-supply').addEventListener('click', () => this.addSupply());
        document.getElementById('start-timer').addEventListener('click', () => this.toggleTimer());
        document.getElementById('reset-timer').addEventListener('click', () => this.resetTimer());
        
        this.missionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addMission();
        });
        
        this.supplyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSupply();
        });
    }

    // --- MISSIONS ---
    addMission() {
        const text = this.missionInput.value.trim();
        const priority = this.missionPriority.value;
        if (!text) return;

        const mission = {
            id: Date.now(),
            text,
            priority,
            completed: false,
            timestamp: new Date().toISOString()
        };

        this.missions.push(mission);
        this.saveMissions();
        this.renderMissions();
        this.missionInput.value = '';
        this.notify('¡Nueva Misión!', `Rango ${priority}: ${text}`);
    }

    toggleMission(id) {
        const mission = this.missions.find(m => m.id === id);
        if (mission) {
            mission.completed = !mission.completed;
            if (mission.completed) {
                this.triggerKiEffect(id, 'mission');
                this.increasePower(mission.priority === 'S' ? 500 : mission.priority === 'A' ? 200 : 100);
            } else {
                this.increasePower(-100);
            }
            this.saveMissions();
            this.renderMissions();
        }
    }

    deleteMission(id) {
        this.triggerKiEffect(id, 'mission', true);
        setTimeout(() => {
            this.missions = this.missions.filter(m => m.id !== id);
            this.saveMissions();
            this.renderMissions();
        }, 600);
    }

    renderMissions() {
        this.missionsList.innerHTML = this.missions.map(m => `
            <li class="task-item ${m.completed ? 'completed' : ''}" id="mission-${m.id}">
                <div onclick="zCore.toggleMission(${m.id})">
                    <i class="fas ${m.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
                    <span class="priority priority-${m.priority}">${m.priority}</span>
                    <span>${m.text}</span>
                </div>
                <button class="btn-delete" onclick="zCore.deleteMission(${m.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </li>
        `).join('');
        document.getElementById('mission-count').innerText = this.missions.filter(m => !m.completed).length;
    }

    saveMissions() {
        localStorage.setItem('z_missions', JSON.stringify(this.missions));
    }

    // --- SUPPLIES ---
    addSupply() {
        const text = this.supplyInput.value.trim();
        if (!text) return;

        const supply = {
            id: Date.now(),
            text,
            completed: false
        };

        this.supplies.push(supply);
        this.saveSupplies();
        this.renderSupplies();
        this.supplyInput.value = '';
    }

    toggleSupply(id) {
        const item = this.supplies.find(s => s.id === id);
        if (item) {
            item.completed = !item.completed;
            if (item.completed) this.triggerKiEffect(id, 'supply');
            this.saveSupplies();
            this.renderSupplies();
        }
    }

    deleteSupply(id) {
        this.triggerKiEffect(id, 'supply', true);
        setTimeout(() => {
            this.supplies = this.supplies.filter(s => s.id !== id);
            this.saveSupplies();
            this.renderSupplies();
        }, 600);
    }

    renderSupplies() {
        this.suppliesList.innerHTML = this.supplies.map(s => `
            <li class="task-item ${s.completed ? 'completed' : ''}" id="supply-${s.id}">
                <div onclick="zCore.toggleSupply(${s.id})">
                    <i class="fas ${s.completed ? 'fa-check-square' : 'fa-square'}"></i>
                    <span>${s.text}</span>
                </div>
                <button class="btn-delete" onclick="zCore.deleteSupply(${s.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </li>
        `).join('');
        document.getElementById('supply-count').innerText = this.supplies.filter(s => !s.completed).length;
    }

    saveSupplies() {
        localStorage.setItem('z_supplies', JSON.stringify(this.supplies));
    }

    // --- POWER LEVEL ---
    increasePower(amount) {
        this.powerLevel += amount;
        if (this.powerLevel < 0) this.powerLevel = 0;
        if (this.powerLevel >= 10000 && !this.isUltraInstinct) {
            this.activateUltraInstinct();
        }
        this.updatePowerDisplay();
        localStorage.setItem('z_power', this.powerLevel);
    }

    updatePowerDisplay() {
        const percentage = Math.min((this.powerLevel / 10000) * 100, 100);
        this.powerBar.style.width = `${percentage}%`;
        this.powerValue.innerText = this.powerLevel.toLocaleString();
        
        if (percentage >= 100) {
            this.powerValue.classList.add('glow');
        } else {
            this.powerValue.classList.remove('glow');
        }
    }

    activateUltraInstinct() {
        this.isUltraInstinct = true;
        document.body.classList.add('ui-mode');
        this.uiOverlay.classList.remove('hidden');
        this.uiOverlay.classList.add('active');
        
        setTimeout(() => {
            this.uiOverlay.classList.remove('active');
            setTimeout(() => this.uiOverlay.classList.add('hidden'), 1000);
        }, 3000);

        this.notify('ULTRA INSTINTO', 'Has alcanzado el máximo potencial. ¡Sigue así!');
    }

    // --- EFFECTS ---
    triggerKiEffect(id, type, isDelete = false) {
        const el = document.getElementById(`${type}-${id}`);
        if (!el) return;

        el.classList.add('ki-burst');
        
        if (isDelete) {
            el.style.transform = 'scale(0)';
            el.style.opacity = '0';
        }
    }

    // --- TIMER ---
    toggleTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            document.getElementById('start-timer').innerText = 'CONTINUAR';
        } else {
            document.getElementById('start-timer').innerText = 'PAUSAR';
            this.timerInterval = setInterval(() => {
                this.timerSeconds--;
                this.updateTimerDisplay();
                if (this.timerSeconds <= 0) {
                    clearInterval(this.timerInterval);
                    this.timerInterval = null;
                    this.notify('ENTRENAMIENTO COMPLETADO', '¡Tu nivel de pelea ha aumentado!');
                    this.increasePower(1000);
                    this.resetTimer();
                }
            }, 1000);
        }
    }

    resetTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.timerSeconds = 1500;
        this.updateTimerDisplay();
        document.getElementById('start-timer').innerText = 'ENTRENAR';
    }

    updateTimerDisplay() {
        const mins = Math.floor(this.timerSeconds / 60);
        const secs = this.timerSeconds % 60;
        this.timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // --- MISC ---
    renderHorizontalCalendar() {
        const now = new Date();
        const daysContainer = document.getElementById('days-strip');
        const monthLabel = document.getElementById('current-month');
        
        const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
        monthLabel.innerText = `${months[now.getMonth()]} ${now.getFullYear()}`;

        const days = [];
        for (let i = -3; i <= 3; i++) {
            const d = new Date();
            d.setDate(now.getDate() + i);
            days.push(d);
        }

        daysContainer.innerHTML = days.map(d => `
            <div class="day-card ${d.getDate() === now.getDate() ? 'active' : ''}">
                <div class="day-name">${d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</div>
                <div class="day-num">${d.getDate()}</div>
            </div>
        `).join('');
    }

    checkNotificationsPermission() {
        if ('Notification' in window) {
            Notification.requestPermission();
        }
    }

    notify(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: 'android-assets/icon-192.png'
            });
        }
    }
}

const zCore = new ZCore();
window.zCore = zCore; // For inline onclick events
