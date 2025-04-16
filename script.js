// Data structures
let state = {
    turbines: [],
    selectedTurbineId: null,
    selectedBladeId: null
};

// Restore state from localStorage if present
const saved = localStorage.getItem('bladeTrackerState');
if (saved) {
    state = JSON.parse(saved);
    // Migrate any existing "open" status to "pending"
    state.turbines.forEach(turbine => {
        turbine.blades.forEach(blade => {
            blade.damages.forEach(damage => {
                if (damage.status === 'open') {
                    damage.status = 'pending';
                }
            });
        });
    });
    updateUI();
}

// --- LocalStorage: Save state helper ---
function saveState() {
    localStorage.setItem('bladeTrackerState', JSON.stringify(state));
}

// Initialize empty data
function initializeMockData() {
    updateUI();
}

function handleNewDamageSubmit(event) {
    event.preventDefault();
    
    const damageId = parseInt(document.getElementById('damage-id').value);
    const turbineNumber = parseInt(document.getElementById('turbine-number').value);
    const turbineSerialNo = document.getElementById('turbine-serial').value;
    const bladeSerialNo = document.getElementById('blade-serial').value;
    const radius = parseFloat(document.getElementById('damage-radius').value);
    const side = document.getElementById('damage-side').value;
    const category = document.getElementById('damage-category').value;
    const description = document.getElementById('damage-description').value;
    
    // Find or create turbine
    let turbine = state.turbines.find(t => t.id === turbineNumber);
    if (!turbine) {
        turbine = {
            id: turbineNumber,
            name: `Turbine ${turbineNumber}`,
            serialNo: turbineSerialNo,
            blades: []
        };
        state.turbines.push(turbine);
    }
    
    // Find or create blade by serial number
    let blade = turbine.blades.find(b => b.serialNo === bladeSerialNo);
    if (!blade) {
        if (turbine.blades.length >= 3) {
            showToast('This turbine already has 3 blades', 'error');
            return;
        }
        blade = {
            id: `${turbineNumber}-${turbine.blades.length + 1}`,
            serialNo: bladeSerialNo,
            damages: []
        };
        turbine.blades.push(blade);
    }
    
    // Check if damage ID already exists across all turbines and blades
    const damageExists = state.turbines.some(t => 
        t.blades.some(b => 
            b.damages.some(d => d.id === damageId)
        )
    );
    
    if (damageExists) {
        showToast('Damage ID already exists. Please use a different ID.', 'error');
        return;
    }
    
    const newDamage = {
        id: damageId,
        category: category,
        status: 'pending',
        description: description,
        radius: radius,
        side: side,
        turbineId: turbine.id,
        turbineSerialNo: turbineSerialNo,
        bladeSerialNo: bladeSerialNo,
        notes: [],
        logs: [],
        materialsUsed: []
    };
    
    blade.damages.push(newDamage);
    saveState();
    updateUI();
    closeNewDamageModal();
    showToast('New damage added successfully', 'success');
}

function closeNewDamageModal() {
    document.getElementById('new-damage-modal').classList.add('hidden');
    document.getElementById('new-damage-form').reset();
}

// UI Update Functions
function updateUI() {
    // Ensure something is selected so openDamageDetail() can work
    if (!state.selectedTurbineId && state.turbines.length)
        state.selectedTurbineId = state.turbines[0].id;
    if (!state.selectedBladeId) {
        const t = state.turbines.find(t => t.id === state.selectedTurbineId);
        if (t && t.blades.length) state.selectedBladeId = t.blades[0].id;
    }
    updateTurbineList();
    updateBladeList();
    updateDamageDetails();
    saveState();
}

function updateTurbineList() {
    const container = document.getElementById('turbine-list');
    const search = document.getElementById('turbine-search')?.value.toLowerCase() || '';
    let turbines = state.turbines;
    if (search) {
        turbines = turbines.filter(t => t.name.toLowerCase().includes(search) || (t.serialNo && t.serialNo.toLowerCase().includes(search)));
    }
    container.innerHTML = turbines.map(turbine => {
        const pendingDamages = turbine.blades.reduce((count, blade) => 
            count + blade.damages.filter(d => d.status === 'pending').length, 0);
        const isSelected = state.selectedTurbineId === turbine.id;
        return `
            <button class="w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between transition-colors duration-150 
                         ${isSelected ? 'bg-blue-100 text-blue-800 font-bold border-2 border-blue-400 shadow' : 'text-gray-700 hover:bg-gray-100'}"
                    onclick="selectTurbine(${turbine.id})">
                <div class="flex items-center gap-2">
                    <i class="fas fa-wind ${isSelected ? 'text-blue-600' : 'text-gray-400'}"></i>
                    <span>${turbine.name}</span>
                </div>
                ${pendingDamages > 0 ? `<span class="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">${pendingDamages}</span>` : ''}
            </button>
        `;
    }).join('');
    if (!turbines.length) {
        container.innerHTML = `<p class="px-3 py-2 text-sm text-gray-500 italic">No turbines found.</p>`;
    }
}

