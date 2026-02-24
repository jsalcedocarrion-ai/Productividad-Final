// Base URL: usar backend local por defecto; cambia a tu ngrok si lo necesitas
const baseURL = 'http://localhost:5000';

let fechaDesde = '';
let fechaHasta = '';
let currentRol = '';
let currentUsuario = '';
let usersData = [];
let tramitesChart = null;
let eficaciaChart = null;

// ✅ Variables globales CORREGIDAS (no comentadas)
let currentPage = 1;
const tramitesPorPagina = 5;
let allTramitesRows = [];
let originalTramitesRows = []; // ✅ DECLARADA
let sortColumn = null; // ✅ DECLARADA
let sortAscending = true; // ✅ DECLARADA

function showStep(step) {
  document.querySelectorAll('.step-container').forEach(el => el.classList.remove('step-active'));
  document.getElementById(`step${step}`).classList.add('step-active');
}

function backToStep1() {
  showStep(1);
}

function backToStep2() {
  showStep(2);
}

function backToStep3() {
  showStep(3);
}

function backToStep4() {
  showStep(4);
}

// ✅ Función fetch mejorada con headers para ngrok
function loadRoles() {
  fechaDesde = document.getElementById('fechaDesde').value;
  fechaHasta = document.getElementById('fechaHasta').value;
  
  console.log('📅 Fechas seleccionadas:', fechaDesde, fechaHasta);
  
  if (!fechaDesde || !fechaHasta) {
    alert('Por favor selecciona ambas fechas');
    return;
  }

  const url = `${baseURL}/estadisticas/usuarios?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;
  
  console.log('🔗 Consultando URL:', url);
  
  document.getElementById('rolesTable').innerHTML = '<div class="loading">🔄 Cargando datos...</div>';

  // ✅ Headers para ngrok
  fetch(url, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      console.log('📡 Status:', response.status);
      if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('✅ Datos recibidos:', data);
      if (data.success) {
        showStep(2);
        populateRolesTable(data.data);
      } else {
        document.getElementById('rolesTable').innerHTML = 
          '<p class="error-msg">Error: ' + (data.error || 'Desconocido') + '</p>';
      }
    })
    .catch(error => {
      console.error('❌ Error de conexión:', error);
      document.getElementById('rolesTable').innerHTML = 
        '<p class="error-msg">Error de conexión: ' + error.message + '</p>';
    });
}

function populateRolesTable(data) {
    if (!data || data.length === 0) {
        document.getElementById('rolesTable').innerHTML = '<p>No hay datos para mostrar</p>';
        return;
    }

    const tableHTML = `
        <h3>Resultados (${data.length} roles)</h3>
        <table border="1" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f0f0f0;">
                    <th style="padding: 10px; text-align: left;">Rol</th>
                    <th style="padding: 10px; text-align: left;">Usuarios</th>
                    <th style="padding: 10px; text-align: left;">Trámites</th>
                    <th style="padding: 10px; text-align: left;">Peso Trámites</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => `
                     <tr style="cursor: pointer;" onclick="loadUsers('${item.rol_nombre || item.rol_usuario_titulo}')">
                        <td style="padding: 8px;">${item.rol_usuario_titulo || 'N/A'}</td>
                        <td style="padding: 8px;">${item.usuarios || 0}</td>
                        <td style="padding: 8px;">${item.cantidad_tramites || 0}</td>
                        <td style="padding: 8px;">${item.peso_tramites || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('rolesTable').innerHTML = tableHTML;
}


// (login/logout controlado desde index.html)

// ✅ Función loadUsers con headers
function loadUsers(rolNombre) {
  currentRol = rolNombre;
  document.getElementById('currentRol').innerHTML = rolNombre;
  showStep(3);
  document.getElementById('usersTable').innerHTML = '<div class="loading"><div class="spinner-border"></div> Cargando usuarios...</div>';

  if (tramitesChart) tramitesChart.destroy();
  if (eficaciaChart) eficaciaChart.destroy();
  tramitesChart = null;
  eficaciaChart = null;

  const url = `${baseURL}/estadisticas/detalle?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}&nombre=${rolNombre}`;
  
  // ✅ Headers para ngrok
  fetch(url, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('📡 Response status:', response.status, response.statusText);
    if (!response.ok) {
    throw new Error(`Error HTTPS: ${response.status} - ${response.statusText}- ${errData.error || 'Error desconocido'}`);
    }
    return response.json();
  })
    .then(data => {
      console.log('Datos de usuarios:', data);
      if (data.success) {
        localStorage.setItem("sesionActiva", "true");
        usersData = data.data;
        populateUsersTable(data.data, 20);
      } else {
        document.getElementById('usersTable').innerHTML = 
        '<p class="error-msg">Error al cargar usuarios.</p>';
      }
    })
    .catch(error => {
      console.error('❌ Error de conexión:', error);
      document.getElementById('usersTable').innerHTML =
       '<p class="error-msg">Error de conexión: ' + error.message + '</p>';
    });
}

function populateUsersTable(rows, maxItems = 10) {
  let table = '<table class="table table-striped"><thead><tr><th>Nombre Usuario</th><th>Días Lab</th><th>N Tram</th><th>Trámites</th><th>Peso</th><th>No Terminado</th><th>Eficiencia</th><th>Fuera</th><th>Eficacia</th></tr></thead><tbody>';
  const limitedRows = rows
    .sort((a, b) => parseFloat(b.tramites) - parseFloat(a.tramites))
    .slice(0, maxItems);
    
  limitedRows.forEach(row => {
    table += `<tr style="cursor: pointer;" onclick="loadTramites('${row.usuario}')"><td>${row.nombre_usuario}</td><td>${row.dias_lab}</td><td>${row.ntram}</td><td>${row.tramites}</td><td>${row.peso}</td><td>${row.no_terminado}</td><td>${row.eficiencia}%</td><td>${row.fuera}</td><td>${row.eficacia}%</td></tr>`;
  });
  table += '</tbody></table>';
  document.getElementById('usersTable').innerHTML = table;
}

function showChart(type) {
  if (type === 'tramites') {
    $('#tramitesModal').modal('show');
    drawTramitesChart();
  } else if (type === 'eficacia') {
    $('#eficaciaModal').modal('show');
    drawEficaciaChart();
  }
}

function drawTramitesChart() {
  const canvas = document.getElementById('tramitesChart');
  if (!canvas) return;
  if (tramitesChart) tramitesChart.destroy();

  if (usersData.length > 0) {
    const ctx = canvas.getContext('2d');
    
    const dataValues = usersData.map(row => parseFloat(row.tramites) || 0);
    const fullNames = usersData.map(row => 
      row.nombre_usuario || row.usuario || 'Desconocido'
    );

    tramitesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: fullNames,
        datasets: [{
          label: 'Cantidad de Trámites',
          data: dataValues,
          backgroundColor: 'rgba(75, 192, 192, 0.4)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { 
            beginAtZero: true,
            title: { display: true, text: 'Número de Trámites' }
          },
          y: { 
            ticks: { 
              autoSkip: false,
              font: { 
                size: 10,
                family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
              },
              maxRotation: 0,
              minRotation: 0,
              padding: 20,
              callback: function(value, index, values) {
                const name = fullNames[index];
                if (!name) return '';
                
                const mid = Math.ceil(name.length / 2);
                let splitIndex = mid;
                
                for (let i = 0; i < 5; i++) {
                  if (name[mid + i] === ' ') {
                    splitIndex = mid + i;
                    break;
                  }
                  if (name[mid - i] === ' ') {
                    splitIndex = mid - i;
                    break;
                  }
                }
                
                const line1 = name.substring(0, splitIndex).trim();
                const line2 = name.substring(splitIndex).trim();
                
                return line1 + '\n' + line2;
              }
            },
            afterFit: function(scale) {
              scale.width = 250;
            }
          }
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.parsed.x + ' trámites';
              }
            }
          }
        }
      }
    });
  }
}

function drawEficaciaChart() {
  if (eficaciaChart) eficaciaChart.destroy();

  if (usersData.length > 0) {
    const ctx = document.getElementById('eficaciaChart').getContext('2d');
    
    const dataValues = usersData.map(row => parseFloat(row.eficacia) || 0);
    const fullNames = usersData.map(row => 
      row.nombre_usuario || row.usuario || 'Desconocido'
    );

    eficaciaChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: fullNames,
        datasets: [{
          label: 'Eficacia (%)',
          data: dataValues,
          backgroundColor: 'rgba(153, 102, 255, 0.4)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { 
            beginAtZero: true, 
            max: 100,
            title: { display: true, text: 'Eficacia (%)' }
          },
          y: { 
            ticks: { 
              autoSkip: false,  
              font: { 
                size: 10,
                family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
              },
              maxRotation: 0,
              minRotation: 0,
              padding: 20,
              callback: function(value, index, values) {
                const name = fullNames[index];
                if (!name) return '';
                
                const mid = Math.ceil(name.length / 2);
                let splitIndex = mid;
                
                for (let i = 0; i < 5; i++) {
                  if (name[mid + i] === ' ') {
                    splitIndex = mid + i;
                    break;
                  }
                  if (name[mid - i] === ' ') {
                    splitIndex = mid - i;
                    break;
                  }
                }
                
                const line1 = name.substring(0, splitIndex).trim();
                const line2 = name.substring(splitIndex).trim();
                
                return line1 + '\n' + line2;
              }
            },
            afterFit: function(scale) {
              scale.width = 250;
            }
          }
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.parsed.x + '%';
              }
            }
          }
        }
      }
    });
  }
}

// ✅ Función loadTramites con headers
function loadTramites(usuario) {
  currentUsuario = usuario;
  document.getElementById('currentUsuario').innerHTML = usuario;
  showStep(4);
  document.getElementById('tramitesTable').innerHTML = '<div class="loading"><div class="spinner-border"></div> Cargando trámites...</div>';
  document.getElementById('tramitesPagination').innerHTML = '';
  document.getElementById('tramiteFilter').value = '';
  sortColumn = null;
  sortAscending = true;

  const url = `${baseURL}/estadisticas/detalle_usuario?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}&nombre=${currentRol}&usuario=${usuario}`;

  // ✅ Headers para ngrok
  fetch(url, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
      'Content-Type': 'application/json'
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.data) {
        allTramitesRows = data.data;
        originalTramitesRows = [...data.data];
        populateTramitesTable(data.data);
        renderTramitesTable();
      } else {
        document.getElementById('tramitesTable').innerHTML = '<p class="error-msg">Error al cargar trámites: ' + (data.message || 'Datos no disponibles') + '</p>';
      }
    })
    .catch(err => {
      console.error('❌ Error loadTramites:', err);
      document.getElementById('tramitesTable').innerHTML = '<p class="error-msg">Error de conexión al obtener detalle del usuario.</p>';
    });
}

function populateTramitesTable(rows) {
  allTramitesRows = rows;
  currentPage = 1;
  renderTramitesTable();
}

function renderTramitesTable() {
  const startIndex = (currentPage - 1) * tramitesPorPagina;
  const endIndex = startIndex + tramitesPorPagina;
  const pageRows = allTramitesRows.slice(startIndex, endIndex);
  
  let table = '<table class="table table-striped"><thead><tr>';
  table += '<th>Núm. Trámite</th>';
  table += '<th>Contrato</th>';
  table += '<th>Nombre </th>';
  table += `<th><a href="#" onclick="sortByDate('fecha_ingreso')">Fecha Ingreso</a></th>`;
  table += `<th><a href="#" onclick="sortByDate('fecha_proceso')">Fecha Proceso</a></th>`;
  table += `<th><a href="#" onclick="sortByDate('fecha_fin')">Fecha Fin</a></th>`;
  table += '<th>Peso Trámite</th>';
  table += '<th>Última Acción</th>';
  table += '</tr></thead><tbody>';

  if (pageRows.length === 0) {
    table += '<tr><td colspan="8" class="text-center">No hay trámites para mostrar</td></tr>';
  } else {
    pageRows.forEach(row => {
      table += `<tr style="cursor: pointer;" onclick="loadDetalleTramite('${row.num_tramite}')">
        <td>${row.num_tramite}</td>
        <td>${row.contrato || 'N/A'}</td>
        <td>${row.nombre || 'N/A'}</td>
        <td>${formatDate(row.fecha_ingreso)}</td>
        <td>${formatDate(row.fecha_proceso)}</td>
        <td>${formatDate(row.fecha_fin)}</td>
        <td>${row.peso_tramite || '0'}</td>
        <td>${row.ultima_accion || 'N/A'}</td>
      </tr>`;
    });
  }
  
  table += '</tbody></table>';
  document.getElementById('tramitesTable').innerHTML = table;
  
  renderTramitesPagination();
}

function renderTramitesPagination() {
  const totalPages = Math.ceil(allTramitesRows.length / tramitesPorPagina);
  const paginationContainer = document.getElementById('tramitesPagination');
  
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }
  
  let buttons = '';
  if (currentPage > 1) {
    buttons += `<button class="btn btn-sm btn-outline-secondary mx-1" onclick="goToTramitesPage(${currentPage - 1})">← Anterior</button>`;
  }
  
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    buttons += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'} mx-1" onclick="goToTramitesPage(${i})">${i}</button>`;
  }
  
  if (currentPage < totalPages) {
    buttons += `<button class="btn btn-sm btn-outline-secondary mx-1" onclick="goToTramitesPage(${currentPage + 1})">Siguiente →</button>`;
  }
  
  const infoText = `<span class="mx-2">Página ${currentPage} de ${totalPages} (${allTramitesRows.length} trámites)</span>`;
  
  paginationContainer.innerHTML = infoText + buttons;
}

