const container = document.getElementById("container");
let chart;
let undoStack = [];
let redoStack = [];
// 1. DATA MANAGEMENT: Mengambil data dalam bentuk Array/Object, bukan HTML mentah
let appData = JSON.parse(localStorage.getItem("appData")) || [];
let streakData = JSON.parse(localStorage.getItem("streakData")) || [];

// LOAD INITIAL DATA
window.onload = function () {
    render();
    updateStreakDisplay();
    generateHeatmap();
    updateChart();
    displayRandomQuote();
};

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
        let draggedIndex = null;
        taskList.addEventListener("drop", (e) => {
    e.preventDefault();

    const targetTask = e.target.closest(".task");
    if (!targetTask) return;

    const toIndex = Number(targetTask.dataset.index);
    const fromIndex = draggedIndex;

    if (fromIndex === null || fromIndex === toIndex) return;

    const tasks = appData[catIndex].tasks;

    const movedItem = tasks.splice(fromIndex, 1)[0];
    tasks.splice(toIndex, 0, movedItem);

    saveData();
    render();
});
        taskList.addEventListener("dragover", (e) => {
    e.preventDefault();
});

        category.tasks.forEach((task, taskIndex) => {

            const taskDiv = document.createElement("div");
            taskDiv.className = "task";
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

            const text = document.createElement("span");
            text.innerText = task.name;

            left.appendChild(checkbox);
            left.appendChild(text);

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
}


// 3. ACTIONS (TAMBAH, EDIT, HAPUS)
function addCategory() {
    const input = document.getElementById("categoryInput");
    if (input.value.trim() === "") return;
    saveState();
    appData.push({ name: input.value, tasks: [] });
    
    input.value = "";
    render();
    updateChart();
}

function addTask(catIndex, input) {
    if (input.value.trim() === "") return;
    saveState();
    appData[catIndex].tasks.push({ name: input.value, done: false });
    input.value = ""
    render();
    updateChart();
}

function toggleTask(catIndex, taskIndex) {
    appData[catIndex].tasks[taskIndex].done = !appData[catIndex].tasks[taskIndex].done;
    updateStreak();
    render();
    updateChart();
    saveState();
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
        appData.splice(index, 1); render(); updateChart(); }
}

function editTask(catIndex, taskIndex, textElement) {
    const input = document.createElement("input");
    input.value = appData[catIndex].tasks[taskIndex].name;
    input.className = "inline-edit";

    textElement.replaceWith(input);
    input.focus();

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            appData[catIndex].tasks[taskIndex].name = input.value;
            saveData();
            render();
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
        updateChart();
    }
    // Jika user menekan "Cancel", tidak terjadi apa-apa
}

// 4. UTILITIES (SAVE, CHART, STREAK)
function saveData() {
    localStorage.setItem("appData", JSON.stringify(appData));
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


function saveState() {
    undoStack.push(JSON.stringify(appData));
    redoStack = [];
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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js")
    .then(() => console.log("Service Worker registered"))
    .catch(err => console.log("SW error:", err));
}
