document.addEventListener('DOMContentLoaded', async () => {
  const avgRespEl = document.getElementById('avgRespTime');
  const avgCloseEl = document.getElementById('avgCloseTime');
  const resolutionEl = document.getElementById('resolutionRate');

  try {
    const res = await fetch('/api/stats');
    const data = await res.json();

    if (avgRespEl) avgRespEl.textContent = `${data.avgResponseTimeMinutes || 5} mins`;
    if (avgCloseEl) avgCloseEl.textContent = `${data.avgCloseTimeMinutes || 15} mins`;
    if (resolutionEl) {
      const rate = data.totalTickets > 0 
        ? Math.round((data.closedTickets / data.totalTickets) * 100)
        : 100;
      resolutionEl.textContent = `${rate}%`;
    }

    // ─── 1. Tickets Per Day Line Chart ───
    const lineCtx = document.getElementById('ticketsPerDayChart')?.getContext('2d');
    if (lineCtx) {
      const labels = (data.dailyTickets || []).map(d => d.date);
      const counts = (data.dailyTickets || []).map(d => d.count);

      new Chart(lineCtx, {
        type: 'line',
        data: {
          labels: labels.length > 0 ? labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Tickets Created',
            data: counts.length > 0 ? counts : [0, 0, 0, 0, 0, 0, 0],
            borderColor: '#5865F2',
            backgroundColor: 'rgba(88, 101, 242, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#dbdee1' } } },
          scales: {
            x: { ticks: { color: '#949ba4' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
            y: { ticks: { color: '#949ba4' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
          }
        }
      });
    }

    // ─── 2. Ticket Types Pie Chart ───
    const pieCtx = document.getElementById('ticketTypesChart')?.getContext('2d');
    if (pieCtx) {
      new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: ['Complaints', 'Suggestions', 'Applications'],
          datasets: [{
            data: [
              data.totalComplaints || 0,
              data.totalSuggestions || 0,
              data.totalApplications || 0
            ],
            backgroundColor: ['#ED4245', '#00B0F4', '#57F287'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: '#dbdee1' } } }
        }
      });
    }

    // ─── 3. Staff Activity Bar Chart ───
    const barCtx = document.getElementById('staffActivityChart')?.getContext('2d');
    if (barCtx) {
      const staffLabels = (data.staffActivity || []).map(s => s.staff_tag);
      const staffCounts = (data.staffActivity || []).map(s => s.tickets_handled);

      new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: staffLabels.length > 0 ? staffLabels : ['No Activity Recorded Yet'],
          datasets: [{
            label: 'Tickets Handled',
            data: staffCounts.length > 0 ? staffCounts : [0],
            backgroundColor: '#57F287',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#dbdee1' } } },
          scales: {
            x: { ticks: { color: '#949ba4' }, grid: { display: false } },
            y: { ticks: { color: '#949ba4' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
          }
        }
      });
    }

  } catch (err) {
    console.error('Stats chart initialization error:', err);
  }
});
