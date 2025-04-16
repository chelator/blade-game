import { state, saveState } from './state.js';

// UI Update Functions
export function updateUI() {
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

export function updateTurbineList() {
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
                    data-turbine-id="${turbine.id}">
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

export function updateBladeList() {
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
                    data-blade-id="${blade.id}">
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

export function updateDamageDetails() {
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
            <tr class="hover:bg-gray-50 cursor-pointer" data-damage-id="${damage.id}">
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
                    <button onclick="event.stopPropagation(); toggleDamageStatus(${damage.id});" 
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
            <tr class="hover:bg-gray-50 cursor-pointer" data-damage-id="${damage.id}">
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
                    <button onclick="event.stopPropagation(); toggleDamageStatus(${damage.id});" 
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
            <tr class="hover:bg-gray-50 cursor-pointer" data-damage-id="${damage.id}">
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
                            onclick="event.stopPropagation(); showMaterialsForDamage(${damage.id});" 
                            title="Toggle Materials List">
                        <i class="fas fa-list-ul"></i>
                    </button>
                    <div id="materials-list-${damage.id}" class="hidden mt-2"></div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button onclick="event.stopPropagation(); toggleDamageStatus(${damage.id});" 
                            class="text-yellow-600 hover:text-yellow-800 hover:underline transition-colors duration-150 flex items-center gap-1 text-xs font-medium p-1 rounded hover:bg-yellow-50">
                        <i class="fas fa-undo"></i>
                        <span>Reopen</span>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

export function showToast(message, type = 'success') {
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

export function renderRepairLogs(damage) {
    const list = document.getElementById('repair-logs-list');
    if (!damage.logs || damage.logs.length === 0) {
        list.innerHTML = '<div class="text-gray-400 text-sm">No logs yet.</div>';
        return;
    }
    list.innerHTML = damage.logs.map(log => `
        <div class="border p-2 rounded bg-white text-sm mb-2 shadow-sm">
            <div class="flex justify-between items-center text-xs text-gray-500 mb-1">
                <span>${log.date}</span>
                <div class="flex items-center gap-2">
                    <span>${log.hours}h / ${log.weather}</span>
                    <button onclick="deleteRepairLog(${damage.id}, ${log.id})" 
                            class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            title="Delete log entry">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
            <div>${log.description}</div>
        </div>
    `).join('');
}

function groupMaterials(materialsArray) {
    if (!materialsArray || !Array.isArray(materialsArray)) return [];
    
    const grouped = materialsArray.reduce((acc, material) => {
        // Create a unique key for each material+unit combination
        const key = `${material.name}|${material.unit}`;
        
        if (!acc[key]) {
            acc[key] = {
                name: material.name,
                unit: material.unit,
                totalQty: 0,
                count: 0,
                // Keep track of individual entries for deletion
                entries: []
            };
        }
        
        acc[key].totalQty += material.qty;
        acc[key].count += 1;
        // Sort entries by timestamp if available
        acc[key].entries.push({
            ...material,
            addedAt: material.addedAt || new Date().toISOString() // Fallback for older entries
        });
        
        return acc;
    }, {});
    
    // Sort entries within each group by timestamp
    Object.values(grouped).forEach(group => {
        group.entries.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    });
    
    // Convert to array and sort by name
    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
}

export function renderMaterialsList(materials) {
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

    const groupedMaterials = groupMaterials(materials);
    
    list.innerHTML = groupedMaterials.map((group, groupIndex) => `
        <li class="text-sm border-b border-gray-100 last:border-0" data-group-index="${groupIndex}">
            <!-- Material Group Header -->
            <div class="py-2 px-2 flex items-center justify-between hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                 onclick="toggleMaterialGroup(${groupIndex})">
                <div class="flex items-center gap-2">
                    <i class="fas fa-chevron-right text-gray-400 transition-transform duration-200" id="chevron-${groupIndex}"></i>
                    <i class="fas fa-box text-blue-500"></i>
                    <div>
                        <span class="font-medium">${group.totalQty} ${group.unit}</span>
                        <span class="text-gray-700">${group.name}</span>
                        <span class="text-gray-400 text-xs ml-2">(${group.count} use${group.count !== 1 ? 's' : ''})</span>
                    </div>
                </div>
            </div>
            <!-- Individual Entries (Initially Hidden) -->
            <div class="hidden bg-gray-50 border-t border-gray-100" id="group-entries-${groupIndex}">
                ${group.entries.map((entry, entryIndex) => {
                    const isRecent = new Date(entry.addedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
                    return `
                    <div class="flex items-center justify-between py-2 px-8 border-b last:border-b-0 border-gray-100/50 group ${isRecent ? 'animate-fade-in' : ''}"
                         data-entry-index="${entryIndex}">
                        <div class="flex items-center gap-3">
                            <span class="text-gray-600">${entry.qty} ${entry.unit}</span>
                            ${isRecent ? '<i class="fas fa-star-of-life text-blue-400 text-xs animate-pulse"></i>' : ''}
                            ${entry.addedAt ? `<span class="text-gray-400 text-xs">${new Date(entry.addedAt).toLocaleDateString()}</span>` : ''}
                        </div>
                        <button onclick="deleteMaterial('${entry.name}', ${entry.qty}, '${entry.unit}')" 
                                class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-all duration-150"
                                title="Remove material">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `}).join('')}
            </div>
        </li>
    `).join('');

    // Add the toggle function to window scope
    window.toggleMaterialGroup = function(groupIndex) {
        const entriesDiv = document.getElementById(`group-entries-${groupIndex}`);
        const chevron = document.getElementById(`chevron-${groupIndex}`);
        
        if (entriesDiv && chevron) {
            const isHidden = entriesDiv.classList.contains('hidden');
            entriesDiv.classList.toggle('hidden', !isHidden);
            chevron.style.transform = isHidden ? 'rotate(90deg)' : '';
        }
    };
}

// Add this to your existing styles or create a new style tag
const style = document.createElement('style');
style.textContent = `
    @keyframes fade-in {
        from { opacity: 0; background-color: rgba(59, 130, 246, 0.1); }
        to { opacity: 1; background-color: transparent; }
    }
    .animate-fade-in {
        animation: fade-in 1s ease-out;
    }
`;
document.head.appendChild(style);

// Utility Functions
export function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
} 