// State management for CNC-01 (Interactive simulation)
const state = {
    activeMachine: "CNC-01",
    brix: 7.0,
    ph: 8.8,
    trampOil: 0.24,
    bacteria: 120,
    temp: 28.4,
    flow: 1.5,
    pztPower: 80,
    plasmaPower: 25,
    freq: 1.60,
    
    // System switches
    acousticActive: true,
    plasmaActive: true,
    autodoseActive: true,
    
    // Actuator states
    waterSolenoid: false,
    oilSolenoid: false,
    
    // Accumulators for ESG
    oilSaved: 1420,
    waterRecycled: 8450,
    toolLife: 26.4
};

// Simulation target constants
const TARGETS = {
    brix: 7.0,
    ph: 8.8,
    trampOil: 0.05,
    bacteria: 50
};

// Particle physics for the acoustic separation canvas
class Particle {
    constructor(type, canvas) {
        this.canvas = canvas;
        this.type = type; // 'oil' or 'metal'
        this.reset();
        // Scatter x randomly across the chamber
        this.x = Math.random() * canvas.width;
    }
    
    reset() {
        this.x = 0;
        this.y = Math.random() * this.canvas.height;
        this.size = this.type === 'oil' ? Math.random() * 4 + 3 : Math.random() * 2 + 1.5;
        this.speed = Math.random() * 1.5 + 0.5;
        
        // Target vertical bands
        // Standing wave at 1.6MHz has nodes (center) and antinodes (edges)
        // Metal goes to nodes (center y), Oil goes to antinodes (top y=0, bottom y=height)
        if (this.type === 'oil') {
            this.targetY = Math.random() > 0.5 ? 10 : this.canvas.height - 10;
        } else {
            this.targetY = this.canvas.height / 2 + (Math.random() * 20 - 10);
        }
    }
    
    update(acousticActive) {
        this.x += this.speed;
        if (this.x > this.canvas.width) {
            this.reset();
        }
        
        if (acousticActive) {
            // Drag toward target vertical positions (acoustophoresis force simulation)
            const diff = this.targetY - this.y;
            this.y += diff * 0.04;
        } else {
            // Brown drift (random walk)
            this.y += (Math.random() * 2 - 1) * 0.5;
            // Bound
            if (this.y < 0) this.y = 0;
            if (this.y > this.canvas.height) this.y = this.canvas.height;
        }
    }
    
    draw(ctx) {
        ctx.beginPath();
        if (this.type === 'oil') {
            // Glowing yellow oil droplets
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
            ctx.shadowColor = '#F59E0B';
            ctx.shadowBlur = 4;
        } else {
            // Hard gray metal particles
            ctx.rect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
            ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
            ctx.shadowBlur = 0;
        }
        ctx.fill();
    }
}

// Canvas Initialization
const canvas = document.getElementById('acousticCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    
    // Re-generate particles
    particles = [];
    for (let i = 0; i < 40; i++) particles.push(new Particle('oil', canvas));
    for (let i = 0; i < 30; i++) particles.push(new Particle('metal', canvas));
}

// Tab Navigation Logic
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');
        
        // Toggle Nav Active state
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Toggle Tab content
        tabContents.forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');
        
        // Update Titles
        if (tab === 'overview') {
            pageTitle.innerText = "Factory Overview";
            pageSubtitle.innerText = "Real-time status of all retrofitted machine sumps";
        } else if (tab === 'machine-details') {
            pageTitle.innerText = "Sump Diagnostic";
            pageSubtitle.innerText = "Deep-dive analysis of coolant composition and chemistry";
            resizeCanvas();
        } else if (tab === 'controls') {
            pageTitle.innerText = "System Controls";
            pageSubtitle.innerText = "Adjust acoustic frequencies, plasma cycles, and overrides";
        } else if (tab === 'analytics') {
            pageTitle.innerText = "ESG & Financial Savings";
            pageSubtitle.innerText = "Detailed report of raw oil offset, carbon savings, and cost reductions";
        }
    });
});

