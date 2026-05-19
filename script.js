let chart = null;
let deferredPrompt = null;
let dragged = null;

/* =========================
   STATE
========================= */

const state = {
  appData: JSON.parse(localStorage.getItem("appData") || "[]"),

  xp: Number(localStorage.getItem("xp")) || 0,

  habits: JSON.parse(
    localStorage.getItem("habits") || "[]"
  ),

  streakData: JSON.parse(
    localStorage.getItem("streakData") || "[]"
  ),

  undoStack: [],
  redoStack: [],

  searchValue: "",
  currentFilter: "all",

  currentDate: new Date(),

  currentCategoryIndex: null
};

/* =========================
   ELEMENT
========================= */

const container =
  document.getElementById("container");

/* =========================
   START
========================= */

window.addEventListener(
  "DOMContentLoaded",
  () => {
    if("Notification" in window){

  Notification.requestPermission();
}
    resetHabitsDaily();
    refreshUI();

    loadTheme();

    showSection("home");
  }
);

/* =========================
   SAVE
========================= */

function saveToLocal() {

  localStorage.setItem(
    "appData",
    JSON.stringify(state.appData)
  );

  localStorage.setItem(
    "xp",
    state.xp
  );

  localStorage.setItem(
    "habits",
    JSON.stringify(state.habits)
  );

  localStorage.setItem(
    "streakData",
    JSON.stringify(state.streakData)
  );
}
function saveState() {

  state.undoStack.push(
    JSON.stringify(state.appData)
  );

  if (state.undoStack.length > 10) {
    state.undoStack.shift();
  }

  state.redoStack = [];
}

/* =========================
   RENDER
========================= */

function render() {

  container.innerHTML = "";

  state.appData.forEach(
    (category, catIndex) => {

      const categoryDiv =
        document.createElement("div");
        

      categoryDiv.className =
        "category";

      /* HEADER */

      const header =
        document.createElement("div");

      header.className =
        "category-header";

      const title =
        document.createElement("h2");

      title.innerText =
        category.name;

      const actions =
        document.createElement("div");

      const editBtn =
        document.createElement("button");

      editBtn.innerText = "✏️";

      editBtn.onclick = () =>
        editCategory(catIndex);

      const delBtn =
        document.createElement("button");

      delBtn.innerText = "🗑";

      delBtn.onclick = () =>
        deleteCategory(catIndex);

      actions.append(
        editBtn,
        delBtn
      );

      header.append(
        title,
        actions
      );

      /* TASK LIST */

      const taskList =
        document.createElement("div");

      category.tasks.forEach(
        (task, taskIndex) => {

          if (!filterTask(task)) return;

          const taskDiv =
            document.createElement("div");

          taskDiv.className =
            `task 
            ${task.done ? "done" : ""}
            ${task.priority || "low"}-priority`;
            
            /* DRAG */

taskDiv.draggable = true;

taskDiv.addEventListener(
  "dragstart",
  () => {

    dragged = {
      catIndex,
      taskIndex
    };

    taskDiv.classList.add(
      "dragging"
    );
  }
);

taskDiv.addEventListener(
  "dragend",
  () => {

    taskDiv.classList.remove(
      "dragging"
    );
  }
);

taskDiv.addEventListener(
  "dragover",
  (e) => {

    e.preventDefault();
  }
);

taskDiv.addEventListener(
  "drop",
  () => {

    if (!dragged) return;

    saveState();

    const fromCategory =
      state.appData[dragged.catIndex];

    const movedTask =
      fromCategory.tasks.splice(
        dragged.taskIndex,
        1
      )[0];

    // FIX INDEX
    let insertIndex = taskIndex;

    if (
      dragged.catIndex === catIndex &&
      dragged.taskIndex < taskIndex
    ) {
      insertIndex--;
    }

    state.appData[
      catIndex
    ].tasks.splice(
      insertIndex,
      0,
      movedTask
    );

    dragged = null;

    saveToLocal();

    refreshUI();
  }
);

          /* LEFT */

          const left =
            document.createElement("div");

          left.className =
            "task-left";

          const checkbox =
            document.createElement("input");

          checkbox.type =
            "checkbox";

          checkbox.checked =
            task.done;

          checkbox.onchange = () =>
            toggleTask(
              catIndex,
              taskIndex
            );

          const textWrapper =
  document.createElement("div");

const text =
  document.createElement("span");

text.innerText =
  task.name;

textWrapper.appendChild(text);

/* DEADLINE */

if(task.deadline){

  const deadlineText =
    document.createElement("div");

  deadlineText.className =
    "deadline-warning";

  const today =
    new Date();

  const deadline =
    new Date(task.deadline);

  const diff =
    Math.ceil(
      (
        deadline - today
      ) / (1000*60*60*24)
    );

  if(diff < 0){

    deadlineText.classList.add(
      "overdue"
    );

    deadlineText.innerText =
      "⚠️ Deadline lewat";

  }else if(diff === 0){

    deadlineText.innerText =
      "⏰ Deadline hari ini";

  }else{

    deadlineText.innerText =
      `📅 ${diff} hari lagi`;
  }

  textWrapper.appendChild(
    deadlineText
  );
}



          left.append(
            checkbox,
            text
          );

          /* RIGHT */

          const right =
            document.createElement("div");

          right.className =
            "task-right";

          const edit =
            document.createElement("button");

          edit.innerText = "✏️";

          edit.onclick = () =>
            editTask(
              catIndex,
              taskIndex
            );

          const del =
            document.createElement("button");

          del.innerText = "🗑";

          del.onclick = () =>
            deleteTask(
              catIndex,
              taskIndex
            );

          right.append(
            edit,
            del
          );

          taskDiv.append(
            left,
            right
          );

          taskList.appendChild(
            taskDiv
          );
        }
      );

      /* ADD TASK */

      const addTaskBtn =
        document.createElement("button");

      addTaskBtn.innerText =
        "+ Tambah Task";

      addTaskBtn.onclick = () => {

        state.currentCategoryIndex =
          catIndex;

        openTaskModal();
      };

      categoryDiv.append(
        header,
        taskList,
        addTaskBtn
      );

      container.appendChild(
        categoryDiv
      );
    });
}

