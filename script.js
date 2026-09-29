  const STORAGE_KEY = 'taskManagerTasks';
  const THEME_KEY = 'taskManagerTheme';

  const form = document.getElementById('taskForm');
  const formTitle = document.getElementById('formTitle');
  const submitBtn = document.getElementById('submitBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const listContainer = document.getElementById('listContainer');
  const emptyState = document.getElementById('emptyState');
  const visibleCount = document.getElementById('visibleCount');
  const totalCount = document.getElementById('totalCount');
  const completedCount = document.getElementById('completedCount');
  const pendingCount = document.getElementById('pendingCount');
  const searchInput = document.getElementById('searchInput');
  const filterDept = document.getElementById('filterDept');
  const sortBy = document.getElementById('sortBy');
  const exportBtn = document.getElementById('exportBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const themeToggle = document.getElementById('themeToggle');
  const cardViewBtn = document.getElementById('cardViewBtn');
  const tableViewBtn = document.getElementById('tableViewBtn');
  const toastContainer = document.getElementById('toastContainer');
  const progressFill = document.getElementById('progressFill');
  const progressPercentLabel = document.getElementById('progressPercentLabel');

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    const icons = { success: '✅', error: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.2s ease forwards';
      setTimeout(() => toast.remove(), 200);
    }, 2500);
  }

  const fields = ['firstName', 'lastName', 'age', 'department', 'taskDesc', 'priority', 'dueDate'];
  const AVATAR_COLORS = ['#4f46e5', '#0891b2', '#db2777', '#ea580c', '#65a30d', '#7c3aed', '#0d9488'];

  let tasks = [];
  let nextId = 1;
  let editingId = null;
  let viewMode = 'cards';

  function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(task.dueDate + 'T00:00:00') < today;
  }

  function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function initials(first, last) {
    return ((first[0] || '') + (last[0] || '')).toUpperCase();
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        tasks = parsed.tasks || [];
        nextId = parsed.nextId || (tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1);
      }
    } catch (e) {
      tasks = [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, nextId }));
    } catch (e) {
      console.error('Could not save tasks', e);
    }
  }

  function loadTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️ Light Mode';
      }
    } catch (e) {}
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      themeToggle.textContent = '🌙 Dark Mode';
      try { localStorage.setItem(THEME_KEY, 'light'); } catch (e) {}
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggle.textContent = '☀️ Light Mode';
      try { localStorage.setItem(THEME_KEY, 'dark'); } catch (e) {}
    }
  }

  function clearErrors() {
    fields.forEach(f => {
      const el = document.getElementById('err-' + f);
      if (el) el.textContent = '';
    });
  }

  function validate() {
    clearErrors();
    let valid = true;

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const age = document.getElementById('age').value.trim();
    const department = document.getElementById('department').value.trim();
    const taskDesc = document.getElementById('taskDesc').value.trim();
    const dueDate = document.getElementById('dueDate').value;

    if (!firstName) {
      document.getElementById('err-firstName').textContent = 'First name is required.';
      valid = false;
    }
    if (!lastName) {
      document.getElementById('err-lastName').textContent = 'Last name is required.';
      valid = false;
    }
    if (!age) {
      document.getElementById('err-age').textContent = 'Age is required.';
      valid = false;
    } else if (isNaN(age) || Number(age) < 1 || Number(age) > 120) {
      document.getElementById('err-age').textContent = 'Enter a valid age (1–120).';
      valid = false;
    }
    if (!department) {
      document.getElementById('err-department').textContent = 'Department is required.';
      valid = false;
    }
    if (!taskDesc) {
      document.getElementById('err-taskDesc').textContent = 'Task description is required.';
      valid = false;
    }
    if (!dueDate) {
      document.getElementById('err-dueDate').textContent = 'Due date is required.';
      valid = false;
    }

    return valid;
  }

  function refreshDeptOptions() {
    const currentValue = filterDept.value;
    const depts = [...new Set(tasks.map(t => t.department))].sort((a, b) => a.localeCompare(b));
    filterDept.innerHTML = '<option value="">All Departments</option>' +
      depts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
    if (depts.includes(currentValue)) filterDept.value = currentValue;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function getFilteredSortedTasks() {
    let result = [...tasks];

    const search = searchInput.value.trim().toLowerCase();
    if (search) {
      result = result.filter(t =>
        (t.firstName + ' ' + t.lastName).toLowerCase().includes(search)
      );
    }

    const dept = filterDept.value;
    if (dept) {
      result = result.filter(t => t.department === dept);
    }

    const sort = sortBy.value;
    if (sort === 'nameAsc') {
      result.sort((a, b) => a.firstName.localeCompare(b.firstName));
    } else if (sort === 'nameDesc') {
      result.sort((a, b) => b.firstName.localeCompare(a.firstName));
    } else if (sort === 'ageAsc') {
      result.sort((a, b) => Number(a.age) - Number(b.age));
    } else if (sort === 'ageDesc') {
      result.sort((a, b) => Number(b.age) - Number(a.age));
    } else if (sort === 'dueDate') {
      result.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    }

    return result;
  }

  function updateStats() {
    totalCount.textContent = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    completedCount.textContent = completed;
    pendingCount.textContent = tasks.length - completed;

    const pct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    progressFill.style.width = pct + '%';
    progressPercentLabel.textContent = pct + '%';
  }

  function renderTasks() {
    const filtered = getFilteredSortedTasks();
    listContainer.innerHTML = '';

    if (viewMode === 'table') {
      renderTable(filtered);
    } else {
      renderCards(filtered);
    }

    emptyState.style.display = tasks.length === 0 ? 'block' : 'none';
    visibleCount.textContent = `${filtered.length} shown`;
    updateStats();
    refreshDeptOptions();
  }

  function renderCards(filtered) {
    const ul = document.createElement('ul');
    ul.id = 'taskList';

    filtered.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item priority-' + task.priority + (task.completed ? ' completed' : '');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => toggleComplete(task.id));

      const fullName = `${task.firstName} ${task.lastName}`;
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.style.background = avatarColor(fullName);
      avatar.textContent = initials(task.firstName, task.lastName);

      const info = document.createElement('div');
      info.className = 'task-info';

      const name = document.createElement('div');
      name.className = 'task-name';
      name.textContent = fullName;

      const desc = document.createElement('div');
      desc.className = 'task-desc';
      desc.textContent = task.taskDesc;

      const meta = document.createElement('div');
      meta.className = 'task-meta';

      const ageBadge = document.createElement('span');
      ageBadge.className = 'badge badge-age';
      ageBadge.textContent = `Age: ${task.age}`;

      const deptBadge = document.createElement('span');
      deptBadge.className = 'badge badge-dept';
      deptBadge.textContent = task.department;

      const priorityBadge = document.createElement('span');
      priorityBadge.className = 'badge badge-priority-' + task.priority;
      priorityBadge.textContent = task.priority + ' Priority';

      const dateBadge = document.createElement('span');
      const overdue = isOverdue(task);
      dateBadge.className = 'badge badge-date' + (overdue ? ' overdue' : '');
      dateBadge.textContent = (overdue ? '⚠️ Overdue: ' : '📅 ') + formatDate(task.dueDate);

      meta.appendChild(ageBadge);
      meta.appendChild(deptBadge);
      meta.appendChild(priorityBadge);
      meta.appendChild(dateBadge);

      info.appendChild(name);
      info.appendChild(desc);
      info.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'task-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.textContent = '✏️ Edit';
      editBtn.addEventListener('click', () => startEdit(task.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn delete';
      deleteBtn.textContent = '🗑️ Delete';
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(checkbox);
      li.appendChild(avatar);
      li.appendChild(info);
      li.appendChild(actions);

      ul.appendChild(li);
    });

    listContainer.appendChild(ul);
  }

  function renderTable(filtered) {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';

    const table = document.createElement('table');
    table.className = 'task-table';

    table.innerHTML = `
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>Age</th>
          <th>Department</th>
          <th>Task</th>
          <th>Priority</th>
          <th>Due Date</th>
          <th>Actions</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');

    filtered.forEach(task => {
      const tr = document.createElement('tr');
      if (task.completed) tr.className = 'completed';

      const overdue = isOverdue(task);
      const dueLabel = (overdue ? '⚠️ ' : '') + formatDate(task.dueDate);

      tr.innerHTML = `
        <td></td>
        <td>${escapeHtml(task.firstName + ' ' + task.lastName)}</td>
        <td>${escapeHtml(String(task.age))}</td>
        <td>${escapeHtml(task.department)}</td>
        <td>${escapeHtml(task.taskDesc)}</td>
        <td><span class="badge badge-priority-${task.priority}">${task.priority}</span></td>
        <td style="${overdue ? 'color:var(--danger);font-weight:700;' : ''}">${dueLabel}</td>
        <td></td>
      `;

      const checkboxCell = tr.children[0];
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => toggleComplete(task.id));
      checkboxCell.appendChild(checkbox);

      const actionsCell = tr.children[7];
      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.textContent = '✏️';
      editBtn.title = 'Edit';
      editBtn.addEventListener('click', () => startEdit(task.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn delete';
      deleteBtn.textContent = '🗑️';
      deleteBtn.title = 'Delete';
      deleteBtn.style.marginLeft = '6px';
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      actionsCell.appendChild(editBtn);
      actionsCell.appendChild(deleteBtn);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrap.appendChild(table);
    listContainer.appendChild(wrap);
  }

  function setViewMode(mode) {
    viewMode = mode;
    cardViewBtn.classList.toggle('active', mode === 'cards');
    tableViewBtn.classList.toggle('active', mode === 'table');
    renderTasks();
  }

  function addOrUpdateTask(data) {
    if (editingId !== null) {
      const task = tasks.find(t => t.id === editingId);
      if (task) Object.assign(task, data);
      editingId = null;
      formTitle.textContent = 'Add New Task';
      submitBtn.textContent = 'Add Task';
      cancelEditBtn.style.display = 'none';
      showToast('Task updated successfully', 'success');
    } else {
      tasks.push({ id: nextId++, completed: false, ...data });
      showToast('Task added', 'success');
    }
    saveTasks();
    renderTasks();
  }

  function startEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    editingId = id;
    document.getElementById('firstName').value = task.firstName;
    document.getElementById('lastName').value = task.lastName;
    document.getElementById('age').value = task.age;
    document.getElementById('department').value = task.department;
    document.getElementById('taskDesc').value = task.taskDesc;
    document.getElementById('priority').value = task.priority;
    document.getElementById('dueDate').value = task.dueDate;
    formTitle.textContent = 'Edit Task';
    submitBtn.textContent = 'Update Task';
    cancelEditBtn.style.display = 'inline-block';
    clearErrors();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    editingId = null;
    form.reset();
    document.getElementById('priority').value = 'Medium';
    formTitle.textContent = 'Add New Task';
    submitBtn.textContent = 'Add Task';
    cancelEditBtn.style.display = 'none';
    clearErrors();
  }

  function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      saveTasks();
      renderTasks();
      showToast(task.completed ? 'Marked as completed' : 'Marked as pending', 'info');
    }
  }

  function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const confirmed = confirm(`Delete task for ${task.firstName} ${task.lastName}? This cannot be undone.`);
    if (confirmed) {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderTasks();
      showToast('Task deleted', 'error');
    }
  }

  function clearAll() {
    if (tasks.length === 0) return;
    const confirmed = confirm('Delete ALL tasks? This cannot be undone.');
    if (confirmed) {
      tasks = [];
      saveTasks();
      renderTasks();
      showToast('All tasks cleared', 'error');
    }
  }

  function exportCSV() {
    if (tasks.length === 0) {
      showToast('No tasks to export', 'error');
      return;
    }
    const headers = ['First Name', 'Last Name', 'Age', 'Department', 'Task', 'Priority', 'Due Date', 'Completed'];
    const rows = tasks.map(t => [
      t.firstName, t.lastName, t.age, t.department, t.taskDesc, t.priority, t.dueDate, t.completed ? 'Yes' : 'No'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV exported', 'success');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      firstName: document.getElementById('firstName').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      age: document.getElementById('age').value.trim(),
      department: document.getElementById('department').value.trim(),
      taskDesc: document.getElementById('taskDesc').value.trim(),
      priority: document.getElementById('priority').value,
      dueDate: document.getElementById('dueDate').value
    };

    addOrUpdateTask(data);
    form.reset();
    document.getElementById('priority').value = 'Medium';
    document.getElementById('firstName').focus();
  });

  cancelEditBtn.addEventListener('click', cancelEdit);
  searchInput.addEventListener('input', renderTasks);
  filterDept.addEventListener('change', renderTasks);
  sortBy.addEventListener('change', renderTasks);
  exportBtn.addEventListener('click', exportCSV);
  clearAllBtn.addEventListener('click', clearAll);
  themeToggle.addEventListener('click', toggleTheme);
  cardViewBtn.addEventListener('click', () => setViewMode('cards'));
  tableViewBtn.addEventListener('click', () => setViewMode('table'));

  loadTheme();
  loadTasks();
  renderTasks();
