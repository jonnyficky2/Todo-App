const container = document.getElementById("container");
let chart;
let draggedIndex = null;
let undoStack = [];
let redoStack = [];
let searchValue = "";
let currentFilter = "all";
let currentDate = new Date();

let xp =
Number(localStorage.getItem("xp")) || 0;
// 1. DATA MANAGEMENT: Mengambil data dalam bentuk Array/Object, bukan HTML mentah
let appData = JSON.parse(localStorage.getItem("appData")) || [];
let habits =
JSON.parse(localStorage.getItem("habits")) || [];
let streakData = JSON.parse(localStorage.getItem("streakData")) || [];

// LOAD INITIAL DATA
window.onload = function () {
    render();
    updateStreakDisplay();
    generateHeatmap();
    updateChart();
    displayRandomQuote();
    generateCalendar();
    renderHabits();
    showSection("home");

    requestNotificationPermission();
    checkDeadlines();
    updateLevel();
};

function searchTask() {
    searchValue = document.getElementById("searchInput").value.toLowerCase();
    render();
}
function setFilter(filter) {
    currentFilter = filter;
    render();
}

function showSection(section) {

    // SEMBUNYIKAN SEMUA
    document.getElementById("homeSection")
        .style.display = "none";

    document.getElementById("calendarSection")
        .style.display = "none";

    document.getElementById("habitSection")
        .style.display = "none";

    document.getElementById("statsSection")
        .style.display = "none";

    // TAMPILKAN YANG DIPILIH
    document.getElementById(
        section + "Section"
    ).style.display = "block";

    // HAPUS ACTIVE
    document.querySelectorAll(
        "#bottomNav button"
    ).forEach(btn => {

        btn.classList.remove("active-nav");

    });

    // ACTIVE BUTTON
    const buttons =
        document.querySelectorAll(
            "#bottomNav button"
        );

    if (section === "home") {
        buttons[0].classList.add("active-nav");
    }

    if (section === "calendar") {
        buttons[1].classList.add("active-nav");
    }

    if (section === "habit") {
        buttons[2].classList.add("active-nav");
    }

    if (section === "stats") {
        buttons[3].classList.add("active-nav");
    }
}


function getDeadlineStatus(deadline, done) {

    if (!deadline || deadline === "Tidak ada") {
        return "Tidak ada deadline";
    }

    if (done) {
        return "✅ Selesai";
    }

    const today = new Date();
    const dueDate = new Date(deadline);

    // hilangkan jam biar akurat
    today.setHours(0,0,0,0);
    dueDate.setHours(0,0,0,0);

    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
        return `⏳ ${diffDays} hari lagi`;
    }

    if (diffDays === 1) {
        return "📌 Besok";
    }

    if (diffDays === 0) {
        return "🔥 Hari ini";
    }

    return `⚠️ Terlambat ${Math.abs(diffDays)} hari`;
}

function checkAllTasksCompleted() {

    let allDone = true;

    appData.forEach(category => {

        category.tasks.forEach(task => {

            if (!task.done) {
                allDone = false;
            }

        });

    });

    if (
        allDone &&
        appData.length > 0
    ) {

        document.body.classList.add(
            "celebrate-animation"
        );

        setTimeout(() => {

            document.body.classList.remove(
                "celebrate-animation"
            );

        }, 1000);

        alert("🎉 Semua task selesai!");
    }
}

