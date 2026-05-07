class LifeOptimizerPro {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('optimizer_tasks')) || [];
        this.items = JSON.parse(localStorage.getItem('optimizer_items')) || [];
        this.notes = localStorage.getItem('optimizer_notes') || "";
        
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.renderCalendar();
        this.renderHomeTasks();
        this.renderItems();
        this.loadNotes();
        this.checkPermissions();
    }

    cacheDOM() {
        this.homeTaskList = document.getElementById('home-task-list');
        this.itemsList = document.getElementById('items-list');
        this.notesArea = document.getElementById('notes-area');
        this.taskName = document.getElementById('task-name');
        this.taskDateTime = document.getElementById('task-datetime');
        this.taskCategory = document.getElementById('task-category');
        this.taskNote = document.getElementById('task-note');
        this.itemInput = document.getElementById('item-input');
    }

    bindEvents() {
        this.notesArea.addEventListener('input', () => {
            this.notes = this.notesArea.value;
            localStorage.setItem('optimizer_notes', this.notes);
        });
    }

    // --- NAVIGATION ---
    switchTab(tabId, btn) {
        document.querySelectorAll('.tab-content').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        
        document.getElementById(`page-${tabId}`).classList.remove('hidden');
        btn.classList.add('active');

        if (tabId === 'home') this.renderHomeTasks();
    }

    toggleHomeFilter(type, btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderHomeTasks(type);
    }

    // --- CALENDAR ---
    renderCalendar() {
        const strip = document.getElementById('calendar-strip');
        const now = new Date();
        const days = [];
        for (let i = -2; i <= 4; i++) {
            const d = new Date();
            d.setDate(now.getDate() + i);
            days.push(d);
        }

        strip.innerHTML = days.map(d => `
            <div class="cal-day ${d.getDate() === now.getDate() ? 'active' : ''}" onclick="zCore.selectDate(${d.getTime()})">
                <span style="font-size: 0.7rem; color: #888;">${d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span>
                <span style="font-size: 1rem; font-weight: 700;">${d.getDate()}</span>
                <div class="dot"></div>
            </div>
        `).join('');

        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        document.getElementById('display-month').innerText = months[now.getMonth()];
    }

    selectDate(ts) {
        const d = new Date(ts);
        this.taskDateTime.value = d.toISOString().split('T')[0] + "T09:00";
        this.switchTab('add', document.querySelectorAll('.nav-item')[1]);
    }

    // --- TASK LOGIC ---
    addTask() {
        const name = this.taskName.value.trim();
        const time = this.taskDateTime.value;
        if (!name || !time) return alert("Por favor completa el nombre y la fecha.");

        const task = {
            id: Date.now(),
            name,
            time,
            category: this.taskCategory.value,
            note: this.taskNote.value,
            completed: false,
            created: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.taskName.value = "";
        this.taskNote.value = "";
        this.switchTab('home', document.querySelectorAll('.nav-item')[0]);
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderHomeTasks();
        }
    }

    saveTasks() { localStorage.setItem('optimizer_tasks', JSON.stringify(this.tasks)); }

    renderHomeTasks(filter = 'all') {
        let filtered = this.tasks;
        if (filter === 'new') {
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            filtered = this.tasks.filter(t => new Date(t.created).getTime() > oneHourAgo);
        }

        this.homeTaskList.innerHTML = filtered.sort((a,b) => new Date(a.time) - new Date(b.time)).map(t => `
            <div class="card ${t.completed ? 'card-white' : 'card-black'}" onclick="zCore.toggleTask(${t.id})" style="opacity: ${t.completed ? 0.6 : 1}">
                <div class="task-card-header">
                    <span class="task-time">${new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <i class="fas ${t.completed ? 'fa-check-circle' : 'fa-circle'}" style="color: ${t.completed ? '#4cd137' : '#ff0080'}"></i>
                </div>
                <h2 class="task-title">${t.name}</h2>
                <p style="font-size: 0.8rem; opacity: 0.7;">${t.category.toUpperCase()}</p>
            </div>
        `).join('') || '<p style="text-align:center; color:#888;">No hay tareas programadas.</p>';
    }

    // --- ITEMS LOGIC ---
    addItem() {
        const text = this.itemInput.value.trim();
        if (!text) return;
        this.items.push({ id: Date.now(), text, done: false });
        this.saveItems();
        this.itemInput.value = "";
        this.renderItems();
    }

    toggleItem(id) {
        const item = this.items.find(i => i.id === id);
        if (item) { item.done = !item.done; this.saveItems(); this.renderItems(); }
    }

    deleteItem(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.saveItems();
        this.renderItems();
    }

    renderItems() {
        this.itemsList.innerHTML = this.items.map(i => `
            <div class="card card-white" style="padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                <span onclick="zCore.toggleItem(${i.id})" style="text-decoration: ${i.done ? 'line-through' : 'none'}; cursor: pointer;">
                    ${i.text}
                </span>
                <i class="fas fa-trash" onclick="zCore.deleteItem(${i.id})" style="color: #ff3b30; cursor: pointer;"></i>
            </div>
        `).join('');
    }

    saveItems() { localStorage.setItem('optimizer_items', JSON.stringify(this.items)); }

    loadNotes() { this.notesArea.value = this.notes; }

    // --- BACKUP LOGIC ---
    exportDB() {
        const data = {
            tasks: this.tasks,
            items: this.items,
            notes: this.notes
        };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_optimizer_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }

    importDB(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.tasks) localStorage.setItem('optimizer_tasks', JSON.stringify(data.tasks));
                if (data.items) localStorage.setItem('optimizer_items', JSON.stringify(data.items));
                if (data.notes) localStorage.setItem('optimizer_notes', data.notes);
                alert("¡Restauración exitosa!");
                location.reload();
            } catch (err) { alert("Archivo de backup no válido."); }
        };
        reader.readAsText(file);
    }

    wipeDB() {
        if (confirm("¿Seguro que quieres borrar TODO? Esta acción no se puede deshacer.")) {
            localStorage.clear();
            location.reload();
        }
    }

    checkPermissions() { if ('Notification' in window) Notification.requestPermission(); }
}

const zCore = new LifeOptimizerPro();
window.zCore = zCore;
