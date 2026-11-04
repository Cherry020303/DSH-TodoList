window.__ModuleLoader__.load({
  id: '@local/todolist',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const PANEL_ID = 'todo-list';
    const TODOS_KEY = 'dsh.my-todos.v1';
    const LEGACY_KEY = 'dsh.sticky-notes-wall.v1';
    const NOTE_COLORS = ['sun', 'rose', 'peach', 'apricot', 'lemon', 'sage', 'mint', 'aqua', 'sky', 'periwinkle', 'lilac', 'lavender'];
    const COLOR_ALIASES = { yellow: 'sun', gold: 'sun', pink: 'rose', red: 'rose', orange: 'apricot', green: 'mint', teal: 'aqua', blue: 'sky', purple: 'lilac' };
    const listeners = new Set();

    const COPY = {
      en: {
        nav: 'TodoList', title: 'TodoList', subtitle: 'A quiet wall for the things you want to finish.',
        pendingCount: '{count} pending', search: 'Search notes', all: 'All', pending: 'Pending', completed: 'Completed',
        unscheduled: 'Unscheduled', today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday', emptyTitle: 'Your todo wall is ready', emptyBody: 'Use the + button to pin your first note.',
        noResultsTitle: 'No matching notes', noResultsBody: 'Try another keyword or status.', addTitle: 'New todo', editTitle: 'Edit todo',
        taskTitle: 'Title', titlePlaceholder: 'What needs to be done?', location: 'Location', locationPlaceholder: 'Where will this happen?', time: 'Date & time', optional: 'Optional', color: 'Note color',
        create: 'Create note', save: 'Save changes', cancel: 'Cancel', remove: 'Delete', confirmRemove: 'Click again to delete', markCompleted: 'Mark completed', markPending: 'Mark pending',
        close: 'Close', overdue: 'Overdue', saved: 'Saved automatically',
      },
      zh: {
        nav: 'TodoList', title: 'TodoList', subtitle: '把想完成的事情，轻轻贴在眼前。',
        pendingCount: '{count} 项待完成', search: '搜索便签', all: '全部', pending: '待完成', completed: '已完成',
        unscheduled: '未安排', today: '今天', tomorrow: '明天', yesterday: '昨天', emptyTitle: 'TodoList 还是空的', emptyBody: '点击右下角 +，贴上第一张待办便签。',
        noResultsTitle: '没有匹配的便签', noResultsBody: '换个关键词或状态试试。', addTitle: '新增待办', editTitle: '编辑待办',
        taskTitle: '标题', titlePlaceholder: '接下来要完成什么？', location: '地点', locationPlaceholder: '这件事在哪里进行？', time: '日期与时间', optional: '可选', color: '便签颜色',
        create: '贴上便签', save: '保存修改', cancel: '取消', remove: '删除', confirmRemove: '再次点击确认', markCompleted: '标记为已完成', markPending: '恢复为待完成',
        close: '关闭', overdue: '已逾期', saved: '自动保存',
      },
    };

    function copyFor(locale) {
      return String(locale || '').toLowerCase().startsWith('zh') ? COPY.zh : COPY.en;
    }

    function useCopy(runtime) {
      const [, setRevision] = React.useState(0);
      React.useEffect(() => runtime.locale.subscribe(() => setRevision((value) => value + 1)), [runtime]);
      return copyFor(runtime.locale.getSnapshot().active);
    }

    function todoId() {
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function colorFromId(id) {
      let hash = 0;
      const text = String(id || 'todo');
      for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
      return NOTE_COLORS[Math.abs(hash) % NOTE_COLORS.length];
    }

    function normalizeColor(value, id) {
      if (NOTE_COLORS.includes(value)) return value;
      if (typeof value === 'string' && COLOR_ALIASES[value.toLowerCase()]) return COLOR_ALIASES[value.toLowerCase()];
      return colorFromId(id);
    }

    function normalizeDue(value) {
      if (typeof value !== 'string' || !value) return '';
      const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
      if (!match) return '';
      const parts = match.slice(1).map((part) => Number(part || 0));
      const date = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
      if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2] || date.getHours() !== parts[3] || date.getMinutes() !== parts[4]) return '';
      return value;
    }

    function normalizeTodo(item) {
      if (!item || typeof item.title !== 'string') return null;
      const now = Date.now();
      const id = typeof item.id === 'string' ? item.id : todoId();
      return {
        id,
        title: item.title.trim(),
        location: typeof item.location === 'string' ? item.location.trim() : '',
        due: normalizeDue(item.due),
        status: item.status === 'completed' ? 'completed' : 'pending',
        color: normalizeColor(item.color, id),
        createdAt: Number(item.createdAt) || now,
        updatedAt: Number(item.updatedAt) || now,
      };
    }

    function loadTodos() {
      let currentRaw = null;
      try { currentRaw = window.localStorage.getItem(TODOS_KEY); } catch {}
      if (currentRaw !== null) {
        try {
          const current = JSON.parse(currentRaw);
          if (Array.isArray(current)) return current.map(normalizeTodo).filter((item) => item && item.title);
        } catch {}
      }
      try {
        const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
        const legacy = legacyRaw ? JSON.parse(legacyRaw) : [];
        const migrated = Array.isArray(legacy) ? legacy.filter((item) => item && typeof item.text === 'string' && item.text.trim()).map((item) => {
          const id = typeof item.id === 'string' ? `legacy-${item.id}` : todoId();
          return {
            id,
            title: item.text.trim().replace(/\s+/g, ' '),
            location: '',
            due: '',
            status: 'pending',
            color: normalizeColor(item.color, id),
            createdAt: Number(item.createdAt) || Date.now(),
            updatedAt: Number(item.updatedAt) || Date.now(),
          };
        }) : [];
        window.localStorage.setItem(TODOS_KEY, JSON.stringify(migrated));
        return migrated;
      } catch {
        return [];
      }
    }

    let todoState = loadTodos();
    function subscribeTodos(listener) { listeners.add(listener); return () => listeners.delete(listener); }
    function setTodos(update) {
      todoState = typeof update === 'function' ? update(todoState) : update;
      try { window.localStorage.setItem(TODOS_KEY, JSON.stringify(todoState)); } catch {}
      listeners.forEach((listener) => listener());
    }
    function useTodos() {
      const [snapshot, setSnapshot] = React.useState(() => todoState);
      React.useEffect(() => subscribeTodos(() => setSnapshot(todoState)), []);
      return snapshot;
    }

    function PanelIcon(props) {
      const todos = useTodos();
      const pending = todos.filter((item) => item.status === 'pending').length;
      const size = props && props.size ? props.size : 22;
      return h(React.Fragment, null,
        h('style', null, ICON_CSS),
        h('span', { className: 'todo-nav-icon' },
          h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', 'aria-hidden': true },
            h('path', { d: 'M6.5 5.2h11a2 2 0 0 1 2 2v10.4a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V7.2a2 2 0 0 1 2-2Z', stroke: 'currentColor', strokeWidth: 1.65 }),
            h('path', { d: 'M8.2 4.1h7.6v2.7H8.2zM8.1 11.3l1.6 1.6 3-3.2M8.1 16h7.3', stroke: 'currentColor', strokeWidth: 1.65, strokeLinecap: 'round', strokeLinejoin: 'round' })),
          pending > 0 ? h('span', { className: 'todo-nav-badge', 'aria-label': `${pending} pending` }, String(Math.min(pending, 99))) : null));
    }

    function SearchIcon() {
      return h('svg', { viewBox: '0 0 20 20', width: 17, height: 17, fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 8.3, cy: 8.3, r: 4.7, stroke: 'currentColor', strokeWidth: 1.5 }),
        h('path', { d: 'm11.8 11.8 4.1 4.1', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }));
    }

    function TrashIcon() {
      return h('svg', { viewBox: '0 0 20 20', width: 17, height: 17, fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M4.3 5.8h11.4M8 3.3h4M6.1 5.9l.7 9.8h6.4l.7-9.8M8.4 8.5v4.5M11.6 8.5v4.5', stroke: 'currentColor', strokeWidth: 1.45, strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }

    function LocationIcon() {
      return h('svg', { viewBox: '0 0 20 20', width: 14, height: 14, fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M10 17s5-4.6 5-9a5 5 0 1 0-10 0c0 4.4 5 9 5 9Z', stroke: 'currentColor', strokeWidth: 1.45, strokeLinejoin: 'round' }),
        h('circle', { cx: 10, cy: 8, r: 1.7, stroke: 'currentColor', strokeWidth: 1.45 }));
    }

    function ClockIcon() {
      return h('svg', { viewBox: '0 0 20 20', width: 14, height: 14, fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 10, cy: 10, r: 6.3, stroke: 'currentColor', strokeWidth: 1.45 }),
        h('path', { d: 'M10 6.5v4l2.8 1.7', stroke: 'currentColor', strokeWidth: 1.45, strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }

    function dateKey(due) {
      return due && due.includes('T') ? due.slice(0, 10) : '';
    }

    function localDateKey(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function localTodayKey() {
      return localDateKey(new Date());
    }

    function offsetLocalDateKey(days) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() + days);
      return localDateKey(date);
    }

    function formatGroupDate(key, locale, copy) {
      if (!key) return copy.unscheduled;
      const date = new Date(`${key}T00:00:00`);
      if (Number.isNaN(date.getTime())) return copy.unscheduled;
      const isZh = String(locale || '').toLowerCase().startsWith('zh');
      const weekday = new Intl.DateTimeFormat(locale || 'en', { weekday: 'short' }).format(date);
      const base = isZh
        ? `${key.replaceAll('-', '.')} ${weekday}`
        : new Intl.DateTimeFormat(locale || 'en', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' }).format(date);
      const relative = key === localTodayKey() ? copy.today : key === offsetLocalDateKey(1) ? copy.tomorrow : key === offsetLocalDateKey(-1) ? copy.yesterday : '';
      return relative ? `${relative} · ${base}` : base;
    }

    function formatTime(due, locale) {
      if (!due || !due.includes('T')) return '';
      const date = new Date(due);
      if (Number.isNaN(date.getTime())) return '';
      if (String(locale || '').toLowerCase().startsWith('zh')) {
        const weekday = new Intl.DateTimeFormat(locale || 'zh-CN', { weekday: 'short' }).format(date);
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekday} ${hour}:${minute}`;
      }
      return new Intl.DateTimeFormat(locale || 'en', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
    }

    function groupTodos(items) {
      const groups = new Map();
      items.forEach((todo) => {
        const key = dateKey(todo.due);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(todo);
      });
      const today = localTodayKey();
      return Array.from(groups.entries()).sort(([a], [b]) => {
        if (!a) return 1;
        if (!b) return -1;
        const aFuture = a >= today;
        const bFuture = b >= today;
        if (aFuture !== bFuture) return aFuture ? -1 : 1;
        return aFuture ? a.localeCompare(b) : b.localeCompare(a);
      }).map(([key, todos]) => ({
        key,
        todos: todos.slice().sort((a, b) => {
          if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
          if (a.due && b.due) return a.due.localeCompare(b.due);
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        }),
      }));
    }

    function Modal({ mode, todo, copy, onClose }) {
      const isEdit = mode === 'edit' && todo;
      const [title, setTitle] = React.useState(isEdit ? todo.title : '');
      const [location, setLocation] = React.useState(isEdit ? todo.location : '');
      const [due, setDue] = React.useState(isEdit ? todo.due : '');
      const timeInputRef = React.useRef(null);
      const [color, setColor] = React.useState(isEdit ? todo.color : NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]);
      const [confirmDelete, setConfirmDelete] = React.useState(false);

      React.useEffect(() => {
        const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
      }, [onClose]);

      function openTimePicker() {
        const input = timeInputRef.current;
        if (!input) return;
        input.focus();
        if (typeof input.showPicker === 'function') { try { input.showPicker(); } catch {} }
      }

      function submit(event) {
        event.preventDefault();
        const cleanTitle = title.trim();
        if (!cleanTitle) return;
        const now = Date.now();
        if (isEdit) {
          setTodos((items) => items.map((item) => item.id === todo.id ? { ...item, title: cleanTitle, location: location.trim(), due: normalizeDue(due), color, updatedAt: now } : item));
        } else {
          setTodos((items) => [{ id: todoId(), title: cleanTitle, location: location.trim(), due: normalizeDue(due), status: 'pending', color, createdAt: now, updatedAt: now }, ...items]);
        }
        onClose();
      }

      function remove() {
        if (!isEdit) return;
        if (!confirmDelete) { setConfirmDelete(true); return; }
        setTodos((items) => items.filter((item) => item.id !== todo.id));
        onClose();
      }

      function toggleStatus() {
        if (!isEdit) return;
        setTodos((items) => items.map((item) => item.id === todo.id ? { ...item, status: item.status === 'pending' ? 'completed' : 'pending', updatedAt: Date.now() } : item));
        onClose();
      }

      return h('div', { className: 'todo-modal-backdrop', onMouseDown: (event) => { if (event.target === event.currentTarget) onClose(); } },
        h('section', { className: 'todo-modal', role: 'dialog', 'aria-modal': true, 'aria-label': isEdit ? copy.editTitle : copy.addTitle },
          h('header', null,
            h('div', null, h('span', { className: `todo-paper-dot color-${color}` }), h('h2', null, isEdit ? copy.editTitle : copy.addTitle)),
            h('button', { type: 'button', className: 'todo-modal-close', onClick: onClose, 'aria-label': copy.close }, '×')),
          h('form', { onSubmit: submit },
            h('label', null, h('span', null, copy.taskTitle), h('input', { value: title, onChange: (event) => setTitle(event.target.value), placeholder: copy.titlePlaceholder, autoFocus: true })),
            h('label', null, h('span', null, `${copy.location} · ${copy.optional}`), h('input', { value: location, onChange: (event) => setLocation(event.target.value), placeholder: copy.locationPlaceholder })),
            h('div', { className: 'todo-field todo-datetime-field', onClick: (event) => { if (event.target !== timeInputRef.current) openTimePicker(); } }, h('span', null, `${copy.time} · ${copy.optional}`), h('input', { ref: timeInputRef, type: 'datetime-local', value: due, onClick: (event) => { event.preventDefault(); event.stopPropagation(); openTimePicker(); }, onChange: (event) => setDue(event.target.value) })),
            h('fieldset', null, h('legend', null, copy.color), h('div', { className: 'todo-color-picker' }, NOTE_COLORS.map((value) => h('button', { key: value, type: 'button', className: `color-${value}${color === value ? ' is-selected' : ''}`, onClick: () => setColor(value), 'aria-label': value })))),
            h('footer', null,
              isEdit ? h('button', { type: 'button', className: `todo-danger${confirmDelete ? ' is-confirming' : ''}`, onClick: remove }, h(TrashIcon), confirmDelete ? copy.confirmRemove : copy.remove) : h('span'),
              h('div', null,
                isEdit ? h('button', { type: 'button', className: 'todo-secondary', onClick: toggleStatus }, todo.status === 'pending' ? copy.markCompleted : copy.markPending) : null,
                h('button', { type: 'button', className: 'todo-secondary', onClick: onClose }, copy.cancel),
                h('button', { type: 'submit', className: 'todo-primary', disabled: !title.trim() }, isEdit ? copy.save : copy.create))))));
    }

    function NoteCard({ todo, copy, locale, onEdit }) {
      const overdue = todo.status === 'pending' && todo.due && new Date(todo.due).getTime() < Date.now();
      const tilt = ((Math.abs(todo.id.split('').reduce((sum, letter) => sum + letter.charCodeAt(0), 0)) % 7) - 3) * 0.22;
      const time = formatTime(todo.due, locale);
      function toggle(event) {
        event.stopPropagation();
        setTodos((items) => items.map((item) => item.id === todo.id ? { ...item, status: item.status === 'pending' ? 'completed' : 'pending', updatedAt: Date.now() } : item));
      }
      return h('article', {
        className: `todo-note color-${todo.color} status-${todo.status}${overdue ? ' is-overdue' : ''}`,
        style: { '--todo-tilt': `${tilt}deg` },
        tabIndex: 0,
        role: 'button',
        onClick: () => onEdit(todo),
        onKeyDown: (event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onEdit(todo); } },
      },
        h('div', { className: 'todo-note-heading' },
          h('button', { type: 'button', className: `todo-status-light status-${todo.status}`, onClick: toggle, 'aria-label': todo.status === 'pending' ? copy.markCompleted : copy.markPending }, h('span', { className: 'todo-status-dot', 'aria-hidden': true })),
          h('h3', null, todo.title)),
        todo.location || time ? h('div', { className: 'todo-note-details' },
          todo.location ? h('div', { className: 'todo-note-detail' }, h(LocationIcon), h('span', null, todo.location)) : null,
          time ? h('div', { className: `todo-note-detail todo-note-time${overdue ? ' is-overdue' : ''}` }, h(ClockIcon), h('span', null, time), overdue ? h('em', null, copy.overdue) : null) : null) : null);
    }

    function TodoPanel({ runtime }) {
      const copy = useCopy(runtime);
      const locale = runtime.locale.getSnapshot().active;
      const todos = useTodos();
      const [query, setQuery] = React.useState('');
      const [filter, setFilter] = React.useState('all');
      const [modal, setModal] = React.useState(null);
      const word = query.trim().toLowerCase();
      const visible = todos.filter((item) => (filter === 'all' || item.status === filter) && (!word || item.title.toLowerCase().includes(word) || item.location.toLowerCase().includes(word)));
      const groups = groupTodos(visible);
      const pending = todos.filter((item) => item.status === 'pending').length;
      const empty = todos.length === 0;
      const noResults = !empty && visible.length === 0;

      return h('div', { className: 'todo-page' },
        h('style', null, CSS),
        h('header', { className: 'todo-header' },
          h('div', { className: 'todo-heading' },
            h('h1', null, copy.title),
            h('p', null, copy.subtitle)),
          h('div', { className: 'todo-header-actions' },
            h('span', { className: 'todo-pending-chip' }, copy.pendingCount.replace('{count}', String(pending))),
            h('div', { className: 'todo-search' }, h(SearchIcon), h('input', { value: query, onChange: (event) => setQuery(event.target.value), placeholder: copy.search, 'aria-label': copy.search }), query ? h('button', { type: 'button', onClick: () => setQuery(''), 'aria-label': copy.close }, '×') : null),
            h('div', { className: 'todo-filters' }, [['all', copy.all], ['pending', copy.pending], ['completed', copy.completed]].map(([value, label]) => h('button', { key: value, type: 'button', className: filter === value ? 'is-active' : '', onClick: () => setFilter(value) }, label))))),
        h('main', { className: 'todo-wall', 'aria-live': 'polite' },
          empty || noResults ? h('section', { className: 'todo-empty' },
            h('div', { className: 'todo-empty-note' }, h('span', null, '+'), h('strong', null, noResults ? copy.noResultsTitle : copy.emptyTitle)),
            h('p', null, noResults ? copy.noResultsBody : copy.emptyBody)) :
            groups.map((group) => h('section', { className: 'todo-date-group', key: group.key || 'unscheduled' },
              h('header', null, h('h2', null, formatGroupDate(group.key, locale, copy)), h('span', { className: 'todo-group-count' }, group.todos.length)),
              h('div', { className: 'todo-note-grid' }, group.todos.map((todo) => h(NoteCard, { key: todo.id, todo, copy, locale, onEdit: (item) => setModal({ mode: 'edit', todo: item }) })))))),
        h('button', { type: 'button', className: 'todo-fab', onClick: () => setModal({ mode: 'create', todo: null }), 'aria-label': copy.addTitle }, h('span', null, '+')),
        modal ? h(Modal, { key: modal.todo ? modal.todo.id : 'create', mode: modal.mode, todo: modal.todo, copy, onClose: () => setModal(null) }) : null);
    }

    const ICON_CSS = `
      @keyframes todo-badge-breathe{0%,100%{box-shadow:0 0 0 0 rgba(232,78,91,.4)}50%{box-shadow:0 0 0 5px rgba(232,78,91,0)}}
      button:has(.todo-nav-icon),[role=button]:has(.todo-nav-icon){position:relative!important;padding-right:50px!important}
      .todo-nav-icon{position:static;display:grid;place-items:center}
      .todo-nav-badge{position:absolute;right:16px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:21px;height:21px;box-sizing:border-box;border:2px solid var(--dsw-alias-bg-layer-1);border-radius:50%;background:#e84e5b;color:#fff;font:700 10px/1 system-ui;animation:todo-badge-breathe 2s ease-in-out infinite}
    `;

    const CSS = `
      @keyframes todo-pending-breathe{0%,100%{box-shadow:0 0 0 0 rgba(242,157,54,.5)}50%{box-shadow:0 0 0 7px rgba(242,157,54,0)}}
      @keyframes todo-complete-breathe{0%,100%{box-shadow:0 0 0 0 rgba(55,181,117,.42)}50%{box-shadow:0 0 0 6px rgba(55,181,117,0)}}
      .todo-page{position:relative;height:100%;min-height:0;overflow:auto;background:var(--dsh-dream-skin-page-fill,var(--dsw-alias-bg-base));color:var(--dsw-alias-label-primary);font-family:inherit}
      .todo-header{position:sticky;top:0;z-index:8;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:25px 34px 20px;border-bottom:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsh-dream-skin-page-fill,var(--dsw-alias-bg-base)) 92%,transparent);backdrop-filter:blur(18px)}
      .todo-heading h1{margin:0;font-size:30px;line-height:1.05;letter-spacing:-.045em}.todo-heading p{margin:8px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px}.todo-header-actions{display:flex;align-items:center;gap:10px}.todo-pending-chip{white-space:nowrap;padding:7px 11px;border-radius:999px;background:color-mix(in srgb,#f29d36 14%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:650}
      .todo-search{display:flex;align-items:center;gap:7px;width:210px;height:35px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}.todo-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}.todo-search button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font-size:18px;cursor:pointer}
      .todo-filters{display:flex;gap:3px;padding:3px;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:var(--dsw-alias-bg-layer-1)}.todo-filters button{height:29px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}.todo-filters button.is-active{background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-primary);font-weight:700}
      .todo-wall{width:min(1040px,calc(100% - 64px));margin:0 auto;padding:31px 0 100px}.todo-date-group{margin-bottom:31px}.todo-date-group>header{display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid var(--dsw-alias-border-l1)}.todo-date-group h2{margin:0 0 -1px;padding:0 2px 10px;border-bottom:2px solid color-mix(in srgb,var(--dsw-alias-label-primary) 58%,transparent);font-size:14px;letter-spacing:.01em}.todo-group-count{display:grid;place-items:center;width:18px;height:18px;box-sizing:border-box;margin-bottom:10px;border-radius:50%;background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent);color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:9px;font-weight:650}
      .todo-note-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px 21px;padding:2px 4px 0}.todo-note{--paper:#FFE7A3;position:relative;display:flex;min-height:132px;box-sizing:border-box;flex-direction:column;justify-content:flex-start;padding:18px;border:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);border-radius:12px;background:var(--paper);color:#343743;box-shadow:0 9px 22px color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent),inset 0 1px rgba(255,255,255,.42);cursor:pointer;transform:rotate(var(--todo-tilt));transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease}.todo-note:hover,.todo-note:focus-visible{z-index:2;transform:translateY(-4px) rotate(0);box-shadow:0 15px 30px color-mix(in srgb,var(--dsw-alias-label-primary) 13%,transparent);outline:none}.todo-note.color-rose{--paper:#FFD1DC}.todo-note.color-peach{--paper:#FFD7C2}.todo-note.color-apricot{--paper:#FFE0B5}.todo-note.color-lemon{--paper:#FFF3B0}.todo-note.color-sage{--paper:#DDE8C8}.todo-note.color-mint{--paper:#CBEEDD}.todo-note.color-aqua{--paper:#CDEFF2}.todo-note.color-sky{--paper:#CEE8FF}.todo-note.color-periwinkle{--paper:#D8DEFF}.todo-note.color-lilac{--paper:#E5D5FF}.todo-note.color-lavender{--paper:#EADFF5}.todo-note-heading{display:flex;align-items:flex-start;gap:8px;min-width:0}.todo-note h3{flex:1;min-width:0;margin:1px 0 0;font-size:16px;line-height:1.45;letter-spacing:0;overflow-wrap:anywhere}.todo-note.status-completed{filter:saturate(.76);opacity:.8}
      .todo-status-light{flex:0 0 32px;display:grid!important;place-items:center;width:32px!important;height:32px!important;margin:-6px 0 0 -7px!important;padding:0!important;border:0!important;border-radius:50%!important;background:transparent!important;box-shadow:none!important;appearance:none;cursor:pointer}.todo-status-light:focus-visible{outline:2px solid rgba(52,55,67,.4);outline-offset:-3px}.todo-status-dot{position:relative;display:block;width:18px;height:18px;border-radius:50%;transition:transform .16s ease,box-shadow .16s ease}.todo-status-light:hover .todo-status-dot{transform:scale(1.08)}.todo-status-light.status-pending .todo-status-dot{background:#f29d36;animation:todo-pending-breathe 2.6s ease-in-out infinite}.todo-status-light.status-completed .todo-status-dot{background:#37b575;animation:todo-complete-breathe 3s ease-in-out infinite}.todo-status-light.status-completed .todo-status-dot::after{content:'';position:absolute;left:5px;top:4px;width:6px;height:3px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg)}.todo-note-details{display:flex;flex-direction:column;gap:8px;margin-top:17px;padding-left:33px;color:rgba(52,55,67,.76);font-size:13px}.todo-note-detail{display:flex;align-items:center;gap:8px;min-width:0;line-height:1.45}.todo-note-detail svg{width:16px;height:16px;flex:0 0 16px;opacity:.84}.todo-note-detail span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.todo-note-time.is-overdue{color:#b83e4a;font-weight:650}.todo-note-time.is-overdue svg{opacity:.9}.todo-note-detail em{flex:0 0 auto;padding:2px 5px;border-radius:999px;background:rgba(214,73,85,.1);color:#b83e4a;font-size:9px;font-style:normal;font-weight:700}
      .todo-fab{position:fixed;right:32px;bottom:28px;z-index:9;display:grid;place-items:center;width:56px;height:56px;padding:0;border:0;border-radius:50%;background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#5068ee));color:#fff;box-shadow:0 13px 30px color-mix(in srgb,var(--dsw-alias-brand-primary,#5068ee) 32%,transparent);cursor:pointer;transition:transform .16s ease,box-shadow .16s ease}.todo-fab:hover{transform:translateY(-3px) scale(1.03);box-shadow:0 17px 34px color-mix(in srgb,var(--dsw-alias-brand-primary,#5068ee) 38%,transparent)}.todo-fab span{font-size:31px;font-weight:300;line-height:1}
      .todo-empty{display:flex;min-height:410px;flex-direction:column;align-items:center;justify-content:center;text-align:center}.todo-empty-note{display:flex;width:152px;min-height:118px;box-sizing:border-box;flex-direction:column;align-items:center;justify-content:center;padding:20px;border-radius:8px 15px 10px 14px;background:color-mix(in srgb,#f6d269 30%,var(--dsw-alias-bg-layer-1));box-shadow:0 10px 24px color-mix(in srgb,var(--dsw-alias-label-primary) 9%,transparent);transform:rotate(-2deg)}.todo-empty-note span{font-size:30px;font-weight:300}.todo-empty-note strong{margin-top:8px;font-size:13px}.todo-empty p{margin:22px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px}
      .todo-modal-backdrop{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:24px;background:color-mix(in srgb,#10131c 42%,transparent);backdrop-filter:blur(5px)}.todo-modal{width:min(470px,100%);max-height:calc(100vh - 48px);overflow:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:19px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 28px 80px rgba(0,0,0,.26)}.todo-modal>header{display:flex;align-items:center;justify-content:space-between;padding:21px 22px 12px}.todo-modal>header>div{display:flex;align-items:center;gap:10px}.todo-modal h2{margin:0;font-size:19px}.todo-paper-dot{width:11px;height:11px;border-radius:3px;background:#FFE7A3}.todo-paper-dot.color-rose{background:#FFD1DC}.todo-paper-dot.color-peach{background:#FFD7C2}.todo-paper-dot.color-apricot{background:#FFE0B5}.todo-paper-dot.color-lemon{background:#FFF3B0}.todo-paper-dot.color-sage{background:#DDE8C8}.todo-paper-dot.color-mint{background:#CBEEDD}.todo-paper-dot.color-aqua{background:#CDEFF2}.todo-paper-dot.color-sky{background:#CEE8FF}.todo-paper-dot.color-periwinkle{background:#D8DEFF}.todo-paper-dot.color-lilac{background:#E5D5FF}.todo-paper-dot.color-lavender{background:#EADFF5}.todo-modal-close{width:32px;height:32px;border:0;border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:23px;cursor:pointer}.todo-modal-close:hover{background:var(--dsw-alias-bg-layer-2)}
      .todo-modal form{display:flex;flex-direction:column;gap:15px;padding:10px 22px 21px}.todo-modal label,.todo-modal .todo-field{display:flex;flex-direction:column;gap:7px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:650}.todo-modal input{height:44px;box-sizing:border-box;padding:0 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit}.todo-datetime-field,.todo-datetime-field input{cursor:pointer}.todo-modal fieldset{margin:0;padding:0;border:0}.todo-modal legend{margin-bottom:9px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:650}.todo-color-picker{display:grid;grid-template-columns:repeat(6,28px);gap:9px}.todo-color-picker button{width:28px;height:28px;padding:0;border:2px solid transparent;border-radius:9px;background:#FFE7A3;cursor:pointer}.todo-color-picker button.color-rose{background:#FFD1DC}.todo-color-picker button.color-peach{background:#FFD7C2}.todo-color-picker button.color-apricot{background:#FFE0B5}.todo-color-picker button.color-lemon{background:#FFF3B0}.todo-color-picker button.color-sage{background:#DDE8C8}.todo-color-picker button.color-mint{background:#CBEEDD}.todo-color-picker button.color-aqua{background:#CDEFF2}.todo-color-picker button.color-sky{background:#CEE8FF}.todo-color-picker button.color-periwinkle{background:#D8DEFF}.todo-color-picker button.color-lilac{background:#E5D5FF}.todo-color-picker button.color-lavender{background:#EADFF5}.todo-color-picker button.is-selected{border-color:var(--dsw-alias-label-primary);box-shadow:0 0 0 2px var(--dsw-alias-bg-layer-1) inset}.todo-modal footer{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:5px}.todo-modal footer>div{display:flex;align-items:center;gap:8px}.todo-primary,.todo-secondary,.todo-danger{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:38px;padding:0 14px;border-radius:10px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}.todo-primary{border:0;background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#5068ee));color:#fff}.todo-primary:disabled{opacity:.42;cursor:not-allowed}.todo-secondary{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.todo-danger{padding:0 9px;border:0;background:transparent;color:#d64955}.todo-danger:hover,.todo-danger.is-confirming{background:color-mix(in srgb,#d64955 10%,transparent)}
      button:focus-visible,input:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#5068ee));outline-offset:2px}
      @media(max-width:980px){.todo-header{align-items:flex-start;flex-direction:column}.todo-header-actions{width:100%;flex-wrap:wrap}.todo-search{flex:1;min-width:180px}.todo-wall{width:min(100% - 40px,820px)}.todo-note-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:640px){.todo-header{padding:21px 20px 17px}.todo-heading h1{font-size:27px}.todo-pending-chip{display:none}.todo-filters{order:3}.todo-wall{width:calc(100% - 32px);padding-top:24px}.todo-note-grid{grid-template-columns:1fr;gap:15px}.todo-note{min-height:112px}.todo-fab{right:20px;bottom:20px;width:52px;height:52px}.todo-modal-backdrop{padding:14px}.todo-modal footer{align-items:stretch;flex-direction:column-reverse}.todo-modal footer>div{justify-content:flex-end;flex-wrap:wrap}.todo-danger{align-self:flex-start}}
    `;

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 20, label: () => copyFor(ctx.locale.getSnapshot().active).nav }, PanelIcon));
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, () => h(TodoPanel, { runtime: ctx })));
      },
    };
  },
});
