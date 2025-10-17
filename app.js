// app.js

// 헬퍼 함수: ArrayBuffer를 Hex 문자열로 변환
function buf2hex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// OpenCV가 준비되면 메인 로직 실행
cv['onRuntimeInitialized'] = () => {
    console.log('OpenCV.js is ready.');

    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const preview = document.getElementById('preview');
    const generateButton = document.getElementById('generateButton');
    const overlay = document.getElementById('processing-overlay');
    
    const steps = {
        geo: document.getElementById('step-geo'),
        analyze: document.getElementById('step-analyze'),
        entropy: document.getElementById('step-entropy'),
        hash: document.getElementById('step-hash'),
        complete: document.getElementById('step-complete'),
    };

    const canvasIn = document.getElementById('canvasIn');
    const canvasEdge = document.getElementById('canvasEdge');
    const ctxIn = canvasIn.getContext('2d');
    
    let originalImageURL = null;
    let selectedFile = null;

    fileInput.addEventListener('change', (e) => {
        selectedFile = e.target.files[0];
        if (!selectedFile) return;
        originalImageURL = URL.createObjectURL(selectedFile);
        preview.src = originalImageURL;
        preview.classList.remove('hidden');
        generateButton.classList.remove('hidden');
        fileLabel.classList.add('hidden');
    });

    generateButton.addEventListener('click', () => {
        if (!selectedFile) return;
        overlay.classList.remove('hidden');
        resetSteps();
        steps.geo.classList.remove('pending');
        navigator.geolocation.getCurrentPosition(
            (pos) => onGeoSuccess(pos, selectedFile),
            onGeoError
        );
    });

    function onGeoError(err) {
        console.error(err);
        alert('위치 정보를 허용해야 방문증을 발급할 수 있습니다.');
        overlay.classList.add('hidden');
    }

    async function onGeoSuccess(pos, file) {
        const lat = pos.coords.latitude.toFixed(6);
        const lon = pos.coords.longitude.toFixed(6);
        const ts = new Date().toISOString();
        
        completeStep(steps.geo);

        steps.analyze.classList.remove('pending');
        const img = new Image();
        img.onload = async () => {
            canvasIn.width = img.width;
            canvasIn.height = img.height;
            ctxIn.drawImage(img, 0, 0);

            let src, gray, edge;
            try {
                src = cv.imread(canvasIn);
                gray = new cv.Mat();
                cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
                edge = new cv.Mat();
                cv.Canny(gray, edge, 100, 200);
                completeStep(steps.analyze);

                steps.entropy.classList.remove('pending');
                const bits = [];
                for (let y = 0; y < edge.rows; y++) {
                    for (let x = 0; x < edge.cols; x++) {
                        if (edge.ucharPtr(y, x)[0] > 0) {
                            bits.push(x & 1, y & 1);
                        }
                    }
                }
                
                cv.imshow('canvasEdge', edge);
                const edgeImageURL = canvasEdge.toDataURL();

                const ub = [];
                for (let i = 0; i + 1 < bits.length; i += 2) {
                    const a = bits[i], b = bits[i + 1];
                    if (a === 0 && b === 1) ub.push(0);
                    else if (a === 1 && b === 0) ub.push(1);
                }

                if (ub.length < 128) {
                    throw new Error('엔트로피 부족: 사진이 너무 단순합니다. 다른 사진을 시도하세요.');
                }
                
                const rawBitStr = bits.join('');
                const unbiasedBitStr = ub.join('');
                completeStep(steps.entropy);

                steps.hash.classList.remove('pending');
                const byteLen = Math.ceil(unbiasedBitStr.length / 8);
                const sbuf = new Uint8Array(byteLen);
                for (let i = 0; i < byteLen; i++) {
                    sbuf[i] = parseInt(unbiasedBitStr.substr(i * 8, 8).padEnd(8, '0'), 2);
                }
                const seedHash = await crypto.subtle.digest('SHA-256', sbuf);
                const seedHex = buf2hex(seedHash);

                const key = await crypto.subtle.importKey(
                    'raw', seedHash, { name: 'HMAC', hash: 'SHA-256' },
                    false, ['sign']
                );
                const msg = new TextEncoder().encode(`${lat},${lon},${ts}`);
                const sig = await crypto.subtle.sign('HMAC', key, msg);
                const hmacHex = buf2hex(sig); // <-- 프로세스 페이지용으로 저장

                const hbytes = new Uint8Array(sig);
                const offset = hbytes[hbytes.length - 1] & 0x0F; // <-- 프로세스 페이지용
                let codeInt = ( // <-- 프로세스 페이지용
                    ((hbytes[offset] & 0x7F) << 24) |
                    ((hbytes[offset + 1] & 0xFF) << 16) |
                    ((hbytes[offset + 2] & 0xFF) << 8) |
                    (hbytes[offset + 3] & 0xFF)
                ) >>> 0;
                const cardID = (codeInt % 1000000).toString().padStart(6, '0');
                
                completeStep(steps.hash);

                // **[중요] process.html에서 사용할 모든 데이터를 저장**
                const cardData = {
                    originalImage: originalImageURL,
                    edgeImage: edgeImageURL,
                    rawBitsCount: bits.length,
                    unbiasedBitsCount: ub.length,
                    rawBitStr: rawBitStr.substring(0, 500), // 시각화용 (일부만)
                    unbiasedBitStr: unbiasedBitStr.substring(0, 500), // 시각화용 (일부만)
                    seedHex,
                    hmacHex, // 추가
                    latitude: lat,
                    longitude: lon,
                    timestamp: ts,
                    offset, // 추가
                    codeInt, // 추가
                    cardID
                };
                sessionStorage.setItem('visitorCardData', JSON.stringify(cardData));

                completeStep(steps.complete);
                setTimeout(() => {
                    location.href = 'card.html';
                }, 1000);

            } catch (err) {
                console.error(err);
                alert(err.message || '이미지 처리 중 오류가 발생했습니다.');
                overlay.classList.add('hidden');
            } finally {
                src?.delete();
                gray?.delete();
                edge?.delete();
            }
        };
        img.src = originalImageURL;
    }

    function completeStep(stepElement) {
        stepElement.classList.remove('pending');
    }

    function resetSteps() {
        Object.values(steps).forEach((step, index) => {
            if (index === 0) step.classList.remove('pending');
            else step.classList.add('pending');
        });
    }
};
