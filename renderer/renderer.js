let currentTheme = 'light';
let skills = [];
let hoursWorkedDict = {}
let currentDate = new Date();
let openSkillIds = new Set();
let selectedDate = null;

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
  renderSkills();
  renderCalendar();
});

function setupEventListeners() {
  document.getElementById('progressButton').addEventListener('click', showProgressPage);
  document.getElementById('calendarButton').addEventListener('click', showCalendarPage);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('addSkillButton').addEventListener('click', () => {addSkill(null);});
}

function showProgressPage() {
  document.getElementById('progressPage').style.display = 'block';
  document.getElementById('calendarPage').style.display = 'none';
}

function showCalendarPage() {
  document.getElementById('progressPage').style.display = 'none';
  document.getElementById('calendarPage').style.display = 'block';
  renderCalendar();
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.classList.toggle('dark-mode');
  document.getElementById('themeToggle').textContent = currentTheme === 'light' ? '🌙' : '☀️';
  renderCalendar();
}

function addSkill(parentId = null) {
  const skillCount = parentId ? findSkillById(parentId).subskills.length : skills.length;
  const newSkill = {
    id: Date.now(),
    name: ``,
    subskills: [],
    tasks: [],
    hours: 0,
    isEditing: true  // Start in editing mode
  };
  
  if (parentId) {
    const parent = findSkillById(parentId);
    if (parent) {
      parent.subskills.push(newSkill);
    }
  } else {
    skills.push(newSkill);
  }
  renderSkills();
}

function findSkillById(id, skillList = skills) {
  for (const skill of skillList) {
    if (skill.id === id) return skill;
    const subskill = findSkillById(id, skill.subskills);
    if (subskill) return subskill;
  }
  return null;
}

function renderSkills() {
  const skillsList = document.getElementById('skillsList');
  skillsList.innerHTML = '';
  skills.forEach(skill => {
    const skillElement = createSkillElement(skill);
    skillsList.appendChild(skillElement);
    updateSkillProgress(skill);
  });
  updateOverallProgress();
}

function createSkillElement(skill) {
  const skillElement = document.createElement('div');
  skillElement.className = 'skill';
  skillElement.id = `skill-${skill.id}`;  // Add an ID for easy selection

  // Create a container for the skill's header and details
  const skillHeader = document.createElement('div');
  skillHeader.className = 'skill-header';

  // Create the skill name input or display
  const nameElement = skill.isEditing 
    ? `<input type="text" class="skill-name-input" value="${skill.name}">`
    : `<h3 class="skill-name">${skill.name}</h3>`;
  skillHeader.innerHTML = `
    <button class="toggle-details">${openSkillIds.has(skill.id) ? '▲' : '▼'}</button>
    <div class="skill-name-container">
      ${nameElement}
      <button class="edit-skill">✏️</button>
    </div>
    <button class="delete-skill">🗑️</button> <!-- Updated delete button -->
  `;

  // Create a container for the skill's details
  const detailsContainer = document.createElement('div');
  detailsContainer.className = 'skill-details';
  detailsContainer.style.maxHeight = openSkillIds.has(skill.id) ? 'none' : '0'; // No height limit or initially hidden
  detailsContainer.style.opacity = openSkillIds.has(skill.id) ? '1' : '0';
  detailsContainer.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
  detailsContainer.innerHTML = `
    <div class="progress-bar">
      <div class="progress" style="width: ${calculateProgress(skill)}%"></div>
    </div>
    <input type="number" value="${skill.hours}" min="0" step="0.5" class="hours-input">
    <button class="add-subskill">+ Subskill</button>
    <button class="add-task">+ Task</button>
    <div class="tasks"></div>
    <div class="subskills"></div>
  `;

  // Add event listener to toggle details
  skillHeader.querySelector('.toggle-details').addEventListener('click', () => {
    const isDetailsVisible = detailsContainer.style.maxHeight === '0px';
    detailsContainer.style.maxHeight = isDetailsVisible ? 'none' : '0'; // No max height limit
    detailsContainer.style.opacity = isDetailsVisible ? '1' : '0';
    skillHeader.querySelector('.toggle-details').textContent = isDetailsVisible ? '▲' : '▼';
    if (isDetailsVisible) {
      openSkillIds.add(skill.id);
    } else {
      openSkillIds.delete(skill.id);
    }
  });

  // Handle editing
  const input = skillHeader.querySelector('.skill-name-input, .skill-name');
  const editButton = skillHeader.querySelector('.edit-skill');
  const deleteButton = skillHeader.querySelector('.delete-skill');

  editButton.addEventListener('click', () => {
    skill.isEditing = !skill.isEditing;
    renderSkills();
  });

  if (skill.isEditing) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    input.addEventListener('blur', () => {
      skill.name = input.value.trim() || `Skill ${skills.indexOf(skill) + 1}`;
      skill.isEditing = false;
      renderSkills();
    });
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    });
  }

  // Add delete button event listener
  deleteButton.addEventListener('click', () => {
    deleteSkill(skill.id);
  });

  // Event listeners for the hours input and add buttons
  detailsContainer.querySelector('.hours-input').addEventListener('change', (e) => {
    const newHours = (parseFloat(e.target.value) || 0 ) - skill.hours;
    const formattedDate = formatDate(currentDate);
    
    // Update the hours worked on the selected date
    hoursWorkedDict[formattedDate] = (hoursWorkedDict[formattedDate] || 0) + newHours;
    
    // Update the skill's hours
    skill.hours = parseFloat(e.target.value) || 0;
    
    // Re-render calendar to reflect changes
    renderCalendar();
  });

  // Prevent dropdown toggle from closing when adding subskill or task
  detailsContainer.querySelector('.add-subskill').addEventListener('click', (e) => {
    e.stopPropagation();  // Prevent event from propagating to the toggle button
    addSkill(skill.id);
  });

  detailsContainer.querySelector('.add-task').addEventListener('click', (e) => {
    e.stopPropagation();  // Prevent event from propagating to the toggle button
    addTask(skill);
  });

  // Render tasks and subskills
  renderTasks(detailsContainer.querySelector('.tasks'), skill);
  skill.subskills.forEach(subskill => {
    const subskillElement = createSkillElement(subskill);
    subskillElement.classList.add('subskill');
    detailsContainer.querySelector('.subskills').appendChild(subskillElement);
  });

  // Append header and details container to the skill element
  skillElement.appendChild(skillHeader);
  skillElement.appendChild(detailsContainer);

  // Focus the input field if it is in editing mode
  if (skill.isEditing) {
    setTimeout(() => {
      const newInput = skillElement.querySelector('.skill-name-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
      }
    }, 0);  // Use setTimeout to ensure the element is added to the DOM
  }

  return skillElement;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so add 1
  const day = String(date.getDate()).padStart(2, '0'); // Pad single-digit days with leading zero
  
  return `${year}-${month}-${day}`;
}

