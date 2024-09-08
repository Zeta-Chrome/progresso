let currentTheme = 'light';
let skills = [];
let hoursWorkedDict = {}
let currentDate = new Date();
let openSkillIds = new Set();
let selectedDate = null;

const Pages = ["progressPage", "calendarPage", "chartPage"]

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setCurrentTheme();
  setupEventListeners();
  showProgressPage();
});

function loadData() {
  const savedData = localStorage.getItem('ProgressoData');

  if (savedData) {
    const data = JSON.parse(savedData);
    currentTheme = data.currentTheme || 'light';
    skills = data.skills || [];
    hoursWorkedDict = data.hoursWorkedDict || {};
    selectedDate = data.selectedDate ? new Date(data.selectedDate) : null;
    currentDate = new Date();
  }
}

function setCurrentTheme() {
  document.body.classList.toggle('dark-mode', currentTheme === 'dark');
  document.getElementById('themeToggle').textContent = currentTheme === 'light' ? '🌙' : '☀️';
}

function setupEventListeners() {
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('progressButton').addEventListener('click', showProgressPage);
  document.getElementById('calendarButton').addEventListener('click', showCalendarPage);
  document.getElementById('chartButton').addEventListener('click', showChartPage);
  document.getElementById('addSkillButton').addEventListener('click', () => addSkill());
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.classList.toggle('dark-mode');
  document.getElementById('themeToggle').textContent = currentTheme === 'light' ? '🌙' : '☀️';
  renderCalendar();
  renderChart();
}

function showPage(page) {
  // Hide all pages
  Pages.forEach(pageId => {
    document.getElementById(pageId).style.display = 'none';
  });

  // Show a specific page (for example, 'calendarPage')
  document.getElementById(page).style.display = 'block';
}

function showProgressPage() {
  showPage("progressPage");
  renderSkills();
}

function showCalendarPage() {
  showPage("calendarPage");
  renderCalendar();
}

function showChartPage() {
  showPage("chartPage");
  renderChart();
}

function addSkill(parentId = null) {
  
  const newSkill = {
    id: Date.now(),
    name: "",
    skills: [],
    tasks: [],
    hours: 0,
    isEditing: true
  };

  if (parentId) {
    const parentSkill = findSkillById(parentId);
    if (parentSkill) {
      parentSkill.skills.push(newSkill);
      renderSkill(newSkill, document.querySelector(`#skill-${parentId} > .skill-details > .skills`));
    }
  } else {
    skills.push(newSkill);
    renderSkill(newSkill, document.getElementById('skillsList'));
  }
  updateOverallProgress();
}

function findSkillById(id, skillList = skills) {
  for (const skill of skillList) {
    if (skill.id === id) return skill;
    const subskill = findSkillById(id, skill.skills);
    if (subskill) return subskill;
  }
  return null;
}

function renderSkills() {
  const skillsList = document.getElementById('skillsList');
  skillsList.innerHTML = '';
  skills.forEach(skill => renderSkill(skill, skillsList));
  updateOverallProgress();
  setupDragAndDrop();
}

function renderSkill(skill, container) {
  const skillElement = createSkillElement(skill);
  container.appendChild(skillElement);
  skill.skills.forEach(subskill => renderSkill(subskill, skillElement.querySelector('.skills')));
  updateSkillProgress(skill);
}

function createSkillElement(skill) {
  const skillElement = document.createElement('div');
  skillElement.className = 'skill';
  skillElement.id = `skill-${skill.id}`;

  const skillHeader = createSkillHeader(skill);
  const detailsContainer = createDetailsContainer(skill);

  skillElement.appendChild(skillHeader);
  skillElement.appendChild(detailsContainer);

  return skillElement;
}