// Sidebar machine card switcher
const machineCards = document.querySelectorAll('.machine-mini-card');
machineCards.forEach(card => {
    card.addEventListener('click', () => {
        machineCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        const machineId = card.getAttribute('data-machine');
        state.activeMachine = machineId;
        document.getElementById('active-machine-title').innerText = card.querySelector('.m-name').innerText;
        
        // Seed values for simulated warning machines
        if (machineId === 'CNC-01') {
            state.brix = 7.0;
            state.ph = 8.8;
            state.trampOil = 0.24;
            state.bacteria = 120;
            state.acousticActive = true;
            state.plasmaActive = true;
            state.autodoseActive = true;
        } else if (machineId === 'CNC-02') {
            state.brix = 6.8;
            state.ph = 8.9;
            state.trampOil = 0.04;
            state.bacteria = 40;
            state.acousticActive = true;
            state.plasmaActive = true;
            state.autodoseActive = true;
        } else if (machineId === 'VMC-03') {
            // Evaporated / Over-concentrated state
            state.brix = 9.2;
            state.ph = 8.5;
            state.trampOil = 0.12;
            state.bacteria = 180;
            state.acousticActive = true;
            state.plasmaActive = false;
            state.autodoseActive = false; // Turned off to show warning
        } else if (machineId === 'CNC-04') {
            // Acidic / Bacterial decay state
            state.brix = 4.8;
            state.ph = 7.2;
            state.trampOil = 0.98;
            state.bacteria = 14500;
            state.acousticActive = false;
            state.plasmaActive = false;
            state.autodoseActive = false;
        }
        
        // Sync inputs
        document.getElementById('toggle-acoustic').checked = state.acousticActive;
        document.getElementById('toggle-plasma').checked = state.plasmaActive;
        document.getElementById('toggle-autodose').checked = state.autodoseActive;
        
        updateUI();
    });
});

// Inputs / Overrides events
document.getElementById('toggle-acoustic').addEventListener('change', (e) => {
    state.acousticActive = e.target.checked;
});
document.getElementById('toggle-plasma').addEventListener('change', (e) => {
    state.plasmaActive = e.target.checked;
});
document.getElementById('toggle-autodose').addEventListener('change', (e) => {
    state.autodoseActive = e.target.checked;
});

// Slider inputs
document.getElementById('input-pzt-power').addEventListener('input', (e) => {
    state.pztPower = parseInt(e.target.value);
    document.getElementById('slider-val-pzt').innerText = `${state.pztPower} W`;
    document.getElementById('lbl-acoustic-power').innerText = state.pztPower;
});

document.getElementById('input-plasma-power').addEventListener('input', (e) => {
    state.plasmaPower = parseInt(e.target.value);
    document.getElementById('slider-val-plasma').innerText = `${state.plasmaPower} %`;
    document.getElementById('val-plasma').innerText = `${state.plasmaPower}%`;
});

document.getElementById('input-freq').addEventListener('input', (e) => {
    state.freq = parseFloat(e.target.value / 100);
    document.getElementById('slider-val-freq').innerText = `${state.freq.toFixed(2)} MHz`;
    document.getElementById('lbl-acoustic-freq').innerText = state.freq.toFixed(2);
});

// Manual override buttons
document.getElementById('btn-dose-water').addEventListener('click', () => {
    state.brix = Math.max(4.0, state.brix - 0.5);
    state.waterSolenoid = true;
    setTimeout(() => { state.waterSolenoid = false; updateUI(); }, 1500);
    updateUI();
});
document.getElementById('btn-dose-oil').addEventListener('click', () => {
    state.brix = Math.min(12.0, state.brix + 0.5);
    state.oilSolenoid = true;
    setTimeout(() => { state.oilSolenoid = false; updateUI(); }, 1500);
    updateUI();
});

// Quick cycle button
document.getElementById('btn-trigger-regen').addEventListener('click', () => {
    state.trampOil = Math.max(0.01, state.trampOil - 0.15);
    state.bacteria = Math.max(10, state.bacteria - 2000);
    if (state.bacteria < 1000 && state.ph < 8.5) state.ph = 8.5;
    updateUI();
});

// Simulation Lab Buttons
document.getElementById('sim-leak-trampoil').addEventListener('click', () => {
    state.trampOil = 0.95;
    updateUI();
});
document.getElementById('sim-evap').addEventListener('click', () => {
    state.brix = 9.8;
    updateUI();
});
document.getElementById('sim-bacteria').addEventListener('click', () => {
    state.bacteria = 18000;
    state.ph = 7.1;
    updateUI();
});
document.getElementById('sim-reset').addEventListener('click', () => {
    state.brix = 7.0;
    state.ph = 8.8;
    state.trampOil = 0.05;
    state.bacteria = 45;
    updateUI();
});