function deleteSkill(id) {
  skills = skills.filter(skill => skill.id !== id);
  skills.forEach(skill => deleteSubskill(skill, id));
  renderSkills();
}

function deleteSubskill(skill, id) {
  skill.subskills = skill.subskills.filter(subskill => subskill.id !== id);
  skill.subskills.forEach(subskill => deleteSubskill(subskill, id));
}

function addTask(skill) {
  const taskId = Date.now();  // Generate a unique ID for the task
  const taskElement = document.createElement('div');
  taskElement.className = 'task';
  taskElement.dataset.taskId = taskId;  // Store the task ID in a data attribute
  taskElement.innerHTML = `
    <div class="task-content">
      <input type="text" class="task-name-input" value="" placeholder="Enter task name">
      <input type="checkbox">
      <button class="delete-task">🗑️</button>
    </div>
  `;
  
  // Append the new task element to the skill's tasks container
  const tasksElement = document.querySelector(`#skill-${skill.id} .tasks`);
  tasksElement.appendChild(taskElement);

  // Focus the input field for the new task
  const input = taskElement.querySelector('.task-name-input');
  input.focus();

  // Save the task when Enter is pressed
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const taskName = input.value.trim();
      if (taskName) {
        skill.tasks.push({ id: taskId, name: taskName, completed: false });
        renderTasks(tasksElement, skill);
        renderSkills();
        taskElement.remove(); // Remove the task element after saving
      }
    }
  });

  // Handle task deletion
  taskElement.querySelector('.delete-task').addEventListener('click', () => {
    taskElement.remove(); // Remove the task element when deleted
  });
}

function renderTasks(tasksElement, skill) {
  tasksElement.innerHTML = '';
  skill.tasks.forEach(task => {
    const taskElement = document.createElement('div');
    taskElement.className = 'task';
    taskElement.dataset.taskId = task.id;  // Store the task ID in a data attribute
    taskElement.innerHTML = `
      <div class="task-content">
        <input type="checkbox" ${task.completed ? 'checked' : ''}>
        <span>${task.name}</span>
      </div>
      <button class="delete-task">🗑️</button> <!-- Added delete button -->
    `;
    
    // Event listener for task checkbox
    taskElement.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      task.completed = e.target.checked;
      task.date = currentDate
      renderSkills();
    });

    // Event listener for delete button
    taskElement.querySelector('.delete-task').addEventListener('click', () => {
      skill.tasks = skill.tasks.filter(t => t.id !== task.id);
      renderTasks(tasksElement, skill);
      renderSkills();
    });

    tasksElement.appendChild(taskElement);
  });
}