// 2. RENDER FUNCTION: Fungsi untuk membangun UI dari data
function render() {
    container.innerHTML = "";

    appData.forEach((category, catIndex) => {

        // CARD
        const categoryDiv = document.createElement("div");
        categoryDiv.className = "category";

        // ===== HEADER =====
        const header = document.createElement("div");
        header.className = "category-header";

        const title = document.createElement("h2");
        title.innerText = category.name;

        const headerActions = document.createElement("div");

        const editCat = document.createElement("button");
        editCat.innerText = "✏️";
        editCat.onclick = () => editCategory(catIndex, title);

        const deleteCat = document.createElement("button");
deleteCat.innerText = "🗑";
deleteCat.onclick = () => deleteCategory(catIndex);

        headerActions.appendChild(editCat);
        headerActions.appendChild(deleteCat);

        header.appendChild(title);
        header.appendChild(headerActions);

        // ===== PROGRESS =====
        const total = category.tasks.length;
        const done = category.tasks.filter(t => t.done).length;
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);

        const progressText = document.createElement("p");
        progressText.innerText = percent + "%";

        const progressBar = document.createElement("div");
        progressBar.className = "progress-bar";

        const progressFill = document.createElement("div");
        progressFill.className = "progress-fill";
        progressFill.style.width = percent + "%";

        progressBar.appendChild(progressFill);

        // ===== INPUT TASK =====
        const inputGroup = document.createElement("div");
        inputGroup.className = "task-input-group";

        const input = document.createElement("input");
        input.placeholder = "Tambah task";

        const addBtn = document.createElement("button");
        addBtn.innerText = "+";
        addBtn.onclick = () => addTask(catIndex,input);

        inputGroup.appendChild(input);
        inputGroup.appendChild(addBtn);

        // ===== TASK LIST =====
        const taskList = document.createElement("div");
        taskList.className = "task-list";
        taskList.addEventListener("drop", (e) => {
    e.preventDefault();

    const targetTask = e.target.closest(".task");
    if (!targetTask) return;

    const toIndex = Number(targetTask.dataset.index);
    const fromIndex = draggedIndex;

    if (fromIndex === null || fromIndex === toIndex) return;

    const tasks = appData[catIndex].tasks;
    saveState();

    const movedItem = tasks.splice(fromIndex, 1)[0];
    tasks.splice(toIndex, 0, movedItem);

    saveData();
    render();
});
        taskList.addEventListener("dragover", (e) => {
    e.preventDefault();
});

        category.tasks.forEach((task, taskIndex) => {

    if (currentFilter === "done" && !task.done) return;
    if (currentFilter === "pending" && task.done) return;
    if (!task.name.toLowerCase().includes(searchValue)) return;

            const taskDiv = document.createElement("div");
            taskDiv.className = task.done ? "task done" : "task";
            taskDiv.draggable = true;
            taskDiv.dataset.index = taskIndex;
            taskDiv.addEventListener("dragstart", () => {
    draggedIndex = taskIndex;
});

            // LEFT
            const left = document.createElement("div");
            left.className = "task-left";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = task.done;
            checkbox.onchange = () => toggleTask(catIndex, taskIndex);

            const textContainer = document.createElement("div");

const text = document.createElement("span");
text.innerText = task.name;

const deadline = document.createElement("small");

deadline.innerHTML = `
📅 ${task.deadline || "Tidak ada"}
<br>
${getDeadlineStatus(task.deadline, task.done)}
`;

if (task.deadline !== "Tidak ada") {

    const today = new Date().toISOString().split("T")[0];

    // MERAH = TERLAMBAT
    if (task.deadline < today && !task.done) {
        deadline.style.color = "#ff3b30";
    }

    // KUNING = HARI INI
    else if (task.deadline === today && !task.done) {
        deadline.style.color = "#ffcc00";
    }

    // HIJAU = SELESAI
    else if (task.done) {
        deadline.style.color = "#34c759";
    }
}

textContainer.appendChild(text);
textContainer.appendChild(document.createElement("br"));
textContainer.appendChild(deadline);

            left.appendChild(checkbox);
            left.appendChild(textContainer);

            // RIGHT
            const right = document.createElement("div");
            right.className = "task-right";

            const edit = document.createElement("button");
            edit.innerText = "✏️";
            edit.onclick = () => editTask(catIndex, taskIndex, text);

            const del = document.createElement("button");
            del.innerText = "🗑";
            del.onclick = () => deleteTask(catIndex, taskIndex);

            right.appendChild(edit);
            right.appendChild(del);

            taskDiv.appendChild(left);
            taskDiv.appendChild(right);

            taskList.appendChild(taskDiv);
        });

        // ===== APPEND ALL =====
        categoryDiv.appendChild(header);
        categoryDiv.appendChild(progressText);
        categoryDiv.appendChild(progressBar);
        categoryDiv.appendChild(inputGroup);
        categoryDiv.appendChild(taskList);

        container.appendChild(categoryDiv);
    });

    saveData();
    renderCalendar();
}


// 3. ACTIONS (TAMBAH, EDIT, HAPUS)
function addCategory() {
    const input = document.getElementById("categoryInput");
    if (input.value.trim() === "") return;
    saveState();
    appData.push({ name: input.value, tasks: [] });
    
    input.value = "";
    render();
    generateCalendar();
    updateChart();
}

