import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas'; 
import '../styles/DailySnapshot.css';
import catFace from '../assets/cat_face.png';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const DailySnapshot = ({ currentDate }) => {
  const captureRef = useRef(null);
  const dateObj = currentDate || new Date();

  const [snapData, setSnapData] = useState({
    avgScore: 0,
    safePer: 0, cautionPer: 0, riskPer: 0,
    totalLogs: 0, dangerLogs: 0, jammerLogs: 0,
    worstHour: '--', topEmotion: '데이터 없음',
    formattedDate: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'tint_results'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const year = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const targetDateString = `${year}-${m}-${d}`;

      let safe = 0, caution = 0, risk = 0, totalScore = 0;
      let jammerCount = 0;
      const hourMap = {};
      const emotionMap = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.timestamp && data.timestamp.startsWith(targetDateString)) {
          const levelStr = String(data.tint_danger_level || data.danger_level || data.level || data.tint_level || '').toLowerCase();
          const score = Number(data.tint_danger_score || data.danger_score || data.tint_score || data.score || 0);
          
          if (levelStr.includes('2') || levelStr.includes('주의')) { 
            caution++; 
          }
          else if (levelStr.includes('3') || levelStr.includes('위험')) { 
            risk++; 
            if (score >= 85) {
              jammerCount++; 
            }
          }
          else { 
            safe++; 
          }

          totalScore += score;

          const hour = data.timestamp.substring(11, 13);
          if (!hourMap[hour]) hourMap[hour] = { count: 0, score: 0 };
          hourMap[hour].count += 1;
          hourMap[hour].score += score;

          const ems = data.tint_emotions || data.emotions || {};
          Object.entries(ems).forEach(([k, v]) => {
            emotionMap[k] = (emotionMap[k] || 0) + Number(v);
          });
        }
      });

      const total = safe + caution + risk;
      const avgScore = total > 0 ? Math.round(totalScore / total) : 0;
      
      let maxHour = '--';
      let maxHourScore = -1;
      Object.entries(hourMap).forEach(([h, val]) => {
        const avgH = val.score / val.count;
        if (avgH > maxHourScore) {
          maxHourScore = avgH;
          maxHour = h;
        }
      });

      let topE = '분석 불가';
      let maxE = -1;
      Object.entries(emotionMap).forEach(([k, v]) => {
        if (v > maxE) { maxE = v; topE = k; }
      });

      setSnapData({
        avgScore,
        safePer: total > 0 ? Math.round((safe / total) * 100) : 0,
        cautionPer: total > 0 ? Math.round((caution / total) * 100) : 0,
        riskPer: total > 0 ? Math.round((risk / total) * 100) : 0,
        totalLogs: total,
        dangerLogs: caution + risk,
        jammerLogs: jammerCount, 
        worstHour: maxHour !== '--' ? `${maxHour}~${String(Number(maxHour)+1).padStart(2,'0')}` : '--',
        topEmotion: maxE > -1 ? topE : '평온함',
        formattedDate: `${year}.${m}.${d}`
      });
    });

    return () => unsubscribe();
  }, [currentDate]);

  const handleShare = async () => {
    if (!captureRef.current) return;
    try {
      const canvas = await html2canvas(captureRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'tint_daily_report.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ title: 'TiNT 하루 리포트', text: '오늘 나의 대화 온도를 확인해 보세요!', files: [file] });
          } catch (error) { console.log('공유 실패:', error); }
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'tint_daily_report.png';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url); alert('영수증 이미지가 저장되었습니다!');
        }
      }, 'image/png');
    } catch (error) {
      console.error('캡처 에러:', error);
      alert('이미지 생성에 실패했습니다.');
    }
  };

  let aiComment = '완벽해요!';
  if (snapData.avgScore > 70) aiComment = '내일 더 잘해봐요..';
  else if (snapData.avgScore > 30) aiComment = '조금 릴렉스~';

  return (
    <main className="snapshot-tab-content">
      <div className="shareable-ticket" ref={captureRef}>
        
        <div className="ticket-header">
          <img src={catFace} alt="Cat Face" className="ticket-cat-img" />
          <h2 className="ticket-title">
            오늘 위험도는 <br />
            <span className="ticket-score">{snapData.avgScore}%</span> 에요
          </h2>
        </div>

        <div className="ticket-body">
          <div className="ticket-gauge-container">
            <div className="gauge-arrow" style={{ left: `${snapData.avgScore}%`, transition: 'left 0.5s ease' }}>▼</div>
            <div className="gauge-bar">
              <div className="gauge-safe" style={{ width: `${snapData.safePer}%`, transition: 'width 0.5s ease' }}></div>
              <div className="gauge-caution" style={{ width: `${snapData.cautionPer}%`, transition: 'width 0.5s ease' }}></div>
              <div className="gauge-risk" style={{ width: `${snapData.riskPer}%`, transition: 'width 0.5s ease' }}></div>
            </div>
          </div>

          <div className="ticket-divider"></div>

          <div className="ticket-stats-grid">
            <div className="stat-col">
              <span className="stat-label">총 대화 수</span>
              <span className="stat-value">{snapData.totalLogs}<span className="stat-unit">회</span></span>
            </div>
            <div className="stat-col">
              <span className="stat-label">위험 발화</span>
              <span className="stat-value">{snapData.dangerLogs}<span className="stat-unit">회</span></span>
            </div>
            
            <div className="stat-col">
              <span className="stat-label">가장 위험한 시간</span>
              <span className="stat-value" style={{ fontSize: '18px' }}>{snapData.worstHour}<span className="stat-unit">시</span></span>
            </div>
            <div className="stat-col">
              <span className="stat-label">많이 나온 감정</span>
              <span className="stat-value text-yellow" style={{ fontSize: '18px' }}>{snapData.topEmotion}</span>
            </div>
            
            <div className="stat-col">
              <span className="stat-label">스피치 재머</span>
              <span className="stat-value">{snapData.jammerLogs}<span className="stat-unit">회</span></span>
            </div>
            <div className="stat-col">
              <span className="stat-label">오늘의 한마디</span>
              <span className="stat-value" style={{ fontSize: '18px' }}>
                {aiComment}
              </span>
            </div>
          </div>

          <div className="ticket-footer">
            <span className="footer-logo">TiNT Daily Report</span>
            <span className="footer-date">{snapData.formattedDate}</span>
          </div>
        </div>
      </div>

      <button className="share-btn" onClick={handleShare}>오늘 하루 공유하기</button>
    </main>
  );
};

export default DailySnapshot;