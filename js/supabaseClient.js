import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

/**
 * Inicializa a ponte do Cliente do Supabase com as Chaves Providas na Configuração.
 * Este cliente lidará com o Networking WebSocket/HTTP REST.
 */
const supabaseUrl = 'https://wmgsdgtqbssjbgmmcomr.supabase.co'
const supabaseKey = 'sb_publishable_Yx7nLJpymzqw3rAds7c9Qg_nwS-D_h4'

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Retorna a sessão ativa no momento atual do navegador LocalStorage do Supabase,
 * extraindo o usuário logado para validar integridade de páginas fechadas.
 * 
 * @returns {object|null} Objeto da sessão retornado ou vazio em caso de anônimo.
 */
export async function checkSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return session
}

/**
 * Middleware para Proteger Páginas:
 * Valida rigorosamente se há um usuário conectado, caso contrário, abortamos a execução e 
 * redirecionamos o usuário compulsoriamente para o 'login.html'.
 * 
 * @returns {object|null} Dados seguros do usuário (`user`)
 */
export async function requireAuth() {
  const session = await checkSession()
  if (!session) {
    window.location.href = 'login.html'
    return null
  }
  return session.user
}

/**
 * Busca os dados extras de Perfil (Profile) na tabela pública (nome, cargo: student/educator).
 * Permite separar as restrições que cada pessoa irá executar (Acesso Diferencial).
 * 
 * @param {string} userId - O UUID retornado dinamicamente pelo Auth principal.
 * @returns {object|null} O registro da Tabela SQL atrelado ao usuário.
 */
export async function getUserProfile(userId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error("Erro drástico ao buscar perfil SQL Database:", error.message)
    return null
  }
  return profile
}

/**
 * Desconecta a sessão atual, quebrando o cachê e os tokens autoritativos e 
 * volta de forma limpa para a página de Autenticação/Login.
 */
export async function logout() {
  await supabase.auth.signOut()
  window.location.href = 'login.html'
}