function goToTramitesPage(page) {
  currentPage = page;
  renderTramitesTable();
}

// sesión manejada en index.html


// ✅ Función loadDetalleTramite con headers
function loadDetalleTramite(numTramite, pagina = 1) {
  document.getElementById('currentTramite').innerHTML = numTramite;
  showStep(5);

  console.log('Iniciando carga de detalles para trámite:', numTramite);
  document.getElementById('eventosTable').innerHTML = '<div class="loading"><div class="spinner-border"></div> Cargando eventos...</div>';
  document.getElementById('cambiosTable').innerHTML = '<div class="loading"><div class="spinner-border"></div> Cargando cambios...</div>';
  
  const url = `${baseURL}/estadisticas/detalle_tramite?num_tramite=${numTramite}`;
  
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout excedido')), 10000)
  );

  Promise.race([
    fetch(url, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json'
      }
    }),
    timeoutPromise
  ])
  .then(res => res.json())
  .then(data => {
    console.log('Datos recibidos:', data);
    if (data.success) {
      const eventos = (data.data && data.data.eventos) || data.eventos || [];
      const cambios = (data.data && data.data.cambios) || data.cambios || [];
      console.log('Eventos:', eventos.length, 'Cambios:', cambios.length);
      
      populateEventosTable(eventos);
      populateCambiosTable(cambios);
      
      console.log('Ambas tablas cargadas correctamente');
    } else {
      showError('Error al cargar datos del trámite');
    }
  })
  .catch(err => {
    console.error('❌ Error loadDetalleTramite:', err);
    showError(err.message.includes('Timeout') ? 
      'La consulta está tomando demasiado tiempo. Intente con menos datos.' : 
      'Error de conexión'
    );
  });
}

