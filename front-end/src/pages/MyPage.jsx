import React from 'react';
import '../styles/MyPage.css';

import homeOff from '../assets/Home_Off.png';
import chartOff from '../assets/Chart_Off.png';
import logOff from '../assets/Log_Off.png';
import myOn from '../assets/My_On.png';

import deviceIcon from '../assets/My_Phone.png';
import notiIcon from '../assets/My_Notification.png';
import goalIcon from '../assets/My_Goal.png';
import recordIcon from '../assets/My_Record.png';
import helpIcon from '../assets/My_Help.png';
import infoIcon from '../assets/My_Info.png';
import noticeIcon from '../assets/My_Notice.png';

const MyPage = ({ onNavigate }) => {
  const menuGroup1 = [
    { id: 'device', icon: deviceIcon, title: '기기 설정' },
    { id: 'noti', icon: notiIcon, title: '알림 설정' },
    { id: 'goalSetting', icon: goalIcon, title: '목표 설정' },
    { id: 'history', icon: recordIcon, title: '사용기록' }
  ];

  const menuGroup2 = [
    { id: 'help', icon: helpIcon, title: '도움말' },
    { id: 'info', icon: infoIcon, title: '앱 정보' },
    { id: 'notice', icon: noticeIcon, title: '공지사항' }
  ];

  const handleMenuClick = (id) => {
    if (id === 'goalSetting') {
      onNavigate('goalList');
    }
  };

  return (
    <div className="mypage-wrapper bg-white">
      <main className="mypage-content">
        <ul className="menu-list">
          {menuGroup1.map((item) => (
            <li className="menu-item" key={item.id} onClick={() => handleMenuClick(item.id)}>
              <div className="menu-left">
                <img src={item.icon} alt={item.title} className="menu-icon" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                <span className="menu-title">{item.title}</span>
              </div>
              <span className="menu-arrow">〉</span>
            </li>
          ))}
        </ul>

        <div className="menu-divider"></div>

        <ul className="menu-list">
          {menuGroup2.map((item) => (
            <li className="menu-item" key={item.id} onClick={() => handleMenuClick(item.id)}>
              <div className="menu-left">
                <img src={item.icon} alt={item.title} className="menu-icon" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                <span className="menu-title">{item.title}</span>
              </div>
              <span className="menu-arrow">〉</span>
            </li>
          ))}
        </ul>
      </main>

      <nav className="bottom-nav-bar">
        <div className="nav-item" onClick={() => onNavigate('home')}>
          <img src={homeOff} alt="홈" className="nav-icon" />
          <span>홈</span>
        </div>
        <div className="nav-item" onClick={() => onNavigate('analysis')}>
          <img src={chartOff} alt="분석" className="nav-icon" />
          <span>분석</span>
        </div>
        <div className="nav-item" onClick={() => onNavigate('log')}>
          <img src={logOff} alt="로그" className="nav-icon" />
          <span>로그</span>
        </div>
        <div className="nav-item" onClick={() => onNavigate('mypage')}>
          <img src={myOn} alt="마이" className="nav-icon" />
          <span>마이</span></div>
      </nav>
    </div>
  );
};

export default MyPage;