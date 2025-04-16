// State management
export let state = {
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
}

export function saveState() {
    localStorage.setItem('bladeTrackerState', JSON.stringify(state));
}

export function getCurrentDamageId() {
    const value = document.getElementById('detail-damage-id').value;
    return parseInt(value, 10);
}

// Helper functions for state access
export function getSelectedDamage(damageId) {
    const turbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    const blade = turbine?.blades.find(b => b.id === state.selectedBladeId);
    const damage = blade?.damages.find(d => d.id === damageId);
    return { turbine, blade, damage };
}

export function findDamage(damageId) {
    const { damage } = getSelectedDamage(damageId);
    return damage;
}

export function findCurrentBlade() {
    const turbine = state.turbines.find(t => t.id === state.selectedTurbineId);
    return turbine?.blades.find(b => b.id === state.selectedBladeId);
}

export function isDamageIdDuplicate(newId, currentDamageId) {
    return state.turbines.some(turbine => 
        turbine.blades.some(blade => 
            blade.damages.some(damage => 
                damage.id !== currentDamageId && damage.id === parseInt(newId)
            )
        )
    );
}

// Initialize empty data if needed
export function initializeMockData() {
    if (!state.turbines.length) {
        // You could add mock data here if needed
        saveState();
    }
} 