function createSkillHeader(skill) {
  const skillHeader = document.createElement('div');
  skillHeader.className = 'skill-header';

  const nameElement = skill.isEditing 
    ? `<input type="text" class="skill-name-input" value="${skill.name}">`
    : `<h3 class="skill-name">${skill.name}</h3>`;
  skillHeader.innerHTML = `
    <button class="toggle-details">${openSkillIds.has(skill.id) ? '▲' : '▼'}</button>
    <div class="skill-name-container">
      ${nameElement}
      <button class="edit-skill">✏️</button>
    </div>
    <button class="delete-skill">🗑️</button>
  `;

  addSkillHeaderEventListeners(skillHeader, skill);

  return skillHeader;
}

function createDetailsContainer(skill) {
  const detailsContainer = document.createElement('div');
  detailsContainer.className = 'skill-details';
  detailsContainer.style.maxHeight = openSkillIds.has(skill.id) ? 'none' : '0';
  detailsContainer.style.opacity = openSkillIds.has(skill.id) ? '1' : '0';
  detailsContainer.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
  detailsContainer.innerHTML = `
    <div class="progress-bar">
      <div class="progress" style="width: ${calculateProgress(skill)}%"></div>
    </div>
    <input type="number" value="${skill.hours}" min="0" step="0.5" class="hours-input">
    <button class="add-skill">+ Skill</button>
    <button class="add-task">+ Task</button>
    <div class="tasks"></div>
    <div class="skills"></div>
  `;

  addDetailsContainerEventListeners(detailsContainer, skill);

  renderTasks(detailsContainer.querySelector('.tasks'), skill);

  return detailsContainer;
}

function addSkillHeaderEventListeners(skillHeader, skill) {
  const toggleButton = skillHeader.querySelector('.toggle-details');
  const editButton = skillHeader.querySelector('.edit-skill');
  const deleteButton = skillHeader.querySelector('.delete-skill');

  toggleButton.addEventListener('click', () => toggleSkillDetails(skill, skillHeader));
  editButton.addEventListener('click', () => toggleSkillEditing(skill));
  deleteButton.addEventListener('click', () => deleteSkill(skill.id));

  if (skill.isEditing) {
    const input = skillHeader.querySelector('.skill-name-input');
    input.addEventListener('blur', () => finishEditing(skill, input));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') input.blur();
    });
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }, 0);
  }
}

function addDetailsContainerEventListeners(detailsContainer, skill) {
  const hoursInput = detailsContainer.querySelector('.hours-input');
  const addSkillButton = detailsContainer.querySelector('.add-skill');
  const addTaskButton = detailsContainer.querySelector('.add-task');
  const tasksContainer = detailsContainer.querySelector('.tasks');

  hoursInput.addEventListener('change', (e) => updateSkillHours(skill, e.target.value));
  addSkillButton.addEventListener('click', (e) => {
    e.stopPropagation();
    addSkill(skill.id);
  });
  addTaskButton.addEventListener('click', (e) => {
    e.stopPropagation();
    addTask(skill);
  });
  tasksContainer.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      e.preventDefault();
      const taskElement = e.target.closest('.task');
      if (taskElement) {
        setupTaskDragAndDrop(taskElement, tasksContainer, skill);
      }
    }
  });
}

function toggleSkillDetails(skill, skillHeader) {
  const detailsContainer = skillHeader.nextElementSibling;
  const isDetailsVisible = detailsContainer.style.maxHeight === '0px';
  detailsContainer.style.maxHeight = isDetailsVisible ? 'none' : '0';
  detailsContainer.style.opacity = isDetailsVisible ? '1' : '0';
  skillHeader.querySelector('.toggle-details').textContent = isDetailsVisible ? '▲' : '▼';
  isDetailsVisible ? openSkillIds.add(skill.id) : openSkillIds.delete(skill.id);
}

function toggleSkillEditing(skill) {
  skill.isEditing = !skill.isEditing;
  const skillElement = document.getElementById(`skill-${skill.id}`);
  const newSkillElement = createSkillElement(skill);
  skillElement.parentNode.replaceChild(newSkillElement, skillElement);
}

function finishEditing(skill, input) {
  skill.name = input.value.trim() || "";
  skill.isEditing = false;
  const skillElement = document.getElementById(`skill-${skill.id}`);
  const newSkillElement = createSkillElement(skill);
  skillElement.parentNode.replaceChild(newSkillElement, skillElement);
}

