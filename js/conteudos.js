const CONFIG = window.SITE_CONFIG || {
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

const GITHUB_USERNAME = CONFIG.githubUsername;
const REPOSITORIO = CONFIG.repositorio;
const BRANCH = CONFIG.branch;
const TIPOS_PERMITIDOS = CONFIG.tiposPermitidos;

function normalizarArquivoNome(nomeArquivo) {
    return String(nomeArquivo || '').replace(/\.md$/i, '');
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
        arquivo: normalizarArquivoNome(nomeArquivo),
        temConteudoInterno: body.length > 0
    };

    if (!match) return metadata;

    const frontmatter = match[1];
    const tituloMatch = frontmatter.match(/titulo:\s*(.+)/i);
    const dataMatch = frontmatter.match(/data:\s*(.+)/i);
    const resumoMatch = frontmatter.match(/resumo:\s*(.+)/i);
    const imagemMatch = frontmatter.match(/imagem:\s*(.+)/i);
    const linkMatch = frontmatter.match(/link:\s*(.+)/i);

    if (tituloMatch) metadata.titulo = String(tituloMatch[1]).replace(/^['"]|['"]$/g, '').trim();
    if (dataMatch) metadata.data = String(dataMatch[1]).replace(/^['"]|['"]$/g, '').trim();
    if (resumoMatch) metadata.resumo = String(resumoMatch[1]).replace(/^['"]|['"]$/g, '').trim();
    if (imagemMatch) metadata.imagem = String(imagemMatch[1]).replace(/^['"]|['"]$/g, '').trim();
    if (linkMatch) metadata.link = String(linkMatch[1]).replace(/^['"]|['"]$/g, '').trim();

    return metadata;
}

function inferirTipoDaPagina() {
    const partes = window.location.pathname.split('/').filter(Boolean);
    const potencialTipo = partes[partes.length - 1];
    return TIPOS_PERMITIDOS.includes(potencialTipo) ? potencialTipo : null;
}

function rotuloVazio(tipo) {
    const rótulos = {
        materias: 'matéria',
        reportagens: 'reportagem',
        'artigos-opiniao': 'artigo de opinião',
        resenhas: 'resenha'
    };

    return rótulos[tipo] || (CONFIG.labels[tipo] || tipo).toLowerCase();
}

function renderizarCard(conteudo, tipo) {
    const arquivo = normalizarArquivoNome(conteudo.arquivo || conteudo.name);
    const url = `../../materia.html?tipo=${encodeURIComponent(tipo)}&arquivo=${encodeURIComponent(arquivo)}`;
    const imagem = conteudo.imagem
        ? `<img src="${conteudo.imagem}" class="card-imagem" alt="${conteudo.titulo}">`
        : '<div class="card-imagem" style="background:linear-gradient(135deg, #e8ddf5, #d4c5e8)"></div>';

    return `
        <a class="card-materia" href="${url}" aria-label="Abrir ${conteudo.titulo}">
            ${imagem}
            <div class="card-conteudo">
                <div class="card-meta">
                    <span class="card-tag">${CONFIG.labels[tipo]}</span>
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

async function carregarCategoria(tipo) {
    const container = document.getElementById('lista-conteudos');
    if (!container) return;

    if (!TIPOS_PERMITIDOS.includes(tipo)) {
        container.innerHTML = '<p>Categoria não encontrada.</p>';
        return;
    }

    try {
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPOSITORIO}/contents/${CONFIG.baseConteudosPath}/${tipo}?ref=${BRANCH}`;
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

        const itens = await Promise.all(
            arquivosMd.map(async (arquivo) => {
                const respostaConteudo = await fetch(arquivo.download_url);
                const texto = await respostaConteudo.text();
                const metadata = extrairMetadata(texto, arquivo.name);
                return {
                    ...metadata,
                    arquivo: arquivo.name,
                    tipo
                };
            })
        );

        itens.sort((a, b) => new Date(b.data || '2024-01-01') - new Date(a.data || '2024-01-01'));
        container.innerHTML = itens.map(item => renderizarCard(item, tipo)).join('');
    } catch (erro) {
        console.error('Erro ao carregar categoria:', erro);
        container.innerHTML = '<p>Erro ao carregar categoria. Tente novamente mais tarde.</p>';
    }
}

const tipoPagina = inferirTipoDaPagina();
if (tipoPagina) {
    carregarCategoria(tipoPagina);
}

window.carregarCategoria = carregarCategoria;