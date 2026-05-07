class ZCorePro {
    constructor() {
        this.tasks = [];
        this.checks = [];
        this.notes = "";
        this.currentDay = new Date().toISOString().split('T')[0];
        
        try {
            this.tasks = JSON.parse(localStorage.getItem('zc_tasks')) || [];
            this.checks = JSON.parse(localStorage.getItem('zc_checks')) || [];
            this.notes = localStorage.getItem('zc_notes_html') || "";
        } catch(e) { console.error("LS Error", e); }

        window.addEventListener('DOMContentLoaded', () => this.init());
    }

    init() {
        this.cache();
        this.events();
        this.renderCal();
        this.renderTasks();
        this.renderChecks();
        this.loadNotes();
        this.updateStats();
        this.startNotifyEngine();
    }

    cache() {
        this.inName = document.getElementById('in-name');
        this.inTime = document.getElementById('in-time');
        this.inCat = document.getElementById('in-cat');
        this.inCheck = document.getElementById('in-check');
        this.homeTasks = document.getElementById('home-tasks');
        this.checkListContainer = document.getElementById('check-list');
        this.editor = document.getElementById('editor-content');
        this.pctLabel = document.getElementById('pct-label');
        this.labelMonth = document.getElementById('label-month');
        this.stripCal = document.getElementById('strip-cal');
    }

    events() {
        // Auto-Capitalization Logic
        const capFirst = (e) => {
            const el = e.target;
            let val = el.value || el.innerText || "";
            if (val.length === 1) {
                if (el.value !== undefined) el.value = val.toUpperCase();
                else el.innerText = val.toUpperCase();
            }
        };

        if(this.inName) this.inName.addEventListener('input', capFirst);
        if(this.inCheck) this.inCheck.addEventListener('input', capFirst);
        if(this.editor) {
            this.editor.addEventListener('input', (e) => {
                capFirst(e);
                this.saveNotes();
            });
        }
    }

    switchView(id, btn) {
        document.querySelectorAll('.tab-pane').forEach(v => v.classList.add('hidden'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const target = document.getElementById(`view-${id}`);
        if(target) target.classList.remove('hidden');
        if(btn) btn.classList.add('active');
        if(id === 'home') this.renderTasks();
    }

    filterHome(type, btn) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');
        this.renderTasks(type);
    }

    renderCal() {
        if(!this.stripCal) return;
        const now = new Date();
        const days = [];
        for (let i = -3; i <= 3; i++) {
            const d = new Date();
            d.setDate(now.getDate() + i);
            days.push(d);
        }

        this.stripCal.innerHTML = days.map(d => {
            const dStr = d.toISOString().split('T')[0];
            const active = dStr === this.currentDay;
            return `
                <div class="cal-card ${active ? 'active' : ''}" onclick="zCore.selectDay('${dStr}')">
                    <span class="day-name">${d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span>
                    <span class="day-num">${d.getDate()}</span>
                    <div class="day-dot"></div>
                </div>
            `;
        }).join('');

        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        if(this.labelMonth) this.labelMonth.innerText = months[now.getMonth()];
    }

    selectDay(date) {
        this.currentDay = date;
        this.renderCal();
        this.renderTasks();
    }

    saveTask() {
        const name = this.inName.value.trim();
        const time = this.inTime.value;
        if (!name || !time) return alert("Completa los datos.");

        const task = { id: Date.now(), name, time, cat: this.inCat.value, done: false, notified: false };
        this.tasks.push(task);
        localStorage.setItem('zc_tasks', JSON.stringify(this.tasks));
        this.inName.value = "";
        this.currentDay = time.split('T')[0];
        this.switchView('home', document.querySelectorAll('.nav-link')[0]);
        this.updateStats();
    }

    toggleTask(id) {
        const t = this.tasks.find(x => x.id === id);
        if (t) { t.done = !t.done; localStorage.setItem('zc_tasks', JSON.stringify(this.tasks)); this.renderTasks(); this.updateStats(); }
    }

    renderTasks(filter = 'all') {
        if(!this.homeTasks) return;
        let list = this.tasks.filter(t => t.time.startsWith(this.currentDay));
        if (filter === 'pending') list = list.filter(t => !t.done);

        this.homeTasks.innerHTML = list.map(t => `
            <div class="card-z ${t.done ? 'card-light' : 'card-dark'}" onclick="zCore.toggleTask(${t.id})">
                <span class="task-time">${new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${t.cat.toUpperCase()}</span>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 class="task-name">${t.name}</h3>
                    <i class="fas ${t.done ? 'fa-check-circle' : 'fa-circle'}" style="color: ${t.done ? 'var(--success)' : 'var(--primary-gradient)'}"></i>
                </div>
            </div>
        `).join('') || '<p style="text-align:center; color:#ccc; padding:40px;">No hay misiones hoy.</p>';
    }

    addCheck() {
        const text = this.inCheck.value.trim();
        if (!text) return;
        this.checks.push({ id: Date.now(), text, done: false });
        localStorage.setItem('zc_checks', JSON.stringify(this.checks));
        this.inCheck.value = "";
        this.renderChecks();
    }

    toggleCheck(id) {
        const c = this.checks.find(x => x.id === id);
        if (c) { c.done = !c.done; localStorage.setItem('zc_checks', JSON.stringify(this.checks)); this.renderChecks(); }
    }

    renderChecks() {
        if(!this.checkListContainer) return;
        this.checkListContainer.innerHTML = this.checks.map(c => `
            <div class="check-item ${c.done ? 'done' : ''}" onclick="zCore.toggleCheck(${c.id})">
                <div class="check-circle"></div>
                <span style="font-weight:700;">${c.text}</span>
            </div>
        `).join('');
    }

    updateStats() {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() + 1); // Monday

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dStr = d.toISOString().split('T')[0];
            const dayTasks = this.tasks.filter(t => t.time.startsWith(dStr));
            const done = dayTasks.filter(t => t.done).length;
            const pct = dayTasks.length > 0 ? (done / dayTasks.length) * 100 : 0;
            
            const bar = document.getElementById(`bar-${i}`);
            if (bar) bar.style.height = `${Math.max(pct, 5)}%`;
            if (dStr === new Date().toISOString().split('T')[0] && this.pctLabel) {
                this.pctLabel.innerText = `${Math.round(pct)}%`;
            }
        }
    }

    format(cmd) { document.execCommand(cmd, false, null); if(this.editor) this.editor.focus(); }
    saveNotes() { if(this.editor) localStorage.setItem('zc_notes_html', this.editor.innerHTML); }
    loadNotes() { if(this.editor) this.editor.innerHTML = this.notes; }

    askNotify() { if ('Notification' in window) Notification.requestPermission().then(p => { if (p === 'granted') alert("Notificaciones Activadas."); }); }
    startNotifyEngine() {
        setInterval(() => {
            const now = new Date();
            this.tasks.forEach(t => {
                const tDate = new Date(t.time);
                const diff = (tDate - now) / 1000 / 60;
                if (!t.done && !t.notified && diff > 0 && diff <= 5) {
                    if (Notification.permission === 'granted') {
                        new Notification("Z-Core Pro", { body: `En 5 min: ${t.name}` });
                        t.notified = true;
                        localStorage.setItem('zc_tasks', JSON.stringify(this.tasks));
                    }
                }
            });
        }, 30000);
    }

    exportDB() {
        const data = { tasks: this.tasks, checks: this.checks, notes: this.notes };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup_zcore.json`;
        a.click();
    }
    importDB(e) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                localStorage.setItem('zc_tasks', JSON.stringify(data.tasks));
                localStorage.setItem('zc_checks', JSON.stringify(data.checks));
                localStorage.setItem('zc_notes_html', data.notes);
                location.reload();
            } catch(e) { alert("Archivo Inválido."); }
        };
        reader.readAsText(e.target.files[0]);
    }
    wipeDB() { if (confirm("¿Borrar todo?")) { localStorage.clear(); location.reload(); } }
}

const zCore = new ZCorePro();
window.zCore = zCore;
