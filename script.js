
const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "daylight-planner-v1";

const DAYS = [
  "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday", "Sunday"
];

let data = loadData();
let selectedDate = new Date();
let weekStart = getMonday(new Date());
let activeView = "daily";

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};

    return {
      daily: parsed.daily && typeof parsed.daily === "object"
        ? parsed.daily : {},
      weekly: parsed.weekly && typeof parsed.weekly === "object"
        ? parsed.weekly : {}
    };
  } catch {
    return { daily: {}, weekly: {} };
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    alert("Could not save your tasks. Check your browser storage.");
  }
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function getMonday(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  return result;
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function formatDate(date, options = {}) {
  return date.toLocaleDateString("en-IN", options);
}

function getDailyTasks(date = new Date()) {
  return data.daily[dateKey(date)] || [];
}

function getWeeklyTasks(date = selectedDate) {
  return data.weekly[dateKey(date)] || [];
}

function setTasks(type, date, tasks) {
  const key = dateKey(date);

  if (tasks.length === 0) {
    delete data[type][key];
  } else {
    data[type][key] = tasks;
  }

  saveData();
}

function makeId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9);
}

function createTask(text, priority) {
  return {
    id: makeId(),
    text: text.trim(),
    priority,
    completed: false
  };
}

function getProgress(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;

  return {
    total,
    completed,
    percent: total ? Math.round(completed / total * 100) : 0
  };
}

function updateStats(prefix, tasks) {
  const progress = getProgress(tasks);

  $(prefix + "Total").textContent = progress.total;
  $(prefix + "Completed").textContent = progress.completed;
  $(prefix + "Percent").textContent = progress.percent + "%";
  $(prefix + "Progress").style.width = progress.percent + "%";
}

