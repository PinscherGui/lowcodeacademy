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
    const btn = e.target.querySelector('button');
    
    btn.disabled = true;
    btn.textContent = 'Computando Transação...';
    
    // Operação do DB (Equivalente ao `INSERT INTO requests (...)`)
    const { error } = await supabase.from('requests').insert([
        { user_id: currentUser.id, title: title, description: desc }
    ]);
    
    if (error) {
        alert("Erro no envio do formulário: " + error.message);
    } else {
        document.getElementById('new-req-form').reset();
        await loadRequests(); // Regenera a interface da tabela dinamicamente abaixo!
    }
    
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
    
    // Select SQL Abstrato ordenado decrescente em base do DateTime default
    const { data: requests, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });
        
    // Exibição de UI de falha ou "No Content"
    if (error) { 
        list.innerHTML = `<p class="alert alert-error" style="display:block">${error.message}</p>`; 
        return; 
    }
    if (requests.length === 0) { 
        list.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem;">As suas requisições surgirão listadas aqui.</p>'; 
        return; 
    }
    
    // Parser iterador DOM de Elementos para cada linha retornada
    list.innerHTML = '';
    requests.forEach(r => {
        // Aloca badges condicionalmente na string de template
        const badgeClass = r.status === 'Pendente' ? 'status-pendente' : (r.status === 'Em análise' ? 'status-analise' : 'status-concluida');
        const dateStr = new Date(r.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute:'2-digit' });
        
        // SECURITY SHIELD: Previne XSS (Cross Site Scripting) escapando a Entrada Nativa antes de Injetar HTML
        const safeTitle = escapeHTML(r.title);
        const safeDesc = escapeHTML(r.description);

        list.innerHTML += `
            <div class="request-card">
                <div class="request-content" style="width: 100%;">
                    <div class="d-flex justify-between align-center mb-2">
                        <h3 style="margin: 0">${safeTitle}</h3>
                        <span class="status-badge ${badgeClass}">${r.status}</span>
                    </div>
                    <p>${safeDesc}</p>
                    <div class="request-meta">
                        <span>🗓️ ${dateStr}</span>
                    </div>
                </div>
            </div>
        `;
    });
}

// Escuta a macro dom event loading completion tree
document.addEventListener('DOMContentLoaded', init);
