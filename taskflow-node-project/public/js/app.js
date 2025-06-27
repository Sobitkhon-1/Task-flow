tailwind.config = {
            theme: {
                extend: {
                    animation: {
                        'slide-in': 'slideIn 0.3s ease-out',
                        'fade-in': 'fadeIn 0.2s ease-out',
                        'bounce-in': 'bounceIn 0.5s ease-out'
                    }
                }
            }
        }
    

        class TodoApp {
            constructor() {
                this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
                this.projects = JSON.parse(localStorage.getItem('projects')) || [];
                this.currentFilter = 'all';
                this.currentView = 'list';
                this.searchTerm = '';
                this.sortBy = 'date';
                this.editingTask = null;
                this.selectedProjectColor = 'blue';
                
                this.initEventListeners();
                this.render();
                this.updateStats();
            }

            initEventListeners() {
                // Modal controls
                document.getElementById('addTaskBtn').addEventListener('click', () => this.showTaskModal());
                document.getElementById('closeModal').addEventListener('click', () => this.hideTaskModal());
                document.getElementById('cancelTask').addEventListener('click', () => this.hideTaskModal());
                document.getElementById('taskForm').addEventListener('submit', (e) => this.handleTaskSubmit(e));

                // Project modal
                document.getElementById('addProjectBtn').addEventListener('click', () => this.showProjectModal());
                document.getElementById('closeProjectModal').addEventListener('click', () => this.hideProjectModal());
                document.getElementById('cancelProject').addEventListener('click', () => this.hideProjectModal());
                document.getElementById('projectForm').addEventListener('submit', (e) => this.handleProjectSubmit(e));

                // Project color selection
                document.querySelectorAll('.project-color').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        document.querySelectorAll('.project-color').forEach(b => b.classList.remove('border-gray-800'));
                        e.target.classList.add('border-gray-800');
                        this.selectedProjectColor = e.target.dataset.color;
                    });
                });

                // View toggles
                document.getElementById('listViewBtn').addEventListener('click', () => this.switchView('list'));
                document.getElementById('boardViewBtn').addEventListener('click', () => this.switchView('board'));

                // Filters
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active', 'bg-blue-100', 'text-blue-700'));
                        e.target.classList.add('active', 'bg-blue-100', 'text-blue-700');
                        this.currentFilter = e.target.dataset.filter;
                        this.render();
                    });
                });

                // Search and sort
                document.getElementById('searchInput').addEventListener('input', (e) => {
                    this.searchTerm = e.target.value.toLowerCase();
                    this.render();
                });

                document.getElementById('sortSelect').addEventListener('change', (e) => {
                    this.sortBy = e.target.value;
                    this.render();
                });

                // Sidebar toggle
                document.getElementById('sidebarToggle').addEventListener('click', () => {
                    const sidebar = document.getElementById('sidebar');
                    sidebar.classList.toggle('-translate-x-full');
                });

                // Close sidebar on mobile when clicking outside
                document.addEventListener('click', (e) => {
                    if (window.innerWidth < 768) {
                        const sidebar = document.getElementById('sidebar');
                        const toggle = document.getElementById('sidebarToggle');
                        if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
                            sidebar.classList.add('-translate-x-full');
                        }
                    }
                });

                // Drag and drop for board view
                this.setupDragAndDrop();
            }

            setupDragAndDrop() {
                const columns = ['todoColumn', 'inProgressColumn', 'reviewColumn', 'completedColumn'];
                columns.forEach(columnId => {
                    const column = document.getElementById(columnId);
                    column.addEventListener('dragover', this.handleDragOver);
                    column.addEventListener('drop', (e) => this.handleDrop(e, column.dataset.status));
                });
            }

            handleDragOver(e) {
                e.preventDefault();
                e.currentTarget.classList.add('drag-over');
            }

            handleDrop(e, newStatus) {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-over');
                
                const taskId = e.dataTransfer.getData('text/plain');
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    task.status = newStatus;
                    if (newStatus === 'completed') {
                        task.completedAt = new Date().toISOString();
                    }
                    this.saveData();
                    this.render();
                    this.updateStats();
                }
            }

            showTaskModal(task = null) {
                this.editingTask = task;
                const modal = document.getElementById('taskModal');
                const title = document.getElementById('modalTitle');
                
                if (task) {
                    title.textContent = 'Edit Task';
                    this.populateTaskForm(task);
                } else {
                    title.textContent = 'Add New Task';
                    this.resetTaskForm();
                }
                
                this.populateProjectSelect();
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }

            hideTaskModal() {
                document.getElementById('taskModal').classList.add('hidden');
                document.getElementById('taskModal').classList.remove('flex');
                this.editingTask = null;
            }

            populateTaskForm(task) {
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDescription').value = task.description || '';
                document.getElementById('taskPriority').value = task.priority;
                document.getElementById('taskStatus').value = task.status;
                document.getElementById('taskProject').value = task.projectId || '';
                document.getElementById('taskDueDate').value = task.dueDate || '';
                document.getElementById('taskRecurring').value = task.recurring || '';
            }

            resetTaskForm() {
                document.getElementById('taskForm').reset();
                document.getElementById('taskPriority').value = 'medium';
                document.getElementById('taskStatus').value = 'todo';
            }

            populateProjectSelect() {
                const select = document.getElementById('taskProject');
                select.innerHTML = '<option value="">No Project</option>';
                this.projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.id;
                    option.textContent = project.name;
                    select.appendChild(option);
                });
            }

            handleTaskSubmit(e) {
                e.preventDefault();
                
                const formData = {
                    title: document.getElementById('taskTitle').value,
                    description: document.getElementById('taskDescription').value,
                    priority: document.getElementById('taskPriority').value,
                    status: document.getElementById('taskStatus').value,
                    projectId: document.getElementById('taskProject').value || null,
                    dueDate: document.getElementById('taskDueDate').value || null,
                    recurring: document.getElementById('taskRecurring').value || null
                };

                if (this.editingTask) {
                    Object.assign(this.editingTask, formData);
                } else {
                    const newTask = {
                        id: Date.now().toString(),
                        ...formData,
                        createdAt: new Date().toISOString(),
                        completedAt: null
                    };
                    this.tasks.push(newTask);

                    // Handle recurring tasks
                    if (formData.recurring) {
                        this.scheduleRecurringTask(newTask);
                    }
                }

                this.saveData();
                this.render();
                this.updateStats();
                this.hideTaskModal();
            }

            scheduleRecurringTask(task) {
                // Simple recurring task logic
                const recurring = task.recurring.toLowerCase();
                const baseDate = new Date(task.dueDate || task.createdAt);
                
                if (recurring.includes('daily') || recurring.includes('every day')) {
                    // Create next day task
                    const nextDate = new Date(baseDate);
                    nextDate.setDate(nextDate.getDate() + 1);
                    this.createRecurringInstance(task, nextDate);
                } else if (recurring.includes('weekly') || recurring.includes('every week')) {
                    const nextDate = new Date(baseDate);
                    nextDate.setDate(nextDate.getDate() + 7);
                    this.createRecurringInstance(task, nextDate);
                } else if (recurring.includes('monday')) {
                    const nextMonday = this.getNextWeekday(baseDate, 1);
                    this.createRecurringInstance(task, nextMonday);
                }
            }

            createRecurringInstance(originalTask, dueDate) {
                const recurringTask = {
                    ...originalTask,
                    id: Date.now().toString() + '-recurring',
                    status: 'todo',
                    dueDate: dueDate.toISOString().split('T')[0],
                    createdAt: new Date().toISOString(),
                    completedAt: null
                };
                this.tasks.push(recurringTask);
            }

            getNextWeekday(date, dayOfWeek) {
                const resultDate = new Date(date);
                resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7);
                return resultDate;
            }

            showProjectModal() {
                document.getElementById('projectModal').classList.remove('hidden');
                document.getElementById('projectModal').classList.add('flex');
                document.getElementById('projectName').value = '';
                // Reset color selection
                document.querySelectorAll('.project-color').forEach(b => b.classList.remove('border-gray-800'));
                document.querySelector('[data-color="blue"]').classList.add('border-gray-800');
                this.selectedProjectColor = 'blue';
            }

            hideProjectModal() {
                document.getElementById('projectModal').classList.add('hidden');
                document.getElementById('projectModal').classList.remove('flex');
            }

            handleProjectSubmit(e) {
                e.preventDefault();
                
                const newProject = {
                    id: Date.now().toString(),
                    name: document.getElementById('projectName').value,
                    color: this.selectedProjectColor,
                    createdAt: new Date().toISOString()
                };

                this.projects.push(newProject);
                this.saveData();
                this.renderProjects();
                this.hideProjectModal();
            }

            switchView(view) {
                this.currentView = view;
                
                const listBtn = document.getElementById('listViewBtn');
                const boardBtn = document.getElementById('boardViewBtn');
                const listView = document.getElementById('listView');
                const boardView = document.getElementById('boardView');

                if (view === 'list') {
                    listBtn.classList.add('bg-white', 'text-gray-700', 'shadow-sm');
                    listBtn.classList.remove('text-gray-500');
                    boardBtn.classList.remove('bg-white', 'text-gray-700', 'shadow-sm');
                    boardBtn.classList.add('text-gray-500');
                    listView.classList.remove('hidden');
                    boardView.classList.add('hidden');
                } else {
                    boardBtn.classList.add('bg-white', 'text-gray-700', 'shadow-sm');
                    boardBtn.classList.remove('text-gray-500');
                    listBtn.classList.remove('bg-white', 'text-gray-700', 'shadow-sm');
                    listBtn.classList.add('text-gray-500');
                    boardView.classList.remove('hidden');
                    listView.classList.add('hidden');
                }
                
                this.render();
            }

            getFilteredTasks() {
                let filtered = [...this.tasks];

                // Apply search filter
                if (this.searchTerm) {
                    filtered = filtered.filter(task => 
                        task.title.toLowerCase().includes(this.searchTerm) ||
                        (task.description && task.description.toLowerCase().includes(this.searchTerm))
                    );
                }

                // Apply status filter
                switch (this.currentFilter) {
                    case 'today':
                        const today = new Date().toISOString().split('T')[0];
                        filtered = filtered.filter(task => task.dueDate === today);
                        break;
                    case 'high-priority':
                        filtered = filtered.filter(task => task.priority === 'high');
                        break;
                    case 'completed':
                        filtered = filtered.filter(task => task.status === 'completed');
                        break;
                    // 'all' shows everything
                }

                // Apply sorting
                filtered.sort((a, b) => {
                    switch (this.sortBy) {
                        case 'priority':
                            const priorityOrder = { high: 3, medium: 2, low: 1 };
                            return priorityOrder[b.priority] - priorityOrder[a.priority];
                        case 'project':
                            const aProject = this.projects.find(p => p.id === a.projectId)?.name || '';
                            const bProject = this.projects.find(p => p.id === b.projectId)?.name || '';
                            return aProject.localeCompare(bProject);
                        case 'status':
                            return a.status.localeCompare(b.status);
                        case 'date':
                        default:
                            return new Date(b.createdAt) - new Date(a.createdAt);
                    }
                });

                return filtered;
            }

            render() {
                if (this.currentView === 'list') {
                    this.renderListView();
                } else {
                    this.renderBoardView();
                }
                this.renderProjects();
            }

            renderListView() {
                const container = document.getElementById('listView');
                const tasks = this.getFilteredTasks();

                if (tasks.length === 0) {
                    container.innerHTML = `
                        <div class="text-center py-12">
                            <div class="text-6xl mb-4">📋</div>
                            <h3 class="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                            <p class="text-gray-500 mb-4">Get started by creating your first task</p>
                            <button onclick="app.showTaskModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                Add Task
                            </button>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = tasks.map(task => this.renderTaskCard(task)).join('');
            }

            renderTaskCard(task) {
                const project = this.projects.find(p => p.id === task.projectId);
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
                
                return `
                    <div class="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow ${task.status === 'completed' ? 'task-completed' : ''} priority-${task.priority}" 
                         draggable="true" 
                         ondragstart="event.dataTransfer.setData('text/plain', '${task.id}')">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <div class="flex items-center space-x-3 mb-2">
                                    <button onclick="app.toggleTaskStatus('${task.id}')" 
                                            class="flex-shrink-0 w-5 h-5 rounded border-2 ${task.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'} flex items-center justify-center">
                                        ${task.status === 'completed' ? '✓' : ''}
                                    </button>
                                    <h3 class="font-medium text-gray-900 ${task.status === 'completed' ? 'line-through' : ''}">${task.title}</h3>
                                    ${this.getPriorityBadge(task.priority)}
                                    ${this.getStatusBadge(task.status)}
                                </div>
                                
                                ${task.description ? `<p class="text-gray-600 text-sm mb-3 ml-8">${task.description}</p>` : ''}
                                
                                <div class="flex items-center space-x-4 text-sm text-gray-500 ml-8">
                                    ${project ? `<span class="flex items-center"><span class="w-2 h-2 rounded-full bg-${project.color}-500 mr-1"></span>${project.name}</span>` : ''}
                                    ${task.dueDate ? `<span class="flex items-center ${isOverdue ? 'text-red-600 font-medium' : ''}">📅 ${this.formatDate(task.dueDate)}</span>` : ''}
                                    ${task.recurring ? `<span class="flex items-center">🔄 ${task.recurring}</span>` : ''}
                                </div>
                            </div>
                            
                            <div class="flex items-center space-x-2 ml-4">
                                <button onclick="app.showTaskModal(app.tasks.find(t => t.id === '${task.id}'))" 
                                        class="p-1 text-gray-400 hover:text-blue-600">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                                <button onclick="app.deleteTask('${task.id}')" 
                                        class="p-1 text-gray-400 hover:text-red-600">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            renderBoardView() {
                const columns = {
                    'todo': document.getElementById('todoColumn'),
                    'in-progress': document.getElementById('inProgressColumn'),
                    'review': document.getElementById('reviewColumn'),
                    'completed': document.getElementById('completedColumn')
                };

                Object.keys(columns).forEach(status => {
                    columns[status].innerHTML = '';
                });

                const tasks = this.getFilteredTasks();
                tasks.forEach(task => {
                    const column = columns[task.status];
                    if (column) {
                        const taskElement = document.createElement('div');
                        taskElement.innerHTML = this.renderBoardCard(task);
                        column.appendChild(taskElement.firstElementChild);
                    }
                });
            }

            renderBoardCard(task) {
                const project = this.projects.find(p => p.id === task.projectId);
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
                
                return `
                    <div class="bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow cursor-move priority-${task.priority}" 
                         draggable="true" 
                         ondragstart="event.dataTransfer.setData('text/plain', '${task.id}')">
                        <div class="flex justify-between items-start mb-2">
                            <h4 class="font-medium text-gray-900 text-sm">${task.title}</h4>
                            <div class="flex space-x-1">
                                ${this.getPriorityBadge(task.priority, true)}
                                <button onclick="app.deleteTask('${task.id}')" 
                                        class="text-gray-400 hover:text-red-600 p-1">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        ${task.description ? `<p class="text-gray-600 text-xs mb-2">${task.description}</p>` : ''}
                        
                        <div class="flex items-center justify-between text-xs text-gray-500">
                            <div class="flex items-center space-x-2">
                                ${project ? `<span class="flex items-center"><span class="w-2 h-2 rounded-full bg-${project.color}-500 mr-1"></span>${project.name}</span>` : ''}
                            </div>
                            ${task.dueDate ? `<span class="flex items-center ${isOverdue ? 'text-red-600 font-medium' : ''}">📅 ${this.formatDate(task.dueDate, true)}</span>` : ''}
                        </div>
                    </div>
                `;
            }

            renderProjects() {
                const container = document.getElementById('projectsList');
                
                if (this.projects.length === 0) {
                    container.innerHTML = '<p class="text-gray-500 text-sm">No projects yet</p>';
                    return;
                }

                container.innerHTML = this.projects.map(project => {
                    const taskCount = this.tasks.filter(t => t.projectId === project.id).length;
                    return `
                        <div class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                            <div class="flex items-center space-x-2">
                                <span class="w-3 h-3 rounded-full bg-${project.color}-500"></span>
                                <span class="text-sm font-medium text-gray-700">${project.name}</span>
                                <span class="text-xs text-gray-500">(${taskCount})</span>
                            </div>
                            <button onclick="app.deleteProject('${project.id}')" 
                                    class="text-gray-400 hover:text-red-600 p-1">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    `;
                }).join('');
            }

            getPriorityBadge(priority, small = false) {
                const colors = {
                    high: 'bg-red-100 text-red-800',
                    medium: 'bg-yellow-100 text-yellow-800',
                    low: 'bg-green-100 text-green-800'
                };
                const size = small ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs';
                return `<span class="${colors[priority]} ${size} rounded-full font-medium">${priority.charAt(0).toUpperCase() + priority.slice(1)}</span>`;
            }

            getStatusBadge(status) {
                const statuses = {
                    'todo': 'bg-gray-100 text-gray-800',
                    'in-progress': 'bg-blue-100 text-blue-800',
                    'review': 'bg-yellow-100 text-yellow-800',
                    'completed': 'bg-green-100 text-green-800'
                };
                const labels = {
                    'todo': 'To Do',
                    'in-progress': 'In Progress',
                    'review': 'Review',
                    'completed': 'Completed'
                };
                return `<span class="${statuses[status]} px-2 py-1 text-xs rounded-full font-medium">${labels[status]}</span>`;
            }

            formatDate(dateString, short = false) {
                const date = new Date(dateString);
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                if (date.toDateString() === today.toDateString()) {
                    return 'Today';
                } else if (date.toDateString() === tomorrow.toDateString()) {
                    return 'Tomorrow';
                } else if (short) {
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else {
                    return date.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                }
            }

            toggleTaskStatus(taskId) {
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    if (task.status === 'completed') {
                        task.status = 'todo';
                        task.completedAt = null;
                    } else {
                        task.status = 'completed';
                        task.completedAt = new Date().toISOString();
                    }
                    this.saveData();
                    this.render();
                    this.updateStats();
                }
            }

            deleteTask(taskId) {
                if (confirm('Are you sure you want to delete this task?')) {
                    this.tasks = this.tasks.filter(t => t.id !== taskId);
                    this.saveData();
                    this.render();
                    this.updateStats();
                }
            }

            deleteProject(projectId) {
                if (confirm('Are you sure you want to delete this project? Tasks in this project will not be deleted.')) {
                    this.projects = this.projects.filter(p => p.id !== projectId);
                    // Remove project association from tasks
                    this.tasks.forEach(task => {
                        if (task.projectId === projectId) {
                            task.projectId = null;
                        }
                    });
                    this.saveData();
                    this.render();
                }
            }

            updateStats() {
                const today = new Date().toISOString().split('T')[0];
                const todayTasks = this.tasks.filter(task => {
                    const taskDate = task.dueDate || task.createdAt.split('T')[0];
                    return taskDate === today;
                });
                
                const completed = todayTasks.filter(task => task.status === 'completed').length;
                const total = todayTasks.length;
                const remaining = total - completed;
                const percentage = total > 0 ? (completed / total) * 100 : 0;

                document.getElementById('completedCount').textContent = completed;
                document.getElementById('remainingCount').textContent = remaining;
                document.getElementById('progressBar').style.width = `${percentage}%`;
            }

            saveData() {
                localStorage.setItem('tasks', JSON.stringify(this.tasks));
                localStorage.setItem('projects', JSON.stringify(this.projects));
            }
        }

        // Initialize the app
        const app = new TodoApp();

        // Add some sample data if empty
        if (app.tasks.length === 0 && app.projects.length === 0) {
            // Sample projects
            app.projects = [
                { id: '1', name: 'Work', color: 'blue', createdAt: new Date().toISOString() },
                { id: '2', name: 'Personal', color: 'green', createdAt: new Date().toISOString() },
                { id: '3', name: 'Learning', color: 'purple', createdAt: new Date().toISOString() }
            ];

            // Sample tasks
            app.tasks = [
                {
                    id: '1',
                    title: 'Complete project proposal',
                    description: 'Write and review the Q2 project proposal for the new client',
                    priority: 'high',
                    status: 'in-progress',
                    projectId: '1',
                    dueDate: new Date().toISOString().split('T')[0],
                    createdAt: new Date().toISOString(),
                    completedAt: null,
                    recurring: null
                },
                {
                    id: '2',
                    title: 'Review team reports',
                    description: 'Go through weekly reports from team members',
                    priority: 'medium',
                    status: 'todo',
                    projectId: '1',
                    dueDate: null,
                    createdAt: new Date().toISOString(),
                    completedAt: null,
                    recurring: 'weekly'
                },
                {
                    id: '3',
                    title: 'Learn React hooks',
                    description: 'Complete the React hooks tutorial and build a small project',
                    priority: 'medium',
                    status: 'todo',
                    projectId: '3',
                    dueDate: null,
                    createdAt: new Date().toISOString(),
                    completedAt: null,
                    recurring: null
                },
                {
                    id: '4',
                    title: 'Grocery shopping',
                    description: 'Buy ingredients for weekend dinner party',
                    priority: 'low',
                    status: 'completed',
                    projectId: '2',
                    dueDate: null,
                    createdAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    recurring: null
                }
            ];

            app.saveData();
            app.render();
            app.updateStats();
        }