function updateSkillHours(skill, newValue) {
  const newHours = parseFloat(newValue) || 0;
  const hoursDiff = newHours - skill.hours;
  const formattedDate = formatDate(currentDate);
  
  hoursWorkedDict[formattedDate] = (hoursWorkedDict[formattedDate] || 0) + hoursDiff;
  skill.hours = newHours;
  updateSkillProgress(skill);
  updateOverallProgress();
  renderCalendar();
}

function deleteSkill(id) {
  const skillToDelete = findSkillById(id);
  if (!skillToDelete) return;

  const parentSkill = findParentSkill(id);
  if (parentSkill) {
    parentSkill.skills = parentSkill.skills.filter(s => s.id !== id);
    updateSkillProgress(parentSkill);
  } else {
    skills = skills.filter(s => s.id !== id);
  }

  const skillElement = document.getElementById(`skill-${id}`);
  if (skillElement) skillElement.remove();

  updateOverallProgress();
}

function findParentSkill(childId, skillList = skills) {
  for (const skill of skillList) {
    if (skill.skills && skill.skills.some(s => s.id === childId)) return skill;
    const found = findParentSkill(childId, skill.skills);
    if (found) return found;
  }
  return null;
}

function addTask(skill) {
  const taskId = Date.now();
  const taskElement = document.createElement('div');
  taskElement.className = 'task';
  taskElement.dataset.taskId = taskId;
  taskElement.innerHTML = `
    <div class="task-content">
      <input type="text" class="task-name-input" value="" placeholder="Enter task name">
      <input type="checkbox">
      <button class="delete-task">🗑️</button>
    </div>
  `;
  
  const tasksElement = document.querySelector(`#skill-${skill.id} .tasks`);
  tasksElement.appendChild(taskElement);

  const input = taskElement.querySelector('.task-name-input');
  input.focus();

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const taskName = input.value.trim();
      if (taskName) {
        skill.tasks.push({ id: taskId, name: taskName, completed: false });
        renderTasks(tasksElement, skill);
        updateSkillProgress(skill);
        updateOverallProgress();
        taskElement.remove();
      }
    }
  });

  taskElement.querySelector('.delete-task').addEventListener('click', () => {
    taskElement.remove();
  });
}

function renderTasks(tasksElement, skill) {
  tasksElement.innerHTML = '';
  skill.tasks.forEach(task => {
    const taskElement = document.createElement('div');
    taskElement.className = 'task';
    taskElement.dataset.taskId = task.id;
    taskElement.innerHTML = `
      <div class="task-content">
        <input type="checkbox" ${task.completed ? 'checked' : ''}>
        <span>${task.name}</span>
      </div>
      <button class="delete-task">🗑️</button>
    `;
    
    taskElement.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      task.completed = e.target.checked;
      task.date = currentDate;
      updateSkillProgress(skill);
      updateOverallProgress();
    });

    taskElement.querySelector('.delete-task').addEventListener('click', () => {
      skill.tasks = skill.tasks.filter(t => t.id !== task.id);
      renderTasks(tasksElement, skill);
      updateSkillProgress(skill);
      updateOverallProgress();
    });

    tasksElement.appendChild(taskElement);
  });
}

function calculateTotalTasks(skill) {
  if (skill.skills.length > 0)
    return skill.tasks.length + skill.skills.reduce((sum, subskill) => sum + calculateTotalTasks(subskill), 0);
  else
  return skill.tasks.length;
}

function calculateCompletedTasks(skill) {
  if (skill.skills.length > 0)
    return skill.tasks.filter(task => task.completed).length + skill.skills.reduce((sum, subskill) => sum + calculateCompletedTasks(subskill), 0);
  else
    return skill.tasks.filter(task => task.completed).length;
}

function calculateProgress(skill) {
  const totalTasks = calculateTotalTasks(skill);
  const completedTasks = calculateCompletedTasks(skill);
  return totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
}