function addTask(catIndex, input) {
    if (input.value.trim() === "") return;
    saveState();
    const deadline = prompt("Masukkan deadline (contoh: 2026-05-20)");

appData[catIndex].tasks.push({
    name: input.value,
    done: false,
    deadline: deadline || "Tidak ada"
});
    input.value = "";
    render();
    generateCalendar();
    updateChart();
}

function toggleTask(catIndex, taskIndex) {
  saveState();
    appData[catIndex].tasks[taskIndex].done = !appData[catIndex].tasks[taskIndex].done;
    if (
    appData[catIndex]
    .tasks[taskIndex]
    .done) {
    addXP(10);
}
    updateStreak();
    render();
    generateCalendar();
    updateChart();
    checkAllTasksCompleted();
    
}

function editCategory(index, titleElement) {
    const input = document.createElement("input");
    input.value = appData[index].name;
    input.className = "inline-edit";

    titleElement.replaceWith(input);
    input.focus();

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          saveState();
            appData[index].name = input.value;
            saveData();
            render();
        }
    });

    input.addEventListener("blur", () => {
        render(); // kalau klik keluar tanpa save
    });
}

function deleteCategory(index) {
    if (confirm("Hapus category?")) {
        saveState();
        appData.splice(index, 1);
        render();
        generateCalendar();
        updateChart(); }
}

function editTask(catIndex, taskIndex, textElement) {
    const input = document.createElement("input");
    input.value = appData[catIndex].tasks[taskIndex].name;
    input.className = "inline-edit";

    textElement.replaceWith(input);
    input.focus();

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          saveState();
            appData[catIndex].tasks[taskIndex].name = input.value;
            saveData();
            render();
            generateCalendar();
        }
    });

    input.addEventListener("blur", () => {
        render();
    });
}

function deleteTask(catIndex, taskIndex) {
    // 1. Tambahkan pop up peringatan (confirm)
    const yakinHapus = confirm("Apakah Anda yakin ingin menghapus task ini?");

    // 2. Jika user menekan "OK", maka hapus data
    if (yakinHapus) {
      saveState();
        appData[catIndex].tasks.splice(taskIndex, 1);
        
        // Simpan perubahan dan render ulang UI agar sinkron
        saveData();
        render();
        generateCalendar();
        updateChart();
    }
    // Jika user menekan "Cancel", tidak terjadi apa-apa
}

// 4. UTILITIES (SAVE, CHART, STREAK)
function saveData() {

    localStorage.setItem(
        "appData",
        JSON.stringify(appData)
    );

    const status =
        document.getElementById("saveStatus");

    status.innerText = "💾 Menyimpan...";

    setTimeout(() => {
        status.innerText = "✔ Data tersimpan";
    }, 500);
}

function saveState() {
    undoStack.push(JSON.stringify(appData));
    redoStack = [];
}

function updateChart() {
    const ctx = document.getElementById("statsChart");
    if (!ctx) return;
    
    const labels = appData.map(cat => cat.name);
    const data = appData.map(cat => {
        const total = cat.tasks.length;
        const done = cat.tasks.filter(t => t.done).length;
        return total === 0 ? 0 : Math.round((done / total) * 100);
    });

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Progress %', data: data, backgroundColor: '#4A90E2' }] },
        options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
    });
}

function updateStreak() {
    const today = new Date().toISOString().split("T")[0];
    if (!streakData.includes(today)) {
        streakData.push(today);
        localStorage.setItem("streakData", JSON.stringify(streakData));
        updateStreakDisplay();
        generateHeatmap();
    }
}

function updateStreakDisplay() {
    document.getElementById("streakText").innerText = "🔥 Streak: " + streakData.length + " hari";
}

function generateHeatmap() {
    const heatmap = document.getElementById("heatmap");
    if (!heatmap) return;
    heatmap.innerHTML = "";
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split("T")[0];
        const dayBox = document.createElement("div");
        dayBox.className = "day-box" + (streakData.includes(dateString) ? " day-active" : "");
        // Fungsi: Menampilkan tanggal saat user mengarahkan kursor (hover)
dayBox.title = `Tanggal: ${dateString}`;

        heatmap.appendChild(dayBox);
    }
}
// THEME TOGGLE
const themeToggle = document.getElementById("themeToggle");
themeToggle.onclick = function () {
    document.body.classList.toggle("light-mode");
    const mode = document.body.classList.contains("light-mode") ? "light" : "dark";
    localStorage.setItem("theme", mode);
    themeToggle.innerText = mode === "light" ? "☀️ Light Mode" : "🌙 Dark Mode";
}


