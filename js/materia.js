// Pega o nome do arquivo da URL
const urlParams = new URLSearchParams(window.location.search);
const nomeArquivo = urlParams.get('arquivo');

const GITHUB_USERNAME = 'sauloocavalcante';
const REPOSITORIO = 'portifolio-jornalista';
const BRANCH = 'main';

async function carregarMateria() {
    if (!nomeArquivo) {
        document.getElementById('materia-completa').innerHTML = '<p>Matéria não encontrada.</p>';
        return;
    }
    
    try {
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPOSITORIO}/contents/materias/${nomeArquivo}?ref=${BRANCH}`;
        const resposta = await fetch(url);
        const arquivo = await resposta.json();
        const conteudo = decodeURIComponent(escape(atob(arquivo.content.replace(/\n/g, ''))));
        
        // Extrai metadata e conteúdo
        const { metadata, conteudoHtml } = processarMarkdown(conteudo);
        
        // Atualiza título da página
        document.title = `${metadata.titulo} - Portfólio Jornalístico`;
        document.getElementById('titulo-pagina').textContent = metadata.titulo;
        
        // Renderiza matéria
        const html = `
            <h1>${metadata.titulo}</h1>
            <div class="data-materia">${formatarData(metadata.data)}</div>
            ${metadata.imagem ? `<img src="${metadata.imagem}" alt="${metadata.titulo}">` : ''}
            <div class="conteudo-materia">
                ${conteudoHtml}
            </div>
        `;
        
        document.getElementById('materia-completa').innerHTML = html;
        
    } catch (erro) {
        console.error('Erro ao carregar matéria:', erro);
        document.getElementById('materia-completa').innerHTML = '<p>Erro ao carregar matéria.</p>';
    }
}

function processarMarkdown(mdTexto) {
    // Remove frontmatter
    const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
    let conteudo = mdTexto.replace(frontmatterRegex, '');
    
    // Extrai metadata novamente (reaproveita função do main.js)
    const frontmatterMatch = mdTexto.match(/^---\n([\s\S]*?)\n---/);
    let metadata = {
        titulo: 'Sem título',
        data: '2024-01-01',
        resumo: '',
        imagem: ''
    };
    
    if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const tituloMatch = frontmatter.match(/titulo:\s*(.+)/);
        const dataMatch = frontmatter.match(/data:\s*(.+)/);
        const resumoMatch = frontmatter.match(/resumo:\s*(.+)/);
        const imagemMatch = frontmatter.match(/imagem:\s*(.+)/);
        
        if (tituloMatch) metadata.titulo = tituloMatch[1];
        if (dataMatch) metadata.data = dataMatch[1];
        if (resumoMatch) metadata.resumo = resumoMatch[1];
        if (imagemMatch) metadata.imagem = imagemMatch[1];
    }
    
    // Converte Markdown básico para HTML
    let html = conteudo;    
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    html = html.replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^\- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');
    
    return { metadata, conteudoHtml: html };
}

function formatarData(dataString) {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

carregarMateria();