// Mathematical Model Logic (Runs every 1 second)
setInterval(() => {
    // 1. Tramp Oil Leakage (Continuous background leak of 0.01 L/s)
    let leakRate = 0.005;
    if (state.acousticActive && state.pztPower > 0) {
        // Acoustic separation rate is proportional to transducer power
        let separationRate = 0.02 * (state.pztPower / 80);
        state.trampOil = Math.max(0.01, state.trampOil + leakRate - separationRate);
    } else {
        state.trampOil = Math.min(2.0, state.trampOil + leakRate);
    }
    
    // 2. Bacterial Proliferation (Grows fast if tramp oil forms a film (>0.3L) blocking air)
    let growthRate = 1.05; // 5% growth per second
    if (state.trampOil > 0.3) {
        growthRate = 1.25; // 25% growth per second under oil blanket (anaerobic)
    }
    
    if (state.plasmaActive && state.plasmaPower > 0) {
        // Plasma destroys bacteria based on duty cycle intensity
        let killRate = 100 * (state.plasmaPower / 25);
        state.bacteria = Math.max(10, (state.bacteria * growthRate) - killRate);
    } else {
        state.bacteria = Math.min(100000, state.bacteria * growthRate);
    }
    
    // 3. pH Decay (Bacterial H2S production makes the sump acidic)
    if (state.bacteria > 2000) {
        let decay = (state.bacteria / 100000) * 0.05;
        state.ph = Math.max(6.2, state.ph - decay);
    } else {
        // Self-heal/buffer properties of the coolant slowly restore pH to normal when sterile
        if (state.ph < 8.8) {
            state.ph = Math.min(8.8, state.ph + 0.02);
        }
    }
    
    // 4. Brix Concentration (Auto-dosing logic)
    // Water slowly evaporates naturally (0.01% Brix shift per second)
    state.brix += 0.008;
    
    if (state.autodoseActive) {
        if (state.brix > TARGETS.brix + 0.2) {
            // Open water solenoid to dilute
            state.brix = Math.max(TARGETS.brix, state.brix - 0.08);
            state.waterSolenoid = true;
            state.oilSolenoid = false;
            // Accumulate recycled water
            state.waterRecycled += 0.2;
        } else if (state.brix < TARGETS.brix - 0.2) {
            // Open oil solenoid to enrich
            state.brix = Math.min(TARGETS.brix, state.brix + 0.08);
            state.waterSolenoid = false;
            state.oilSolenoid = true;
            // Accumulate oil saved
            state.oilSaved += 0.05;
        } else {
            state.waterSolenoid = false;
            state.oilSolenoid = false;
        }
    }
    
    updateUI();
}, 1000);

