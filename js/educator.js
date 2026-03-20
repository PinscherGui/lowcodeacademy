import { supabase, requireAuth, getUserProfile, logout } from './supabaseClient.js';
import { escapeHTML, renderSkeletonLoader } from './utils.js';

let currentUser = null;

/**
 * Inicializador da Janela do Educativo
 * Confere credenciais e bloqueia acessos indevidos pelo "cargo" restrito configurado no DB.
 */
async function init() {
    currentUser = await requireAuth();
    if (!currentUser) return;
    
    const profile = await getUserProfile(currentUser.id);
    if (!profile || profile.role !== 'educator') {
        window.location.href = 'dashboard_student.html';
        return; // Early bailout fallback caso mexam no cache
    }

    document.getElementById('user-name').textContent = `Olá, ${profile.name}`;
    document.getElementById('btn-logout').addEventListener('click', logout);
    
    // Anexa as lógicas explicitamente no contexto local Root Global (Window)
    // Motivo: Os elementos formados via `<select onChange="X()">` são injetados em string raw,
    // necessitando de alcance global na árvore do namespace JS.
    window.updateStatus = updateStatus;
    window.loadAllRequests = loadAllRequests;
    
    loadAllRequests();
}

/**
 * Algoritmo da Pranchêta do Diretor / Analista.
 * Faz varredura e colhe Todas As Linhas criadas sem restrição em `public.requests`,
 * fazendo um Auto-Join interativo com a constraint UUID do perfil para acoplar o Campo 'Nome'.
 */
async function loadAllRequests() {
    const list = document.getElementById('all-req-list');
    // UI/UX Pattern: Empregamos Skeleton Loading em vez de texto bruto
    list.innerHTML = renderSkeletonLoader();
    
    // O recurso "profiles(name)" do querybuilder abaixo informa pra API do Supabase
    // resolver a chave estrangeira (ForeignKey) em O(1) e aninhar o objeto ali mesmo.
    const { data: requests, error } = await supabase
        .from('requests')
        .select(`
            id, title, description, status, created_at,
            profiles(name)
        `)
        .order('created_at', { ascending: false });
        
    // Fallbacks
    if (error) { 
        list.innerHTML = `<p class="alert alert-error" style="display:block">${error.message}</p>`; 
        return; 
    }
    if (!requests || requests.length === 0) { 
        list.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem;">Sem solicitações correntes na mesa.</p>'; 
        return; 
    }
    
    list.innerHTML = '';
    
    // Desenha o Grid Card na tela principal
    requests.forEach(r => {
        // Explode o Join JSON `profiles: { name: "Maria" }` previnindo nulabilidades falsas e vazios
        const studentName = escapeHTML((r.profiles && r.profiles.name) ? r.profiles.name : 'Aluno Desconhecido');
        const dateStr = new Date(r.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute:'2-digit' });
        
        // Define o item focado do 'Select' baseado no atual espelho do Server State
        let pendingSelected = r.status === 'Pendente' ? 'selected' : '';
        let analiseSelected = r.status === 'Em análise' ? 'selected' : '';
        let concluidaSelected = r.status === 'Concluída' ? 'selected' : '';

        // SECURITY SHIELD: Previne XSS Stored Injections. Crucial aqui, pois o educador 
        // lê inputs gerados por outras pessoas.
        const safeTitle = escapeHTML(r.title);
        const safeDesc = escapeHTML(r.description);

        list.innerHTML += `
            <div class="request-card" style="flex-direction: column; gap: 1rem;">
                <div class="d-flex justify-between align-center" style="width: 100%;">
                    <div>
                        <h3 style="margin-bottom: 0.25rem;">${safeTitle}</h3>
                        <div class="text-muted" style="font-size: 0.85rem;">Feito por: <strong style="color:white">${studentName}</strong> • ${dateStr}</div>
                    </div>
                    <div style="display:flex; gap: 0.5rem; align-items: center;">
                        <span style="font-size: 0.85rem; color: var(--text-muted)">Modificar Tarefa:</span>
                        <select onchange="updateStatus('${r.id}', this.value)" style="padding: 0.4rem; font-size: 0.9rem; margin: 0; min-width: 140px; background: rgba(0,0,0,0.5); cursor: pointer">
                            <option value="Pendente" ${pendingSelected}>Pendente</option>
                            <option value="Em análise" ${analiseSelected}>Em análise</option>
                            <option value="Concluída" ${concluidaSelected}>Concluída</option>
                        </select>
                    </div>
                </div>
                <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; width: 100%;">
                    <p style="margin: 0; color: #cbd5e1;">${safeDesc}</p>
                </div>
            </div>
        `;
    });
}

/**
 * Transacionador Unitário da Planilha
 * Conecta-se diretamente pela chave primária (ID) e aplica via REST 'PATCH' (`update()`).
 * 
 * @param {string} reqId String com identificação Hexadecimal da solicitação.
 * @param {string} newStatus Valores explícitos validados da DB constraint enum type.
 */
async function updateStatus(reqId, newStatus) {
    const { error } = await supabase
        .from('requests')
        .update({ status: newStatus })
        .eq('id', reqId);
        
    // Estratégia "Rollback Guiado" -> Notifica pane e repuxa valores estáticos pra destruir as falsas visões da UI.
    if (error) {
        alert("Falha de rede ao alterar a Cloud Data: " + error.message);
        loadAllRequests(); 
    }
}

document.addEventListener('DOMContentLoaded', init);
