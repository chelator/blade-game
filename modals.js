import { state, getSelectedDamage } from './state.js';
import { showToast } from './ui.js';
import { renderRepairLogs, renderMaterialsList } from './ui.js';

// Focus management utilities
const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
let lastFocusedElement = null;

export function trapFocus(element) {
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

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    lastFocusedElement = document.activeElement;
    modal.classList.remove('hidden');
    trapFocus(modal);
    
    const firstInput = modal.querySelector(focusableElements);
    if (firstInput) {
        firstInput.focus();
    }
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
    if (lastFocusedElement) {
        lastFocusedElement.focus();
    }
    lastFocusedElement = null;  // Prevent orphaned focus reference
}

export function openDamageDetail(damageId) {
    const { damage } = getSelectedDamage(damageId);
    
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
    
    // Render logs
    renderRepairLogs(damage);
    
    // Initialize materials list if it doesn't exist
    if (!damage.materialsUsed) {
        damage.materialsUsed = [];
    }
    
    // Render materials list
    renderMaterialsList(damage.materialsUsed);
    
    // Show the modal
    openModal('damage-detail-modal');
}

export function closeDamageDetailModal() {
    closeModal('damage-detail-modal');
}

export function openQuickAddDamageForm() {
    openModal('quick-add-modal');
}

export function closeQuickAddModal() {
    closeModal('quick-add-modal');
}

export function openMaterialsSummaryModal() {
    openModal('materials-summary-modal');
    updateMaterialsSummary();
}

export function closeMaterialsSummaryModal() {
    closeModal('materials-summary-modal');
}

function updateMaterialsSummary() {
    const statusFilter = document.getElementById('status-filter').value;
    const tbody = document.getElementById('materials-summary-table-body');
    
    // Collect all materials across all turbines/blades/damages
    const allMaterials = [];
    state.turbines.forEach(turbine => {
        turbine.blades.forEach(blade => {
            blade.damages.forEach(damage => {
                if (!statusFilter || damage.status === statusFilter) {
                    (damage.materialsUsed || []).forEach(material => {
                        allMaterials.push({
                            ...material,
                            damageId: damage.id,
                            damageStatus: damage.status
                        });
                    });
                }
            });
        });
    });

    // If no materials found, show empty state
    if (allMaterials.length === 0) {
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

    // Generate table rows with status indicators
    const rows = allMaterials.map(m => `
        <tr class="hover:bg-gray-50 transition-colors duration-150">
            <td class="px-6 py-4 text-sm text-gray-900">${m.name}</td>
            <td class="px-6 py-4 text-sm text-gray-900 font-medium">${m.qty}</td>
            <td class="px-6 py-4 text-sm text-gray-900">${m.unit}</td>
            <td class="px-6 py-4 text-sm">
                <span class="inline-flex items-center">
                    <span class="w-2 h-2 rounded-full ${
                        m.damageStatus === 'pending' ? 'bg-red-400' :
                        m.damageStatus === 'in_progress' ? 'bg-blue-400' :
                        'bg-green-400'
                    } mr-2"></span>
                    <span class="text-gray-600">#${m.damageId}</span>
                </span>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = rows;
} 