function updateBladeList() {
    const container = document.getElementById('blade-list');
    const selectedTurbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    const search = document.getElementById('blade-search')?.value.toLowerCase() || '';
    if (!selectedTurbine) {
        container.innerHTML = `<p class="px-3 py-2 text-sm text-gray-500 italic">Select a turbine.</p>`;
        return;
    }
    let blades = selectedTurbine.blades;
    if (search) {
        blades = blades.filter(b => b.serialNo.toLowerCase().includes(search));
    }
    container.innerHTML = blades.map(blade => {
        const pendingDamages = blade.damages.filter(d => d.status === 'pending').length;
        const isSelected = state.selectedBladeId === blade.id;
        return `
            <button class="w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between transition-colors duration-150 
                         ${isSelected ? 'bg-blue-100 text-blue-800 font-bold border-2 border-blue-400 shadow' : 'text-gray-700 hover:bg-gray-100'}"
                    onclick="selectBlade('${blade.id}')">
                <div class="flex items-center gap-2">
                     <i class="fas fa-stream fa-xs ${isSelected ? 'text-blue-500' : 'text-gray-400'}"></i>
                    <span class="truncate" title="${blade.serialNo}">${blade.serialNo}</span>
                </div>
                ${pendingDamages > 0 ? `<span class="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">${pendingDamages}</span>` : ''}
            </button>
        `;
    }).join('');
    if (!blades.length) {
        container.innerHTML = `<p class="px-3 py-2 text-sm text-gray-500 italic">No blades found.</p>`;
    }
}

