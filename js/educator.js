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
            id, title, description, status, category, created_at,
            profiles(name),
            request_history ( action, actor_name, comment, created_at )
        `)
        .order('created_at', { ascending: false });
        
    // Fallbacks
    if (error) { 
        list.innerHTML = `<p class="alert alert-error" style="display:block">${error.message}</p>`; 
        return; 
    }
    if (!requests || requests.length === 0) { 
        list.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem;">Nenhuma solicitação aguardando laudo na mesa.</p>'; 
        return; 
    }
    
    list.innerHTML = '';
    
    // Desenha o Grid Card na tela principal
    requests.forEach(r => {
        // Explodes de relações JSON
        const studentName = escapeHTML((r.profiles && r.profiles.name) ? r.profiles.name : 'Aluno Desconhecido');
        const badgeClass = r.status === 'Pendente' ? 'status-pendente' : (r.status === 'Em análise' ? 'status-analise' : 'status-concluida');
        const safeCategory = escapeHTML(r.category || 'Não categorizado');
        
        // Rendering da Timeline Aninhada
        let historyHtml = '';
        if (r.request_history && r.request_history.length > 0) {
            const sortedHistory = r.request_history.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
            sortedHistory.forEach(h => {
                const hTime = new Date(h.created_at).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short'});
                historyHtml += `
                <div class="timeline-item">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <strong>${escapeHTML(h.action)}</strong>
                        <p class="timeline-date">${hTime} - Por: <strong>${escapeHTML(h.actor_name)}</strong></p>
                        ${h.comment ? `<div class="timeline-comment">${escapeHTML(h.comment)}</div>` : ''}
                    </div>
                </div>`;
            });
        }

        let pendingSelected = r.status === 'Pendente' ? 'selected' : '';
        let analiseSelected = r.status === 'Em análise' ? 'selected' : '';
        let concluidaSelected = r.status === 'Concluída' ? 'selected' : '';

        const safeTitle = escapeHTML(r.title);

        list.innerHTML += `
            <div class="request-card" style="flex-direction: column; gap: 0rem;">
                <div class="d-flex justify-between align-center" style="width: 100%; border-bottom: 2px solid rgba(255,255,255,0.05); padding-bottom:1rem; margin-bottom: 0.5rem">
                    <div>
                        <h3 style="margin-bottom: 0.25rem;">${safeTitle} <span style="font-size:0.8rem; opacity:0.7">(${safeCategory})</span></h3>
                        <div class="text-muted" style="font-size: 0.85rem;">Protocolado Inicialmente por: <strong style="color:white">${studentName}</strong></div>
                    </div>
                    <span class="status-badge ${badgeClass}">${r.status}</span>
                </div>
                
                <div class="timeline-container">
                    ${historyHtml}
                </div>
                
                <div class="educator-action-box" style="margin-top:1.5rem; padding-top:1rem; border-top: 1px dashed rgba(255,255,255,0.2);">
                    <label style="font-size:0.85rem; color:var(--text-muted); font-weight:600">✍️ Emitir Laudo do Atendimento (Opcional):</label>
                    <textarea id="educator-comment-${r.id}" rows="2" style="width:100%; padding:0.8rem; border-radius:8px; background:rgba(0,0,0,0.3); border:1px solid var(--glass-border); color:white; margin: 0.5rem 0;" placeholder="Redija sua mensagem ou adendo que acompanhará a sua alteração de sistema..."></textarea>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
                        <select id="educator-status-${r.id}" style="padding: 0.8rem; font-size: 0.95rem; margin: 0; min-width: 140px; background: rgba(0,0,0,0.5); cursor: pointer; color:white; border-radius:6px; border:1px solid #475569">
                            <option value="Pendente" ${pendingSelected}>Aguardando Tratativa (Pendente)</option>
                            <option value="Em análise" ${analiseSelected}>Verificando com Setores (Em análise)</option>
                            <option value="Concluída" ${concluidaSelected}>Finalizar e Dar Baixa (Concluída)</option>
                        </select>
                        <button class="btn btn-primary" onclick="updateStatus('${r.id}')">Efetivar Modificação de Protocolo</button>
                    </div>
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
document.addEventListener('DOMContentLoaded', init);