// 1. Daftar koleksi quote (Bisa kamu tambah sesuai keinginan)
const wisdomQuotes = [
    { text: "Kamu memiliki kendali atas pikiranmu, bukan kejadian di luar sana. Sadari ini, dan kamu akan menemukan kekuatan.", author: "Marcus Aurelius" },
    { text: "Kita menderita lebih sering dalam imajinasi daripada dalam kenyataan.", author: "Seneca" },
    { text: "Jangan menjelaskan filosofimu. Wujudkanlah.", author: "Epictetus" },
    { text: "Kebahagiaan hidupmu bergantung pada kualitas pikiranmu.", author: "Marcus Aurelius" },
    { text: "Hanya orang yang terpelajar yang bebas.", author: "Epictetus" }
];

// 2. Fungsi untuk menampilkan quote secara acak
function displayRandomQuote() {
    const randomIndex = Math.floor(Math.random() * wisdomQuotes.length);
    const selectedQuote = wisdomQuotes[randomIndex];
    
    document.getElementById("quoteText").innerText = `"${selectedQuote.text}"`;
    document.getElementById("quoteAuthor").innerText = `- ${selectedQuote.author}`;
}




  function undo() {
    if (undoStack.length === 0) return;

    redoStack.push(JSON.stringify(appData));

    appData = JSON.parse(undoStack.pop());

    render();
    updateChart();
    saveData();
    
}

function redo() {
    if (redoStack.length === 0) return;

    undoStack.push(JSON.stringify(appData));

    appData = JSON.parse(redoStack.pop());

    render();
    updateChart();
    saveData();
}

function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);

    const blob = new Blob([dataStr], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "daily-tracker-backup.json";

    a.click();

    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            saveState();

            appData = JSON.parse(e.target.result);

            saveData();
            render();
            updateChart();

            alert("Data berhasil diimport!");
        } catch {
            alert("File tidak valid!");
        }
    };

    reader.readAsText(file);
}

function requestNotificationPermission() {
    if ("Notification" in window) {
        Notification.requestPermission();
    }
}


function showNotification(taskName) {

    if (Notification.permission === "granted") {

        new Notification("⏰ Deadline Task!", {
            body: taskName + " sudah deadline!",
            icon: "icon.png"
        });
    }
}

function renderCalendar() {

    const calendar = document.getElementById("calendarView");

    if (!calendar) return;

    calendar.innerHTML = "";

    let tasksWithDeadline = [];

    appData.forEach(category => {

        category.tasks.forEach(task => {

            if (
                task.deadline &&
                task.deadline !== "Tidak ada"
            ) {

                tasksWithDeadline.push({
                    name: task.name,
                    deadline: task.deadline,
                    done: task.done
                });
            }
        });
    });

    tasksWithDeadline.sort((a, b) =>
        a.deadline.localeCompare(b.deadline)
    );

    tasksWithDeadline.forEach(task => {

        const item = document.createElement("div");

        item.className = task.done
            ? "calendar-item done"
            : "calendar-item";

        item.innerHTML = `
            <strong>📅 ${task.deadline}</strong><br>
            ${task.name}
        `;

        calendar.appendChild(item);
    });
}

function generateCalendar() {

    const calendarGrid = document.getElementById("calendarGrid");
    const calendarMonth = document.getElementById("calendarMonth");

    if (!calendarGrid) return;

    calendarGrid.innerHTML = "";
    const dayNames = [
    "Min", "Sen", "Sel",
    "Rab", "Kam", "Jum", "Sab"
];

dayNames.forEach(day => {

    const dayName =
        document.createElement("div");

    dayName.className = "calendar-day-name";

    dayName.innerText = day;

    calendarGrid.appendChild(dayName);
});

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "Januari", "Februari", "Maret",
        "April", "Mei", "Juni",
        "Juli", "Agustus", "September",
        "Oktober", "November", "Desember"
    ];

    calendarMonth.innerText =
        `${monthNames[month]} ${year}`;

    const firstDay =
        new Date(year, month, 1).getDay();

    const totalDays =
        new Date(year, month + 1, 0).getDate();

    // KOSONG SEBELUM TANGGAL 1
    for (let i = 0; i < firstDay; i++) {

        const empty = document.createElement("div");
        empty.className = "calendar-day empty";

        calendarGrid.appendChild(empty);
    }

    // TANGGAL
    for (let day = 1; day <= totalDays; day++) {

        const dayBox = document.createElement("div");
        dayBox.className = "calendar-day";

            
            const today =
    new Date().toISOString().split("T")[0];


        dayBox.innerHTML = `<strong>${day}</strong>`;

        // CEK TASK
        appData.forEach(category => {

            category.tasks.forEach(task => {

                if (task.deadline === dateText) {

                    const taskEl =
                        document.createElement("div");

                    taskEl.className = task.done
    ? "calendar-task done-task"
    : "calendar-task";

if (task.deadline < today && !task.done) {
    taskEl.classList.add("overdue-task");
}

                    taskEl.innerText = task.name;

                    dayBox.appendChild(taskEl);
                }
            });
        });
        dayBox.addEventListener("dblclick", () => {

    const taskName =
        prompt("Tambah task");

    if (!taskName) return;

    if (appData.length === 0) {
        alert("Buat category dulu");
        return;
    }

    appData[0].tasks.push({
        name: taskName,
        done: false,
        deadline: dateText
    });

    saveData();
    render();
    updateChart();
    generateCalendar();
});
        calendarGrid.appendChild(dayBox);
    }
}