/* =========================
   REFRESH UI
========================= */

function refreshUI() {

  render();

  renderCalendar();

  updateChart();

  generateHeatmap();

  renderHabits();

  updateLevel();
  loadRandomQuote();
}

/* =========================
   CATEGORY
========================= */

function addCategory() {

  const input =
    document.getElementById(
      "categoryInput"
    );

  if (!input.value.trim()) return;

  saveState();

  state.appData.push({
    name: input.value,
    tasks: []
  });

  input.value = "";

  saveToLocal();
  refreshUI();

  ;
}

function editCategory(index) {

  const newName =
    prompt(
      "Edit category:",
      state.appData[index].name
    );

  if (!newName) return;

  state.appData[index].name =
    newName;

  saveToLocal();

  refreshUI();
}

function deleteCategory(index) {

  if (!confirm("Hapus category?"))
    return;

  saveState();

  state.appData.splice(index, 1);

  saveToLocal();

  refreshUI();
}

/* =========================
   TASK
========================= */

function saveTaskModal() {

  const name =
    document.getElementById(
      "taskNameInput"
    ).value;

  const deadline =
    document.getElementById(
      "taskDeadlineInput"
    ).value;

  const priority =
    document.getElementById(
      "taskPriorityInput"
    ).value;

  if (!name.trim()) return;

  saveState();

  state.appData[
    state.currentCategoryIndex
  ].tasks.push({
    name,
    deadline,
    priority,
    done: false
  });

  saveToLocal();

  refreshUI();
  closeTaskModal();

  document.getElementById(
    "taskNameInput"
  ).value = "";

  document.getElementById(
    "taskDeadlineInput"
  ).value = "";
}

function toggleTask(
  catIndex,
  taskIndex
) {

  saveState();
  /* =========================
   REFRESH UI
========================= */


  const task =
    state.appData[catIndex]
    .tasks[taskIndex];

  task.done = !task.done;

  if (task.done) {

  addXP(10);

  celebrate();

  updateStreak();

} else {

  addXP(-10);
}

  saveToLocal();

  refreshUI();
}

function editTask(
  catIndex,
  taskIndex
) {

  const task =
    state.appData[catIndex]
    .tasks[taskIndex];

  const newName =
    prompt(
      "Edit task:",
      task.name
    );

  if (!newName) return;

  task.name = newName;

  saveToLocal();

  refreshUI();
}

function deleteTask(
  catIndex,
  taskIndex
) {

  saveState();

  state.appData[catIndex]
    .tasks.splice(taskIndex, 1);

  saveToLocal();

  refreshUI();
}

/* =========================
   FILTER
========================= */