function updateDamageDetails() {
    const detailsContainer = document.getElementById('damage-details');
    const emptyState = document.getElementById('empty-state');
    const titleElement = document.getElementById('selected-blade-title');
    
    const selectedTurbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    const selectedBlade = selectedTurbine?.blades.find(b => b.id === state.selectedBladeId);
    
    if (!selectedTurbine || !selectedBlade) {
        detailsContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        titleElement.textContent = selectedTurbine ? 'Select a Blade' : 'Select a Turbine';
        return;
    }
    
    detailsContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    // Update title
    titleElement.textContent = `${selectedTurbine.name} - ${selectedBlade.serialNo}`;
    
    // Update statistics
    document.getElementById('blade-total-damages').textContent = selectedBlade.damages.length;
    document.getElementById('blade-inprogress-damages').textContent = selectedBlade.damages.filter(d => d.status === 'in_progress').length;
    document.getElementById('blade-resolved-damages').textContent = selectedBlade.damages.filter(d => d.status === 'closed').length;
    
    // Update damage tables
    const openTableBody = document.getElementById('open-damages-table-body');
    const inProgressTableBody = document.getElementById('in-progress-table-body');
    const completedTableBody = document.getElementById('completed-damages-table-body');
    
    const pendingDamages = selectedBlade.damages.filter(d => d.status === 'pending');
    const inProgressDamages = selectedBlade.damages.filter(d => d.status === 'in_progress');
    const completedDamages = selectedBlade.damages.filter(d => d.status === 'closed');

    // Render pending damages
    if (pendingDamages.length === 0) {
        openTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    No pending damages to repair
                </td>
            </tr>
        `;
    } else {
        openTableBody.innerHTML = pendingDamages.map(damage => `
        <tr class="hover:bg-gray-50 cursor-pointer" onclick="openDamageDetail(${damage.id})">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#${damage.id}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${damage.description}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs rounded-full severity-${damage.category.replace(/\s+/g, '')}">
                        ${damage.category}
                    </span>
            </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${damage.radius}m - ${damage.side.replace('_', ' ')}
            </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs rounded-full status-${damage.status}">Pending</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button onclick="toggleDamageStatus(${damage.id}); event.stopPropagation();" 
                            class="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-150 flex items-center gap-1 text-xs font-medium p-1 rounded hover:bg-blue-50">
                        <i class="fas fa-play-circle"></i>
                        <span>Start Repair</span>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Render in-progress damages
    if (inProgressDamages.length === 0) {
        inProgressTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    No repairs in progress
                </td>
            </tr>
        `;
    } else {
        inProgressTableBody.innerHTML = inProgressDamages.map(damage => `
            <tr class="hover:bg-gray-50 cursor-pointer" onclick="openDamageDetail(${damage.id})">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#${damage.id}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${damage.description}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full severity-${damage.category.replace(/\s+/g, '')}">
                    ${damage.category}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${damage.radius}m - ${damage.side.replace('_', ' ')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs rounded-full status-in_progress">In Progress</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button onclick="toggleDamageStatus(${damage.id}); event.stopPropagation();" 
                            class="text-green-600 hover:text-green-800 hover:underline transition-colors duration-150 flex items-center gap-1 text-xs font-medium p-1 rounded hover:bg-green-50">
                        <i class="fas fa-check-circle"></i>
                        <span>Complete</span>
                </button>
            </td>
        </tr>
    `).join('');
    }

    // Render completed damages
    if (completedDamages.length === 0) {
        completedTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    No completed repairs
                </td>
            </tr>
        `;
    } else {
        completedTableBody.innerHTML = completedDamages.map(damage => `
            <tr class="hover:bg-gray-50 cursor-pointer" onclick="openDamageDetail(${damage.id})">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#${damage.id}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${damage.description}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs rounded-full severity-${damage.category.replace(/\s+/g, '')}">
                        ${damage.category}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${damage.radius}m - ${damage.side.replace('_', ' ')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button class="text-gray-500 hover:text-blue-600 transition-colors duration-150 p-1 rounded hover:bg-blue-50" 
                            onclick="showMaterialsForDamage(${damage.id}); event.stopPropagation();" 
                            title="Toggle Materials List">
                        <i class="fas fa-list-ul"></i>
                    </button>
                    <div id="materials-list-${damage.id}" class="hidden mt-2"></div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button onclick="toggleDamageStatus(${damage.id}); event.stopPropagation();" 
                            class="text-yellow-600 hover:text-yellow-800 hover:underline transition-colors duration-150 flex items-center gap-1 text-xs font-medium p-1 rounded hover:bg-yellow-50">
                        <i class="fas fa-undo"></i>
                        <span>Reopen</span>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

function renderRepairLog(damage, log, isEditing = false) {
    if (isEditing) {
        return `
            <div class="border p-3 rounded bg-white text-sm mb-2 shadow-sm" data-log-id="${log.id}">
                <form onsubmit="saveLogEdit(event, ${damage.id}, ${log.id})" class="space-y-3">
                    <div class="grid grid-cols-3 gap-2">
                        <div>
                            <label class="block text-xs text-gray-500 mb-1">Date</label>
                            <input type="date" 
                                   value="${log.date}"
                                   class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                                   required>
                        </div>
                        <div>
                            <label class="block text-xs text-gray-500 mb-1">Hours</label>
                            <input type="number" 
                                   value="${log.hours}"
                                   step="0.5" 
                                   min="0"
                                   class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                                   required>
                        </div>
                        <div>
                            <label class="block text-xs text-gray-500 mb-1">Weather</label>
                            <select class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500" required>
                                ${['Sunny', 'Cloudy', 'Rainy', 'Windy'].map(w => 
                                    `<option value="${w}" ${w === log.weather ? 'selected' : ''}>${w}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Description</label>
                        <textarea class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500" 
                                 rows="2" 
                                 required>${log.description}</textarea>
                    </div>
                    <div class="flex justify-end gap-2 pt-1">
                        <button type="button" 
                                onclick="cancelLogEdit(${damage.id}, ${log.id})"
                                class="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded">
                            Cancel
                        </button>
                        <button type="submit"
                                class="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>`;
    }

    return `
        <div class="border p-2 rounded bg-white text-sm mb-2 shadow-sm" data-log-id="${log.id}">
            <div class="flex justify-between items-center text-xs text-gray-500 mb-1">
                <span>${log.date}</span>
                <div class="flex items-center gap-2">
                    <span>${log.hours}h / ${log.weather}</span>
                    <button onclick="startLogEdit(${damage.id}, ${log.id})" 
                            class="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                            title="Edit log entry">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteRepairLog(${damage.id}, ${log.id})" 
                            class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            title="Delete log entry">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
            <div>${log.description}</div>
        </div>`;
}

function renderRepairLogs(damage) {
    const list = document.getElementById('repair-logs-list');
    if (!damage.logs || damage.logs.length === 0) {
        list.innerHTML = '<div class="text-gray-400 text-sm">No logs yet.</div>';
        return;
    }
    list.innerHTML = damage.logs.map(log => renderRepairLog(damage, log)).join('');
}

function startLogEdit(damageId, logId) {
    const turbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    const blade = turbine?.blades.find(b => b.id === state.selectedBladeId);
    const damage = blade?.damages.find(d => d.id === damageId);
    const log = damage?.logs.find(l => l.id === logId);
    
    if (!damage || !log) {
        showToast('Error: Log not found', 'error');
        return;
    }

    const logElement = document.querySelector(`[data-log-id="${logId}"]`);
    if (!logElement) return;

    logElement.outerHTML = renderRepairLog(damage, log, true);
}

function saveLogEdit(event, damageId, logId) {
    event.preventDefault();
    
    const form = event.target;
    const [dateInput, hoursInput, weatherSelect, descriptionTextarea] = form.querySelectorAll('input, select, textarea');
    
    const turbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    const blade = turbine?.blades.find(b => b.id === state.selectedBladeId);
    const damage = blade?.damages.find(d => d.id === damageId);
    const log = damage?.logs.find(l => l.id === logId);
    
    if (!damage || !log) {
        showToast('Error: Log not found', 'error');
        return;
    }

    // Update log object
    log.date = dateInput.value;
    log.hours = parseFloat(hoursInput.value);
    log.weather = weatherSelect.value;
    log.description = descriptionTextarea.value.trim();
    
    // Save state and update UI
    saveState();
    const logElement = document.querySelector(`[data-log-id="${logId}"]`);
    if (logElement) {
        logElement.outerHTML = renderRepairLog(damage, log);
    }
    
    showToast('Log updated successfully', 'success');
}

function cancelLogEdit(damageId, logId) {
    const turbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    const blade = turbine?.blades.find(b => b.id === state.selectedBladeId);
    const damage = blade?.damages.find(d => d.id === damageId);
    const log = damage?.logs.find(l => l.id === logId);
    
    if (!damage || !log) return;

    const logElement = document.querySelector(`[data-log-id="${logId}"]`);
    if (logElement) {
        logElement.outerHTML = renderRepairLog(damage, log);
    }
}

function openDamageDetail(damageId) {
    const selectedTurbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    const selectedBlade = selectedTurbine?.blades.find(b => b.id === state.selectedBladeId);
    const damage = selectedBlade?.damages.find(d => d.id === damageId);
    
    if (!damage) {
        showToast('Error: Damage not found', 'error');
        return;
    }
    
    document.getElementById('damage-detail-title').textContent = `Damage #${damage.id} (${damage.category})`;
    document.getElementById('detail-damage-id').value = damage.id;
    document.getElementById('detail-damage-radius').value = damage.radius;
    document.getElementById('detail-damage-side').value = damage.side;
    document.getElementById('detail-damage-category').value = damage.category;
    document.getElementById('detail-damage-status').value = damage.status;
    document.getElementById('detail-damage-description').value = damage.description;
    
    // Initialize logs array if it doesn't exist
    if (!damage.logs) {
        damage.logs = [];
    }
    
    // Render logs using the new function
    renderRepairLogs(damage);
    
    // Initialize materials list if it doesn't exist
    if (!damage.materialsUsed) {
        damage.materialsUsed = [];
    }
    
    // Render materials list
    renderMaterialsList(damage.materialsUsed);
    
    // Show the modal
    document.getElementById('damage-detail-modal').classList.remove('hidden');
}

function closeDamageDetailModal() {
    document.getElementById('damage-detail-modal').classList.add('hidden');
}

function selectTurbine(turbineId) {
    state.selectedTurbineId = turbineId;
    state.selectedBladeId = null; // Clear blade selection when switching turbines
    updateUI();
}

function selectBlade(bladeId) {
    state.selectedBladeId = bladeId;
    updateUI();
}

function toggleDamageStatus(damageId) {
    const selectedTurbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    const selectedBlade = selectedTurbine?.blades.find(b => b.id === state.selectedBladeId);
    
    if (selectedBlade) {
        const damage = selectedBlade.damages.find(d => d.id === damageId);
        if (damage) {
            if (damage.status === 'pending') {
                damage.status = 'in_progress';
            } else if (damage.status === 'in_progress') {
                damage.status = 'closed';
            } else {
                damage.status = 'pending';
            }
            saveState();
            updateUI();
        }
    }
}

// Focus management utilities
const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(element) {
    const focusableContent = element.querySelectorAll(focusableElements);
    const firstFocusable = focusableContent[0];
    const lastFocusable = focusableContent[focusableContent.length - 1];

    element.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        }
    });
}

// Modal management
let lastFocusedElement = null;

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    lastFocusedElement = document.activeElement;
    modal.classList.remove('hidden');
    trapFocus(modal);
    
    const firstInput = modal.querySelector(focusableElements);
    if (firstInput) {
        firstInput.focus();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
    if (lastFocusedElement) {
        lastFocusedElement.focus();
    }
    lastFocusedElement = null;  // Prevent orphaned focus reference
}

// Keyboard navigation for blade list
function setupBladeKeyboardNavigation() {
    const bladeList = document.getElementById('blade-list');
    bladeList.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (e.target.classList.contains('blade-item')) {
                e.target.click();
            }
        }
    });
}

