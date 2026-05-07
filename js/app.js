class ZCoreUltimate {
    constructor() {
        this.tasks = [];
        this.checks = [];
        this.notes = "";
        this.selDay = new Date().toISOString().split('T')[0];
        
        this.quotes = [
            { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier" },
            { text: "No cuentes los días, haz que los días cuenten.", author: "Muhammad Ali" },
            { text: "Tu tiempo es limitado, no lo malgastes viviendo la vida de otro.", author: "Steve Jobs" },
            { text: "La disciplina es el puente entre metas y logros.", author: "Jim Rohn" },
            { text: "Si puedes imaginarlo, puedes lograrlo.", author: "Walt Disney" },
            { text: "El único lugar donde el éxito viene antes que el trabajo es en el diccionario.", author: "Vidal Sassoon" },
            { text: "Haz de cada día tu obra maestra.", author: "John Wooden" }
        ];

        this.load();
        window.addEventListener('DOMContentLoaded', () => this.init());
    }

    load() {
        try {
            this.tasks = JSON.parse(localStorage.getItem('zu_tasks')) || [];
            this.notes = localStorage.getItem('zu_notes_html') || "";
            this.checks = JSON.parse(localStorage.getItem('zu_checks')) || [];
        } catch(e) { console.error("Error al cargar datos", e); }
    }

    init() {
        this.cache();
        this.bind();
        this.renderCal();
        this.renderTasks();
        this.renderChecks();
        this.loadNotes();
        this.updateStats();
        this.showQuote();
        this.notifyLoop();
    }

    cache() {
        this.homeList = document.getElementById('home-task-list');
        this.checkList = document.getElementById('check-list');
        this.editor = document.getElementById('rich-editor');
        this.addName = document.getElementById('add-name');
        this.addTime = document.getElementById('add-time');
        this.addCat = document.getElementById('add-cat');
        this.mainPct = document.getElementById('main-pct');
        this.calStrip = document.getElementById('cal-strip');
        this.inCheck = document.getElementById('in-check');
        this.qText = document.getElementById('quote-text');
        this.qAuthor = document.getElementById('quote-author');
    }

    bind() {
        const autoCap = (e) => {
            const el = e.target;
            let val = el.value || el.innerText || "";
            if (val.length === 1) {
                const upper = val.toUpperCase();
                if (el.value !== undefined) el.value = upper;
                else el.innerText = upper;
            }
        };

        if(this.addName) this.addName.addEventListener('input', autoCap);
        if(this.inCheck) this.inCheck.addEventListener('input', autoCap);
        if(this.editor) {
            this.editor.addEventListener('input', (e) => {
                autoCap(e);
                this.saveNotes();
            });
        }
    }

    showQuote() {
        const q = this.quotes[Math.floor(Math.random() * this.quotes.length)];
        if(this.qText) this.qText.innerText = `"${q.text}"`;
        if(this.qAuthor) this.qAuthor.innerText = q.author;
    }

    // --- NAVEGACIÓN ---
    nav(id, btn) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.querySelectorAll('.tab-icon').forEach(t => t.classList.remove('active'));
        const v = document.getElementById(`v-${id}`);
        if(v) v.classList.remove('hidden');
        if(btn) btn.classList.add('active');
        if(id === 'inicio') {
            this.renderTasks();
            this.updateStats();
        }
    }

    // --- CALENDARIO ---
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

    // --- TAREAS ---
    saveTask() {
        const name = this.addName.value.trim();
        const time = this.addTime.value;
        if(!name || !time) return alert("Por favor, completa el título y la hora.");

        const task = { id: Date.now(), name, time, cat: this.addCat.value, done: false, notified: false };
        this.tasks.push(task);
        this.save();
        this.addName.value = "";
        this.selDay = time.split('T')[0];
        this.nav('inicio', document.querySelectorAll('.tab-icon')[0]);
    }

    toggle(id) {
        const t = this.tasks.find(x => x.id === id);
        if(t) { t.done = !t.done; this.save(); this.renderTasks(); this.updateStats(); }
    }

    renderTasks() {
        if(!this.homeList) return;
        const daily = this.tasks.filter(t => t.time.startsWith(this.selDay));
        
        this.homeList.innerHTML = daily.sort((a,b) => new Date(a.time) - new Date(b.time)).map(t => `
            <div class="task-item ${t.done ? 'done' : ''}" onclick="z.toggle(${t.id})">
                <div class="task-check"></div>
                <div class="task-info">
                    <p>${new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${t.cat.toUpperCase()}</p>
                    <h4>${t.name}</h4>
                </div>
                <i class="fas fa-trash" style="margin-left:auto; color:#eee;" onclick="event.stopPropagation(); z.delTask(${t.id})"></i>
            </div>
        `).join('') || '<div style="text-align:center; padding:50px; color:#ccc;">No hay misiones programadas para este día.</div>';
    }

    delTask(id) {
        if(confirm("¿Eliminar esta misión de tu agenda?")) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.save();
            this.renderTasks();
            this.updateStats();
        }
    }

    // --- CHECKLIST / MERCADO ---
    addCheck() {
        const text = this.inCheck.value.trim();
        if(!text) return;
        this.checks.push({ id: Date.now(), text, done: false });
        this.save();
        this.inCheck.value = "";
        this.renderChecks();
    }

    toggleCheck(id) {
        const c = this.checks.find(x => x.id === id);
        if(c) { c.done = !c.done; this.save(); this.renderChecks(); }
    }

    delCheck(id) {
        this.checks = this.checks.filter(x => x.id !== id);
        this.save();
        this.renderChecks();
    }

    renderChecks() {
        if(!this.checkList) return;
        this.checkList.innerHTML = this.checks.map(c => `
            <div class="task-item ${c.done ? 'done' : ''}" onclick="z.toggleCheck(${c.id})">
                <div class="task-check"></div>
                <div style="flex:1;"><h4 style="font-size:1rem;">${c.text}</h4></div>
                <i class="fas fa-trash" style="color:#eee;" onclick="event.stopPropagation(); z.delCheck(${c.id})"></i>
            </div>
        `).join('') || '<div style="text-align:center; padding:30px; color:#ccc;">La lista está vacía.</div>';
    }

    save() { 
        localStorage.setItem('zu_tasks', JSON.stringify(this.tasks)); 
        localStorage.setItem('zu_checks', JSON.stringify(this.checks)); 
    }

    // --- ESTADÍSTICAS ---
    updateStats() {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayTasks = this.tasks.filter(t => t.time.startsWith(todayStr));
        const done = todayTasks.filter(t => t.done).length;
        const pct = todayTasks.length > 0 ? (done / todayTasks.length) * 100 : 0;

        if(this.mainPct) this.mainPct.innerText = `${Math.round(pct)}%`;

        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() + 1); // Lunes

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

    // --- NOTIFICACIONES ---
    askPerms() { if ('Notification' in window) Notification.requestPermission(); }
    notifyLoop() {
        setInterval(() => {
            const now = new Date();
            this.tasks.forEach(t => {
                const tDate = new Date(t.time);
                const diff = (tDate - now) / 1000 / 60;
                if(!t.done && !t.notified && diff > 0 && diff <= 5) {
                    if(Notification.permission === 'granted') {
                        new Notification("Z-Core ULTIMATE", { body: `Misión en 5 min: ${t.name}` });
                        t.notified = true;
                        this.save();
                    }
                }
            });
        }, 30000);
    }

    // --- BASE DE DATOS ---
    export() {
        const data = { tasks: this.tasks, checks: this.checks, notes: this.notes };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup_zcore.json`;
        a.click();
    }
    import(e) {
        const r = new FileReader();
        r.onload = (ev) => {
            const d = JSON.parse(ev.target.result);
            localStorage.setItem('zu_tasks', JSON.stringify(d.tasks));
            localStorage.setItem('zu_checks', JSON.stringify(d.checks));
            localStorage.setItem('zu_notes_html', d.notes);
            location.reload();
        };
        r.readAsText(e.target.files[0]);
    }
    wipe() { if(confirm("¿Deseas borrar TODOS los datos? Esta acción es irreversible.")) { localStorage.clear(); location.reload(); } }
}

const z = new ZCoreUltimate();
window.z = z;
