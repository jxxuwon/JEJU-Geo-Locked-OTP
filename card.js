// card.js

window.addEventListener('DOMContentLoaded', () => {
    // --- 1. 데이터 로드 및 카드 채우기 ---
    const dataString = sessionStorage.getItem('visitorCardData');
    if (!dataString) {
        alert('생성된 방문증 데이터가 없습니다. 메인 페이지로 이동합니다.');
        location.href = 'index.html';
        return;
    }
    const data = JSON.parse(dataString);

    document.getElementById('visitorCard').style.backgroundImage = `url(${data.originalImage})`;
    document.getElementById('card-id').textContent = data.cardID;
    document.getElementById('card-geo').textContent = `LAT ${data.latitude}, LON ${data.longitude}`;
    const date = new Date(data.timestamp);
    document.getElementById('card-time').textContent = date.toLocaleString('ko-KR');
    document.getElementById('card-hash').textContent = `${data.seedHex.substring(0, 24)}...`;

    new QRCode(document.getElementById('card-qr'), {
        text: data.seedHex,
        width: 100,
        height: 100,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });

    // --- 2. [신규] PNG 다운로드 기능 ---
    const downloadButton = document.getElementById('downloadButton');
    const cardElement = document.getElementById('visitorCard');

    downloadButton.addEventListener('click', () => {
        // 캡처 시 광택 효과와 3D 변형을 일시적으로 제거
        cardElement.classList.remove('hover');
        cardElement.style.transform = 'none';

        html2canvas(cardElement, {
            useCORS: true, // 외부 이미지가 있다면 필요
            backgroundColor: null, // 투명 배경
            onclone: (doc) => {
                // html2canvas가 DOM을 복제할 때, 
                // 원본 이미지 URL이 제대로 로드되도록 보장
                doc.getElementById('visitorCard').style.backgroundImage = `url(${data.originalImage})`;
            }
        }).then(canvas => {
            // 캔버스를 PNG URL로 변환
            const imageURL = canvas.toDataURL('image/png');
            
            // 다운로드 링크 생성
            const link = document.createElement('a');
            link.href = imageURL;
            link.download = `suwolbong_card_${data.cardID}.png`;
            link.click();
        });
    });


    // --- 3. [신규] 3D 틸트 및 광택(Sheen) 효과 ---
    const wrapper = document.getElementById('cardWrapper');
    const card = document.getElementById('visitorCard');

    wrapper.addEventListener('mousemove', (e) => {
        const rect = wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left; // 래퍼 기준 X
        const y = e.clientY - rect.top;  // 래퍼 기준 Y
        const { width, height } = rect;

        const rotateY = (x - width / 2) / (width / 2) * 15; // 최대 15도
        const rotateX = (height / 2 - y) / (height / 2) * 15; // 최대 15도

        // 카드 3D 틸트
        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;

        // 광택 효과 위치
        const cardRect = card.getBoundingClientRect();
        const sheenX = e.clientX - cardRect.left;
        const sheenY = e.clientY - cardRect.top;
        card.style.setProperty('--mouse-x', `${sheenX}px`);
        card.style.setProperty('--mouse-y', `${sheenY}px`);
    });

    wrapper.addEventListener('mouseenter', () => {
        card.classList.add('hover'); // 광택 보이기
    });

    wrapper.addEventListener('mouseleave', () => {
        card.classList.remove('hover'); // 광택 숨기기
        // 3D 효과 리셋
        card.style.transform = 'rotateX(0) rotateY(0) scale(1)';
    });
});
