let currentTheme = 'light';
let skills = [];
let hoursWorkedDict = {}
let exerciseHoursDict = {}
let currentDate = new Date();
let selectedDate = null;
let openPanelStack = [];

const Pages = ["progressPage", "calendarPage", "chartPage"]

document.addEventListener('DOMContentLoaded', () => {
  loadData();
});

function loadData() {
  window.electronAPI.loadData('ProgressoData').then((savedData) => {
    if (savedData) {
      console.log('Loaded data:', savedData);
      currentTheme = savedData.currentTheme || 'light';
      skills = savedData.skills || [];
      hoursWorkedDict = savedData.hoursWorkedDict || {};
      exerciseHoursDict = savedData.exerciseHoursDict || {};
      selectedDate = savedData.selectedDate ? new Date(savedData.selectedDate) : new Date();
    } else {
      console.log('No saved data found.');
    }
    
    currentDate = new Date(); // Ensure currentDate is always set to today
    setCurrentTheme();
    setupEventListeners();
    showProgressPage();
  });
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
  document.getElementById('setCurrentDate').addEventListener('click', () => setCurrentDate());
  const exerciseHours = document.getElementById('exerciseHours').querySelector('.hours-input');
  exerciseHours.addEventListener('change', (e) => {
    updateExerciseHours(exerciseHours, e.target.value);
  });
  setupMainSkillDragAndDrop();
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.classList.toggle('dark-mode');
  document.getElementById('themeToggle').textContent = currentTheme === 'light' ? '🌙' : '☀️';
  renderCalendar();
  renderChart();
  saveData();
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

function setupMainSkillDragAndDrop() {
  const skillsGrid = document.getElementById('skillsList');

  skillsGrid.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      e.preventDefault(); 

      const skillElement = e.target.closest('.skill');
      if (skillElement) {
        setupDragAndDrop(skillElement, skillsGrid, null, 'skill');
      }
    }
  });
}

function setCurrentDate() {
  const setCurrentDateButton = document.getElementById('setCurrentDate');

  // Toggle button state
  if (setCurrentDateButton.classList.contains('button-set')) {
    setCurrentDateButton.classList.remove('button-set');
    setCurrentDateButton.innerText = "Set";
    currentDate = new Date();
  } else {
    setCurrentDateButton.classList.add('button-set');
    setCurrentDateButton.innerText = "Unset";
    currentDate = selectedDate;
  }

  renderCalendar();
  saveData();
}