// Synchronize state with HTML UI elements
function updateUI() {
    // 1. Text values
    document.getElementById('val-brix').innerText = state.brix.toFixed(1);
    document.getElementById('val-ph').innerText = state.ph.toFixed(2);
    document.getElementById('val-trampoil').innerText = state.trampOil.toFixed(2);
    document.getElementById('val-bacteria').innerText = Math.round(state.bacteria).toLocaleString();
    
    // Solenoid indicators
    const waterSolenoidEl = document.getElementById('state-water-sol');
    const oilSolenoidEl = document.getElementById('state-state-sol') || document.getElementById('state-conc-sol');
    
    if (waterSolenoidEl) {
        waterSolenoidEl.innerText = state.waterSolenoid ? "OPEN (Dosing Water)" : "CLOSED";
        waterSolenoidEl.className = state.waterSolenoid ? "text-success" : "text-muted";
    }
    if (oilSolenoidEl) {
        oilSolenoidEl.innerText = state.oilSolenoid ? "OPEN (Dosing Concentrate)" : "CLOSED";
        oilSolenoidEl.className = state.oilSolenoid ? "text-success" : "text-muted";
    }
    
    // Dynamic Temperatures & flows
    document.getElementById('val-temp').innerText = `${(28.0 + Math.sin(Date.now()/50000)*0.5).toFixed(1)}°C`;
    document.getElementById('val-pzt-temp').innerText = `${(32.0 + (state.pztPower/150)*4).toFixed(1)}°C`;
    
    // 2. Bar widths & Colors
    // Brix
    const barBrix = document.getElementById('bar-brix');
    const statusBrix = document.getElementById('status-brix');
    let brixPct = (state.brix / 12) * 100;
    barBrix.style.width = `${brixPct}%`;
    if (state.brix >= 6.0 && state.brix <= 8.0) {
        barBrix.style.background = 'var(--success)';
        statusBrix.innerText = "Normal (Surfactant Balanced)";
        statusBrix.className = "gauge-status text-success";
    } else {
        barBrix.style.background = 'var(--warning)';
        statusBrix.innerText = state.brix > 8.0 ? "High Concentration (Dermatitis risk)" : "Low Concentration (Rust risk)";
        statusBrix.className = "gauge-status text-warning";
    }
    
    // pH
    const barPh = document.getElementById('bar-ph');
    const statusPh = document.getElementById('status-ph');
    let phPct = (state.ph / 14) * 100;
    barPh.style.width = `${phPct}%`;
    if (state.ph >= 8.5 && state.ph <= 9.4) {
        barPh.style.background = 'var(--success)';
        statusPh.innerText = "Alkaline Sump (Rust Protection Active)";
        statusPh.className = "gauge-status text-success";
    } else if (state.ph >= 8.0 && state.ph < 8.5) {
        barPh.style.background = 'var(--warning)';
        statusPh.innerText = "pH Dropping (Anaerobic growth threat)";
        statusPh.className = "gauge-status text-warning";
    } else {
        barPh.style.background = 'var(--critical)';
        statusPh.innerText = "Acidic Emulsion (Rancid / Odorous Sump)";
        statusPh.className = "gauge-status text-danger";
    }
    
    // Tramp Oil
    const barOil = document.getElementById('bar-trampoil');
    const statusOil = document.getElementById('status-trampoil');
    let oilPct = Math.min(100, (state.trampOil / 1.5) * 100);
    barOil.style.width = `${oilPct}%`;
    if (state.trampOil < 0.25) {
        barOil.style.background = 'var(--success)';
        statusOil.innerText = "Clean Emulsion Matrix";
        statusOil.className = "gauge-status text-success";
    } else if (state.trampOil >= 0.25 && state.trampOil < 0.6) {
        barOil.style.background = 'var(--warning)';
        statusOil.innerText = "Oil Film Forming (Bacterial risk)";
        statusOil.className = "gauge-status text-warning";
    } else {
        barOil.style.background = 'var(--critical)';
        statusOil.innerText = "Saturated tramp oil (Replace filter)";
        statusOil.className = "gauge-status text-danger";
    }
    
    // Bacteria
    const barBact = document.getElementById('bar-bacteria');
    const statusBact = document.getElementById('status-bacteria');
    let bactPct = Math.min(100, (state.bacteria / 10000) * 100);
    barBact.style.width = `${bactPct}%`;
    if (state.bacteria < 1000) {
        barBact.style.background = 'var(--success)';
        statusBact.innerText = "Monday Odor Suppressed";
        statusBact.className = "gauge-status text-success";
    } else if (state.bacteria >= 1000 && state.bacteria < 8000) {
        barBact.style.background = 'var(--warning)';
        statusBact.innerText = "Slight Rancidity (Biological Growth)";
        statusBact.className = "gauge-status text-warning";
    } else {
        barBact.style.background = 'var(--critical)';
        statusBact.innerText = "Hazardous Bio-Film (Biocide overload)";
        statusBact.className = "gauge-status text-danger";
    }
    
    // Sync node on map
    const nodeEl = document.querySelector(`.machine-node[data-id="${state.activeMachine}"]`);
    if (nodeEl) {
        nodeEl.querySelector('.node-brix').innerText = `Brix: ${state.brix.toFixed(1)}%`;
        nodeEl.className = "machine-node";
        if (state.activeMachine === "CNC-01") nodeEl.classList.add('active');
        
        if (state.ph < 8.0 || state.bacteria > 8000) {
            nodeEl.classList.add('critical-node');
        } else if (state.brix > 8.0 || state.brix < 6.0 || state.trampOil > 0.5) {
            nodeEl.classList.add('warning-node');
        } else {
            nodeEl.classList.add('healthy');
        }
    }
}

// Particle Canvas Animation Loop
function animateParticles() {
    ctx.fillStyle = 'rgba(5, 8, 17, 0.2)'; // Fading trail
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw standing wave lines (1.6MHz representation)
    if (state.acousticActive) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.12)';
        ctx.lineWidth = 2;
        const wavelengthCount = 3;
        const midY = canvas.height / 2;
        
        // Sine standing wave
        for (let x = 0; x < canvas.width; x += 5) {
            let y1 = midY + Math.sin(x * 0.015 + Date.now()*0.005) * 40 * (state.pztPower/80);
            let y2 = midY - Math.sin(x * 0.015 + Date.now()*0.005) * 40 * (state.pztPower/80);
            if (x === 0) {
                ctx.moveTo(x, y1);
            } else {
                ctx.lineTo(x, y1);
            }
        }
        ctx.stroke();
    }
    
    // Update and draw particles
    particles.forEach(p => {
        p.update(state.acousticActive);
        p.draw(ctx);
    });
    
    // Plasma chamber bubbles (DBD generator section at the right side)
    if (state.plasmaActive) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(112, 0, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(canvas.width - 60, 20, 40, canvas.height - 40);
        
        for (let i = 0; i < 5; i++) {
            let bx = canvas.width - 60 + Math.random() * 40;
            let by = 20 + Math.random() * (canvas.height - 40);
            ctx.beginPath();
            ctx.arc(bx, by, Math.random()*2 + 1, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(156, 39, 176, 0.6)';
            ctx.fill();
        }
    }
    
    requestAnimationFrame(animateParticles);
}

// Window sizing
window.addEventListener('resize', resizeCanvas);
setTimeout(() => { resizeCanvas(); animateParticles(); }, 200);
