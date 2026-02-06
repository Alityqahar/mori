const dateChip = document.getElementById("dateChip");
        const today = new Date();
        dateChip.textContent = today.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
        });

        /* ---------- Task Manager ---------- */
        const taskForm = document.getElementById("taskForm");
        const taskTitle = document.getElementById("taskTitle");
        const taskDue = document.getElementById("taskDue");
        const taskList = document.getElementById("taskList");
        const STORAGE_KEY = "mori.tasks.v1";

        let tasks = loadTasks();

        function loadTasks() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn("Gagal memuat tasks:", e);
            return [];
        }
        }

        function saveTasks() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        }

        function relativeDateLabel(dateStr) {
        const today = new Date();
        const target = new Date(dateStr + "T00:00:00");
        const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
        if (isNaN(diff)) return "Tanpa tanggal";
        if (diff === 0) return "Hari ini";
        if (diff === 1) return "Besok";
        if (diff < 0) return `${Math.abs(diff)} hari lalu`;
        return `Dalam ${diff} hari`;
        }

        function sortTasks() {
        tasks.sort((a, b) => {
            const da = new Date(a.due).getTime();
            const db = new Date(b.due).getTime();
            return da - db;
        });
        }

        function renderTasks() {
        sortTasks();
        taskList.innerHTML = "";
        if (!tasks.length) {
            taskList.innerHTML = '<div class="empty">Daftar tugas kosong. Tambahkan satu dan mulai fokus.</div>';
            return;
        }

        const frag = document.createDocumentFragment();
        tasks.forEach((task) => {
            const item = document.createElement("div");
            item.className = "task-item" + (task.done ? " completed" : "");
            item.dataset.id = task.id;

            const label = document.createElement("label");
            label.className = "check";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = task.done;
            const box = document.createElement("span");
            box.className = "box";
            box.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            label.append(checkbox, box);

            const body = document.createElement("div");
            body.className = "task-body";
            const title = document.createElement("div");
            title.className = "task-title";
            title.textContent = task.title;
            const meta = document.createElement("div");
            meta.className = "task-meta";
            const due = document.createElement("span");
            const overdue = new Date(task.due) < new Date(today.toDateString());
            due.className = "pill" + (overdue && !task.done ? " danger" : "");
            due.textContent = relativeDateLabel(task.due);
            const dateText = document.createElement("span");
            dateText.textContent = new Date(task.due + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" });
            meta.append(due, dateText);
            body.append(title, meta);

            const del = document.createElement("button");
            del.className = "delete";
            del.innerHTML = "&times;";
            del.title = "Hapus tugas";

            item.append(label, body, del);
            frag.appendChild(item);
        });
        taskList.appendChild(frag);
        }

        taskForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = taskTitle.value.trim();
        const due = taskDue.value;
        if (!title || !due) return;
        tasks.push({
            id: crypto.randomUUID(),
            title,
            due,
            done: false,
            createdAt: Date.now()
        });
        saveTasks();
        renderTasks();
        taskForm.reset();
        taskTitle.focus();
        });

        taskList.addEventListener("click", (e) => {
        const id = e.target.closest(".task-item")?.dataset.id;
        if (!id) return;
        if (e.target.matches("input[type='checkbox']")) {
            tasks = tasks.map((t) => (t.id === id ? { ...t, done: e.target.checked } : t));
            saveTasks();
            renderTasks();
        }
        if (e.target.closest(".delete")) {
            tasks = tasks.filter((t) => t.id !== id);
            saveTasks();
            renderTasks();
        }
        });

        renderTasks();

        /* ---------- Pomodoro & Stopwatch ---------- */
        const tabButtons = document.querySelectorAll(".tab-btn");
        const tabPanels = document.querySelectorAll(".tab-panel");
        const timeDisplay = document.getElementById("timeDisplay");
        const modeLabel = document.getElementById("modeLabel");
        const startBtn = document.getElementById("startBtn");
        const switchBtn = document.getElementById("switchBtn");
        const resetBtn = document.getElementById("resetBtn");
        const workInput = document.getElementById("workInput");
        const breakInput = document.getElementById("breakInput");
        const ring = document.getElementById("ring");
        const alarmToggle = document.getElementById("alarmToggle");
        const ambientToggle = document.getElementById("ambientToggle");
        const stopwatchDisplay = document.getElementById("stopwatchDisplay");
        const stopwatchStartBtn = document.getElementById("stopwatchStart");
        const stopwatchResetBtn = document.getElementById("stopwatchReset");
        const stopwatchRing = document.getElementById("stopwatchRing");
        const stopwatchLabel = document.getElementById("stopwatchLabel");
        const reportTotal = document.getElementById("reportTotal");
        const reportPomodoro = document.getElementById("reportPomodoro");
        const reportStopwatch = document.getElementById("reportStopwatch");
        const reportUpdated = document.getElementById("reportUpdated");

        tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.tab;
            tabButtons.forEach((b) => {
            const active = b === btn;
            b.classList.toggle("active", active);
            b.setAttribute("aria-selected", active ? "true" : "false");
            });
            tabPanels.forEach((panel) => {
            panel.classList.toggle("active", panel.id === target);
            });
        });
        });

        // Audio elements
        const alarmAudio = new Audio("assets/alarm.mp3");
        const ambientAudio = new Audio("assets/ambient.mp3");
        ambientAudio.loop = true;
        alarmAudio.volume = 0.5; // 2x lipat volume

        // Modal elements
        const alarmModal = document.getElementById("alarmModal");
        const confirmAlarmBtn = document.getElementById("confirmAlarm");
        const alarmMessage = document.getElementById("alarmMessage");

        let mode = "work";
        let isRunning = false;
        let isModalWaiting = false;
        let remaining = 25 * 60;
        let timerId = null;
        let durations = {
        work: 25 * 60,
        break: 5 * 60,
        };
        let stopwatchSeconds = 0;
        let stopwatchRunning = false;
        let stopwatchId = null;

        const STUDY_LOG_KEY = "mori.study.log.v1";
        let studyLog = loadStudyLog();

        function loadStudyLog() {
        try {
            const saved = localStorage.getItem(STUDY_LOG_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.warn("Gagal memuat log belajar:", e);
            return {};
        }
        }

        function saveStudyLog() {
        localStorage.setItem(STUDY_LOG_KEY, JSON.stringify(studyLog));
        }

        function todayKey() {
        const d = new Date();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${d.getFullYear()}-${m}-${day}`;
        }

        function ensureTodayEntry() {
        const key = todayKey();
        if (!studyLog[key]) {
            studyLog[key] = { pomodoro: 0, stopwatch: 0 };
        }
        return studyLog[key];
        }

        function formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = Math.floor(seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
        }

        function formatHMS(seconds) {
        const total = Math.max(0, Math.floor(seconds));
        const h = Math.floor(total / 3600).toString().padStart(2, "0");
        const m = Math.floor((total % 3600) / 60).toString().padStart(2, "0");
        const s = Math.floor(total % 60).toString().padStart(2, "0");
        return `${h}:${m}:${s}`;
        }

        function formatDurationLabel(seconds) {
        const total = Math.max(0, Math.floor(seconds));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        if (h > 0) return `${h}j ${m.toString().padStart(2, "0")}m`;
        if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}dtk`;
        return `${s}dtk`;
        }

        function renderReport() {
        const entry = ensureTodayEntry();
        const total = (entry.pomodoro || 0) + (entry.stopwatch || 0);
        reportTotal.textContent = formatDurationLabel(total);
        reportPomodoro.textContent = `Pomodoro: ${formatDurationLabel(entry.pomodoro || 0)}`;
        reportStopwatch.textContent = `Stopwatch: ${formatDurationLabel(entry.stopwatch || 0)}`;
        const now = new Date();
        reportUpdated.textContent = `Hari ini (${now.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
        })})`;
        }

        function addStudySeconds(source, seconds) {
        if (seconds <= 0) return;
        const entry = ensureTodayEntry();
        entry[source] = (entry[source] || 0) + seconds;
        saveStudyLog();
        renderReport();
        }

        function updateRing() {
        const total = durations[mode] || 1;
        const progress = Math.max(0, remaining) / total;
        const deg = progress * 360;
        ring.style.background = `conic-gradient(#6f9a75 ${deg}deg, #d9e7d1 ${deg}deg)`;
        }

        function updateTimerUI() {
        timeDisplay.textContent = formatTime(remaining);
        modeLabel.textContent = mode === "work" ? "Sesi fokus" : "Istirahat singkat";
        switchBtn.textContent = mode === "work" ? "Ke Istirahat" : "Ke Fokus";
        startBtn.textContent = isRunning ? "Jeda" : "Mulai";
        updateRing();
        }

        function beep() {
        if (!alarmToggle.classList.contains("active")) return;
        alarmAudio.currentTime = 0;
        alarmAudio.play().catch(e => console.warn("Gagal memutar alarm:", e));
        showAlarmModal();
        pauseTimer();
        isModalWaiting = true;
        }

        function showAlarmModal() {
        const title = mode === "work" ? "⏰ Waktu Istirahat!" : "⏰ Istirahat Selesai!";
        const message = mode === "work" 
            ? "Sesi fokus Anda telah selesai. Ambil waktu untuk istirahat."
            : "Istirahat Anda sudah cukup. Siap untuk sesi fokus berikutnya?";
        
        alarmModal.querySelector("h3").textContent = title;
        alarmMessage.textContent = message;
        alarmModal.classList.add("active");
        }

        function closeAlarmModal() {
        alarmModal.classList.remove("active");
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
        isModalWaiting = false;
        
        // Lanjutkan ke mode berikutnya dan mulai timer
        const nextMode = mode === "work" ? "break" : "work";
        switchMode(nextMode);
        remaining = durations[nextMode];
        updateTimerUI();
        startTimer();
        }

        let ambientCtx = null;
        let ambientNodes = [];

        function startAmbient() {
        ambientAudio.play().catch(e => console.warn("Gagal memutar musik alam:", e));
        }

        function stopAmbient() {
        ambientAudio.pause();
        ambientAudio.currentTime = 0;
        }

        function switchMode(next) {
        mode = next;
        remaining = durations[mode];
        updateTimerUI();
        }

        function tick() {
        if (mode === "work") {
            addStudySeconds("pomodoro", 1);
        }
        remaining -= 1;
        if (remaining <= 0) {
            beep();
        }
        updateTimerUI();
        }

        function startTimer() {
        if (isModalWaiting) return;
        if (isRunning) {
            pauseTimer();
            return;
        }
        if (stopwatchRunning) {
            pauseStopwatch();
        }
        isRunning = true;
        timerId = setInterval(tick, 1000);
        updateTimerUI();
        }

        function pauseTimer() {
        isRunning = false;
        clearInterval(timerId);
        timerId = null;
        updateTimerUI();
        }

        function resetTimer() {
        pauseTimer();
        remaining = durations[mode];
        updateTimerUI();
        }

        function updateStopwatchRing() {
        const cycle = 3600;
        const progress = (stopwatchSeconds % cycle) / cycle;
        const deg = progress * 360;
        stopwatchRing.style.background = `conic-gradient(#6f9a75 ${deg}deg, #d9e7d1 ${deg}deg)`;
        }

        function updateStopwatchUI() {
        stopwatchDisplay.textContent = formatHMS(stopwatchSeconds);
        const paused = stopwatchSeconds > 0 && !stopwatchRunning;
        stopwatchLabel.textContent = stopwatchRunning ? "Sedang berjalan" : paused ? "Stopwatch dijeda" : "Stopwatch siap";
        stopwatchStartBtn.textContent = stopwatchRunning ? "Jeda" : "Mulai";
        updateStopwatchRing();
        }

        function tickStopwatch() {
        stopwatchSeconds += 1;
        addStudySeconds("stopwatch", 1);
        updateStopwatchUI();
        }

        function startStopwatch() {
        if (stopwatchRunning) {
            pauseStopwatch();
            return;
        }
        if (isRunning) {
            pauseTimer();
        }
        stopwatchRunning = true;
        stopwatchId = setInterval(tickStopwatch, 1000);
        updateStopwatchUI();
        }

        function pauseStopwatch() {
        stopwatchRunning = false;
        clearInterval(stopwatchId);
        stopwatchId = null;
        updateStopwatchUI();
        }

        function resetStopwatch() {
        pauseStopwatch();
        stopwatchSeconds = 0;
        updateStopwatchUI();
        }

        startBtn.addEventListener("click", startTimer);
        switchBtn.addEventListener("click", () => {
        switchMode(mode === "work" ? "break" : "work");
        resetTimer();
        });
        resetBtn.addEventListener("click", resetTimer);
        stopwatchStartBtn.addEventListener("click", startStopwatch);
        stopwatchResetBtn.addEventListener("click", resetStopwatch);

        workInput.addEventListener("change", () => {
        const minutes = Math.min(120, Math.max(0.1, Number(workInput.value) || 25));
        workInput.value = minutes;
        durations.work = minutes * 60;
        if (mode === "work" && !isRunning) {
            remaining = durations.work;
            updateTimerUI();
        }
        });

        breakInput.addEventListener("change", () => {
        const minutes = Math.min(60, Math.max(0.1, Number(breakInput.value) || 5));
        breakInput.value = minutes;
        durations.break = minutes * 60;
        if (mode === "break" && !isRunning) {
            remaining = durations.break;
            updateTimerUI();
        }
        });

        alarmToggle.addEventListener("click", () => {
        alarmToggle.classList.toggle("active");
        alarmToggle.textContent = alarmToggle.classList.contains("active") ? "Alarm aktif" : "Alarm mati";
        });

        ambientToggle.addEventListener("click", async () => {
        const willPlay = !ambientToggle.classList.contains("active");
        ambientToggle.classList.toggle("active");
        ambientToggle.textContent = willPlay ? "Musik on" : "Musik off";
        if (willPlay) {
            try {
            await startAmbient();
            } catch (e) {
            console.warn("Audio context diblokir:", e);
            }
        } else {
            stopAmbient();
        }
        });

        confirmAlarmBtn.addEventListener("click", closeAlarmModal);

        updateTimerUI();
        updateStopwatchUI();
        renderReport();

        /* ---------- Quotes ---------- */
        const quotes = [
        { text: "Perlahan itu juga maju, asal tidak berhenti.", author: "Unknown" },
        { text: "Fokus adalah kebaikan terbesar bagi waktu.", author: "James Clear" },
        { text: "Ketika belajar terasa berat, kecilkan langkahnya, lanjutkan jalannya.", author: "Mori no Time" },
        { text: "Ketenangan bukan absen suara, tapi hadirnya kejelasan.", author: "Thomas à Kempis" },
        { text: "Satu halaman per hari mengalahkan niat seribu halaman besok.", author: "Unknown" },
        { text: "Istirahat adalah bagian dari strategi, bukan kemewahan.", author: "Alex Soojung-Kim Pang" },
        { text: "Kerjakan yang paling penting saat energi paling tinggi.", author: "Cal Newport" },
        { text: "Belajar adalah berteman dengan rasa ingin tahu.", author: "Carl Sagan" },
        { text: "Progress kecil konsisten lebih kuat dari ledakan singkat.", author: "James Clear" },
        { text: "Tenang adalah kecepatan yang stabil.", author: "Unknown" },
        { text: "Beri dirimu izin untuk lambat, tapi tidak untuk berhenti.", author: "Unknown" },
        { text: "Konsentrasi tumbuh di tempat yang rapi dan bernapas.", author: "Mori no Time" },
        ];

        const quoteText = document.getElementById("quoteText");
        const quoteAuthor = document.getElementById("quoteAuthor");
        const quoteMeta = document.getElementById("quoteMeta");

        function dayOfYear(d) {
        const start = new Date(d.getFullYear(), 0, 0);
        const diff = d - start + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
        }

        function setQuote() {
        const idx = dayOfYear(new Date()) % quotes.length;
        const q = quotes[idx];
        quoteText.classList.add("fade");
        setTimeout(() => {
            quoteText.textContent = `"${q.text}"`;
            quoteAuthor.textContent = `— ${q.author}`;
            quoteText.classList.remove("fade");
        }, 300);
        quoteMeta.textContent = "Diperbarui: " + today.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
        }

        setQuote();
