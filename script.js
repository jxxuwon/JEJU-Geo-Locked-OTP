// script.js
function buf2hex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2,'0'))
    .join('');
}

cv['onRuntimeInitialized'] = () => {
  const fileInput   = document.getElementById('fileInput');
  const preview     = document.getElementById('preview');
  const status      = document.getElementById('status');
  const otpDiv      = document.getElementById('otp');
  const qrDiv       = document.getElementById('qr');
  const viewProcess = document.getElementById('viewProcess');

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;

    // 원본 이미지 보이기
    const imgURL = URL.createObjectURL(file);
    preview.src = imgURL;
    preview.classList.remove('hidden');

    status.textContent = '에지 검출 중...';
    otpDiv.textContent = '';
    qrDiv.innerHTML    = '';
    viewProcess.classList.add('hidden');

    // Canvas 그리기
    const canvasIn = document.getElementById('canvasIn');
    const ctxIn    = canvasIn.getContext('2d');
    const img      = new Image();
    img.onload = async () => {
      canvasIn.width  = img.width;
      canvasIn.height = img.height;
      ctxIn.drawImage(img,0,0);

      // 그레이 + Canny
      const src  = cv.imread(canvasIn);
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      const edge = new cv.Mat();
      cv.Canny(gray, edge, 100,200);
      src.delete(); gray.delete();

      // 비트 추출
      status.textContent = '난수 비트 추출 중...';
      const bits=[];
      for(let y=0; y<edge.rows; y++){
        for(let x=0; x<edge.cols; x++){
          if(edge.ucharPtr(y,x)[0]>0) bits.push(x&1,y&1);
        }
      }
      const edgeCanvas=document.getElementById('canvasEdge');
      cv.imshow('canvasEdge',edge);
      const edgeURL=edgeCanvas.toDataURL();
      edge.delete();

      // 편향 제거
      status.textContent = '편향 제거 중...';
      const ub=[];
      for(let i=0;i+1<bits.length;i+=2){
        const a=bits[i], b=bits[i+1];
        if(a===0&&b===1) ub.push(0);
        else if(a===1&&b===0) ub.push(1);
      }
      if(ub.length<32){
        status.textContent='비트 부족: 다른 사진을 시도하세요.';
        return;
      }

      // SHA-256 시드
      status.textContent='시드 해싱 중...';
      const bitStr=ub.join('');
      const byteLen=Math.ceil(bitStr.length/8);
      const sbuf=new Uint8Array(byteLen);
      for(let i=0;i<byteLen;i++){
        sbuf[i]=parseInt(bitStr.substr(i*8,8).padEnd(8,'0'),2);
      }
      const seedHash=await crypto.subtle.digest('SHA-256',sbuf);
      const seedHex=buf2hex(seedHash);

      // 위치+HMAC
      status.textContent='위치 수집 중...';
      navigator.geolocation.getCurrentPosition(async pos=>{
        const lat=pos.coords.latitude.toFixed(6);
        const lon=pos.coords.longitude.toFixed(6);
        const ts=new Date().toISOString();

        status.textContent='OTP 생성 중...';
        const key=await crypto.subtle.importKey(
          'raw', seedHash, {name:'HMAC',hash:'SHA-256'},
          false, ['sign']
        );
        const msg=new TextEncoder().encode(`${lat},${lon},${ts}`);
        const sig=await crypto.subtle.sign('HMAC',key,msg);
        const hmacHex=buf2hex(sig);

        // 다이내믹 트렁크
        const hbytes=new Uint8Array(sig);
        const offset=hbytes[hbytes.length-1]&0x0F;
        let code =(
          ((hbytes[offset]   &0x7F)<<24)|
          ((hbytes[offset+1]&0xFF)<<16)|
          ((hbytes[offset+2]&0xFF)<<8 )|
           (hbytes[offset+3]&0xFF)
        )>>>0;
        const otpValue=(code % 1000000).toString().padStart(6,'0');

        // 결과 표시
        status.textContent='완료!';
        otpDiv.textContent=`Geo-Locked OTP: ${otpValue}`;
        new QRCode(qrDiv,{text:otpValue,width:128,height:128});

        // 로그 저장
        const processData={
          originalImage: imgURL,
          edgeImage: edgeURL,
          rawBitsCount: bits.length,
          unbiasedBitsCount: ub.length,
          seedHex, hmacHex,
          latitude:lat, longitude:lon, timestamp:ts,
          offset, codeInt:code, otp:otpValue
        };
        sessionStorage.setItem('otpProcess',JSON.stringify(processData));
        viewProcess.classList.remove('hidden');
      }, err=>{
        status.textContent='위치 권한 에러: 허용해주세요.';
      });
    };
    img.src=imgURL;
  });
  document.getElementById('viewProcess')
    .addEventListener('click',()=>location.href='process.html');
};
