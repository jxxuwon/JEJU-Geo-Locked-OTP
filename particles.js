// particles.js
// 가볍고 의존성 없는 파티클 애니메이션
(function() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) {
        console.error('Particle canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    let particles = [];
    
    // 파티클 색상 (테마에 맞게)
    const particleColor = 'rgba(88, 166, 255, 0.7)'; // --color-primary
    const particleCount = 100;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5; // 느린 속도
            this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = 1 + Math.random() * 2;
        }

        draw() {
            ctx.beginPath();
            ctx.fillStyle = particleColor;
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // 화면 가장자리 밖으로 나가면 반대편에서 다시 등장
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }
    }

    function init() {
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height); // 캔버스 지우기
        
        for (const p of particles) {
            p.update();
            p.draw();
        }
        
        requestAnimationFrame(animate);
    }

    init();
    animate();
})();
