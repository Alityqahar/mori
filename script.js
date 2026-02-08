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
        const diff = Math.round((target - today) / (1000 * 60 * 60 * 24))+1;
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
        const defaultTitle = "Mori no Time — Soft focus, inspired by Ghibli forests";

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

        // Audio elements dengan loop otomatis
        const alarmAudio = new Audio("assets/alarm.mp3");
        const ambientAudio = new Audio("assets/ambient.mp3");
        ambientAudio.loop = true; // Loop otomatis
        alarmAudio.volume = 0.5;
        ambientAudio.volume = 0.6;

        // Tambahkan event listener untuk memastikan loop berfungsi
        ambientAudio.addEventListener('ended', function() {
            if (ambientToggle.classList.contains("active")) {
                this.currentTime = 0;
                this.play().catch(e => console.warn("Gagal loop musik:", e));
            }
        });

        // Modal elements
        const alarmModal = document.getElementById("alarmModal");
        const confirmAlarmBtn = document.getElementById("confirmAlarm");
        const alarmMessage = document.getElementById("alarmMessage");

        let mode = "work";
        let isRunning = false;
        let isStopwatchRunning = false;
        let isModalWaiting = false;
        let remaining = 25 * 60;
        let stopwatchSeconds = 0;
        
        // Timestamp-based timing untuk akurasi
        let timerStartTimestamp = null;
        let timerPausedRemaining = null; // Untuk menyimpan waktu tersisa saat pause
        let stopwatchStartTimestamp = null;
        let stopwatchPausedSeconds = 0; // Untuk menyimpan waktu tersisa saat pause
        let animationFrameId = null;
        let lastRecordedSecond = -1; // Tracking untuk mencegah double-count
        
        // Interval untuk update title (bekerja di background)
        let titleUpdateInterval = null;
        let backgroundUpdateInterval = null;
        
        let durations = {
            work: 25 * 60,
            break: 5 * 60,
        };

        // State persistence key
        const TIMER_STATE_KEY = "mori.timer.state.v1";

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

        // Timer state persistence
        function saveTimerState() {
        const state = {
            mode,
            isRunning,
            isStopwatchRunning,
            remaining,
            stopwatchSeconds,
            timerStartTimestamp,
            timerPausedRemaining,
            stopwatchStartTimestamp,
            stopwatchPausedSeconds,
            durations,
            timestamp: Date.now()
        };
        localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
        }

        function loadTimerState() {
        try {
            const saved = localStorage.getItem(TIMER_STATE_KEY);
            if (!saved) return null;
            
            const state = JSON.parse(saved);
            const now = Date.now();
            
            // Jika lebih dari 1 menit, abaikan state lama
            if (now - state.timestamp > 60000) {
                localStorage.removeItem(TIMER_STATE_KEY);
                return null;
            }
            
            return state;
        } catch (e) {
            console.warn("Gagal memuat timer state:", e);
            return null;
        }
        }

        function clearTimerState() {
        localStorage.removeItem(TIMER_STATE_KEY);
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

        function updateDocumentTitle() {
        let titleText = defaultTitle;
        
        if (isRunning && timerStartTimestamp) {
            // Hitung remaining berdasarkan timestamp real-time
            const now = Date.now();
            const elapsed = Math.floor((now - timerStartTimestamp) / 1000);
            const currentRemaining = (timerPausedRemaining !== null ? timerPausedRemaining : durations[mode]) - elapsed;
            const displayRemaining = Math.max(0, currentRemaining);
            titleText = `${formatTime(displayRemaining)} - Pomodoro - Mori no Time`;
        } else if (isStopwatchRunning && stopwatchStartTimestamp) {
            // Hitung stopwatch berdasarkan timestamp real-time
            const now = Date.now();
            const elapsed = Math.floor((now - stopwatchStartTimestamp) / 1000);
            const currentSeconds = stopwatchPausedSeconds + elapsed;
            titleText = `${formatHMS(currentSeconds)} - Stopwatch - Mori no Time`;
        }
        
        document.title = titleText;
        }

        // Fungsi untuk update title di background (bekerja saat tab tidak aktif)
        function startTitleUpdates() {
        if (titleUpdateInterval) {
            clearInterval(titleUpdateInterval);
        }
        
        // Update setiap 500ms untuk smooth countdown di title
        titleUpdateInterval = setInterval(() => {
            if (isRunning || isStopwatchRunning) {
                updateDocumentTitle();
                saveTimerState(); // Save state untuk recovery
            }
        }, 500);
        }

        function stopTitleUpdates() {
        if (titleUpdateInterval) {
            clearInterval(titleUpdateInterval);
            titleUpdateInterval = null;
        }
        document.title = defaultTitle;
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
        updateDocumentTitle();
        }

        function beep() {
        if (!alarmToggle.classList.contains("active")) return;
        alarmAudio.currentTime = 0;
        alarmAudio.play().catch(e => console.warn("Gagal memutar alarm:", e));
        showAlarmModal();
        stopTimerLoop();
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
        
        // Switch ke mode berikutnya dan mulai timer otomatis
        const nextMode = mode === "work" ? "break" : "work";
        switchMode(nextMode);
        remaining = durations[nextMode];
        updateTimerUI();
        startTimerLoop();
        }

        function startAmbient() {
        return ambientAudio.play().catch(e => {
            console.warn("Gagal memutar musik alam:", e);
            throw e;
        });
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

        function resetTimer() {
        stopTimerLoop();
        remaining = durations[mode];
        timerPausedRemaining = null;
        clearTimerState();
        updateTimerUI();
        }

        // Timestamp-based timer loop (mencegah drift waktu)
        function timerLoop() {
        if (!isRunning) return;

        const now = Date.now();
        const elapsed = Math.floor((now - timerStartTimestamp) / 1000);
        const newRemaining = (timerPausedRemaining !== null ? timerPausedRemaining : durations[mode]) - elapsed;

        // Cek apakah timer selesai
        if (newRemaining <= 0) {
            remaining = 0;
            updateTimerUI();
            beep();
            return;
        }

        remaining = newRemaining;
        
        // Tambah study seconds hanya 1x per detik untuk mode work
        if (elapsed !== lastRecordedSecond && mode === "work") {
            addStudySeconds("pomodoro", 1);
            lastRecordedSecond = elapsed;
        }

        updateTimerUI();
        animationFrameId = requestAnimationFrame(timerLoop);
        }

        function startTimerLoop() {
        if (isModalWaiting) return;
        
        // Toggle pause/resume
        if (isRunning) {
            stopTimerLoop();
            return;
        }
        
        // Hentikan stopwatch jika sedang berjalan
        if (isStopwatchRunning) {
            stopStopwatchLoop();
        }
        
        isRunning = true;
        
        // Set timestamp berdasarkan apakah ini resume atau start baru
        if (timerPausedRemaining !== null) {
            // Resume dari pause
            timerStartTimestamp = Date.now();
            lastRecordedSecond = -1;
        } else {
            // Start baru
            timerStartTimestamp = Date.now();
            timerPausedRemaining = remaining;
            lastRecordedSecond = -1;
        }
        
        animationFrameId = requestAnimationFrame(timerLoop);
        startTitleUpdates(); // Mulai update title
        updateTimerUI();
        }

        function stopTimerLoop() {
        isRunning = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        // Simpan waktu tersisa untuk resume
        timerPausedRemaining = remaining;
        timerStartTimestamp = null;
        lastRecordedSecond = -1;
        stopTitleUpdates(); // Hentikan update title
        clearTimerState(); // Clear state saat stop
        updateTimerUI();
        }

        // Stopwatch timestamp-based loop
        function stopwatchLoop() {
        if (!isStopwatchRunning) return;

        const now = Date.now();
        const elapsed = Math.floor((now - stopwatchStartTimestamp) / 1000);
        stopwatchSeconds = stopwatchPausedSeconds + elapsed;

        // Tambah study seconds hanya 1x per detik
        const currentSecond = stopwatchSeconds;
        if (currentSecond !== lastRecordedSecond) {
            addStudySeconds("stopwatch", 1);
            lastRecordedSecond = currentSecond;
        }

        updateStopwatchUI();
        animationFrameId = requestAnimationFrame(stopwatchLoop);
        }

        function updateStopwatchRing() {
        const cycle = 3600; // 1 jam cycle
        const progress = (stopwatchSeconds % cycle) / cycle;
        const deg = progress * 360;
        stopwatchRing.style.background = `conic-gradient(#6f9a75 ${deg}deg, #d9e7d1 ${deg}deg)`;
        }

        function updateStopwatchUI() {
        stopwatchDisplay.textContent = formatHMS(stopwatchSeconds);
        const paused = stopwatchSeconds > 0 && !isStopwatchRunning;
        stopwatchLabel.textContent = isStopwatchRunning ? "Sedang berjalan" : paused ? "Stopwatch dijeda" : "Stopwatch siap";
        stopwatchStartBtn.textContent = isStopwatchRunning ? "Jeda" : "Mulai";
        updateStopwatchRing();
        updateDocumentTitle();
        }

        function startStopwatchLoop() {
        // Toggle pause/resume
        if (isStopwatchRunning) {
            stopStopwatchLoop();
            return;
        }
        
        // Hentikan pomodoro timer jika sedang berjalan
        if (isRunning) {
            stopTimerLoop();
        }
        
        isStopwatchRunning = true;
        stopwatchStartTimestamp = Date.now();
        lastRecordedSecond = stopwatchSeconds - 1; // Set agar detik pertama langsung tercatat
        animationFrameId = requestAnimationFrame(stopwatchLoop);
        startTitleUpdates(); // Mulai update title
        updateStopwatchUI();
        }

        function stopStopwatchLoop() {
        isStopwatchRunning = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        // Simpan waktu tersisa untuk resume
        stopwatchPausedSeconds = stopwatchSeconds;
        stopwatchStartTimestamp = null;
        stopTitleUpdates(); // Hentikan update title
        clearTimerState(); // Clear state saat stop
        updateStopwatchUI();
        }

        function resetStopwatch() {
        stopStopwatchLoop();
        stopwatchSeconds = 0;
        stopwatchPausedSeconds = 0;
        lastRecordedSecond = -1;
        updateStopwatchUI();
        }

        startBtn.addEventListener("click", startTimerLoop);
        switchBtn.addEventListener("click", () => {
        switchMode(mode === "work" ? "break" : "work");
        resetTimer();
        });
        resetBtn.addEventListener("click", resetTimer);
        stopwatchStartBtn.addEventListener("click", startStopwatchLoop);
        stopwatchResetBtn.addEventListener("click", resetStopwatch);

        workInput.addEventListener("change", () => {
        const minutes = Math.min(120, Math.max(0.1, Number(workInput.value) || 25));
        workInput.value = minutes;
        durations.work = minutes * 60;
        if (mode === "work" && !isRunning) {
            remaining = durations.work;
            timerPausedRemaining = null;
            updateTimerUI();
        }
        });

        breakInput.addEventListener("change", () => {
        const minutes = Math.min(60, Math.max(0.1, Number(breakInput.value) || 5));
        breakInput.value = minutes;
        durations.break = minutes * 60;
        if (mode === "break" && !isRunning) {
            remaining = durations.break;
            timerPausedRemaining = null;
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
            // Revert toggle jika gagal
            ambientToggle.classList.remove("active");
            ambientToggle.textContent = "Musik off";
            }
        } else {
            stopAmbient();
        }
        });

        confirmAlarmBtn.addEventListener("click", closeAlarmModal);

        // Cleanup on page unload
        window.addEventListener("beforeunload", () => {
        stopTimerLoop();
        stopStopwatchLoop();
        stopAmbient();
        stopTitleUpdates();
        });

        // Page Visibility API - update lebih agresif saat tab tidak aktif
        document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            // Tab tidak aktif - title update tetap jalan via setInterval
            console.log("Tab hidden - title updates continue");
        } else {
            // Tab aktif kembali - sync state dan update UI
            console.log("Tab visible - syncing state");
            if (isRunning && timerStartTimestamp) {
                // Re-calculate remaining berdasarkan timestamp
                const now = Date.now();
                const elapsed = Math.floor((now - timerStartTimestamp) / 1000);
                const newRemaining = (timerPausedRemaining !== null ? timerPausedRemaining : durations[mode]) - elapsed;
                remaining = Math.max(0, newRemaining);
                
                if (remaining <= 0 && !isModalWaiting) {
                    beep();
                } else {
                    updateTimerUI();
                }
            }
            
            if (isStopwatchRunning && stopwatchStartTimestamp) {
                // Re-calculate stopwatch berdasarkan timestamp
                const now = Date.now();
                const elapsed = Math.floor((now - stopwatchStartTimestamp) / 1000);
                stopwatchSeconds = stopwatchPausedSeconds + elapsed;
                updateStopwatchUI();
            }
        }
        });

        // Recovery state saat page load
        function recoverTimerState() {
        const savedState = loadTimerState();
        if (!savedState) return;
        
        // Restore state
        mode = savedState.mode;
        durations = savedState.durations;
        
        // Update inputs
        workInput.value = durations.work / 60;
        breakInput.value = durations.break / 60;
        
        const now = Date.now();
        const timeSinceLastUpdate = now - savedState.timestamp;
        
        // Jika timer sedang running
        if (savedState.isRunning && savedState.timerStartTimestamp) {
            const totalElapsed = Math.floor((now - savedState.timerStartTimestamp) / 1000);
            const newRemaining = (savedState.timerPausedRemaining !== null ? savedState.timerPausedRemaining : savedState.durations[savedState.mode]) - totalElapsed;
            
            if (newRemaining > 0) {
                // Resume timer
                remaining = newRemaining;
                timerPausedRemaining = savedState.timerPausedRemaining;
                isRunning = true;
                timerStartTimestamp = savedState.timerStartTimestamp;
                lastRecordedSecond = -1;
                animationFrameId = requestAnimationFrame(timerLoop);
                startTitleUpdates();
                updateTimerUI();
            } else {
                // Timer sudah selesai
                remaining = 0;
                updateTimerUI();
                if (timeSinceLastUpdate < 5000) { // Jika baru saja selesai
                    beep();
                }
            }
        }
        
        // Jika stopwatch sedang running
        if (savedState.isStopwatchRunning && savedState.stopwatchStartTimestamp) {
            const totalElapsed = Math.floor((now - savedState.stopwatchStartTimestamp) / 1000);
            stopwatchSeconds = savedState.stopwatchPausedSeconds + totalElapsed;
            stopwatchPausedSeconds = savedState.stopwatchPausedSeconds;
            isStopwatchRunning = true;
            stopwatchStartTimestamp = savedState.stopwatchStartTimestamp;
            lastRecordedSecond = stopwatchSeconds - 1;
            animationFrameId = requestAnimationFrame(stopwatchLoop);
            startTitleUpdates();
            updateStopwatchUI();
        }
        }

        // Jalankan recovery saat page load
        recoverTimerState();

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