function filterTask(task) {

  if (
    state.currentFilter === "done" &&
    !task.done
  ) return false;

  if (
    state.currentFilter === "pending" &&
    task.done
  ) return false;

  if (state.searchValue) {

    return task.name
      .toLowerCase()
      .includes(
        state.searchValue
      );
  }

  return true;
}

function searchTask() {

  state.searchValue =
    document
      .getElementById(
        "searchInput"
      )
      .value
      .toLowerCase();

  refreshUI();
}

function setFilter(filter) {

  state.currentFilter = filter;

  refreshUI();
}

/* =========================
   XP
========================= */

function addXP(amount) {

  state.xp += amount;

  if (state.xp < 0) {
    state.xp = 0;
  }

  updateLevel();

  saveToLocal();
}

function updateLevel() {

  const level =
    Math.floor(state.xp / 100) + 1;

  const currentXP =
    state.xp % 100;

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
    `${currentXP}%`;
}

/* =========================
   CHART
========================= */

function updateChart(){

  if(typeof Chart === "undefined")
    return;

  const canvas =
    document.getElementById(
      "statsChart"
    );

  if(!canvas) return;

  const labels =
    state.appData.map(
      c => c.name
    );

  const data =
    state.appData.map(c=>{

      const total =
        c.tasks.length;

      const done =
        c.tasks.filter(
          t=>t.done
        ).length;

      return total
        ? Math.round(
            done / total * 100
          )
        : 0;
    });

  if(chart){
    chart.destroy();
  }

  chart = new Chart(canvas, {

    type: "bar",

    data: {

      labels,

      datasets: [{

        label: "Progress %",

        data,

        borderRadius: 12,

        borderSkipped: false,

        backgroundColor: [
          "#38bdf8",
          "#22c55e",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6"
        ]
      }]
    },

    options: {

      responsive: true,

      maintainAspectRatio: false,

      animation: {

        duration: 1200,

        easing: "easeOutQuart"
      },

      plugins: {

        legend: {

          labels: {

            color:
              document.body.classList.contains(
                "light-mode"
              )
              ? "#111"
              : "#fff"
          }
        }
      },

      scales: {

        y: {

          beginAtZero: true,

          max: 100,

          ticks: {

            color:
              document.body.classList.contains(
                "light-mode"
              )
              ? "#111"
              : "#fff"
          },

          grid: {
            color:
              "rgba(255,255,255,0.08)"
          }
        },

        x: {

          ticks: {

            color:
              document.body.classList.contains(
                "light-mode"
              )
              ? "#111"
              : "#fff"
          },

          grid: {
            display: false
          }
        }
      }
    }
  });
}

/* =========================
   HEATMAP
========================= */

function generateHeatmap() {

  const heatmap =
    document.getElementById(
      "heatmap"
    );

  if (!heatmap) return;

  heatmap.innerHTML = "";

  for (let i = 0; i < 30; i++) {

    const box =
      document.createElement("div");

    box.className = "day-box";

    if (i < state.streakData.length)
     {
      box.classList.add(
        "day-active"
      );
    }

    heatmap.appendChild(box);
  }
}

/* =========================
   STREAK
========================= */

function updateStreak() {

  const today =
    new Date()
    .toDateString();

  if (
    !state.streakData.includes(today)
  ) {

    state.streakData.push(today);

    saveToLocal();
  }

  document.getElementById(
    "streakText"
  ).innerText =
    `🔥 Streak: ${state.streakData.length} hari`;
}

function loadRandomQuote() {

  if (!quotes.length) return;

  const today =
    new Date()
    .toDateString();

  let savedDate =
    localStorage.getItem(
      "quoteDate"
    );

  let savedQuote =
    localStorage.getItem(
      "dailyQuote"
    );

  // kalau hari baru
  if (savedDate !== today) {

    const random =
      quotes[
        Math.floor(
          Math.random() * quotes.length
        )
      ];

    savedQuote =
      JSON.stringify(random);

    localStorage.setItem(
      "dailyQuote",
      savedQuote
    );

    localStorage.setItem(
      "quoteDate",
      today
    );
  }

  const quote =
    JSON.parse(savedQuote);

  document.getElementById(
    "quoteText"
  ).innerText =
    `"${quote.text}"`;

  document.getElementById(
    "quoteAuthor"
  ).innerText =
    `— ${quote.author}`;
}

/* =========================
   HABIT
========================= */

function addHabit() {

  const input =
    document.getElementById(
      "habitInput"
    );

  if (!input.value.trim()) return;

  state.habits.push({
    name: input.value,
    done: false
  });

  input.value = "";

  saveToLocal();

  refreshUI();
}

