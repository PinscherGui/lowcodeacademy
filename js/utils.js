/**
 * UTILITÁRIOS GLOBAIS
 * Seguindo o princípio de Responsabilidade Única (Clean Code), funções de 
 * purificação e UI Genéricas residem aqui.
 */

/**
 * Mitigação Primária contra Injeção de Código (DOM XSS / HTML Injection).
 * Converte caracteres especiais em entidades HTML seguras.
 * Fundamental para processar os Títulos e Descrições inseridos por Estudantes.
 * 
 * @param {string} str Array de caracteres potencialmente maliciosos.
 * @returns {string} String purificada e selada contra o Runtime do Browser.
 */
export function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

/**
 * Skeleton Loader - Micro-interação UX/UI
 * Retorna blocos animados cinzas espaciais para melhorar a percepção psicológica de espera.
 * 
 * @returns {string} Snippet HTML dos skeletons.
 */
export function renderSkeletonLoader() {
    return `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="skeleton-box" style="height: 120px;"></div>
            <div class="skeleton-box" style="height: 120px;"></div>
        </div>
    `;
}
