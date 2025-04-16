import { initializeMockData } from './state.js';
import { updateUI, updateTurbineList, updateBladeList, updateDamageDetails, showToast } from './ui.js';
import { 
    handleNewDamageSubmit,
    handleQuickAddSubmit,
    handleAddMaterial,
    handleAddLog
} from './handlers.js';
import {
    openModal,
    closeModal,
    closeDamageDetailModal,
    openQuickAddDamageForm,
    closeQuickAddModal,
    openDamageDetail
} from './modals.js';
import { state, saveState, getCurrentDamageId, getSelectedDamage } from './state.js';
import { setupBladeKeyboardNavigation } from './navigation.js';

// Enhanced event listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeMockData();
    setupBladeKeyboardNavigation();
    setupAutoSave();
    setupDamageTableHandlers();
    
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
    addLogForm.addEventListener('submit', handleAddLog);
    
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
    ['detail-damage-category', 'detail-damage-description'].forEach(id => {
        const field = document.getElementById(id);
        field.addEventListener('change', () => {
            showToast('Changes saved');
        });
    });

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
    const turbineSearch = document.getElementById('turbine-search');
    if (turbineSearch) {
        turbineSearch.addEventListener('input', () => {
            updateTurbineList();
        });
    }

    const bladeSearch = document.getElementById('blade-search');
    if (bladeSearch) {
        bladeSearch.addEventListener('input', () => {
            updateBladeList();
        });
    }

    // Quick add form
    const quickAddForm = document.getElementById('quick-add-form');
    if (quickAddForm) {
        quickAddForm.addEventListener('submit', handleQuickAddSubmit);
    }

    // Material form
    const addMaterialForm = document.getElementById('add-material-form');
    if (addMaterialForm) {
        addMaterialForm.addEventListener('submit', handleAddMaterial);
    }
});

// Setup delegated click handlers for damage tables
function setupDamageTableHandlers() {
    // Handler for open damages table
    document.getElementById('open-damages-table-body')?.addEventListener('click', e => {
        const row = e.target.closest('tr[data-damage-id]');
        if (row) {
            const id = parseInt(row.dataset.damageId, 10);
            openDamageDetail(id);
        }
    });

    // Handler for in-progress damages table
    document.getElementById('in-progress-table-body')?.addEventListener('click', e => {
        const row = e.target.closest('tr[data-damage-id]');
        if (row) {
            const id = parseInt(row.dataset.damageId, 10);
            openDamageDetail(id);
        }
    });

    // Handler for completed damages table
    document.getElementById('completed-damages-table-body')?.addEventListener('click', e => {
        const row = e.target.closest('tr[data-damage-id]');
        if (row) {
            const id = parseInt(row.dataset.damageId, 10);
            openDamageDetail(id);
        }
    });
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
    // Remove status from auto-save fields
    const autoSaveFields = ['detail-damage-category', 'detail-damage-description'];
    
    autoSaveFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.addEventListener('change', () => {
            // Get current damage
            const damageId = getCurrentDamageId();
            const { damage } = getSelectedDamage(damageId);
            
            if (!damage) {
                showToast('Error: Could not save changes - damage not found', 'error');
                return;
            }

            // Update the appropriate field based on the input id
            switch (fieldId) {
                case 'detail-damage-category':
                    damage.category = field.value;
                    // Update modal title to reflect category change
                    document.getElementById('damage-detail-title').textContent = `Damage #${damage.id} (${damage.category})`;
                    break;
                case 'detail-damage-description':
                    damage.description = field.value;
                    break;
            }

            // Save state and update only damage details
            saveState();
            updateDamageDetails();
            
            // Show success message
            showToast('Changes saved automatically', 'success');
        });
    });
} 