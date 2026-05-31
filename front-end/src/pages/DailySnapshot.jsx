import React, { useRef } from 'react';
import html2canvas from 'html2canvas'; // 💡 이미지 캡처 라이브러리 추가
import '../styles/DailySnapshot.css';
import catFace from '../assets/cat_face.png';

const DailySnapshot = () => {
  // 💡 캡처할 영역을 지정하기 위한 useRef
  const captureRef = useRef(null);

  // 💡 공유하기 버튼 클릭 시 실행되는 함수
  const handleShare = async () => {
    if (!captureRef.current) return;

    try {
      // 1. 지정한 영역(영수증 카드)을 고화질 캔버스로 렌더링
      const canvas = await html2canvas(captureRef.current, {
        scale: 2, // 화질을 2배로 높여서 깨끗하게 저장
        useCORS: true, // 외부 이미지(고양이) 로드 허용
        backgroundColor: null, // 모서리 둥근 부분 배경 투명하게
      });

      // 2. 캔버스를 이미지 파일(Blob)로 변환
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        // 이미지 파일 객체 생성
        const file = new File([blob], 'tint_daily_report.png', { type: 'image/png' });

        // 3. 모바일 기기 네이티브 공유 (인스타그램, 카톡 등) 지원 여부 확인
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'TiNT 하루 리포트',
              text: '오늘 나의 대화 온도를 확인해 보세요! 🌡️',
              files: [file],
            });
          } catch (error) {
            console.log('사용자가 공유를 취소했거나 실패했습니다.', error);
          }
        } else {
          // 4. PC 환경이거나 공유 API를 지원하지 않는 브라우저 -> 자동 다운로드 폴백
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'tint_daily_report.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          alert('영수증 이미지가 갤러리에 저장되었습니다! 📸');
        }
      }, 'image/png');
    } catch (error) {
      console.error('캡처 에러:', error);
      alert('이미지 생성에 실패했습니다.');
    }
  };

  return (
    <main className="snapshot-tab-content">
      {/* 💡 ref={captureRef} 를 추가하여 캡처할 영역을 지정합니다 */}
      <div className="shareable-ticket" ref={captureRef}>
        
        <div className="ticket-header">
          <img src={catFace} alt="Cat Face" className="ticket-cat-img" />
          <h2 className="ticket-title">
            오늘 위험도는 <br />
            <span className="ticket-score">59%</span> 에요
          </h2>
        </div>

        <div className="ticket-body">
          <div className="ticket-gauge-container">
            <div className="gauge-arrow" style={{ left: '59%' }}>▼</div>
            <div className="gauge-bar">
              <div className="gauge-safe" style={{ width: '34%' }}></div>
              <div className="gauge-caution" style={{ width: '50%' }}></div>
              <div className="gauge-risk" style={{ width: '16%' }}></div>
            </div>
          </div>

          <div className="ticket-divider"></div>

          <div className="ticket-stats-grid">
            <div className="stat-col">
              <span className="stat-label">총 대화 수</span>
              <span className="stat-value">68<span className="stat-unit">회</span></span>
            </div>
            <div className="stat-col">
              <span className="stat-label">위험 발화</span>
              <span className="stat-value text-red">12<span className="stat-unit">회</span></span>
            </div>
            
            <div className="stat-col">
              <span className="stat-label">가장 위험한 시간</span>
              <span className="stat-value">15~16<span className="stat-unit">시</span></span>
            </div>
            <div className="stat-col">
              <span className="stat-label">많이 나온 감정</span>
              <span className="stat-value text-yellow">예민함</span>
            </div>
            
            <div className="stat-col">
              <span className="stat-label">스피치 재머</span>
              <span className="stat-value">3<span className="stat-unit">회</span></span>
            </div>
            <div className="stat-col">
              <span className="stat-label">연속 안전 대화</span>
              <span className="stat-value">2<span className="stat-unit">일</span></span>
            </div>
          </div>

          <div className="ticket-footer">
            <span className="footer-logo">TiNT Daily Report</span>
            <span className="footer-date">2026.05.31</span>
          </div>
        </div>
      </div>

      {/* 💡 클릭 시 공유/저장 함수 실행 */}
      <button className="share-btn" onClick={handleShare}>오늘 하루 공유하기</button>
    </main>
  );
};

export default DailySnapshot;