function changeMonth(step) {

    currentDate.setMonth(
        currentDate.getMonth() + step
    );

    generateCalendar();
}

function addHabit() {

    const input =
        document.getElementById("habitInput");

    if (input.value.trim() === "") return;

    habits.push({
        name: input.value,
        dates: []
    });

    input.value = "";

    saveHabits();
    renderHabits();
    updateLevel();
}

function toggleHabit(index) {

    const today =
        new Date().toISOString().split("T")[0];

    const dates = habits[index].dates;

    if (dates.includes(today)) {

        habits[index].dates =
            dates.filter(d => d !== today);

    } else {

        dates.push(today);
    }

    saveHabits();
    renderHabits();
updateLevel();
}

function saveHabits() {

    localStorage.setItem(
        "habits",
        JSON.stringify(habits)
    );
}

function renderHabits() {

    const container =
        document.getElementById("habitContainer");

    if (!container) return;

    container.innerHTML = "";

    const today =
        new Date().toISOString().split("T")[0];

    habits.forEach((habit, index) => {

        const card =
            document.createElement("div");

        card.className = "habit-card";

        const doneToday =
            habit.dates.includes(today);

        card.innerHTML = `
            <div>
                <h3>${habit.name}</h3>
                <small>
                    ${habit.dates.length}
                    hari selesai
                </small>
            </div>

            <button onclick="toggleHabit(${index})">
                ${doneToday ? "✅" : "⭕"}
            </button>
        `;

        container.appendChild(card);
    });
}

function addXP(amount) {

    xp += amount;

    localStorage.setItem("xp", xp);

    updateLevel();
}

function updateLevel() {

    const level =
        Math.floor(xp / 100) + 1;

    const currentXP =
        xp % 100;

    document.getElementById(
        "levelText"
    ).innerText =
        `🏆 Level ${level}`;

    document.getElementById(
        "xpText"
    ).innerText =
        `${currentXP} / 100 XP`;

    document.getElementById(
        "xpFill"
    ).style.width =
        currentXP + "%";
}

function checkDeadlines() {

    // cek apakah browser support notif
    if (!("Notification" in window)) return;

    // minta izin notif
    Notification.requestPermission();

    const today = new Date();
    const todayString = today.toISOString().split("T")[0];

    appData.forEach(category => {

        category.tasks.forEach(task => {

            if (
                task.deadline &&
                task.deadline !== "Tidak ada" &&
                !task.done
            ) {

                // deadline hari ini
                if (task.deadline === todayString) {

                    new Notification("📌 Deadline Hari Ini", {
                        body: task.name
                    });
                }
            }
        });

    });

}

// FLOATING BUTTON

const floatingBtn =
document.getElementById("floatingAddBtn");

if (floatingBtn) {

    floatingBtn.onclick = function () {

        const input =
        document.getElementById("categoryInput");
        input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        addTask(catIndex, input);
    }
});
        if (input) {

            input.focus();

            input.scrollIntoView({
                behavior: "smooth"
            });
        }
    };
}

// SERVICE WORKER

if ("serviceWorker" in navigator) {

    navigator.serviceWorker
        .register("./sw.js")
        .then(() => {

            console.log(
                "Service Worker registered"
            );

        })
        .catch(err => {

            console.log(
                "SW error:",
                err
            );

        });
}
