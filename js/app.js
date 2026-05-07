class ZCoreUltimate {
    constructor() {
        this.tasks = [];
        this.checks = [];
        this.notes = "";
        this.selDay = new Date().toISOString().split('T')[0];
        
        this.load();
        window.addEventListener('DOMContentLoaded', () => this.init());
    }

    load() {
        try {
            this.tasks = JSON.parse(localStorage.getItem('zu_tasks')) || [];
            this.notes = localStorage.getItem('zu_notes_html') || "";
            this.checks = JSON.parse(localStorage.getItem('zu_checks')) || [];
        } catch(e) { console.error("Data Load Error", e); }
    }

    init() {
        this.cache();
        this.bind();
        this.renderCal();
        this.renderTasks();
        this.loadNotes();
        this.updateStats();
        this.notifyLoop();
    }

    cache() {
        this.homeList = document.getElementById('home-task-list');
        this.editor = document.getElementById('rich-editor');
        this.addName = document.getElementById('add-name');
        this.addTime = document.getElementById('add-time');
        this.addCat = document.getElementById('add-cat');
        this.pendingLabel = document.getElementById('pending-count');
        this.mainProg = document.getElementById('main-progress');
        this.mainPct = document.getElementById('main-pct');
        this.calStrip = document.getElementById('cal-strip');
    }

    bind() {
        const cap = (e) => {
            const el = e.target;
            let val = el.value || el.innerText || "";
            if (val.length === 1) {
                const upper = val.toUpperCase();
                if (el.value !== undefined) el.value = upper;
                else el.innerText = upper;
            }
        };

        if(this.addName) this.addName.addEventListener('input', cap);
        if(this.editor) {
            this.editor.addEventListener('input', (e) => {
                cap(e);
                this.saveNotes();
            });
        }

        // Auto-capitalize first char of any input
        document.querySelectorAll('.z-input').forEach(i => i.addEventListener('input', cap));
    }

    // --- NAVIGATION ---
    nav(id, btn) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.querySelectorAll('.tab-icon').forEach(t => t.classList.remove('active'));
        const v = document.getElementById(`v-${id}`);
        if(v) v.classList.remove('hidden');
        if(btn) btn.classList.add('active');
        if(id === 'home') this.renderTasks();
    }

    // --- CALENDAR ---
    renderCal() {
        if(!this.calStrip) return;
        const now = new Date();
        const days = [];
        for (let i = -3; i <= 3; i++) {
            const d = new Date();
            d.setDate(now.getDate() + i);
            days.push(d);
        }

        this.calStrip.innerHTML = days.map(d => {
            const dStr = d.toISOString().split('T')[0];
            const active = dStr === this.selDay;
            return `
                <div class="cal-item ${active ? 'active' : ''}" onclick="z.selDate('${dStr}')">
                    <span class="d-name">${d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span>
                    <span class="d-num">${d.getDate()}</span>
                </div>
            `;
        }).join('');
    }

    selDate(date) {
        this.selDay = date;
        this.renderCal();
        this.renderTasks();
    }

    // --- TASKS ---
    saveTask() {
        const name = this.addName.value.trim();
        const time = this.addTime.value;
        if(!name || !time) return alert("Por favor, completa el título y la hora.");

        const task = { id: Date.now(), name, time, cat: this.addCat.value, done: false, notified: false };
        this.tasks.push(task);
        this.save();
        this.addName.value = "";
        this.selDay = time.split('T')[0];
        this.nav('home', document.querySelectorAll('.tab-icon')[0]);
        this.updateStats();
    }

    toggle(id) {
        const t = this.tasks.find(x => x.id === id);
        if(t) { t.done = !t.done; this.save(); this.renderTasks(); this.updateStats(); }
    }

    renderTasks() {
        if(!this.homeList) return;
        const daily = this.tasks.filter(t => t.time.startsWith(this.selDay));
        const pending = daily.filter(t => !t.done).length;
        
        if(this.pendingLabel) this.pendingLabel.innerText = `${pending} misiones`;

        this.homeList.innerHTML = daily.sort((a,b) => new Date(a.time) - new Date(b.time)).map(t => `
            <div class="task-item ${t.done ? 'done' : ''}" onclick="z.toggle(${t.id})">
                <div class="task-check"></div>
                <div class="task-info">
                    <p>${new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${t.cat.toUpperCase()}</p>
                    <h4>${t.name}</h4>
                </div>
                <i class="fas fa-trash" style="margin-left:auto; color:#eee;" onclick="event.stopPropagation(); z.delTask(${t.id})"></i>
            </div>
        `).join('') || '<div style="text-align:center; padding:50px; color:#ccc;">No hay misiones programadas.</div>';
    }

    delTask(id) {
        if(confirm("¿Eliminar misión?")) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.save();
            this.renderTasks();
            this.updateStats();
        }
    }

    save() { localStorage.setItem('zu_tasks', JSON.stringify(this.tasks)); }

    // --- STATS ---
    updateStats() {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayTasks = this.tasks.filter(t => t.time.startsWith(todayStr));
        const done = todayTasks.filter(t => t.done).length;
        const pct = todayTasks.length > 0 ? (done / todayTasks.length) * 100 : 0;

        if(this.mainProg) this.mainProg.style.width = `${pct}%`;
        if(this.mainPct) this.mainPct.innerText = `${Math.round(pct)}%`;

        // Weekly bars
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() + 1); // Mon

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dStr = d.toISOString().split('T')[0];
            const dTasks = this.tasks.filter(t => t.time.startsWith(dStr));
            const dDone = dTasks.filter(t => t.done).length;
            const dPct = dTasks.length > 0 ? (dDone / dTasks.length) * 100 : 0;
            
            const bar = document.getElementById(`bar-${i}`);
            if(bar) bar.style.height = `${Math.max(dPct, 8)}%`;
        }
    }

    // --- EDITOR ---
    exec(cmd) { document.execCommand(cmd, false, null); this.editor.focus(); }
    saveNotes() { if(this.editor) localStorage.setItem('zu_notes_html', this.editor.innerHTML); }
    loadNotes() { if(this.editor) this.editor.innerHTML = this.notes; }

    // --- TRAINING ---
    completeEx(name) { alert(`¡Reto completado: ${name}! +10 Puntos de Energía`); }

    // --- NOTIFICATIONS ---
    askPerms() { if ('Notification' in window) Notification.requestPermission(); }
    notifyLoop() {
        setInterval(() => {
            const now = new Date();
            this.tasks.forEach(t => {
                const tDate = new Date(t.time);
                const diff = (tDate - now) / 1000 / 60;
                if(!t.done && !t.notified && diff > 0 && diff <= 5) {
                    if(Notification.permission === 'granted') {
                        new Notification("Z-Core ULTIMATE", { body: `Misión en 5m: ${t.name}`, icon: 'favicon.ico' });
                        t.notified = true;
                        this.save();
                    }
                }
            });
        }, 30000);
    }

    // --- DATABASE ---
    export() {
        const data = { tasks: this.tasks, notes: this.notes };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `zcore_ultimate_backup.json`;
        a.click();
    }
    import(e) {
        const r = new FileReader();
        r.onload = (ev) => {
            const d = JSON.parse(ev.target.result);
            localStorage.setItem('zu_tasks', JSON.stringify(d.tasks));
            localStorage.setItem('zu_notes_html', d.notes);
            location.reload();
        };
        r.readAsText(e.target.files[0]);
    }
    wipe() { if(confirm("¿RESET TOTAL?")) { localStorage.clear(); location.reload(); } }
}

const z = new ZCoreUltimate();
window.z = z;
