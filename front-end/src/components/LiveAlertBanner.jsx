import React, { useState, useEffect, useRef } from 'react';
import '../styles/LiveAlertBanner.css';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import sirenIcon from '../assets/Notification_Danger.png';

const DISPLAY_DURATION_MS = 8000;

const JAMMER_THRESHOLD = 85;

const LiveAlertBanner = () => {
    const [alert, setAlert] = useState(null); 
    const lastDocIdRef = useRef(null);
    const isFirstSnapshotRef = useRef(true);
    const hideTimerRef = useRef(null);

    useEffect(() => {
        const q = query(collection(db, 'tint_results'), orderBy('timestamp', 'desc'), limit(1));

        const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) return;

        const docSnap = snapshot.docs[0];

        if (isFirstSnapshotRef.current) {
            isFirstSnapshotRef.current = false;
            lastDocIdRef.current = docSnap.id;
            return;
        }

        if (docSnap.id === lastDocIdRef.current) return;

        const data = docSnap.data();
        const levelStr = String(data.tint_danger_level || data.danger_level || '').toLowerCase();
        const isLevel3 = levelStr.includes('3') || levelStr.includes('위험');

        lastDocIdRef.current = docSnap.id;
        if (!isLevel3) return;

        setAlert({ score: Number(data.tint_danger_score || data.danger_score || 0) });

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setAlert(null), DISPLAY_DURATION_MS);
    });

    return () => {
        unsubscribe();
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
}, []);

if (!alert) return null;

const isJammerTier = alert.score >= JAMMER_THRESHOLD;

return (
<div className={`live-alert-banner ${isJammerTier ? 'is-jammer' : 'is-warning'}`} role="alert">
    <img src={sirenIcon} alt="경고" className="live-alert-icon" />
    <div className="live-alert-text">
        <span className="live-alert-title">
            {isJammerTier ? '방금 심각한 위험 발화가 감지됐어요!' : '방금 위험 발화가 감지됐어요!'}
        </span>
        <span className="live-alert-sub">위험도 {alert.score}%</span>
        </div>
    </div>
    );
};

export default LiveAlertBanner;