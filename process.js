// process.js

window.addEventListener('DOMContentLoaded', () => {
    // 1. 세션 스토리지에서 데이터 가져오기
    const dataString = sessionStorage.getItem('visitorCardData');
    if (!dataString) {
        alert('생성된 방문증 데이터가 없습니다. 메인 페이지로 이동합니다.');
        location.href = 'index.html';
        return;
    }

    const data = JSON.parse(dataString);

    // 2. 각 단계별로 데이터 채우기

    // 단계 1: 원본
    document.getElementById('proc-original').src = data.originalImage;

    // 단계 2: 에지
    document.getElementById('proc-edge').src = data.edgeImage;

    // 단계 3: 엔트로피
    document.getElementById('proc-raw-bits').textContent = `${data.rawBitsCount.toLocaleString()} bits`;
    document.getElementById('proc-unbiased-bits').textContent = `${data.unbiasedBitsCount.toLocaleString()} bits`;
    document.getElementById('proc-unbiased-bitstream').textContent = `${data.unbiasedBitStr}... (총 ${data.unbiasedBitsCount}개)`;

    // 단계 4: 시드
    document.getElementById('proc-seed').textContent = data.seedHex;

    // 단계 5: Geo-Lock
    document.getElementById('proc-message').textContent = `(위도: ${data.latitude}, 경도: ${data.longitude}, 시각: ${data.timestamp})`;
    document.getElementById('proc-hmac').textContent = data.hmacHex;

    // 단계 6: 최종 ID
    document.getElementById('proc-offset').textContent = data.offset;
    document.getElementById('proc-codeint').textContent = data.codeInt;
    document.getElementById('proc-final-id').textContent = data.cardID;
});
