const GITHUB_USERNAME = 'sauloocavalcante';
const REPOSITORIO = 'portifolio-jornalista';
const BRANCH = 'main';

async function carregarMaterias() {
    try {
        // Busca lista de arquivos .md na pasta /materias
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPOSITORIO}/contents/materias?ref=${BRANCH}`;
        const resposta = await fetch(url);
        const arquivos = await resposta.json();
        
        // Filtra só arquivos .md
        const materiasMd = arquivos.filter(arquivo => arquivo.name.endsWith('.md'));
        
        if (materiasMd.length === 0) {
            document.getElementById('lista-materias').innerHTML = '<p>Nenhuma matéria publicada ainda.</p>';
            return;
        }
        
        // Carrega cada matéria e exibe como card
        const materias = await Promise.all(
            materiasMd.map(async (arquivo) => {
                const conteudoResposta = await fetch(arquivo.download_url);
                const conteudo = await conteudoResposta.text();
                return extrairMetadata(conteudo, arquivo.name);
            })
        );
        
        // Ordena por data (mais nova primeiro)
        materias.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        // Renderiza os cards
        const html = materias.map(materia => `
            <div class="card-materia">
                ${materia.imagem ? `<img src="${materia.imagem}" class="card-imagem" alt="${materia.titulo}">` : '<div class="card-imagem" style="background:#ecf0f1"></div>'}
                <div class="card-conteudo">
                    <h3 class="card-titulo">${materia.titulo}</h3>
                    <div class="card-data">${formatarData(materia.data)}</div>
                    <p class="card-resumo">${materia.resumo}</p>
                    <a href="materia.html?arquivo=${materia.arquivo}" class="card-link">Ler matéria completa →</a>
                </div>
            </div>
        `).join('');
        
        document.getElementById('lista-materias').innerHTML = html;
        
    } catch (erro) {
        console.error('Erro ao carregar matérias:', erro);
        document.getElementById('lista-materias').innerHTML = '<p>Erro ao carregar matérias. Tente novamente mais tarde.</p>';
    }
}

function extrairMetadata(conteudoMd, nomeArquivo) {
    // Extrai dados do frontmatter (formato YAML entre ---)
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = conteudoMd.match(frontmatterRegex);
    
    let metadata = {
        titulo: 'Sem título',
        data: '2024-01-01',
        resumo: 'Sem resumo',
        imagem: '',
        arquivo: nomeArquivo
    };
    
    if (match) {
        const frontmatter = match[1];
        const tituloMatch = frontmatter.match(/titulo:\s*(.+)/);
        const dataMatch = frontmatter.match(/data:\s*(.+)/);
        const resumoMatch = frontmatter.match(/resumo:\s*(.+)/);
        const imagemMatch = frontmatter.match(/imagem:\s*(.+)/);
        
        if (tituloMatch) metadata.titulo = tituloMatch[1];
        if (dataMatch) metadata.data = dataMatch[1];
        if (resumoMatch) metadata.resumo = resumoMatch[1];
        if (imagemMatch) metadata.imagem = imagemMatch[1];
    }
    
    return metadata;
}

function formatarData(dataString) {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

// Carrega as matérias quando a página abrir
carregarMaterias();