function showError(message) {
  const errorHTML = `<p class="error-msg">${message}</p>`;
  document.getElementById('eventosTable').innerHTML = errorHTML;
  document.getElementById('cambiosTable').innerHTML = errorHTML;
}

function populateEventosTable(rows) {
  console.log('Rendering eventos with rows:', rows);
  let table = '<table class="table table-striped"><thead><tr><th>Fecha Fin</th><th>Proceso</th><th>Usuario</th></tr></thead><tbody>';
  if (rows.length === 0) {
    table += '<tr><td colspan="3" class="text-center">No hay eventos para mostrar</td></tr>';
  } else {
    rows.forEach(row => {
      table += `<tr><td>${formatDate(row.fecha_fin)}</td><td>${row.proceso}</td><td>${row.usuario}</td></tr>`;
    });
  }
  table += '</tbody></table>';
  document.getElementById('eventosTable').innerHTML = table;
  console.log('Eventos table populated');
}

function populateCambiosTable(rows) {
  console.log('Rendering cambios with rows:', rows);
  let table = '<table class="table table-striped"><thead><tr><th>Fecha Hora</th><th>Actividad</th><th>Usuario</th></tr></thead><tbody>';
  if (rows.length === 0) {
    table += '<tr><td colspan="3" class="text-center">No hay cambios para mostrar</td></tr>';
  } else {
    rows.forEach(row => {
      table += `<tr><td>${formatDate(row.fecha_hora)}</td><td>${row.actividad}</td><td>${row.usuario}</td></tr>`;
    });
  }
  table += '</tbody></table>';
  document.getElementById('cambiosTable').innerHTML = table;
  console.log('Cambios table populated');
}

