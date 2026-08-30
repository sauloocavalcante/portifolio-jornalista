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

const urlParams = new URLSearchParams(window.location.search);
const tipo = urlParams.get('tipo') || 'materias';
const nomeArquivo = urlParams.get('arquivo');

function validarTipo(tipoInformado) {
    return typeof tipoInformado === 'string' && TIPOS_PERMITIDOS.includes(tipoInformado);
}

function normalizarValorCampo(valor) {
    if (!valor) return '';
    return String(valor).replace(/^['"]|['"]$/g, '').trim();
}

function removerFrontmatter(conteudoMd) {
    return conteudoMd.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '').trim();
}

function extrairMetadata(conteudoMd) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
    const match = conteudoMd.match(frontmatterRegex);
    const metadata = {
        titulo: 'Sem título',
        data: '2024-01-01',
        resumo: '',
        imagem: '',
        link: ''
    };

    if (!match) return metadata;

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

    return metadata;
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

function normalizarArquivo(nomeArquivo) {
    if (!nomeArquivo) return '';
    return nomeArquivo.replace(/\.md$/i, '');
}

function escapeHtml(valor) {
    return String(valor || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function processarMarkdown(mdTexto) {
    const textoLimpo = removerFrontmatter(mdTexto);
    if (typeof window.marked !== 'undefined') {
        const html = window.marked.parse(textoLimpo, {
            breaks: true,
            gfm: true,
            headerIds: false
        });
        if (window.DOMPurify) {
            return window.DOMPurify.sanitize(html);
        }
        return html;
    }

    return `<p>${escapeHtml(textoLimpo).replace(/\n/g, '<br>')}</p>`;
}

function atualizarMetaDescricao(descricao) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
    }
    meta.content = descricao;
}

async function carregarConteudo() {
    const container = document.getElementById('materia-completa');

    if (!container) return;

    if (!validarTipo(tipo)) {
        container.innerHTML = '<p>Categoria de conteúdo inválida.</p>';
        return;
    }

    if (!nomeArquivo) {
        container.innerHTML = '<p>Conteúdo não encontrado.</p>';
        return;
    }

    try {
        const arquivoNome = normalizarArquivo(nomeArquivo);
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPOSITORIO}/contents/${SITE_CONFIG.baseConteudosPath}/${tipo}/${arquivoNome}.md?ref=${BRANCH}`;
        const resposta = await fetch(url);

        if (!resposta.ok) {
            if (resposta.status === 404) {
                container.innerHTML = '<p>Conteúdo não encontrado.</p>';
                return;
            }
            throw new Error(`Conteúdo não encontrado: ${resposta.status}`);
        }

        const arquivo = await resposta.json();
        const conteudoBase64 = arquivo.content || '';
        const decodificado = atob(conteudoBase64.replace(/\s/g, ''));
        const texto = decodeURIComponent(escape(decodificado));
        const metadata = extrairMetadata(texto);
        const conteudoHtml = processarMarkdown(texto);

        document.title = `${metadata.titulo} - Portfólio Jornalístico`;
        const tituloPagina = document.getElementById('titulo-pagina');
        if (tituloPagina) {
            tituloPagina.textContent = metadata.titulo;
        }

        atualizarMetaDescricao(metadata.resumo || `Leitura de ${metadata.titulo}.`);

        const imagemHtml = metadata.imagem
            ? `<img src="${metadata.imagem}" alt="${escapeHtml(metadata.titulo)}">`
            : '';

        const botaoExterno = metadata.link
            ? `<p class="link-externo-aviso"><a href="${metadata.link}" target="_blank" rel="noopener noreferrer">Leia a matéria completa no site original →</a></p>`
            : '';

        container.innerHTML = `
            <h1>${escapeHtml(metadata.titulo)}</h1>
            <div class="data-materia">${formatarData(metadata.data)}</div>
            ${imagemHtml}
            ${botaoExterno}
            <div class="conteudo-materia">${conteudoHtml}</div>
        `;
    } catch (erro) {
        console.error('Erro ao carregar conteúdo:', erro);
        container.innerHTML = '<p>Erro ao carregar conteúdo. Verifique se o arquivo existe ou se a categoria está correta.</p>';
    }
}

window.carregarConteudo = carregarConteudo;
carregarConteudo();