function resetHabitsDaily() {

  const today =
    new Date().toDateString();

  const lastReset =
    localStorage.getItem(
      "habitResetDate"
    );

  if (lastReset !== today) {

    state.habits.forEach(h => {
      h.done = false;
    });

    localStorage.setItem(
      "habitResetDate",
      today
    );

    saveToLocal();
  }
}

function renderHabits() {

  const container =
    document.getElementById(
      "habitContainer"
    );

  if (!container) return;

  container.innerHTML = "";

  state.habits.forEach(
    (habit, index) => {

      const card =
        document.createElement("div");

      card.className =
        "habit-card";

      card.style.padding =
        "15px";

      card.style.marginTop =
        "10px";

      const checkbox =
        document.createElement("input");

      checkbox.type =
        "checkbox";

      checkbox.checked =
        habit.done;

      checkbox.onchange = () => {

        habit.done =
          !habit.done;

        saveToLocal();
      };

      const text =
        document.createElement("span");

      text.innerText =
        " " + habit.name;

      card.append(
        checkbox,
        text
      );

      container.appendChild(
        card
      );
    }
  );
}

/* =========================
   MODAL
========================= */

function openTaskModal() {

  document
    .getElementById(
      "taskModal"
    )
    .classList.add("show");
}

function closeTaskModal() {

  document
    .getElementById(
      "taskModal"
    )
    .classList.remove("show");
}

/* =========================
   SECTION
========================= */

function showSection(section) {

  document.getElementById("homeSection"
  ).style.display = "none";
  
  document.getElementById(
    "calendarSection"
  ).style.display = "none";

  document.getElementById(
    "habitSection"
  ).style.display = "none";

  document.getElementById(
    "statsSection"
  ).style.display = "none";

  if (section === "home") {
    homeSection.style.display =
      "block";
  }

  if (section === "calendar") {
    calendarSection.style.display =
      "block";
  }

  if (section === "habit") {
    habitSection.style.display =
      "block";
  }

  if (section === "stats") {
    statsSection.style.display =
      "block";
  }
}

/* =========================
   THEME
========================= */

function loadTheme() {

  const theme =
    localStorage.getItem(
      "theme"
    );

  if (theme === "light") {

    document.body.classList.add(
      "light-mode"
    );
  }
}

document
  .getElementById(
    "toggleTheme"
  )
  .onclick = () => {

    document.body.classList.toggle(
      "light-mode"
    );

    localStorage.setItem(
      "theme",

      document.body.classList.contains(
        "light-mode"
      )
        ? "light"
        : "dark"
    );
  };

/* =========================
   EXPORT IMPORT
========================= */

function exportData() {

  const data =
    JSON.stringify(
      state.appData
    );

  const blob =
    new Blob([data], {
      type:
        "application/json"
    });

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  a.download =
    "daily-tracker.json";

  a.click();
}

function importData(event) {

  const file =
    event.target.files[0];

  if (!file) return;

  const reader =
    new FileReader();

  reader.onload = (e) => {

    state.appData =
      JSON.parse(
        e.target.result
      );

    saveToLocal();

    refreshUI();
  };

  reader.readAsText(file);
}

/* =========================
   UNDO REDO
========================= */

function undo() {

  if (
    !state.undoStack.length
  ) return;

  state.redoStack.push(
    JSON.stringify(
      state.appData
    )
  );

  state.appData =
    JSON.parse(
      state.undoStack.pop()
    );

  saveToLocal();

  refreshUI();
}

function redo() {

  if (
    !state.redoStack.length
  ) return;

  state.undoStack.push(
    JSON.stringify(
      state.appData
    )
  );

  state.appData =
    JSON.parse(
      state.redoStack.pop()
    );

  saveToLocal();

  refreshUI();
}

/* =========================
   TOAST
========================= */

function showToast(message){

  const toast =
    document.getElementById(
      "toast"
    );

  toast.innerText =
    message;

  toast.classList.add(
    "show"
  );

  setTimeout(() => {

    toast.classList.remove(
      "show"
    );

  },2500);
}

/* =========================
   EFFECT
========================= */

function celebrate() {

  if (
    typeof confetti !==
    "undefined"
  ) {

    confetti({
      particleCount: 100,
      spread: 70
    });
  }
}




/* =========================
   RENDER CALENDAR
========================= */

