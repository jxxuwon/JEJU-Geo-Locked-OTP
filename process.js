// process.js
window.addEventListener('DOMContentLoaded', ()=>{
    const data = JSON.parse(sessionStorage.getItem('otpProcess')||'{}');
    const log = document.getElementById('log'); // not used now
    // map data to IDs
    document.getElementById('procOriginal').src    = data.originalImage;
    document.getElementById('procEdge').src        = data.edgeImage;
    document.getElementById('procRawBits').textContent       = data.rawBitsCount;
    document.getElementById('procUnbiasedBits').textContent  = data.unbiasedBitsCount;
    document.getElementById('procSeed').textContent          = data.seedHex;
    document.getElementById('procLocation').textContent      = `위도: ${data.latitude}, 경도: ${data.longitude}`;
    document.getElementById('procTimestamp').textContent     = data.timestamp;
    document.getElementById('procHmac').textContent          = data.hmacHex;
    document.getElementById('procOffset').textContent        = data.offset;
    document.getElementById('procRawCode').textContent       = data.codeInt;
    document.getElementById('procOtp').textContent           = data.otp;
  });
  