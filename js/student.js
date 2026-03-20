import { supabase, requireAuth, getUserProfile, logout } from './supabaseClient.js';
import { escapeHTML, renderSkeletonLoader } from './utils.js';

let currentUser = null;

/**
 * Bootstraps initial Student State
 * Puxa dependências de autenticação, garante escopo rigoroso e vincula eventos ao DOM
 */
async function init() {
    // Retorna vazio caso não aja assinatura, redirecionamento tratado internamente.
    currentUser = await requireAuth();
    if (!currentUser) return;
    
    // Impede falhas de acesso isolando "Estudantes" vs "Educadores" da URL direta (Forced Route Guardian)
    const profile = await getUserProfile(currentUser.id);
    if (!profile || profile.role !== 'student') {
        window.location.href = 'dashboard_educator.html';
        return;
    }

    // Configura Nomes Dinâmicos
    document.getElementById('user-name').textContent = `Olá, ${profile.name}`;
    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('new-req-form').addEventListener('submit', createRequest);
    
    // Dá pull imediato das tabelas de listagem
    loadRequests();
}

/**
 * Empacota o formulário da página do aluno, acopla a ID pessoal 
 * e faz a requisição Insert para a Infraestrutura do DB com valor de entrada pendencial.
 */
async function createRequest(e) {
    e.preventDefault();
    const title = document.getElementById('req-title').value;
    const desc = document.getElementById('req-desc').value;
    const category = document.getElementById('req-category').value;
    const btn = e.target.querySelector('button');
    
    btn.disabled = true;
    btn.innerText = 'Enviando ao servidor...';
    
    // Inserção em Requests (agora com Categoria)
    const { data: reqData, error: reqError } = await supabase
        .from('requests')
        .insert([{ user_id: currentUser.id, title: title, description: desc, category: category }])
        .select();
        
    if (reqError) {
        alert(reqError.message, 'error'); // Assuming showAlert is defined elsewhere, using alert for now.
        btn.disabled = false;
        btn.innerText = 'Enviar Solicitação';
        return;
    }
    
    // Dispara Evento Gênesis na Timeline
    const newReqId = reqData[0].id;
    const studentName = (currentUser.user_metadata && currentUser.user_metadata.name) ? currentUser.user_metadata.name : 'Estudante';
    
    await supabase.from('request_history').insert([{
        request_id: newReqId,
        actor_name: studentName,
        action: 'Solicitação Criada Pelo Aluno',
        comment: desc
    }]);

    alert('Sua solicitação protocolou com sucesso.', 'success'); // Assuming showAlert is defined elsewhere, using alert for now.
    document.getElementById('new-req-form').reset();
    await loadRequests(); // Regenera a interface da tabela dinamicamente abaixo!
    
    btn.disabled = false;
    btn.textContent = 'Enviar Solicitação';
}

/**
 * Puxa as tabelas do Histórico via Polling (Fetch).
 * Graças a regra de banco `auth.uid() = user_id`, a API do Supabase JAMAIS retornará 
 * solicitações de outro colega, sem nem precisar pedir WHERE id = current_user.
 */
async function loadRequests() {
    const list = document.getElementById('req-list');
    // UI/UX Pattern: Empregamos Skeleton Loading em vez de texto bruto
    list.innerHTML = renderSkeletonLoader();
    
    // Select SQL com Deep Join para as Timelines
    const { data: requests, error } = await supabase
        .from('requests')
        .select(`
            id, title, description, status, category, created_at,
            request_history ( action, actor_name, comment, created_at )
        `)
        .order('created_at', { ascending: false });
        
    // Exibição de UI de falha ou "No Content"
    if (error) { 
        list.innerHTML = `<p class="alert alert-error" style="display:block">${error.message}</p>`; 
        return; 
    }
    if (!requests || requests.length === 0) { 
        list.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem;">As suas requisições surgirão listadas aqui.</p>'; 
        return; 
    }
    
    // Parser iterador DOM de Elementos
    list.innerHTML = '';
    requests.forEach(r => {
        const badgeClass = r.status === 'Pendente' ? 'status-pendente' : (r.status === 'Em análise' ? 'status-analise' : 'status-concluida');
        const safeTitle = escapeHTML(r.title);
        const safeCategory = escapeHTML(r.category || 'Outros Assuntos');

        // Renderiza a Timeline Relacional extraíndo os Arrays Aninhados do JSON Supabase
        let historyHtml = '';
        if (r.request_history && r.request_history.length > 0) {
            // Ordenando Cronologicamente Ascendente
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

        list.innerHTML += `
            <div class="request-card" style="flex-direction: column;">
                <div style="background: rgba(30, 41, 59, 0.4); padding: 1rem; border-radius: 8px;">
                    <div class="d-flex justify-between align-center mb-2">
                        <h3 style="margin: 0">${safeTitle} <br/><span style="font-size: 0.8rem; font-weight: normal; opacity: 0.7; color: var(--primary-color)">[Categoria: ${safeCategory}]</span></h3>
                        <span class="status-badge ${badgeClass}">${r.status}</span>
                    </div>
                </div>
                
                <div class="timeline-container">
                    ${historyHtml}
                </div>
            </div>
        `;
    });
}

// Escuta a macro dom event loading completion tree
document.addEventListener('DOMContentLoaded', init);