function addSkill(detailsContainer = null, parentId = null) {
  
  const newSkill = {
    id: Date.now(),
    name: "",
    skills: [],
    tasks: [],
    hours: 0,
    isEditing: true
  };

  if(!detailsContainer)
    detailsContainer = document.getElementById('skillsList')

  renderSkill(newSkill, detailsContainer)

  if(parentId) {
    const skill = findSkillById(parentId);
    skill.skills.push(newSkill);
  }
  else {
    skills.push(newSkill);
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

function renderSkills(container = null, skillList = skills) {
  if (!container)
    container = document.getElementById('skillsList');
  container.innerHTML = '';
  skillList.forEach(skill => renderSkill(skill, container));

  updateOverallProgress();
}

function renderSkill(skill, container) {
  const skillElement = createSkillElement(skill);
  container.appendChild(skillElement);
}

function createSkillElement(skill) {
  const skillElement = document.createElement('div');
  skillElement.className = 'skill';
  skillElement.id = `skill-${skill.id}`;

  const skillHeader = createSkillHeader(skill);

  skillElement.appendChild(skillHeader);

  // Create and append the progress bar
  const progressBarContainer = document.createElement('div');
  progressBarContainer.className = 'progress-bar';
  
  const progressBar = document.createElement('div');
  progressBar.className = 'progress';
  progressBar.style.width = `${calculateProgress(skill)}%`;

  progressBarContainer.appendChild(progressBar);
  skillElement.appendChild(progressBarContainer);

  const toggleDetailsButton = document.createElement('button');
  toggleDetailsButton.className = 'toggle-details';
  toggleDetailsButton.textContent = '▼';
  toggleDetailsButton.addEventListener('click', () => openSkillDetails(skill));
  skillElement.appendChild(toggleDetailsButton);
  return skillElement;
}

function createSkillHeader(skill) {
  const skillHeader = document.createElement('div');
  skillHeader.className = 'skill-header';

  const nameElement = skill.isEditing 
    ? `<input type="text" class="skill-name-input" value="${skill.name}">`
    : `<h3 class="skill-name">${skill.name}</h3>`;
  skillHeader.innerHTML = `
    <button class="edit-skill">✎</button>
    <div class="skill-name-container">
      ${nameElement}
    </div>
    <button class="delete-skill">🗑</button>
  `;

  addSkillHeaderEventListeners(skillHeader, skill);

  return skillHeader;
}

function addSkillHeaderEventListeners(skillHeader, skill) {
  const editButton = skillHeader.querySelector('.edit-skill');
  const deleteButton = skillHeader.querySelector('.delete-skill');

  deleteButton.addEventListener('click', () => deleteSkill(skill));
  editButton.addEventListener('click', () => toggleSkillEditing(skill));

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

function openSkillDetails(skill, push=true) {
  const leftPanel = document.getElementById('leftPanel');
  const progressPageContent = document.getElementById('progressPageContent');
  leftPanel.innerHTML = `
    <button class="back-button">⬅️ Back</button>
    <h3>${skill.name}</h3>
    <div class="progress-bar">
      <div class="progress" style="width: ${calculateProgress(skill)}%"></div>
    </div>
    <div class="hours-container">
      <input type="number" value="${skill.hours}" min="0" step="0.5" class="hours-input">
      <span class="hours-label">hours</span>
      <button class="add-skill">+ Skill</button>
      <button class="add-task">+ Task</button>
    </div>
    <div class="skill-details">
      <div class="tasks"></div>
      <div class="skills"></div>
    </div>
  `;

  updatePanelProgress(skill);

  // Add event listeners for skill/task addition and back button
  leftPanel.querySelector('.back-button').addEventListener('click', () => closeLeftPanel());
  addDetailsContainerEventListeners(leftPanel, skill);

  renderTasks(leftPanel.querySelector('.tasks'), skill);
  renderSkills(leftPanel.querySelector('.skills'), skill.skills);

  // Display the left panel
  leftPanel.classList.add('active');
  progressPageContent.classList.add('with-panel');
  if (push)
    openPanelStack.push(skill);
}

function closeLeftPanel(closeall=false) {
  const skill = openPanelStack.pop();
  const parentSkill = findParentSkill(skill.id);
  if (openPanelStack.length > 0 && openPanelStack[openPanelStack.length - 1] !== parentSkill) {
    openPanelStack.length = 0;
  }
  if (openPanelStack.length === 0 || closeall) {
    // If the stack is empty, hide the panel
    const leftPanel = document.getElementById('leftPanel');
    const progressPageContent = document.getElementById('progressPageContent');
    leftPanel.classList.remove('active');
    progressPageContent.classList.remove('with-panel');
  } else {
    // Show the previous panel in the stack
    openSkillDetails(openPanelStack[openPanelStack.length - 1], false);
  }
}

function addDetailsContainerEventListeners(detailsContainer, skill) {
  const hoursInput = detailsContainer.querySelector('.hours-input');
  const addSkillButton = detailsContainer.querySelector('.add-skill');
  const addTaskButton = detailsContainer.querySelector('.add-task');
  const skillsContainer = detailsContainer.querySelector('.skills');
  const tasksContainer = detailsContainer.querySelector('.tasks');

  hoursInput.addEventListener('change', (e) => updateSkillHours(skill, e.target.value));
  addSkillButton.addEventListener('click', (e) => {
    e.stopPropagation();
    addSkill(skillsContainer, skill.id);
  });
  addTaskButton.addEventListener('click', (e) => {
    e.stopPropagation();
    addTask(detailsContainer, skill);
  });
  skillsContainer.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      e.preventDefault();
      const skillElement = e.target.closest('.skill');
      const skillsContainer = detailsContainer.querySelector('.skills');
      if (skillElement) {
        setupDragAndDrop(skillElement, skillsContainer, skill, "skill");
      }
    }
  });
  tasksContainer.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      e.preventDefault();
      const taskElement = e.target.closest('.task');
      const tasksContainer = detailsContainer.querySelector('.tasks');
      if (taskElement) {
        setupDragAndDrop(taskElement, tasksContainer, findSkillById(skill.id), "task");
      }
    }
  });
}