function updateSkillProgress(skill) {
  const progress = calculateProgress(skill);
  const skillElement = document.getElementById(`skill-${skill.id}`);
  if (skillElement) {
    const progressBar = skillElement.querySelector('.progress-bar .progress');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }
  
  const parentSkill = findParentSkill(skill.id);
  if (parentSkill) {
    updateSkillProgress(parentSkill);
  }
}

function updateOverallProgress() {
  const totalTasks = skills.reduce((sum, skill) => sum + calculateTotalTasks(skill), 0);
  const completedTasks = skills.reduce((sum, skill) => sum + calculateCompletedTasks(skill), 0);
  const progress = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
  document.querySelector('#overallProgress .progress-bar').style.width = `${progress}%`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setupDragAndDrop() {
  const skillsList = document.getElementById('skillsList');
  let draggedElement = null;

  document.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // Right mouse button
      e.preventDefault();
      draggedElement = e.target.closest('.skill');
      if (draggedElement) {
        draggedElement.style.opacity = '0.5';
      }
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (draggedElement) {
      const hoverElement = e.target.closest('.skill');
      if (hoverElement && hoverElement !== draggedElement && isSameLevel(draggedElement, hoverElement)) {
        const rect = hoverElement.getBoundingClientRect();
        const hoverMiddle = (rect.bottom - rect.top) / 2;
        if (e.clientY - rect.top < hoverMiddle) {
          hoverElement.parentNode.insertBefore(draggedElement, hoverElement);
        } else {
          hoverElement.parentNode.insertBefore(draggedElement, hoverElement.nextSibling);
        }
      }
    }
  });

  document.addEventListener('mouseup', () => {
    if (draggedElement) {
      draggedElement.style.opacity = '1';
      updateSkillsOrder(draggedElement.closest('.skills') || skillsList);
      draggedElement = null;
    }
  });

  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
}

function isSameLevel(elem1, elem2) {
  return elem1.parentNode === elem2.parentNode;
}

function setupTaskDragAndDrop(taskElement, container, skill) {
  let draggedTask = taskElement;
  draggedTask.style.opacity = '0.5';

  const mouseMoveHandler = (e) => {
    const hoverElement = e.target.closest('.task');
    if (hoverElement && hoverElement !== draggedTask && hoverElement.parentNode === container) {
      const rect = hoverElement.getBoundingClientRect();
      const hoverMiddle = (rect.bottom - rect.top) / 2;
      if (e.clientY - rect.top < hoverMiddle) {
        container.insertBefore(draggedTask, hoverElement);
      } else {
        container.insertBefore(draggedTask, hoverElement.nextSibling);
      }
    }
  };

  const mouseUpHandler = () => {
    draggedTask.style.opacity = '1';
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
    updateTasksOrder(skill, container);
  };

  document.addEventListener('mousemove', mouseMoveHandler);
  document.addEventListener('mouseup', mouseUpHandler);
}

function updateTasksOrder(skill, container) {
  const taskElements = container.querySelectorAll('.task');
  skill.tasks = Array.from(taskElements).map(el => {
    const taskId = parseInt(el.dataset.taskId);
    return skill.tasks.find(task => task.id === taskId);
  });
}

function updateSkillsOrder(container) {
  const skillElements = container.children;
  const newOrder = Array.from(skillElements).map(el => {
    const skillId = parseInt(el.id.split('-')[1]);
    return findSkillById(skillId);
  });

  if (container.id === 'skillsList') {
    skills = newOrder;
  } else {
    const parentSkillId = parseInt(container.closest('.skill').id.split('-')[1]);
    const parentSkill = findSkillById(parentSkillId);
    if (parentSkill) {
      parentSkill.skills = newOrder;
    }
  }
}