function renderTasks(type, date) {
  const tasks = type === "daily"
    ? getDailyTasks(date)
    : getWeeklyTasks(date);

  const list = $(type + "List");
  const empty = $(type + "Empty");
  const count = $(type + "Count");

  list.replaceChildren();

  count.textContent =
    `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

  empty.classList.toggle("hidden", tasks.length !== 0);

  tasks.forEach(task => {
    const item = document.createElement("div");
    item.className = "task-item";

    if (task.completed) {
      item.classList.add("completed");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Complete task");

    checkbox.addEventListener("change", () => {
      updateTask(type, date, task.id, {
        completed: checkbox.checked
      });
    });

    const content = document.createElement("div");
    content.className = "task-content";

    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = task.text;

    const priority = document.createElement("span");
    priority.className = "priority " + task.priority;
    priority.textContent =
      task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

    content.append(title, priority);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "×";
    deleteBtn.setAttribute("aria-label", "Delete task");

    deleteBtn.addEventListener("click", () => {
      deleteTask(type, date, task.id);
    });

    item.append(checkbox, content, deleteBtn);
    list.appendChild(item);
  });

  updateStats(type === "daily" ? "daily" : "weekly",
    type === "daily" ? getDailyTasks(date) : getAllWeeklyTasks());
}

function updateTask(type, date, id, changes) {
  const tasks = type === "daily"
    ? getDailyTasks(date)
    : getWeeklyTasks(date);

  const updated = tasks.map(task =>
    task.id === id ? { ...task, ...changes } : task
  );

  setTasks(type, date, updated);
  renderAll();
}

function deleteTask(type, date, id) {
  const tasks = type === "daily"
    ? getDailyTasks(date)
    : getWeeklyTasks(date);

  setTasks(type, date, tasks.filter(task => task.id !== id));
  renderAll();
}

function addTask(type, date, text, priority) {
  const tasks = type === "daily"
    ? getDailyTasks(date)
    : getWeeklyTasks(date);

  tasks.push(createTask(text, priority));
  setTasks(type, date, tasks);
  renderAll();
}

function getAllWeeklyTasks() {
  const tasks = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    tasks.push(...getWeeklyTasks(date));
  }

  return tasks;
}

function renderDaily() {
  const tasks = getDailyTasks(new Date());

  renderTasks("daily", new Date());
  updateStats("daily", tasks);
}

function renderWeek() {
  const daysContainer = $("weekDays");
  daysContainer.replaceChildren();

  const today = dateKey(new Date());

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const key = dateKey(date);
    const tasks = getWeeklyTasks(date);
    const progress = getProgress(tasks);

    const button = document.createElement("button");
    button.className = "day-card";

    if (key === dateKey(selectedDate)) {
      button.classList.add("selected");
    }

    if (key === today) {
      button.classList.add("today");
    }

    const dayName = document.createElement("span");
    dayName.className = "day-name";
    dayName.textContent = DAYS[i].slice(0, 3);

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = date.getDate();

    const dayProgress = document.createElement("span");
    dayProgress.className = "day-progress";
    dayProgress.textContent =
      tasks.length ? `${progress.completed}/${progress.total}` : "—";

    button.append(dayName, dayNumber, dayProgress);

    button.addEventListener("click", () => {
      selectedDate = new Date(date);
      renderAll();
    });

    daysContainer.appendChild(button);
  }

  const end = addDays(weekStart, 6);

  $("weekLabel").textContent =
    `${formatDate(weekStart, { day: "numeric", month: "short" })} – ` +
    `${formatDate(end, { day: "numeric", month: "short", year: "numeric" })}`;

  $("selectedDayTitle").textContent =
    formatDate(selectedDate, {
      weekday: "long",
      day: "numeric",
      month: "short"
    });

  $("selectedDayLabel").textContent =
    dateKey(selectedDate) === today ? "TODAY" : "SELECTED DAY";

  renderTasks("weekly", selectedDate);
  updateStats("weekly", getAllWeeklyTasks());
}

function renderAll() {
  renderDaily();
  renderWeek();
}

function switchView(view) {
  activeView = view;

  $("dailyView").classList.toggle("hidden", view !== "daily");
  $("weeklyView").classList.toggle("hidden", view !== "weekly");

  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });
}

// DAILY FORM

$("dailyForm").addEventListener("submit", event => {
  event.preventDefault();

  const input = $("dailyInput");
  const text = input.value.trim();

  if (!text) return;

  addTask(
    "daily",
    new Date(),
    text,
    $("dailyPriority").value
  );

  input.value = "";
  input.focus();
});

// WEEKLY FORM

$("weeklyForm").addEventListener("submit", event => {
  event.preventDefault();

  const input = $("weeklyInput");
  const text = input.value.trim();

  if (!text) return;

  addTask(
    "weekly",
    selectedDate,
    text,
    $("weeklyPriority").value
  );

  input.value = "";
  input.focus();
});

// NAVIGATION

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    switchView(tab.dataset.view);
  });
});

$("prevWeek").addEventListener("click", () => {
  weekStart = addDays(weekStart, -7);
  selectedDate = addDays(selectedDate, -7);
  renderAll();
});

$("nextWeek").addEventListener("click", () => {
  weekStart = addDays(weekStart, 7);
  selectedDate = addDays(selectedDate, 7);
  renderAll();
});

$("thisWeek").addEventListener("click", () => {
  selectedDate = new Date();
  weekStart = getMonday(selectedDate);
  renderAll();
});

// CLEAR COMPLETED

$("clearDaily").addEventListener("click", () => {
  const tasks = getDailyTasks(new Date());
  setTasks(
    "daily",
    new Date(),
    tasks.filter(task => !task.completed)
  );
  renderAll();
});

$("clearWeekly").addEventListener("click", () => {
  const tasks = getWeeklyTasks(selectedDate);
  setTasks(
    "weekly",
    selectedDate,
    tasks.filter(task => !task.completed)
  );
  renderAll();
});

// RESET

$("resetAll").addEventListener("click", () => {
  const confirmed = confirm(
    "Delete ALL daily and weekly tasks? This cannot be undone."
  );

  if (!confirmed) return;

  data = { daily: {}, weekly: {} };
  saveData();
  renderAll();
});

// INITIALIZE

function initialize() {
  const now = new Date();
  const hour = now.getHours();

  let greeting = "Good evening!";

  if (hour < 12) greeting = "Good morning!";
  else if (hour < 17) greeting = "Good afternoon!";

  $("greeting").textContent = greeting;

  $("todayDate").textContent = formatDate(now, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  renderAll();
}

initialize();