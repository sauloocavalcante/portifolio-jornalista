const SITE_CONFIG = window.SITE_CONFIG || {
    githubUsername: 'sauloocavalcante',
    repositorio: 'portifolio-jornalista',
    branch: 'main',
    tiposPermitidos: ['materias', 'reportagens', 'artigos-opiniao', 'resenhas'],
    labels: {
        materias: 'Matérias',
        reportagens: 'Reportagens',
        'artigos-opiniao': 'Artigos de opinião',
        resenhas: 'Resenhas'
    },
    baseConteudosPath: 'conteudos'
};

const GITHUB_USERNAME = SITE_CONFIG.githubUsername;
const REPOSITORIO = SITE_CONFIG.repositorio;
const BRANCH = SITE_CONFIG.branch;
const TIPOS_PERMITIDOS = SITE_CONFIG.tiposPermitidos;

function validarTipo(tipo) {
    return typeof tipo === 'string' && TIPOS_PERMITIDOS.includes(tipo);
}

function rotuloVazio(tipo) {
    const rótulos = {
        materias: 'matéria',
        reportagens: 'reportagem',
        'artigos-opiniao': 'artigo de opinião',
        resenhas: 'resenha'
    };

    return rótulos[tipo] || (SITE_CONFIG.labels[tipo] || tipo).toLowerCase();
}

function normalizarArquivoUrl(nomeArquivo) {
    if (!nomeArquivo) return '';
    return nomeArquivo.replace(/\.md$/i, '');
}

function normalizarValorCampo(valor) {
    if (!valor) return '';
    return String(valor).replace(/^['"]|['"]$/g, '').trim();
}

function formatarData(dataString) {
    if (!dataString) return 'Data indisponível';

    const valor = String(dataString).trim();
    const data = new Date(/^-?\d{4}-\d{2}-\d{2}$/.test(valor) ? `${valor}T12:00:00` : valor);

    if (Number.isNaN(data.getTime())) {
        return valor;
    }

    return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function extrairMetadata(conteudoMd, nomeArquivo) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
    const match = conteudoMd.match(frontmatterRegex);
    const body = conteudoMd.replace(frontmatterRegex, '').trim();

    const metadata = {
        titulo: 'Sem título',
        data: '2024-01-01',
        resumo: 'Sem resumo',
        imagem: '',
        link: '',
        arquivo: normalizarArquivoUrl(nomeArquivo),
        temConteudoInterno: body.length > 0,
        tipo: 'materias'
    };

    if (match) {
        const frontmatter = match[1];
        const tituloMatch = frontmatter.match(/titulo:\s*(.+)/i);
        const dataMatch = frontmatter.match(/data:\s*(.+)/i);
        const resumoMatch = frontmatter.match(/resumo:\s*(.+)/i);
        const imagemMatch = frontmatter.match(/imagem:\s*(.+)/i);
        const linkMatch = frontmatter.match(/link:\s*(.+)/i);

        if (tituloMatch) metadata.titulo = normalizarValorCampo(tituloMatch[1]);
        if (dataMatch) metadata.data = normalizarValorCampo(dataMatch[1]);
        if (resumoMatch) metadata.resumo = normalizarValorCampo(resumoMatch[1]);
        if (imagemMatch) metadata.imagem = normalizarValorCampo(imagemMatch[1]);
        if (linkMatch) metadata.link = normalizarValorCampo(linkMatch[1]);
    }

    return metadata;
}

function construirUrlConteudo(tipo, nomeArquivo) {
    const arquivo = normalizarArquivoUrl(nomeArquivo);
    return `materia.html?tipo=${encodeURIComponent(tipo)}&arquivo=${encodeURIComponent(arquivo)}`;
}

function renderizarCard(conteudo, tipo) {
    const arquivo = normalizarArquivoUrl(conteudo.arquivo || conteudo.name);
    const url = construirUrlConteudo(tipo, arquivo);
    const imagem = conteudo.imagem ? `<img src="${conteudo.imagem}" class="card-imagem" alt="${conteudo.titulo}">` : '<div class="card-imagem" style="background:linear-gradient(135deg, #e8ddf5, #d4c5e8)"></div>';

    return `
        <a class="card-materia" href="${url}" aria-label="Abrir ${conteudo.titulo}">
            ${imagem}
            <div class="card-conteudo">
                <div class="card-meta">
                    <span class="card-tag">${SITE_CONFIG.labels[tipo] || tipo}</span>
                    ${conteudo.link ? '<span class="card-tag externo">Externo</span>' : ''}
                </div>
                <h3 class="card-titulo">${conteudo.titulo}</h3>
                <div class="card-data">${formatarData(conteudo.data)}</div>
                <p class="card-resumo">${conteudo.resumo}</p>
                <span class="card-link">Ler conteúdo completo →</span>
            </div>
        </a>
    `;
}

async function carregarConteudos(tipo = 'materias', containerId = 'lista-materias') {
    const container = document.getElementById(containerId);

    if (!container) return;

    if (!validarTipo(tipo)) {
        container.innerHTML = '<p>Categoria não encontrada.</p>';
        return;
    }

    try {
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPOSITORIO}/contents/${SITE_CONFIG.baseConteudosPath}/${tipo}?ref=${BRANCH}`;
        const resposta = await fetch(url);

        if (!resposta.ok) {
            if (resposta.status === 404) {
                container.innerHTML = `<p>Nenhuma ${rotuloVazio(tipo)} publicada ainda.</p>`;
                return;
            }
            throw new Error(`Erro ao buscar ${tipo}: ${resposta.status}`);
        }

        const arquivos = await resposta.json();
        const arquivosMd = Array.isArray(arquivos)
            ? arquivos.filter(arquivo => typeof arquivo.name === 'string' && arquivo.name.toLowerCase().endsWith('.md'))
            : [];

        if (arquivosMd.length === 0) {
            container.innerHTML = `<p>Nenhuma ${rotuloVazio(tipo)} publicada ainda.</p>`;
            return;
        }

        const conteudos = await Promise.all(
            arquivosMd.map(async (arquivo) => {
                const conteudoResposta = await fetch(arquivo.download_url);
                const conteudo = await conteudoResposta.text();
                const metadata = extrairMetadata(conteudo, arquivo.name);
                return {
                    ...metadata,
                    arquivo: arquivo.name,
                    tipo
                };
            })
        );

        conteudos.sort((a, b) => new Date(b.data || '2024-01-01') - new Date(a.data || '2024-01-01'));
        container.innerHTML = conteudos.map(conteudo => renderizarCard(conteudo, tipo)).join('');
    } catch (erro) {
        console.error('Erro ao carregar conteúdos:', erro);
        container.innerHTML = '<p>Erro ao carregar conteúdos. Tente novamente mais tarde.</p>';
    }
}

async function carregarMaterias() {
    return carregarConteudos('materias', 'lista-materias');
}

window.carregarConteudos = carregarConteudos;
window.carregarMaterias = carregarMaterias;

if (document.getElementById('lista-materias')) {
    carregarMaterias();
}
