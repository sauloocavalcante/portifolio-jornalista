// Efeito de fade-in ao rolar a página
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.card-materia, .sobre-page, #contato').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
});

// Botão "Voltar ao topo"
const backToTop = document.createElement('a');
backToTop.href = '#';
backToTop.className = 'back-to-top';
backToTop.innerHTML = '↑';
backToTop.setAttribute('aria-label', 'Voltar ao topo');
document.body.appendChild(backToTop);

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTop.classList.add('show');
    } else {
        backToTop.classList.remove('show');
    }
});

backToTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Efeito de partículas no fundo (opcional)
function criarParticulas() {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    container.style.overflow = 'hidden';
    document.body.insertBefore(container, document.body.firstChild);
    
    for (let i = 0; i < 50; i++) {
        const particula = document.createElement('div');
        particula.style.position = 'absolute';
        particula.style.width = '3px';
        particula.style.height = '3px';
        particula.style.backgroundColor = `rgba(107, 63, 160, ${Math.random() * 0.3})`;
        particula.style.borderRadius = '50%';
        particula.style.left = `${Math.random() * 100}%`;
        particula.style.top = `${Math.random() * 100}%`;
        particula.style.animation = `flutuar ${5 + Math.random() * 10}s linear infinite`;
        
        container.appendChild(particula);
    }
}

// Adiciona animação de flutuação
const style = document.createElement('style');
style.textContent = `
    @keyframes flutuar {
        0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
        }
        50% {
            opacity: 0.5;
        }
        100% {
            transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Só cria partículas em desktop (opcional)
if (window.innerWidth > 768) {
    criarParticulas();
}

// Efeito de brilho nos cards ao passar o mouse
document.querySelectorAll('.card-materia').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        card.style.transform = `translateY(-10px) scale(1.02)`;
        card.style.boxShadow = `0 15px 40px rgba(74, 44, 109, 0.25)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.boxShadow = '';
    });
});