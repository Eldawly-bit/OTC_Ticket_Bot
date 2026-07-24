document.addEventListener('DOMContentLoaded', () => {
  // Mobile Sidebar Toggle
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('mobileSidebarToggle');
  const closeBtn = document.getElementById('mobileSidebarClose');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => sidebar.classList.add('show'));
  }
  if (closeBtn && sidebar) {
    closeBtn.addEventListener('click', () => sidebar.classList.remove('show'));
  }

  // Helper for CSRF Token
  const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  };

  // Helper Alert Toast
  window.showAlert = (message, type = 'success') => {
    const container = document.getElementById('alertContainer');
    if (!container) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : 'circle-exclamation'}"></i> <span>${message}</span>`;
    
    container.appendChild(alert);

    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transform = 'translateX(100%)';
      setTimeout(() => alert.remove(), 300);
    }, 4000);
  };

  // Helper AJAX Post
  async function postData(url, body) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      throw err;
    }
  }

  // ─── Server Settings Form ───
  const serverForm = document.getElementById('serverSettingsForm');
  if (serverForm) {
    serverForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(serverForm);
      const data = Object.fromEntries(formData.entries());
      
      try {
        const res = await postData('/api/settings/server', data);
        showAlert(res.message || 'Server settings updated!');
      } catch (err) {
        showAlert(err.message, 'danger');
      }
    });
  }

  // ─── Ticket Settings Form ───
  const ticketForm = document.getElementById('ticketSettingsForm');
  if (ticketForm) {
    ticketForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(ticketForm);
      const data = Object.fromEntries(formData.entries());

      data.complaintEnabled = ticketForm.querySelector('[name="complaintEnabled"]').checked;
      data.suggestionEnabled = ticketForm.querySelector('[name="suggestionEnabled"]').checked;
      data.jointeamEnabled = ticketForm.querySelector('[name="jointeamEnabled"]').checked;
      data.autoClose = ticketForm.querySelector('[name="autoClose"]').checked;
      data.autoDelete = ticketForm.querySelector('[name="autoDelete"]').checked;

      try {
        const res = await postData('/api/settings/ticket', data);
        showAlert(res.message || 'Ticket settings updated!');
      } catch (err) {
        showAlert(err.message, 'danger');
      }
    });
  }

  // ─── Role Settings Form ───
  const roleForm = document.getElementById('roleSettingsForm');
  if (roleForm) {
    roleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const getSelected = (selectId) => {
        const sel = document.getElementById(selectId);
        return sel ? Array.from(sel.selectedOptions).map(o => o.value) : [];
      };

      const payload = {
        staffRoles: getSelected('staffRoles'),
        supportRoles: getSelected('supportRoles'),
        adminRoles: getSelected('adminRoles'),
        managerRoles: getSelected('managerRoles'),
        pingRoles: getSelected('pingRoles')
      };

      try {
        const res = await postData('/api/settings/roles', payload);
        showAlert(res.message || 'Role settings updated!');
      } catch (err) {
        showAlert(err.message, 'danger');
      }
    });
  }

  // ─── Dynamic Join Team Questions ───
  const addQBtn = document.getElementById('addQuestionBtn');
  const qContainer = document.getElementById('questionsContainer');
  const joinTeamForm = document.getElementById('joinTeamQuestionsForm');

  if (addQBtn && qContainer) {
    addQBtn.addEventListener('click', () => {
      const currentCards = qContainer.querySelectorAll('.question-card');
      if (currentCards.length >= 5) {
        showAlert('Maximum 5 questions allowed!', 'danger');
        return;
      }

      const index = currentCards.length;
      const card = document.createElement('div');
      card.className = 'question-card glass-card';
      card.dataset.index = index;
      card.innerHTML = `
        <div class="question-header">
          <span class="question-badge"><i class="fa-solid fa-grip-vertical"></i> Question #<span class="q-num">${index + 1}</span></span>
          <button type="button" class="btn btn-sm btn-danger remove-q-btn"><i class="fa-solid fa-trash"></i> Remove</button>
        </div>
        <div class="question-body form-row">
          <input type="hidden" name="question_key" value="join_custom_${Date.now()}">
          <div class="form-group half">
            <label>Question Label / Title</label>
            <input type="text" name="label" class="form-control" placeholder="e.g. Portfolio link, Availability" required>
          </div>
          <div class="form-group half">
            <label>Placeholder Text</label>
            <input type="text" name="placeholder" class="form-control" placeholder="e.g. Enter details...">
          </div>
          <div class="form-group half">
            <label>Response Type</label>
            <select name="style" class="form-control">
              <option value="short">Short Text (Single Line)</option>
              <option value="paragraph">Paragraph (Multi-line)</option>
            </select>
          </div>
          <div class="form-group half">
            <label>Required Option</label>
            <div class="checkbox-wrapper">
              <label class="switch">
                <input type="checkbox" name="required" value="true" checked>
                <span class="slider round"></span>
              </label>
              <span>Mandatory field</span>
            </div>
          </div>
        </div>
      `;

      qContainer.appendChild(card);
      if (qContainer.querySelectorAll('.question-card').length >= 5) {
        addQBtn.disabled = true;
      }
    });

    qContainer.addEventListener('click', (e) => {
      if (e.target.closest('.remove-q-btn')) {
        const card = e.target.closest('.question-card');
        if (card) {
          card.remove();
          // Update question numbers
          qContainer.querySelectorAll('.question-card').forEach((c, idx) => {
            c.querySelector('.q-num').textContent = idx + 1;
          });
          addQBtn.disabled = false;
        }
      }
    });
  }

  if (joinTeamForm && qContainer) {
    joinTeamForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cards = qContainer.querySelectorAll('.question-card');
      const questions = [];

      cards.forEach(card => {
        questions.push({
          question_key: card.querySelector('[name="question_key"]').value,
          label: card.querySelector('[name="label"]').value,
          placeholder: card.querySelector('[name="placeholder"]').value,
          style: card.querySelector('[name="style"]').value,
          required: card.querySelector('[name="required"]').checked
        });
      });

      try {
        const res = await postData('/api/settings/jointeam-questions', { questions });
        showAlert(res.message || 'Application questions saved!');
      } catch (err) {
        showAlert(err.message, 'danger');
      }
    });
  }

  // ─── Transcripts Search & Delete ───
  const transcriptSearch = document.getElementById('transcriptSearchInput');
  const transcriptsTable = document.getElementById('transcriptsTable');

  if (transcriptSearch && transcriptsTable) {
    transcriptSearch.addEventListener('input', () => {
      const filter = transcriptSearch.value.toLowerCase();
      const rows = transcriptsTable.querySelectorAll('tbody tr');

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
      });
    });

    transcriptsTable.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.delete-transcript-btn');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (!confirm('Are you sure you want to delete this transcript record?')) return;

        try {
          const res = await fetch(`/api/transcripts/${id}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': getCsrfToken() }
          });
          const data = await res.json();
          if (res.ok) {
            showAlert(data.message || 'Transcript deleted');
            deleteBtn.closest('tr').remove();
          } else {
            throw new Error(data.error);
          }
        } catch (err) {
          showAlert(err.message, 'danger');
        }
      }
    });
  }

  // ─── Activity Logs Tabs & Search ───
  const logsSearch = document.getElementById('logsSearchInput');
  const logsTableBody = document.getElementById('logsTableBody');
  const filterBtns = document.querySelectorAll('.tab-filters .filter-btn');

  let currentLogType = 'all';

  async function fetchLogs() {
    if (!logsTableBody) return;
    const searchVal = logsSearch ? logsSearch.value : '';

    try {
      const res = await fetch(`/api/logs?type=${currentLogType}&search=${encodeURIComponent(searchVal)}`);
      const logs = await res.json();

      if (logs.length === 0) {
        logsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No logs match your filter.</td></tr>`;
        return;
      }

      logsTableBody.innerHTML = logs.map(l => `
        <tr>
          <td>${new Date(l.timestamp).toLocaleString()}</td>
          <td>
            <span class="badge ${l.action.includes('Created') ? 'badge-success' : l.action.includes('Closed') ? 'badge-warning' : l.action.includes('Deleted') ? 'badge-danger' : 'badge-primary'}">
              ${l.action}
            </span>
          </td>
          <td><code>${l.ticket_name}</code></td>
          <td>${l.target_user || 'None'}</td>
          <td>${l.staff_tag || 'System'}</td>
          <td>${l.details || '-'}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Logs fetch error:', err);
    }
  }

  if (filterBtns.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLogType = btn.dataset.type;
        fetchLogs();
      });
    });
  }

  if (logsSearch) {
    let timeout;
    logsSearch.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(fetchLogs, 300);
    });
  }

  // ─── Bot Control Operation Buttons ───
  const controlBtns = document.querySelectorAll('.control-action-btn');
  controlBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      if (!confirm(`Are you sure you want to execute: ${action}?`)) return;

      btn.disabled = true;
      try {
        const res = await postData(`/api/control/${action}`, {});
        showAlert(res.message || 'Operation executed successfully!');
      } catch (err) {
        showAlert(err.message, 'danger');
      } finally {
        btn.disabled = false;
      }
    });
  });
});