function toggleSkillEditing(skill) {
  skill.isEditing = !skill.isEditing;
  const skillElement = document.getElementById(`skill-${skill.id}`);
  const newSkillElement = createSkillElement(skill);
  skillElement.parentNode.replaceChild(newSkillElement, skillElement);
  saveData();
}

function finishEditing(skill, input) {
  skill.name = input.value.trim() || "New Skill";
  skill.isEditing = false;
  const skillElement = document.getElementById(`skill-${skill.id}`);
  
  // Find the input element
  const inputElement = skillElement.querySelector('.skill-name-input');
  
  if (inputElement) {
    // Create a new <h3> element
    const newHeading = document.createElement('h3');
    newHeading.className = 'skill-name';
    newHeading.textContent = skill.name;  // Set the skill name
    
    // Replace the input element with the <h3> element
    inputElement.parentNode.replaceChild(newHeading, inputElement);
  }
  saveData();
}

function updateSkillHours(skill, newValue) {
  const newHours = parseFloat(newValue) || 0;
  const hoursDiff = newHours - skill.hours;
  const formattedDate = formatDate(currentDate);
  
  hoursWorkedDict[formattedDate] = (hoursWorkedDict[formattedDate] || 0) + hoursDiff;
  skill.hours = newHours;
  renderCalendar();
  saveData();
}

function updateExerciseHours(exerciseHours, newValue) {
  const newHours = parseFloat(newValue) || 0;
  const formattedDate = formatDate(currentDate);
  if (formatDate(selectedDate) == formattedDate) {    
    exerciseHoursDict[formattedDate] = newHours;
    renderCalendar();
    saveData();
  }
  else
    exerciseHours.value = exerciseHoursDict[formatDate(selectedDate)] || 0;
}

function deleteSkill(skill) {
  let id = skill.id;
  updatePanelProgress(skill);
  const skillToDelete = findSkillById(id);
  if (!skillToDelete) return;

  const parentSkill = findParentSkill(id);
  if (parentSkill) {
    parentSkill.skills = parentSkill.skills.filter(s => s.id !== id);
    updateSkillProgress(parentSkill);
    updatePanelProgress(parentSkill);
  } else {
    if (openPanelStack.length > 0)
      closeLeftPanel(true);
    skills = skills.filter(s => s.id !== id);
  }

  const skillElement = document.getElementById(`skill-${id}`);
  if (skillElement) skillElement.remove();

  updateOverallProgress();
  saveData();
}

function findParentSkill(childId, skillList = skills) {
  for (const skill of skillList) {
    if (skill.skills && skill.skills.some(s => s.id === childId)) return skill;
    const found = findParentSkill(childId, skill.skills);
    if (found) return found;
  }
  return null;
}

function addTask(detailsContainer, skill) {
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
  
  const tasksContainer = detailsContainer.querySelector('.tasks');
  tasksContainer.appendChild(taskElement);
  
  const input = taskElement.querySelector('.task-name-input');
  input.focus();

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const input = taskElement.querySelector('.task-name-input');
      const taskName = input.value.trim();
      if (taskName) {
        skill.tasks.push({ id: taskId, name: taskName, completed: false });
        skill.tasks = sortTasks(skill.tasks); // Sort tasks after adding a new one
        renderTasks(tasksContainer, skill);
        updatePanelProgress(skill);
        updateSkillProgress(skill);
        updateOverallProgress();
        taskElement.remove();
        saveData();
      }
    }
  });

  taskElement.querySelector('.delete-task').addEventListener('click', () => {
    taskElement.remove();
  });
}

function sortTasks(tasks) {
  return tasks.sort((a, b) => {
    if (a.completed === b.completed) {
      // If both tasks have the same completion status, maintain their relative order
      return tasks.indexOf(a) - tasks.indexOf(b);
    }
    return a.completed ? 1 : -1;
  });
}