function renderCalendar() {

  const grid =
    document.getElementById(
      "calendarGrid"
    );

  const monthText =
    document.getElementById(
      "calendarMonth"
    );

  if (!grid || !monthText) return;

  grid.innerHTML = "";

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember"
  ];

  const days = [
    "Min",
    "Sen",
    "Sel",
    "Rab",
    "Kam",
    "Jum",
    "Sab"
  ];

  const year =
    state.currentDate.getFullYear();

  const month =
    state.currentDate.getMonth();

  monthText.innerText =
    `${months[month]} ${year}`;

  // HEADER HARI
  days.forEach(day => {

    const dayName =
      document.createElement("div");

    dayName.className =
      "calendar-day-name";

    dayName.innerText = day;

    grid.appendChild(dayName);
  });

  // TANGGAL PERTAMA
  const firstDay =
    new Date(year, month, 1)
    .getDay();

  // TOTAL HARI
  const totalDays =
    new Date(year, month + 1, 0)
    .getDate();

  // KOTAK KOSONG
  for (
    let i = 0;
    i < firstDay;
    i++
  ) {

    const empty =
      document.createElement("div");

    grid.appendChild(empty);
  }

  // TANGGAL
  for (
    let day = 1;
    day <= totalDays;
    day++
  ) {

    const dayBox =
      document.createElement("div");

    dayBox.className =
      "calendar-day";

    const today =
      new Date();

    if (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {

      dayBox.classList.add(
        "today"
      );
    }

    // TANGGAL
    const dateText =
      document.createElement("strong");

    dateText.innerText = day;

    dayBox.appendChild(dateText);

    // TASK
    state.appData.forEach(category => {

      category.tasks.forEach(task => {

        if (!task.deadline) return;

        const taskDate =
          new Date(task.deadline);

        if (
          taskDate.getDate() === day &&
          taskDate.getMonth() === month &&
          taskDate.getFullYear() === year
        ) {

          const taskEl =
            document.createElement("div");

          taskEl.className =
            "calendar-task";

          if (task.done) {

            taskEl.classList.add(
              "done-task"
            );
          }

          taskEl.innerText =
  `${category.name} • ${task.name}`;

          dayBox.appendChild(taskEl);
        }
      });
    });

    grid.appendChild(dayBox);
  }
}

/* =========================
   FLOATING BUTTON
========================= */

document
  .getElementById(
    "floatingAddBtn"
  )
  .addEventListener(
    "click",
    () => {

      // CEK CATEGORY ADA
      if (
        state.appData.length === 0
      ) {

        alert(
          "Buat category dulu"
        );

        return;
      }

      // DEFAULT KE CATEGORY PERTAMA
      state.currentCategoryIndex = 
      state.appData.length -1;

      openTaskModal();
    }
  );
  
  /* =========================
   CHANGE MONTH
========================= */

function changeMonth(step) {

  state.currentDate.setMonth(
    state.currentDate.getMonth() + step
  );

  renderCalendar();
}


/* =========================
   SPLASH
========================= */

window.addEventListener(
  "load",
  () => {

    const splash =
      document.getElementById(
        "splashScreen"
      );

    setTimeout(() => {

      splash.classList.add(
        "splash-hide"
      );

    }, 1200);
  }
);

/* =========================
   INSTALL PWA
========================= */

window.addEventListener(
  "beforeinstallprompt",
  (e) => {

    e.preventDefault();

    deferredPrompt = e;

    document.getElementById(
      "installBtn"
    ).style.display =
      "block";
  }
);

document
  .getElementById(
    "installBtn"
  )
  .addEventListener(
    "click",
    async () => {

      if (!deferredPrompt)
        return;

      deferredPrompt.prompt();

      deferredPrompt = null;
    }
  );
  
  /* =========================
   TASK REMINDER
========================= */

function checkDeadlines(){

  if(
    Notification.permission !==
    "granted"
  ) return;

  const today =
    new Date();

  state.appData.forEach(category=>{

    category.tasks.forEach(task=>{

      if(
        task.done ||
        !task.deadline
      ) return;

      const deadline =
        new Date(task.deadline);

      const diff =
        Math.ceil(
          (
            deadline - today
          ) / (1000*60*60*24)
        );

      if(diff === 0){

        new Notification(
          "⏰ Deadline Hari Ini",
          {
            body:task.name
          }
        );

        showToast(
          "Deadline hari ini!"
        );
      }
    });
  });
}

setInterval(
  checkDeadlines,
  60000
);
  