$('#tramitesModal').on('shown.bs.modal', function () {
  drawTramitesChart();
});

$('#eficaciaModal').on('shown.bs.modal', function () {
  drawEficaciaChart();
});

$('#tramitesModal').on('hidden.bs.modal', function () {
  if (tramitesChart) {
    tramitesChart.destroy();
    tramitesChart = null;
  }
});

$('#eficaciaModal').on('hidden.bs.modal', function () {
  if (eficaciaChart) {
    eficaciaChart.destroy();
    eficaciaChart = null;
  }
});

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date)) return 'Fecha inválida';
  return new Date(dateStr).toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function filterTramites() {
  const filterValue = document.getElementById('tramiteFilter').value.trim().toLowerCase();
  if (filterValue === '') {
    allTramitesRows = [...originalTramitesRows];
  } else {
    const filteredRows = allTramitesRows.filter(row => 
      row.num_tramite && row.num_tramite.toString().toLowerCase().includes(filterValue)
    );
    allTramitesRows = filteredRows;
  }
  currentPage = 1;
  renderTramitesTable();
}

function filterNombre() {
  const filterValue = document.getElementById('tramiteFilter').value.trim().toLowerCase();
  if (filterValue === '') {
    allTramitesRows = [...originalTramitesRows];
  } else {
    const filteredRows = allTramitesRows.filter(row => 
      row.nombre && row.nombre.toString().toLowerCase().includes(filterValue)
    );
    allTramitesRows = filteredRows;
  }
  currentPage = 1;
  renderTramitesTable();
}

function clearFilter() {
  document.getElementById('tramiteFilter').value = '';
  allTramitesRows = [...originalTramitesRows];
  currentPage = 1;
  
  if (sortColumn) {
    sortByDate(sortColumn);
  } else {
    renderTramitesTable();
  }
}

function sortByDate(column) {
  if (sortColumn === column) {
    sortAscending = !sortAscending;
  } else {
    sortColumn = column;
    sortAscending = true;
  }

  allTramitesRows.sort((a, b) => {
    const dateA = new Date(a[column] || '1970-01-01');
    const dateB = new Date(b[column] || '1970-01-01');
    return sortAscending ? dateA - dateB : dateB - dateA;
  });

  renderTramitesTable();
}

// cerrarSesion definido en index.html