function renderTasks(tasksElement, skill) {
  tasksElement.innerHTML = '';
  const sortedTasks = sortTasks(skill.tasks);
  
  sortedTasks.forEach(task => {
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
    
    const checkbox = taskElement.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', (e) => {
      const wasCompleted = task.completed;
      task.completed = e.target.checked;
      task.date = currentDate;

      if (wasCompleted && !task.completed) {
        // If a checked task is unchecked, move it to the top of the list
        skill.tasks = skill.tasks.filter(t => t.id !== task.id);
        skill.tasks.unshift(task);
      } else if (!wasCompleted && task.completed) {
        // If an unchecked task is checked, move it to the bottom of the list
        skill.tasks = skill.tasks.filter(t => t.id !== task.id);
        skill.tasks.push(task);
      }

      updatePanelProgress(skill);
      updateSkillProgress(skill);
      updateOverallProgress();
      renderTasks(tasksElement, skill); // Re-render tasks to update order
      saveData();
    });

    taskElement.querySelector('.delete-task').addEventListener('click', () => {
      skill.tasks = skill.tasks.filter(t => t.id !== task.id);
      renderTasks(tasksElement, skill);
      updatePanelProgress(skill);
      updateSkillProgress(skill);
      updateOverallProgress();
      saveData();
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

function updatePanelProgress(skill) {
  const progress = calculateProgress(skill);
  const leftPanel = document.getElementById(`leftPanel`);

  if (leftPanel) {
    const progressBar = leftPanel.querySelector('.progress-bar .progress');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }
}

function updateSkillProgress(skill) {
  const progress = calculateProgress(skill);
  const skillElement = document.getElementById(`skill-${skill.id}`);
  
  // Update the progress bar width
  if (skillElement) {
    const progressBar = skillElement.querySelector('.progress-bar .progress');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }

  if (progress === 100) {
    // If the skill's progress is 100%
    const parentSkill = findParentSkill(skill.id);
    
    if (parentSkill) {
      // Move the skill to the bottom of its parent's skills list
      const index = parentSkill.skills.findIndex(s => s.id === skill.id);
      if (index !== -1) {
        parentSkill.skills.push(parentSkill.skills.splice(index, 1)[0]);
      }
    } else {
      // Move the skill to the bottom of the main skills list
      const index = skills.findIndex(s => s.id === skill.id);
      if (index !== -1) {
        skills.push(skills.splice(index, 1)[0]);
        renderSkills();
      }
    }
  } 

  // Recursively update parent skills
  const parentSkill = findParentSkill(skill.id);
  if (parentSkill) {
    updateSkillProgress(parentSkill);
  }
}

function updateOverallProgress() {
  const totalTasks = skills.reduce((sum, skill) => sum + calculateTotalTasks(skill), 0);
  const completedTasks = skills.reduce((sum, skill) => sum + calculateCompletedTasks(skill), 0);
  const progress = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
  overallProgress = document.querySelector('#overallProgress .progress-bar');
  overallProgress.style.width = `${progress}%`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameLevel(elem1, elem2) {
  return elem1.parentNode === elem2.parentNode;
}

function setupDragAndDrop(Element, container, parentSkill, type) {
  let draggedElement = Element;
  draggedElement.style.opacity = '0.5';

  const mouseMoveHandler = (e) => {
    const hoverElement = e.target.closest(`.${type}`);
    if (hoverElement && hoverElement !== draggedElement && hoverElement.parentNode === container) {
      const rect = hoverElement.getBoundingClientRect();
      const hoverMiddleX = (rect.right - rect.left) / 2;
      const hoverMiddleY = (rect.bottom - rect.top) / 2;

      const isLeft = e.clientX < rect.left + hoverMiddleX;
      const isAbove = e.clientY < rect.top + hoverMiddleY;

      if (isLeft && isAbove) {
        container.insertBefore(draggedElement, hoverElement);
      } else if (isLeft && !isAbove) {
        container.insertBefore(draggedElement, hoverElement.nextSibling);
      } else if (!isLeft && isAbove) {
        container.insertBefore(draggedElement, hoverElement);
      } else {
        container.insertBefore(draggedElement, hoverElement.nextSibling);
      }
    }
  };

  const mouseUpHandler = () => {
    draggedElement.style.opacity = '1';
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
    updateOrder(parentSkill, container, type);
  };

  document.addEventListener('mousemove', mouseMoveHandler);
  document.addEventListener('mouseup', mouseUpHandler);
}

function updateOrder(parentSkill, container, type) {
  const elements = container.querySelectorAll(`.${type}`);
  if (parentSkill) {
    if (type === 'task') {  
      parentSkill.tasks = Array.from(elements).map(el => {
        const taskId = parseInt(el.dataset.taskId);
        return parentSkill.tasks.find(task => task.id === taskId);
      });
    } else {
      parentSkill.skills = Array.from(elements).map(el => {
        const skillId = parseInt(el.id.split('-')[1]); // Assuming the id is in the format 'skill-123'
        return parentSkill.skills.find(subskill => subskill.id === skillId);
      });
    }
  }
  else {
    skills = Array.from(elements).map(el => {
      const skillId = parseInt(el.id.split('-')[1]);
      return skills.find(skill => skill.id === skillId);
    });
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
  const today = currentDate;

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

function calculateExerciseHours(date) {
  return exerciseHoursDict[formatDate(date)] || 0;
}

function updateRightPanel(date) {
  const selectedDate = document.getElementById('selectedDate');
  const learningHoursSpent = document.getElementById('learningHoursSpent');
  const exerciseHours = document.getElementById('exerciseHours').querySelector('.hours-input');
  const taskList = document.getElementById('taskList');

  selectedDate.textContent = date.toDateString();
  learningHoursSpent.textContent = calculateHoursWorked(date);
  exerciseHours.value = calculateExerciseHours(date);

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
  const updateChart = () => {
    const endDate = new Date(currentStartDate);
    let days, title, labels;
  
    switch (currentView) {
      case 'week':
        days = 7;
        endDate.setDate(endDate.getDate() + 6);
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
        labels = Array.from({ length: 365 }, (_, i) => {
          const date = new Date(title, 0, i + 1); // Start from January 1st
          return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
        });
        break;
    }
  
    chartTitle.textContent = title;
  
    const hoursWorkedData = [];
    const exerciseHoursData = [];
    let maxHours = 12; // Default max hours
  
    for (let i = 0; i < days; i++) {
      const date = new Date(currentStartDate);
      date.setDate(date.getDate() + i);
  
      const workedHours = calculateHoursWorked(date);
      const exerciseHours = calculateExerciseHours(date);
  
      hoursWorkedData.push(workedHours);
      exerciseHoursData.push(exerciseHours);
  
      // Update max hours to accommodate both worked and exercise hours
      maxHours = Math.max(maxHours, workedHours + exerciseHours);
    }
  
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = ''; // Clear any previous canvas
    const canvas = document.createElement('canvas');
    chartContainer.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Worked Hours',
            data: hoursWorkedData,
            backgroundColor: hoursWorkedData.map(d => {
              const normalizedHours = Math.min(d / maxHours, 1);
              const hue = 250 * normalizedHours;
              const saturation = 30;
              const lightness = 25 * (currentTheme === 'light' ? 2.5 : 1);
              return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            }),
            barPercentage: 1,
            categoryPercentage: 1
          },
          {
            label: 'Exercise Hours',
            data: exerciseHoursData,
            backgroundColor: exerciseHoursData.map(() => {
              const gradient = ctx.createLinearGradient(0, 0, 0, 400);
              gradient.addColorStop(0, 'rgba(211, 211, 211, 0.8)');  // Light grey, semi-transparent at the top
              gradient.addColorStop(0.5, 'rgba(211, 211, 211, 0.5)'); // More transparency in the middle
              gradient.addColorStop(1, 'rgba(211, 211, 211, 0.2)');  // Almost fully transparent at the bottom
              return gradient;
            }),
            barPercentage: 1,
            categoryPercentage: 1,
            hoverBackgroundColor: 'rgba(211, 211, 211, 0.6)', // Lighter grey on hover
            hoverBorderColor: 'rgba(128, 128, 128, 0.9)',  // Darker border on hover
            hoverBorderWidth: 1.5,
            barThickness: 'flex',
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true // Enable stacking for x-axis
          },
          y: {
            stacked: true, // Enable stacking for y-axis
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
            display: true // Show legend for different datasets
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
    exerciseHoursDict,
    selectedDate: selectedDate ? selectedDate.toISOString() : null,
  };

  console.log('Saving data:', data);
  window.electronAPI.saveData('ProgressoData', data);
}

// Update your app quitting listener
window.electronAPI.onAppQuitting(() => {
  saveData();
});

// Call saveData when the page is about to unload
window.addEventListener('beforeunload', () => {
  saveData();
});