class ZCorePro {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('z_tasks')) || [];
        this.checklist = JSON.parse(localStorage.getItem('z_checklist')) || [];
        this.notes = localStorage.getItem('z_notes_html') || "";
        this.selectedDate = new Date().toISOString().split('T')[0];
        
        this.init();
    }

    init() {
        this.cacheDOM();
        this.renderCalendar();
        this.renderHomeTasks();
        this.renderChecklist();
        this.loadNotes();
        this.updateStats();
        this.startNotificationEngine();
    }

    cacheDOM() {
        this.homeTaskList = document.getElementById('home-task-list');
        this.checklistContainer = document.getElementById('checklist-container');
        this.notesEditor = document.getElementById('notes-editor');
        this.taskName = document.getElementById('task-name');
        this.taskDateTime = document.getElementById('task-datetime');
        this.taskCategory = document.getElementById('task-category');
        this.taskNote = document.getElementById('task-note');
        this.checkInput = document.getElementById('check-input');
        this.displayMonth = document.getElementById('display-month');
        this.taskProgress = document.getElementById('task-progress');
        this.productivityPct = document.getElementById('productivity-pct');
    }

    bindEvents() {
        const autoCap = (e) => {
            const el = e.target;
            let val = el.value || el.innerText || "";
            if (val.length === 1) {
                if (el.value !== undefined) el.value = val.toUpperCase();
                else el.innerText = val.toUpperCase();
            }
        };

        this.taskName.addEventListener('input', autoCap);
        this.checkInput.addEventListener('input', autoCap);
        this.notesEditor.addEventListener('input', (e) => {
            autoCap(e);
            this.saveNotes();
        });
    }

    // --- NAVIGATION ---
    switchTab(tabId, btn) {
        document.querySelectorAll('.tab-content').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById(`page-${tabId}`).classList.remove('hidden');
        btn.classList.add('active');
        if (tabId === 'home') {
            this.renderCalendar();
            this.renderHomeTasks();
        }
    }

    // --- WORD-STYLE EDITOR ---
    format(command) {
        document.execCommand(command, false, null);
        this.notesEditor.focus();
    }

    saveNotes() {
        this.notes = this.notesEditor.innerHTML;
        localStorage.setItem('z_notes_html', this.notes);
    }

    loadNotes() {
        this.notesEditor.innerHTML = this.notes;
    }

    // --- CALENDAR ---
    renderCalendar() {
        const strip = document.getElementById('calendar-strip');
        const now = new Date();
        const days = [];
        for (let i = -3; i <= 3; i++) {
            const d = new Date();
            d.setDate(now.getDate() + i);
            days.push(d);
        }

        strip.innerHTML = days.map(d => {
            const dStr = d.toISOString().split('T')[0];
            const isActive = dStr === this.selectedDate;
            return `
                <div class="cal-day ${isActive ? 'active' : ''}" onclick="zCore.selectDate('${dStr}')">
                    <span style="font-size: 0.7rem; color: ${isActive ? '#000' : '#888'}; font-weight:700;">${d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span>
                    <span style="font-size: 1.1rem; font-weight: 800; color: ${isActive ? '#000' : '#222'};">${d.getDate()}</span>
                    <div class="dot" style="background: ${this.hasTasks(dStr) ? 'var(--primary-gradient)' : 'transparent'};"></div>
                </div>
            `;
        }).join('');

        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        this.displayMonth.innerText = months[now.getMonth()];
    }

    selectDate(dateStr) {
        this.selectedDate = dateStr;
        this.renderCalendar();
        this.renderHomeTasks();
    }

    hasTasks(dateStr) {
        return this.tasks.some(t => t.time.startsWith(dateStr));
    }

    // --- TASK LOGIC ---
    addTask() {
        const name = this.taskName.value.trim();
        const time = this.taskDateTime.value;
        if (!name || !time) return alert("Completa el título y la hora.");

        const task = {
            id: Date.now(),
            name,
            time,
            category: this.taskCategory.value,
            note: this.taskNote.value,
            completed: false,
            notified: false
        };

        this.tasks.push(task);
        this.saveTasks();
        this.taskName.value = "";
        this.taskNote.value = "";
        this.selectedDate = time.split('T')[0];
        this.switchTab('home', document.querySelectorAll('.nav-item')[0]);
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderHomeTasks();
            this.updateStats();
        }
    }

    deleteTask(id) {
        if (confirm("¿Eliminar esta misión?")) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveTasks();
            this.renderHomeTasks();
            this.updateStats();
        }
    }

    renderHomeTasks() {
        const dailyTasks = this.tasks.filter(t => t.time.startsWith(this.selectedDate));
        const completedCount = dailyTasks.filter(t => t.completed).length;
        
        this.taskProgress.innerText = `${completedCount}/${dailyTasks.length} COMPLETADO`;
        
        this.homeTaskList.innerHTML = dailyTasks.sort((a,b) => new Date(a.time) - new Date(b.time)).map(t => `
            <div class="checklist-item ${t.completed ? 'done' : ''}" onclick="zCore.toggleTask(${t.id})">
                <div class="check-circle"></div>
                <div style="flex:1;">
                    <div style="font-size: 0.75rem; color: #888; font-weight: 700;">${new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div style="font-size: 1rem; font-weight: 700;">${t.name}</div>
                    <div style="font-size: 0.7rem; color: var(--primary-gradient); font-weight: 800;">${t.category.toUpperCase()}</div>
                </div>
                <i class="fas fa-trash" onclick="event.stopPropagation(); zCore.deleteTask(${t.id})" style="color: #eee; font-size: 0.9rem;"></i>
            </div>
        `).join('') || `<div style="text-align:center; padding: 40px; color: #ccc;">No hay misiones para este día.</div>`;
    }

    saveTasks() { localStorage.setItem('z_tasks', JSON.stringify(this.tasks)); }

    // --- CHECKLIST DIARIO ---
    addCheck() {
        const text = this.checkInput.value.trim();
        if (!text) return;
        this.checklist.push({ id: Date.now(), text, done: false });
        this.saveChecklist();
        this.checkInput.value = "";
        this.renderChecklist();
    }

    toggleCheck(id) {
        const item = this.checklist.find(i => i.id === id);
        if (item) { item.done = !item.done; this.saveChecklist(); this.renderChecklist(); }
    }

    deleteCheck(id) {
        this.checklist = this.checklist.filter(i => i.id !== id);
        this.saveChecklist();
        this.renderChecklist();
    }

    renderChecklist() {
        this.checklistContainer.innerHTML = this.checklist.map(i => `
            <div class="checklist-item ${i.done ? 'done' : ''}" onclick="zCore.toggleCheck(${i.id})">
                <div class="check-circle"></div>
                <span style="flex:1; font-weight: 600;">${i.text}</span>
                <i class="fas fa-trash" onclick="event.stopPropagation(); zCore.deleteCheck(${i.id})" style="color: #eee;"></i>
            </div>
        `).join('');
    }

    saveChecklist() { localStorage.setItem('z_checklist', JSON.stringify(this.checklist)); }

    // --- STATS & CHARTS ---
    updateStats() {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
        
        let weeklyAvg = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            const dStr = d.toISOString().split('T')[0];
            const dayTasks = this.tasks.filter(t => t.time.startsWith(dStr));
            const completed = dayTasks.filter(t => t.completed).length;
            const pct = dayTasks.length > 0 ? (completed / dayTasks.length) * 100 : 0;
            
            const bar = document.getElementById(`bar-${i}`);
            if (bar) bar.style.height = `${Math.max(pct, 5)}%`;
            if (dStr === new Date().toISOString().split('T')[0]) {
                this.productivityPct.innerText = `${Math.round(pct)}%`;
            }
        }
    }

    // --- NOTIFICATIONS ---
    requestNotificationPermission() {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') alert("¡Notificaciones activadas!");
            });
        }
    }

    startNotificationEngine() {
        setInterval(() => {
            const now = new Date();
            this.tasks.forEach(t => {
                const tDate = new Date(t.time);
                const diff = (tDate - now) / 1000 / 60; // minutes
                if (!t.completed && !t.notified && diff > 0 && diff <= 5) {
                    this.sendNotification("Misión Próxima", `En 5 min: ${t.name}`);
                    t.notified = true;
                    this.saveTasks();
                }
            });
        }, 30000);
    }

    sendNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: 'android-assets/icon-192.png' });
        }
    }

    // --- DATABASE ---
    exportDB() {
        const data = { tasks: this.tasks, checklist: this.checklist, notes: this.notes };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zcore_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }

    importDB(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.tasks) localStorage.setItem('z_tasks', JSON.stringify(data.tasks));
                if (data.checklist) localStorage.setItem('z_checklist', JSON.stringify(data.checklist));
                if (data.notes) localStorage.setItem('z_notes_html', data.notes);
                alert("Importación exitosa. Reiniciando...");
                location.reload();
            } catch (err) { alert("Error en el archivo."); }
        };
        reader.readAsText(file);
    }

    wipeDB() {
        if (confirm("¿Borrar todo el sistema?")) { localStorage.clear(); location.reload(); }
    }
}

const zCore = new ZCorePro();
window.zCore = zCore;