function renderCalendar() {
  const calendarHeader = document.getElementById('calendarHeader');
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';
  calendarHeader.innerHTML = '';
  
  const createButton = (text, action) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', action);
    return button;
  };

  calendarHeader.appendChild(createButton('<<', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  }));

  selectedDate = selectedDate || currentDate;

  const selectedDateDisplay = document.createElement('h2');
  selectedDateDisplay.id = 'currentDateDisplay';
  selectedDateDisplay.textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  calendarHeader.appendChild(selectedDateDisplay);

  calendarHeader.appendChild(createButton('>>', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  }));

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const today = new Date();

  const createDayElement = (day) => {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = day;

    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const hoursWorked = calculateHoursWorked(date);
    const maxHours = 12;
    const normalizedHours = Math.min(hoursWorked / maxHours, 1);

    const hue = 250 * normalizedHours;
    const saturation = 30;
    
    // Check if the body has the dark-mode class
    const isDarkMode = document.body.classList.contains('dark-mode');
    const lightness = isDarkMode ? 25 * 1.5 : 25 * 2.5;

    dayElement.style.backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    if (date.toDateString() === today.toDateString()) {
      dayElement.classList.add('current-day');
    }

    if (date.toDateString() === selectedDate.toDateString()) {
      dayElement.classList.add('selected-day');
    }

    dayElement.addEventListener('click', () => {
      selectedDate = date;
      renderCalendar();
      updateRightPanel(date);
    });

    return dayElement;
  };

  calendar.append(
    ...Array(firstDay).fill().map(() => {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day empty';
      return emptyDay;
    }),
    ...Array(daysInMonth).fill().map((_, index) => createDayElement(index + 1))
  );

  updateRightPanel(selectedDate);
}

function calculateHoursWorked(date) {
  return hoursWorkedDict[formatDate(date)] || 0;
}

function updateRightPanel(date) {
  const selectedDate = document.getElementById('selectedDate');
  const hoursSpent = document.getElementById('hoursSpent');
  const taskList = document.getElementById('taskList');

  selectedDate.textContent = date.toDateString();
  hoursSpent.textContent = calculateHoursWorked(date);

  const tasks = getTasksForDate(date);
  taskList.innerHTML = tasks.length
    ? tasks.map(task => `<li>${task.name}</li>`).join('')
    : 'No tasks completed.';
}

function getTasksForDate(date) {
  return skills.flatMap(skill => 
    getAllTasksFromSkill(skill).filter(task => 
      task.completed && 
      new Date(task.date).toDateString() === date.toDateString()
    )
  );
}

function getAllTasksFromSkill(skill) {
  let tasks = [...skill.tasks];
  if (skill.skills && skill.skills.length > 0) {
    skill.skills.forEach(subskill => {
      tasks = tasks.concat(getAllTasksFromSkill(subskill));
    });
  }
  return tasks;
}

