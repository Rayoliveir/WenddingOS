// --- CONFIGURAÇÃO DE ACESSO ---
const SENHA_MESTRE = "casamento2024"; // ALTERE AQUI SUA SENHA

function checkPassword() {
    const input = document.getElementById('app-password').value;
    if (input === SENHA_MESTRE) {
        sessionStorage.setItem('wedding_auth', 'true');
        document.getElementById('login-screen').style.display = 'none';
    } else {
        const errorMsg = document.getElementById('login-error');
        errorMsg.style.display = 'block';
    }
}

// Verifica se já está logado ao carregar a página
function verifyAuth() {
    if (sessionStorage.getItem('wedding_auth') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
    }
}

// Adicione a chamada da verificação no final do seu script ou no início
verifyAuth();

// CONFIGURAÇÃO SUPABASE
const SUPABASE_URL = 'https://axzjdtxnvvvhpqkktbtn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BhfbqDgtbPIxvP6C4UCn1Q_JtgZKJy4';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let state = {
    convidados: [],
    tarefas: [],
    inventario: []
};

// --- NAVEGAÇÃO ---
function showTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
    document.getElementById('page-title').textContent = element.textContent.trim();
}

// --- BANCO DE DADOS (LOAD/SAVE) ---
async function loadData() {
    const { data, error } = await _supabase
        .from('wedding_data')
        .select('state')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();

    if (data) {
        state = data.state;
        updateUI();
    }
}

async function saveData() {
    const { error } = await _supabase
        .from('wedding_data')
        .update({ state: state, updated_at: new Date() })
        .eq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) console.error('Erro ao salvar no banco:', error);
}

// --- FUNÇÕES DE CONVIDADOS ---
async function addGuest() {
    const name = document.getElementById('guest-name');
    const type = document.getElementById('guest-type');
    if (!name.value) return;
    state.convidados.push({ id: Date.now(), nome: name.value, tipo: type.value, peso: type.value === 'adulto' ? 1 : 0.5, conviteEntregue: false });
    name.value = '';
    updateUI();
    await saveData();
}

async function deleteGuest(id) {
    state.convidados = state.convidados.filter(g => g.id !== id);
    updateUI();
    await saveData();
}

async function toggleInvite(id) {
    const guest = state.convidados.find(g => g.id === id);
    if (guest) { 
        guest.conviteEntregue = !guest.conviteEntregue; 
        updateUI(); 
        await saveData();
    }
}

// --- FUNÇÕES DE ORÇAMENTO E SEÇÕES ---
async function addSection() {
    const nome = prompt("Nome da nova seção:");
    if (nome) {
        state.inventario.push({ id: Date.now(), secao: nome, itens: [] });
        updateUI();
        await saveData();
    }
}

async function removeSection(sectionId) {
    if (confirm("Deseja excluir esta seção completa?")) {
        state.inventario = state.inventario.filter(s => s.id !== sectionId);
        updateUI();
        await saveData();
    }
}

async function addItem(sectionId) {
    const nome = prompt("Nome do item:");
    if (!nome) return;
    const preco = parseFloat(prompt("Valor unitário/total:")) || 0;
    const tipo = confirm("Calcular por número de convidados?") ? "por_convidado" : "fixo";
    
    const section = state.inventario.find(s => s.id === sectionId);
    section.itens.push({ id: Date.now(), nome: nome, preco: preco, pago: 0, tipo: tipo, mult: 1 });
    updateUI();
    await saveData();
}

async function removeItem(sectionId, itemId) {
    const section = state.inventario.find(s => s.id === sectionId);
    section.itens = section.itens.filter(i => i.id !== itemId);
    updateUI();
    await saveData();
}

async function updatePrice(itemId, val) {
    findItem(itemId).preco = parseFloat(val) || 0;
    updateUI();
    await saveData();
}

async function updatePaid(itemId, val) {
    findItem(itemId).pago = parseFloat(val) || 0;
    updateUI();
    await saveData();
}

function findItem(id) {
    for (let s of state.inventario) {
        let item = s.itens.find(i => i.id === id);
        if (item) return item;
    }
}

// --- TAREFAS ---
async function addTask() {
    const input = document.getElementById('task-name');
    if (!input.value) return;
    state.tarefas.push({ id: Date.now(), texto: input.value, pronta: false });
    input.value = '';
    updateUI();
    await saveData();
}

async function toggleTask(id) {
    const task = state.tarefas.find(t => t.id === id);
    task.pronta = !task.pronta;
    updateUI();
    await saveData();
}

