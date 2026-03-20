import { supabase } from './supabaseClient.js';

// Mapeamento e acoplamento (DOM Elements)
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const alertBox = document.getElementById('alert-box');

/**
 * Exibe uma mensagem flutuante de alerta no painel de UI caso aconteça algum êxito/problema.
 * 
 * @param {string} message - O conteúdo do desvio informacional.
 * @param {string} type - 'success', 'error', 'warning' (Classes CSS vinculadas).
 */
function showAlert(message, type = 'error') {
    alertBox.textContent = message;
    alertBox.className = `alert ${type}`;
    alertBox.style.display = 'block';
}

/**
 * Consulta a tabela e encaminha o usuário para a Interface de Aluno ou Interface de Coordenador,
 * dependendo de qual nível (`role`) ele obteve quando se registrou no DB no passado.
 * 
 * @param {string} userId - O ID criptográfico de identificação global do Usuário.
 */
async function redirectUser(userId) {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (error || !profile) {
        // Como o perfil falhou na criação, precisamos destruir essa "sessão-fantasma"
        // para que a pessoa possa criar outra conta ou logar com uma conta válida.
        await supabase.auth.signOut();
        showAlert("Erro: Seu perfil não foi cadastrado no banco de dados. Sessão redefinida. Crie uma nova conta usando outro email.", "error");
        return;
    }

    // Encaminhamento condicional da malha de navegação (Routing em MPA)
    if (profile.role === 'student') window.location.href = 'dashboard_student.html';
    else if (profile.role === 'educator') window.location.href = 'dashboard_educator.html';
}

/**
 * Ao Renderizar o Corpo da aba, auto analisa o estado do JWT Storage do Supabase Auth.
 * Se bater positivo, auto-realiza o tráfego evitando preencher as caixas novamente.
 */
window.onload = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        redirectUser(session.user.id);
    }
};

/**
 * Controlador de Submissão Lógica: EVENTO ENTER/SUBMIT DE LOGIN
 */
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Feedback visual para o clique
    btnLogin.disabled = true;
    btnLogin.textContent = 'Autenticando na Cloud...';

    // Despacha as credenciais de login para a Auth Network
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        let msg = error.message;
        // Tradução customizada de excessões
        if (msg.includes('Invalid login credentials')) msg = "Credenciais incorretas ou não cadastradas.";
        
        showAlert(msg, 'error');
        btnLogin.disabled = false;
        btnLogin.textContent = 'Acessar Portal';
    } else if (data.user) {
        showAlert("Conexão estabelecida com sucesso! Desviando tráfego...", 'success');
        redirectUser(data.user.id);
    }
});

/**
 * Controlador de Submissão Lógica: EVENTO REGISTRO SUPERIOR NOVO ESTUDANTE/EDUCADOR
 */
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    
    // Trava para evitar Dual-Clicking Spam
    btnRegister.disabled = true;
    btnRegister.textContent = 'Criando registro master...';

    // 1. Cria a entidade no módulo Auth restrito.
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
    });

    if (error) {
        showAlert(error.message, 'error');
        btnRegister.disabled = false;
        btnRegister.textContent = 'Cadastrar e Entrar';
        return;
    }

    if (data.user) {
        const authUser = data.user;
        
        // 2. Transfere a Primary Key referenciável junto aos perfis e o "Caminho Administrativo / Cargo" selecionado.
        const { error: profileError } = await supabase.from('profiles').insert([
            { id: authUser.id, name: name, role: role } // Removido o insert de email, que não existe na sua tabela SQL.
        ]);

        if (profileError) {
            console.error(profileError);
            showAlert("Sua conta de Auth existe, porém o insert lógico deu erro no Database.", 'warning');
        } else {
            showAlert("Cadastro finalizado em duas camadas no sistema! Bem vindo.", 'success');
            setTimeout(() => redirectUser(authUser.id), 1100);
        }
    } else {
        // Fallback que ocorre caso a política do Supabase obrigue o aluno a confirmar via Inbox SMTP de E-mails
        showAlert("Verifique o E-Mail na caixa de entrada para autorizar acesso.", 'success');
    }
    
    btnRegister.disabled = false;
    btnRegister.textContent = 'Cadastrar e Entrar';
});