function renderChart() {
  const chartPage = document.getElementById('chartPage');
  chartPage.innerHTML = '';

  const chartTitle = document.createElement('h2');
  chartTitle.id = 'chartTitle';
  chartPage.appendChild(chartTitle);

  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'buttonContainer';
  chartPage.appendChild(buttonContainer);

  const createButton = (text, action) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', action);
    return button;
  };

  let currentView = 'week';
  let currentStartDate = new Date(currentDate);
  currentStartDate.setDate(currentStartDate.getDate() - currentStartDate.getDay());
  console.log(currentStartDate);
  const updateChart = () => {
    const endDate = new Date(currentStartDate);
    let days, title, labels;
  
    switch (currentView) {
      case 'week':
        days = 7;
        endDate.setDate(endDate.getDate() + 6);
        console.log(endDate);
        title = `Week of ${currentStartDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
        labels = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(currentStartDate);
          date.setDate(date.getDate() + i);
          return date.toLocaleDateString('en-US', { weekday: 'short' });
        });
        break;
      case 'month':
        days = new Date(currentStartDate.getFullYear(), currentStartDate.getMonth() + 1, 0).getDate();
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        title = currentStartDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        labels = Array.from({ length: days }, (_, i) => i + 1);
        break;
      case 'year':
        days = 365;
        endDate.setFullYear(endDate.getFullYear() + 1);
        endDate.setDate(0);
        title = currentStartDate.getFullYear().toString();
        
        // Generate labels for each day of the year with month names only at the beginning of each month
        labels = Array.from({ length: 365 }, (_, i) => {
          const date = new Date(title, 0, i + 1); // Start from January 1st
          return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
        });
        
        break;
    }
  
    chartTitle.textContent = title;
  
    const data = [];
    let maxHours = 8;
  
    for (let i = 0; i < days; i++) {
      const date = new Date(currentStartDate);
      if (currentView === 'year') {
        date.setDate(date.getDate() + i);
        const hours = calculateHoursWorked(date);
        data.push(hours);
        maxHours = Math.max(maxHours, hours);
      } else if (currentView === 'month') {
        date.setDate(date.getDate() + i);
        const hours = calculateHoursWorked(date);
        data.push(hours);
        maxHours = Math.max(maxHours, hours);
      } else if (currentView === 'week') {
        date.setDate(date.getDate() + i);
        const hours = calculateHoursWorked(date);
        data.push(hours);
        maxHours = Math.max(maxHours, hours);
      }
    }
  
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    chartContainer.appendChild(canvas);
  
    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: data.map(d => {
            const normalizedHours = Math.min(d / maxHours, 1);
            const hue = 250 * normalizedHours;
            const saturation = 30;
            const lightness = 25 * (currentTheme === 'light' ? 2.5 : 1);
            return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          }),
          barPercentage: 1,
          categoryPercentage: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              callback: function(value, index) {
                // Show month names only for the beginning of each month in the 'year' view
                if (currentView === 'year' && labels[value] !== '') {
                  return labels[value];
                } else if (currentView === 'year') {
                  return '';
                } else {
                  return labels[index];
                }
              }
            }
          },
          y: {
            beginAtZero: true,
            max: maxHours
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  };

  buttonContainer.appendChild(createButton('<<', () => {
    switch (currentView) {
      case 'week':
        currentStartDate.setDate(currentStartDate.getDate() - 7);
        break;
      case 'month':
        currentStartDate.setMonth(currentStartDate.getMonth() - 1);
        break;
      case 'year':
        currentStartDate.setFullYear(currentStartDate.getFullYear() - 1);
        break;
    }
    updateChart();
  }));

  ['Week', 'Month', 'Year'].forEach(view => {
    const button = createButton(view, () => {
      currentView = view.toLowerCase();
      currentStartDate = new Date(selectedDate);
      if (currentView === 'week') {
        currentStartDate = new Date(currentDate);
        currentStartDate.setDate(currentStartDate.getDate() - currentStartDate.getDay());
      } else if (currentView === 'month') {
        currentStartDate.setDate(1);
      } else if (currentView === 'year') {
        currentStartDate.setMonth(0, 1);
      }
      updateChart();
    });
    buttonContainer.appendChild(button);
  });

  buttonContainer.appendChild(createButton('>>', () => {
    switch (currentView) {
      case 'week':
        currentStartDate.setDate(currentStartDate.getDate() + 7);
        break;
      case 'month':
        currentStartDate.setMonth(currentStartDate.getMonth() + 1);
        break;
      case 'year':
        currentStartDate.setFullYear(currentStartDate.getFullYear() + 1);
        break;
    }
    updateChart();
  }));

  const chartContainer = document.createElement('div');
  chartContainer.id = 'chartContainer';
  chartPage.appendChild(chartContainer);

  updateChart();
}

function saveData() {
  const data = {
    currentTheme,
    skills,
    hoursWorkedDict,
    selectedDate: selectedDate ? selectedDate.toISOString() : null,
  };

  localStorage.setItem('ProgressoData', JSON.stringify(data));
}

// Listen for the quit signal from the main process
window.electronAPI.onAppQuitting(() => {
  saveData();
  window.electronAPI.dataSaved();
});

// Call saveData when the page is about to unload
window.addEventListener('beforeunload', () => {
  saveData();
});