// --- RENDERIZAÇÃO ---
function updateUI() {
    const totalEquiv = state.convidados.reduce((acc, g) => acc + g.peso, 0);
    const totalConvidados = state.convidados.length;
    let totalGeral = 0;
    let totalPago = 0;

    // Convidados
    document.getElementById('guest-list').innerHTML = state.convidados.map(g => `
        <div class="item-card">
            <div><strong>${g.nome}</strong><br><small>${g.tipo}</small></div>
            <button onclick="deleteGuest(${g.id})" class="btn-delete-item">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
    `).join('');

    // Convites
    const entregues = state.convidados.filter(g => g.conviteEntregue).length;
    document.getElementById('convite-progress-bar').style.width = `${(entregues/totalConvidados)*100 || 0}%`;
    document.getElementById('convite-stats').textContent = `${entregues} / ${totalConvidados}`;
    document.getElementById('invite-list').innerHTML = state.convidados.map(g => `
        <div class="item-card">
            <span>${g.nome}</span>
            <button class="btn-primary" onclick="toggleInvite(${g.id})" style="background:${g.conviteEntregue ? 'var(--success)' : '#ccc'}">
                ${g.conviteEntregue ? 'Entregue' : 'Marcar'}
            </button>
        </div>
    `).join('');

    // Orçamento & Pagamentos
    let orcHTML = ""; let pagHTML = "";
    state.inventario.forEach(secao => {
        let rowsOrc = ""; let rowsPag = "";
        secao.itens.forEach(item => {
            const qtd = item.tipo === "por_convidado" ? Math.ceil(totalEquiv * item.mult) : item.mult;
            const sub = qtd * item.preco;
            totalGeral += sub; totalPago += item.pago;
            
            rowsOrc += `
                <div class="budget-row">
                    <input type="text" value="${item.nome}" onchange="findItem(${item.id}).nome = this.value; saveData()">
                    <input type="number" value="${item.preco}" onchange="updatePrice(${item.id}, this.value)">
                    <span>Qtd: ${qtd}</span>
                    <strong>R$ ${sub.toFixed(2)}</strong>
                    <button onclick="removeItem(${secao.id}, ${item.id})" class="btn-delete-item"><i data-lucide="x"></i></button>
                </div>`;
            
            rowsPag += `
                <div class="budget-row">
                    <span>${item.nome}</span>
                    <span>R$ ${sub.toFixed(2)}</span>
                    <input type="number" value="${item.pago}" onchange="updatePaid(${item.id}, this.value)">
                    <span style="color:${sub-item.pago > 0 ? 'var(--danger)' : 'var(--success)'}">Falta: R$ ${(sub-item.pago).toFixed(2)}</span>
                    <span></span>
                </div>`;
        });

        orcHTML += `
            <div class="budget-section">
                <div class="section-header">
                    <h3>${secao.secao}</h3>
                    <div>
                        <button onclick="addItem(${secao.id})" class="btn-primary" style="padding:5px 10px; font-size:0.8rem">Item</button>
                        <button onclick="removeSection(${secao.id})" class="btn-delete-item" style="margin-left:5px"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
                <div class="budget-table">${rowsOrc}</div>
            </div>`;
        
        pagHTML += `
            <div class="budget-section">
                <h3>${secao.secao}</h3>
                <div class="budget-table">${rowsPag}</div>
            </div>`;
    });

    document.getElementById('secoes-orcamento').innerHTML = orcHTML;
    document.getElementById('lista-pagamentos').innerHTML = pagHTML;

    // Tarefas
    document.getElementById('task-list').innerHTML = state.tarefas.map(t => `
        <div class="item-card">
            <div style="display:flex; gap:10px; align-items:center">
                <input type="checkbox" ${t.pronta ? 'checked' : ''} onchange="toggleTask(${t.id})">
                <span style="${t.pronta ? 'text-decoration:line-through; color:var(--text-muted)' : ''}">${t.texto}</span>
            </div>
        </div>
    `).join('');

    document.getElementById('dash-orcamento').textContent = `R$ ${totalGeral.toLocaleString('pt-BR')}`;
    document.getElementById('dash-pago').textContent = `R$ ${totalPago.toLocaleString('pt-BR')}`;

    lucide.createIcons();
}

function exportToCSV() {
    alert("Planilha gerada com sucesso!");
}

// Inicia o sistema carregando do banco

loadData();