// Auto-save functionality
function setupAutoSave() {
    const detailForm = document.getElementById('damage-detail-modal');
    const autoSaveFields = ['detail-damage-category', 'detail-damage-status', 'detail-damage-description'];
    
    autoSaveFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        field.addEventListener('change', async () => {
            // Simulate auto-save
            await new Promise(resolve => setTimeout(resolve, 300));
            showToast('Changes saved automatically');
        });
    });
}

// Enhanced event listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeMockData();
    setupBladeKeyboardNavigation();
    setupAutoSave();
    
    // Modal keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('[role="dialog"]:not(.hidden)');
            if (openModal) {
                const modalId = openModal.id;
                closeModal(modalId);
            }
        }
    });
    
    // Add damage button
    const addDamageBtn = document.getElementById('add-damage-btn');
    addDamageBtn.addEventListener('click', () => {
        openModal('new-damage-modal');
    });
    
    // Close modal buttons
    const closeButtons = document.querySelectorAll('[id$="-modal"] button[aria-label="Close modal"]');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.closest('[role="dialog"]').id;
            closeModal(modalId);
        });
    });
    
    // Form submissions
    const newDamageForm = document.getElementById('new-damage-form');
    newDamageForm.addEventListener('submit', handleNewDamageSubmit);
    
    const addLogForm = document.getElementById('add-log-form');
    addLogForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const hours = parseFloat(document.getElementById('log-hours').value);
        const weather = document.getElementById('log-weather').value;
        const description = document.getElementById('log-description').value.trim();

        // Get current damage ID from input value
        const currentDamageId = parseInt(document.getElementById('detail-damage-id').value);
        if (isNaN(currentDamageId)) {
            showToast('Error: Invalid damage ID', 'error');
            return;
        }

        const turbine = state.turbines.find(t => t.id === state.selectedTurbineId);
        const blade = turbine?.blades.find(b => b.id === state.selectedBladeId);
        const damage = blade?.damages.find(d => d.id === currentDamageId);

        if (!damage) {
            showToast('Error: Damage not found', 'error');
            return;
        }

        if (!damage.logs) damage.logs = [];

        // Add new log
        damage.logs.push({
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            hours,
            weather,
            description
        });

        saveState();

        // Rebuild the log list
        const list = document.getElementById('repair-logs-list');
        if (damage.logs && damage.logs.length > 0) {
            list.innerHTML = damage.logs.map(l => `
                <div class="border p-2 rounded bg-white text-sm mb-2 shadow-sm">
                    <div class="flex justify-between items-center text-xs text-gray-500 mb-1">
                        <span>${l.date}</span>
                        <div class="flex items-center gap-2">
                        <span>${l.hours}h / ${l.weather}</span>
                            <button onclick="deleteRepairLog(${damage.id}, ${l.id})" 
                                    class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                    title="Delete log entry">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div>${l.description}</div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<div class="text-gray-400 text-sm">No logs yet.</div>';
        }

        e.target.reset();
        showToast('Repair log added successfully');
    });
    
    // Close damage detail modal
    document.getElementById('close-damage-detail-modal').addEventListener('click', closeDamageDetailModal);
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDamageDetailModal();
        }
    });
    
    // Auto-save damage details
    const detailForm = document.getElementById('damage-detail-modal');
    ['detail-damage-category', 'detail-damage-status', 'detail-damage-description'].forEach(id => {
        const field = document.getElementById(id);
        field.addEventListener('change', () => {
            // TODO: Implement auto-save
            showToast('Changes saved');
        });
    });

    // On page load, after restoring state, update UI
    if (saved) {
        updateUI();
    }

    // Sidebar collapse/expand
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            sidebar.classList.toggle('w-2/5');
            sidebar.classList.toggle('w-16');
            sidebar.classList.toggle('collapsed');
        });
    }

    // Search bar event listeners
    document.getElementById('turbine-search')?.addEventListener('input', updateTurbineList);
    document.getElementById('blade-search')?.addEventListener('input', updateBladeList);

    document.getElementById('show-common-materials-btn').addEventListener('click', () => {
        const commonMaterialsList = document.getElementById('common-materials-list');
        commonMaterialsList.classList.toggle('hidden');
    });
});

// Utility Functions
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function openQuickAddDamageForm() {
    openModal('quick-add-modal');
}

function closeQuickAddModal() {
    closeModal('quick-add-modal');
}

function handleQuickAddSubmit(e) {
    e.preventDefault();
    const radius      = parseFloat(document.getElementById('quick-damage-radius').value);
    const side        = document.getElementById('quick-damage-side').value;
    const category    = document.getElementById('quick-damage-category').value || 'Cat 3';
    const description = document.getElementById('quick-damage-description').value.trim();

    const turbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    if (!turbine)  { showToast('Select a turbine first','error'); return; }
    const blade = turbine.blades.find(b => b.id === state.selectedBladeId);
    if (!blade)   { showToast('Select a blade first','error');   return; }

    const newDamage = {
        id: Date.now(),
        category,
        status: 'pending',
        description,
        radius,
        side,
        turbineId: turbine.id,
        turbineSerialNo: turbine.serialNo,
        bladeSerialNo: blade.serialNo,
        notes: [],
        logs: [],
        materialsUsed: []
    };

    blade.damages.push(newDamage);
    closeQuickAddModal();
    e.target.reset();
    updateUI();
    showToast('Damage added','success');
}

function showMaterialsForDamage(damageId) {
    const selectedTurbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    const selectedBlade = selectedTurbine?.blades.find(b => b.id === state.selectedBladeId);
    const damage = selectedBlade?.damages.find(d => d.id === damageId);
    const div = document.getElementById(`materials-list-${damageId}`);
    if (!damage || !div) return;
    if (div.classList.contains('hidden')) {
        // Show materials
        if (!damage.materialsUsed || damage.materialsUsed.length === 0) {
            div.innerHTML = `<div class="text-xs text-gray-500">No materials recorded.</div>`;
        } else {
            div.innerHTML = `<ul class="text-xs text-gray-700 pl-4 list-disc">
                ${damage.materialsUsed.map(m => `<li>${m.qty} ${m.unit} ${m.name}</li>`).join('')}
            </ul>`;
        }
        div.classList.remove('hidden');
    } else {
        div.classList.add('hidden');
    }
}

function exportMaterialsCSV() {
    const selectedTurbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    const selectedBlade = selectedTurbine?.blades.find(b => b.id === state.selectedBladeId);
    if (!selectedBlade) {
        showToast('Select a blade first', 'error');
        return;
    }
    let rows = [['Damage ID', 'Description', 'Status', 'Material', 'Qty', 'Unit']];
    selectedBlade.damages.forEach(damage => {
        if (damage.materialsUsed && damage.materialsUsed.length > 0) {
            damage.materialsUsed.forEach(m => {
                rows.push([
                    damage.id,
                    damage.description,
                    damage.status,
                    m.name,
                    m.qty,
                    m.unit
                ]);
            });
        }
    });
    if (rows.length === 1) {
        showToast('No materials to export', 'error');
        return;
    }
    const csv = rows.map(r => r.map(x => `"${x}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'materials_report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Helper function for consistent damage ID reading
function getCurrentDamageId() {
    const value = document.getElementById('detail-damage-id').value;
    return parseInt(value, 10);
}

function handleAddMaterial(e) {
  e.preventDefault();
    
    // Get and validate form inputs
  const name = document.getElementById('material-name').value.trim();
  const qty = parseFloat(document.getElementById('material-qty').value);
  const unit = document.getElementById('material-unit').value.trim();

    // Validate inputs
    if (!name) {
        showToast('Please enter a material name', 'error');
        return false;
    }
    if (isNaN(qty) || qty <= 0) {
        showToast('Please enter a valid quantity greater than 0', 'error');
        return false;
    }
    if (!unit) {
        showToast('Please enter a unit of measurement', 'error');
        return false;
    }

    // Get current damage ID from input value
    const currentDamageId = getCurrentDamageId();
    if (isNaN(currentDamageId)) {
        showToast('Error: Invalid damage ID', 'error');
        return false;
    }

    // Find the current damage
  const turbine = state.turbines.find(t => t.id === state.selectedTurbineId);
  const blade = turbine?.blades.find(b => b.id === state.selectedBladeId);
  const damage = blade?.damages.find(d => d.id === currentDamageId);

    if (!damage) {
        showToast('Error: Damage not found', 'error');
        return false;
    }

    // Initialize materialsUsed array if it doesn't exist
    if (!damage.materialsUsed) {
        damage.materialsUsed = [];
    }

    // Add new material
    const newMaterial = {
        name,
        qty,
        unit,
        addedAt: new Date().toISOString()
    };
    
    damage.materialsUsed.push(newMaterial);
    
    // Save state and update UI immediately
    saveState();
  renderMaterialsList(damage.materialsUsed);

    // Reset form
    document.getElementById('material-name').value = '';
    document.getElementById('material-qty').value = '';
    document.getElementById('material-unit').value = '';
    
    // Show success message
    showToast('Material added successfully', 'success');
    return false;
}

function renderMaterialsList(materials) {
  const list = document.getElementById('materials-list');
    if (!list) {
        console.error('Materials list container not found');
        return;
    }

  if (!materials || materials.length === 0) {
        list.innerHTML = `
            <li class="text-gray-400 text-sm flex items-center gap-2">
                <i class="fas fa-box-open"></i>
                <span>No materials added yet.</span>
            </li>`;
    return;
  }

    list.innerHTML = materials.map(m => `
        <li class="text-sm flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div class="flex items-center gap-2">
                <i class="fas fa-box text-blue-500"></i>
                <span>
                    <span class="font-medium">${m.qty} ${m.unit}</span>
                    <span class="text-gray-700">${m.name}</span>
                </span>
            </div>
            <button onclick="deleteMaterial('${m.name}', ${m.qty}, '${m.unit}')" 
                    class="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-colors duration-150 flex items-center gap-1"
                    title="Remove material">
                <i class="fas fa-times"></i>
            </button>
        </li>
    `).join('');
}

function deleteMaterial(name, qty, unit) {
    const currentDamageId = getCurrentDamageId();
    if (isNaN(currentDamageId)) {
        showToast('Error: Invalid damage ID', 'error');
      return;
    }

    const turbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    const blade = turbine?.blades.find(b => b.id === state.selectedBladeId);
    const damage = blade?.damages.find(d => d.id === currentDamageId);

    if (!damage || !damage.materialsUsed) {
        showToast('Error: Could not find damage or materials', 'error');
        return;
    }

    // Remove the material
    const initialLength = damage.materialsUsed.length;
    damage.materialsUsed = damage.materialsUsed.filter(m => 
        !(m.name === name && m.qty === qty && m.unit === unit)
    );

    if (damage.materialsUsed.length === initialLength) {
        showToast('Error: Material not found', 'error');
        return;
    }

    saveState();
    renderMaterialsList(damage.materialsUsed);
    showToast('Material removed successfully', 'success');
}

function openMaterialsSummaryModal() {
    document.getElementById('materials-summary-modal').classList.remove('hidden');
    updateMaterialsSummary();
}

function closeMaterialsSummaryModal() {
    document.getElementById('materials-summary-modal').classList.add('hidden');
}

function updateMaterialsSummary() {
    const statusFilter = document.getElementById('status-filter').value;
    const tbody = document.getElementById('materials-summary-table-body');
    
    // Collect and group all materials across all turbines/blades/damages
    const groupedMaterials = {};
    
    state.turbines.forEach(turbine => {
        turbine.blades.forEach(blade => {
            blade.damages.forEach(damage => {
                // Apply status filter if set
                if (!statusFilter || damage.status === statusFilter) {
                    (damage.materialsUsed || []).forEach(material => {
                        // Normalize name and unit for key
                        const normalizedKey = `${material.name.toLowerCase().trim()}|${(material.unit || '').toLowerCase().trim()}`;
                        
                        if (!groupedMaterials[normalizedKey]) {
                            groupedMaterials[normalizedKey] = {
                                name: material.name, // Preserve original casing
                                unit: material.unit || '?',
                                totalQty: 0,
                                count: 0,
                                usages: [],
                                damageIds: new Set(),
                                statuses: new Set(),
                                entries: []
                            };
                        }
                        
                        const group = groupedMaterials[normalizedKey];
                        group.totalQty += material.qty;
                        group.count += 1;
                        group.entries.push({
                            qty: material.qty,
                            unit: material.unit,
                            damageId: damage.id,
                            addedAt: material.addedAt || null,
                            turbineId: turbine.id,
                            bladeId: blade.id
                        });
                        group.damageIds.add(damage.id);
                        group.statuses.add(damage.status);
                    });
                }
            });
        });
    });

    // If no materials found, show empty state
    if (Object.keys(groupedMaterials).length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center">
                    <div class="flex flex-col items-center text-gray-500">
                        <i class="fas fa-box-open text-4xl mb-3"></i>
                        <p class="text-sm">No materials found${statusFilter ? ' for ' + document.getElementById('status-filter').options[document.getElementById('status-filter').selectedIndex].text.toLowerCase() : ''}</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    // Convert to array and sort by name
    const sortedMaterials = Object.values(groupedMaterials).sort((a, b) => 
        a.name.localeCompare(b.name)
    );
    
    // Track expanded groups
    const expandedGroups = {};

    // Generate table rows with enhanced information
    const rows = sortedMaterials.map((material, index) => `
        <tr class="hover:bg-gray-50 transition-colors duration-150">
            <td class="px-6 py-4">
                <div class="text-sm flex items-center">
                    <button class="mr-2 text-gray-500 hover:text-gray-700 focus:outline-none" onclick="toggleGroup(${index})">
                        <i class="fas ${expandedGroups[index] ? 'fa-minus' : 'fa-plus'}"></i>
                    </button>
                    <span class="text-gray-900 font-medium">${material.name}</span>
                    <span class="text-gray-400 text-xs ml-2">(${material.count} use${material.count !== 1 ? 's' : ''})</span>
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">
                ${material.totalQty} ${material.unit}
            </td>
            <td class="px-6 py-4">
                <div class="flex flex-wrap gap-2">
                    ${Array.from(material.damageIds).map(damageId => `
                        <span class="inline-flex items-center group relative">
                            <span class="w-2 h-2 rounded-full ${
                                Array.from(material.statuses)[0] === 'pending' ? 'bg-red-400' :
                                Array.from(material.statuses)[0] === 'in_progress' ? 'bg-blue-400' :
                                'bg-green-400'
                            } mr-2"></span>
                            <span class="text-blue-600 underline cursor-pointer" data-damage-id="${damageId}" onclick="handleJumpToDamage('${material.entries.find(e => e.damageId === damageId).turbineId}', '${material.entries.find(e => e.damageId === damageId).bladeId}', '${damageId}')">#${damageId}</span>
                            
                            <!-- Tooltip -->
                            <div class="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-48 bg-gray-800 text-white text-xs rounded p-2 shadow-lg z-10">
                                <div class="font-medium mb-1">Damage #${damageId} Usage:</div>
                                ${material.usages
                                    .filter(usage => usage.damageId === damageId)
                                    .map(usage => `
                                        <div class="flex justify-between items-center text-gray-300">
                                            <span>${usage.qty} ${material.unit}</span>
                                            <span>${usage.addedAt ? new Date(usage.addedAt).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    `).join('')}
                            </div>
                        </span>
                    `).join('')}
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
                <button class="text-blue-500 hover:text-blue-700 transition-colors duration-150"
                        onclick="toggleMaterialDetails(${JSON.stringify(material).replace(/"/g, '&quot;')})">
                    <i class="fas fa-info-circle"></i>
                </button>
            </td>
        </tr>
        ${expandedGroups[index] ? `
        <tr class="bg-gray-50">
            <td colspan="4" class="px-6 py-2">
                <div class="pl-4 text-sm text-gray-700">
                    ${material.entries.map(entry => `
                        <div class="flex justify-between py-1">
                            <span>${entry.qty} ${entry.unit}</span>
                            <span class="text-blue-600 underline cursor-pointer" onclick="handleJumpToDamage('${entry.turbineId}', '${entry.bladeId}', '${entry.damageId}')">Damage #${entry.damageId}</span>
                            ${entry.addedAt ? `<span class="text-gray-400 text-xs">${new Date(entry.addedAt).toLocaleDateString()}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </td>
        </tr>
        ` : ''}
    `).join('') + `
        <tr class="bg-gray-50 font-medium border-t-2 border-gray-200">
            <td class="px-6 py-4">Total Materials</td>
            <td class="px-6 py-4 text-gray-900">${sortedMaterials.reduce((sum, m) => sum + m.count, 0)} entries</td>
            <td colspan="2" class="px-6 py-4 text-sm text-gray-500">${sortedMaterials.length} unique material${sortedMaterials.length !== 1 ? 's' : ''}</td>
        </tr>`;
    
    tbody.innerHTML = rows;

    // Add the toggle function to window scope if it doesn't exist
    if (!window.toggleGroup) {
        window.toggleGroup = function(index) {
            expandedGroups[index] = !expandedGroups[index];
            updateMaterialsSummary();
        };
    }

    if (!window.toggleMaterialDetails) {
        window.toggleMaterialDetails = function(material) {
            const modal = document.getElementById('material-details-modal');
            if (!modal) return;
            
            // Update modal content
            modal.innerHTML = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div class="p-6">
                            <div class="flex justify-between items-start mb-4">
                                <h3 class="text-lg font-medium text-gray-900">
                                    ${material.name} Details
                                </h3>
                                <button onclick="this.closest('#material-details-modal').remove()" 
                                        class="text-gray-400 hover:text-gray-500">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            
                            <div class="space-y-4">
                                <div class="bg-gray-50 p-4 rounded-lg">
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <div class="text-sm text-gray-500">Total Quantity</div>
                                            <div class="text-lg font-medium">${material.totalQty} ${material.unit}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm text-gray-500">Total Uses</div>
                                            <div class="text-lg font-medium">${material.count}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 class="text-sm font-medium text-gray-700 mb-2">Usage History</h4>
                                    <div class="space-y-2">
                                        ${material.usages.sort((a, b) => 
                                            new Date(b.addedAt || 0) - new Date(a.addedAt || 0)
                                        ).map(usage => `
                                            <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm">
                                                <div class="flex items-center gap-3">
                                                    <span class="font-medium">${usage.qty} ${material.unit}</span>
                                                    <span class="text-gray-500">Damage #${usage.damageId}</span>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <span class="px-2 py-1 text-xs rounded-full status-${usage.status}">
                                                        ${usage.status.charAt(0).toUpperCase() + usage.status.slice(1)}
                                                    </span>
                                                    ${usage.addedAt ? 
                                                        `<span class="text-gray-400">${new Date(usage.addedAt).toLocaleDateString()}</span>` 
                                                        : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        };
    }
}

function isDamageIdDuplicate(newId, currentDamageId) {
    return state.turbines.some(turbine => 
        turbine.blades.some(blade => 
            blade.damages.some(damage => 
                damage.id !== currentDamageId && damage.id === parseInt(newId)
            )
        )
    );
}

function saveDamageChanges() {
    const selectedTurbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    const selectedBlade = selectedTurbine?.blades.find(b => b.id === state.selectedBladeId);
    
    const oldId = parseInt(document.getElementById('damage-detail-title').textContent.match(/#(\d+)/)[1]);
    const damage = selectedBlade?.damages.find(d => d.id === oldId);
    
    if (!damage) {
        showToast('Error: Damage not found', 'error');
        return;
    }
    
    const newId = parseInt(document.getElementById('detail-damage-id').value);
    
    // Check for duplicate ID
    if (newId !== oldId && isDamageIdDuplicate(newId, oldId)) {
        document.getElementById('id-duplicate-warning').classList.remove('hidden');
        return;
    }
    document.getElementById('id-duplicate-warning').classList.add('hidden');
    
    // Update damage object
    damage.id = newId;
    damage.radius = parseFloat(document.getElementById('detail-damage-radius').value);
    damage.side = document.getElementById('detail-damage-side').value;
    damage.category = document.getElementById('detail-damage-category').value;
    damage.status = document.getElementById('detail-damage-status').value;
    damage.description = document.getElementById('detail-damage-description').value;
    
    // Save to localStorage and update UI
    saveState();
    updateUI();
    
    // Update modal title to reflect new ID
    document.getElementById('damage-detail-title').textContent = `Damage #${damage.id} (${damage.category})`;
    
    showToast('Changes saved successfully', 'success');
}

function deleteRepairLog(damageId, logId) {
    const selectedTurbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    const selectedBlade = selectedTurbine?.blades.find(b => b.id === state.selectedBladeId);
    const damage = selectedBlade?.damages.find(d => d.id === damageId);
    
    if (!damage) return;
    
    // Remove the log
    damage.logs = damage.logs.filter(log => log.id !== logId);
    
    // Save state and update UI
    saveState();
    
    // Re-render logs list
    const list = document.getElementById('repair-logs-list');
    if (damage.logs && damage.logs.length > 0) {
        list.innerHTML = damage.logs.map(l => `
            <div class="border p-2 rounded bg-white text-sm mb-2 shadow-sm">
                <div class="flex justify-between items-center text-xs text-gray-500 mb-1">
                    <span>${l.date}</span>
                    <div class="flex items-center gap-2">
                        <span>${l.hours}h / ${l.weather}</span>
                        <button onclick="deleteRepairLog(${damage.id}, ${l.id})" 
                                class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                title="Delete log entry">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div>${l.description}</div>
            </div>
        `).join('');
    } else {
        list.innerHTML = '<div class="text-gray-400 text-sm">No logs yet.</div>';
    }
    
    showToast('Repair log deleted', 'success');
}

function handleDamageFieldChange(field, value) {
    const errorDiv = document.getElementById('id-duplicate-warning');
    if (field === 'id') {
        const newId = parseInt(value, 10);
        if (isNaN(newId)) {
            errorDiv.textContent = 'Please enter a valid number';
            errorDiv.classList.remove('hidden');
            return false;
        }
        
        if (isDamageIdDuplicate(newId)) {
            errorDiv.textContent = 'This ID is already in use';
            errorDiv.classList.remove('hidden');
            return false;
        }
        
        errorDiv.classList.add('hidden');
        return true;
    }
    return true;
}

// Add this to your existing styles or create a new style tag
const style = document.createElement('style');
style.textContent = `
    .flash-highlight {
        background-color: #fef08a;
        transition: background-color 0.5s ease;
    }
`;
document.head.appendChild(style);

function handleJumpToDamage(turbineId, bladeId, damageId) {
    // Select the correct turbine and blade
    state.selectedTurbineId = turbineId;
    state.selectedBladeId = bladeId;
    updateUI();

    // Scroll to the correct damage row
    const damageRow = document.getElementById(`damage-row-${damageId}`);
    if (damageRow) {
        damageRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        damageRow.classList.add('flash-highlight');
        setTimeout(() => {
            damageRow.classList.remove('flash-highlight');
        }, 2000);
    }

    // Optionally close the modal
    const modal = document.getElementById('materials-summary-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
} 