function calculateTotalTasks(skill) {
  return skill.tasks.length + skill.subskills.reduce((sum, subskill) => sum + calculateTotalTasks(subskill), 0);
}

function calculateCompletedTasks(skill) {
  return skill.tasks.filter(task => task.completed).length + skill.subskills.reduce((sum, subskill) => sum + calculateCompletedTasks(subskill), 0);
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
  
  // Update parent skill if exists
  if (skill.parentId) {
    const parentSkill = findSkillById(skill.parentId);
    if (parentSkill) {
      updateSkillProgress(parentSkill);
    }
  }
}

function updateOverallProgress() {
  const totalTasks = skills.reduce((sum, skill) => sum + calculateTotalTasks(skill), 0);
  const completedTasks = skills.reduce((sum, skill) => sum + calculateCompletedTasks(skill), 0);
  const progress = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
  document.querySelector('#overallProgress .progress-bar').style.width = `${progress}%`;
}

function renderCalendar() {
  const calendarHeader = document.getElementById('calendarHeader');
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';
  calendarHeader.innerHTML = '';

  const prevButton = document.createElement('button');
  prevButton.textContent = '<';
  prevButton.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  calendarHeader.appendChild(prevButton);

  if(!selectedDate) {
    selectedDate = currentDate;
  }

  const selectedDateDisplay = document.createElement('h2');
  selectedDateDisplay.id = 'currentDateDisplay';
  selectedDateDisplay.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`;
  calendarHeader.appendChild(selectedDateDisplay);

  const nextButton = document.createElement('button');
  nextButton.textContent = '>';
  nextButton.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  calendarHeader.appendChild(nextButton);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const today = new Date();

  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    calendar.appendChild(emptyDay);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = day;

    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const hoursWorked = calculateHoursWorked(date);
    const maxHours = 12;
    const normalizedHours = Math.min(hoursWorked / maxHours, 1);

    const hue = 180*normalizedHours + 180;
    const saturation = 30;
    const lightness = (30 - (29 * normalizedHours))*(currentTheme == 'light' ? 2.5 : 1);

    dayElement.style.backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    if (date.toDateString() === today.toDateString()) {
      dayElement.classList.add('current-day');
    }

    if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
      dayElement.classList.add('selected-day');
    }

    dayElement.addEventListener('click', () => {
      selectedDate = date;
      renderCalendar();
      updateRightPanel(date);
    });

    calendar.appendChild(dayElement);
  }

  // Update right panel for the initially selected date
  updateRightPanel(selectedDate);
}

function calculateHoursWorked(date) {
  const formattedDate = formatDate(date);
  return hoursWorkedDict[formattedDate] || 0;
}

function getTasksForDate(date) {
  return skills.flatMap(skill => 
    skill.tasks.filter(task => 
      task.completed && task.date && new Date(task.date).toDateString() === date.toDateString()
    )
  );
}

function updateHours(skill, date, hours) {
  if (!skill.dailyHours) skill.dailyHours = {};
  skill.dailyHours[date.toDateString()] = hours;
  renderCalendar();
  saveData();
}

function updateRightPanel(date) {
  const selectedDate = document.getElementById('selectedDate');
  const hoursSpent = document.getElementById('hoursSpent');
  const taskList = document.getElementById('taskList');

  selectedDate.textContent = date.toDateString();
  hoursSpent.textContent = calculateHoursWorked(date);

  taskList.innerHTML = '';
  const tasks = getTasksForDate(date);
  if (tasks.length) {
    tasks.forEach(task => {
      const li = document.createElement('li');
      li.textContent = `${task.name} ✅`;
      taskList.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = 'No tasks completed';
    taskList.appendChild(li);
  }
}

async function saveData() {
  try {
    await window.electronAPI.saveData({ skills, hoursWorkedDict, currentTheme });
  } catch (error) {
    console.error('Failed to save data:', error);
  }
}

function loadData() {
  window.electronAPI.loadData()
    .then(data => {
      if (data) {
        skills = data.skills || [];
        hoursWorkedDict = data.hoursWorkedDict || {};
        currentTheme = data.currentTheme || 'light';
        if (currentTheme === 'dark') {
          document.body.classList.add('dark-mode');
          document.getElementById('themeToggle').textContent = '☀️';
        }
        renderSkills();
        renderCalendar();
      }
    })
    .catch(error => {
      console.error('Failed to load data:', error);
    });
}

window.addEventListener('beforeunload', async (event) => {
  await saveData();
});