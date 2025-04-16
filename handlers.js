import { state, saveState, findDamage, findCurrentBlade, isDamageIdDuplicate, getSelectedDamage } from './state.js';
import { updateUI, updateTurbineList, updateBladeList, updateDamageDetails, showToast, renderRepairLogs, renderMaterialsList } from './ui.js';
import { closeModal, closeDamageDetailModal, closeQuickAddModal } from './modals.js';

export function handleNewDamageSubmit(event) {
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
        // New turbine added - need full UI update
        saveState();
        updateUI();
        closeNewDamageModal();
        showToast('New damage added successfully', 'success');
        return;
    }
    
    // Find or create blade
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
        // New blade added - update turbine and blade lists
        saveState();
        updateTurbineList();
        updateBladeList();
        showToast('New blade added successfully', 'success');
    }
    
    // Add new damage
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
    updateDamageDetails();
    closeNewDamageModal();
    showToast('New damage added successfully', 'success');
}

export function handleQuickAddSubmit(event) {
    event.preventDefault();
    
    const radius = parseFloat(document.getElementById('quick-damage-radius').value);
    const side = document.getElementById('quick-damage-side').value;
    const category = document.getElementById('quick-damage-category').value || 'Cat 3';
    const description = document.getElementById('quick-damage-description').value.trim();

    const turbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    if (!turbine) {
        showToast('Select a turbine first', 'error');
        return;
    }
    const blade = turbine.blades.find(b => b.id === state.selectedBladeId);
    if (!blade) {
        showToast('Select a blade first', 'error');
        return;
    }

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
    saveState();
    updateDamageDetails();
    closeQuickAddModal();
    showToast('Damage added successfully', 'success');
}

export function handleAddMaterial() {
    const damageId = getCurrentDamageId();
    const { damage } = getSelectedDamage(damageId);
    
    if (!damage) {
        showToast('Error: Damage context missing', 'error');
        return;
    }
    
    const materialInput = document.getElementById('material-input');
    const quantityInput = document.getElementById('quantity-input');
    
    const material = materialInput.value.trim();
    const quantity = parseFloat(quantityInput.value);
    
    if (!material || isNaN(quantity) || quantity <= 0) {
        showToast('Please enter valid material and quantity', 'error');
        return;
    }
    
    if (!damage.materialsUsed) {
        damage.materialsUsed = [];
    }
    
    damage.materialsUsed.push({ material, quantity });
    saveState();
    renderMaterialsList(damage.materialsUsed);
    showToast('Material added successfully', 'success');
}

export function handleAddLogForm(event) {
    event.preventDefault();
    
    const damageId = getCurrentDamageId();
    const { damage } = getSelectedDamage(damageId);
    
    if (!damage) {
        showToast('Error: Damage context missing', 'error');
        return;
    }
    
    const logInput = document.getElementById('log-input');
    const logText = logInput.value.trim();
    
    if (!logText) {
        showToast('Please enter a log message', 'error');
        return;
    }
    
    if (!damage.logs) {
        damage.logs = [];
    }
    
    const timestamp = new Date().toISOString();
    damage.logs.push({ timestamp, text: logText });
    
    saveState();
    renderRepairLogs(damage);
    showToast('Log added successfully', 'success');
}

export function deleteMaterial(index) {
    const damageId = getCurrentDamageId();
    const { damage } = getSelectedDamage(damageId);
    
    if (!damage || !damage.materialsUsed) {
        showToast('Error: Could not delete material', 'error');
        return;
    }
    
    damage.materialsUsed.splice(index, 1);
    saveState();
    renderMaterialsList(damage.materialsUsed);
    showToast('Material deleted successfully', 'success');
}

export function deleteRepairLog(index) {
    const damageId = getCurrentDamageId();
    const { damage } = getSelectedDamage(damageId);
    
    if (!damage || !damage.logs) {
        showToast('Error: Could not delete log', 'error');
        return;
    }
    
    damage.logs.splice(index, 1);
    saveState();
    renderRepairLogs(damage);
    showToast('Log deleted successfully', 'success');
}

export function selectTurbine(turbineId) {
    state.selectedTurbineId = turbineId;
    state.selectedBladeId = null; // Clear blade selection when switching turbines
    saveState();
    updateTurbineList();
    updateBladeList();
    updateDamageDetails();
}

export function selectBlade(bladeId) {
    state.selectedBladeId = bladeId;
    saveState();
    updateBladeList();
    updateDamageDetails();
}

export function toggleDamageStatus(damageId) {
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
            updateDamageDetails();
        }
    }
} 