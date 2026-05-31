import os
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

import speech_recognition as sr
import torch
import torch.nn.functional as F  # 확률 계산
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import sqlite3
import datetime
import json  

import firebase_admin
from firebase_admin import credentials, firestore


# ==========================================
# 0-1. 파이어베이스 클라우드 연결 세팅 (NEW!)
# ==========================================
print("=== 파이어베이스 클라우드 연결 중 ===")
try:
    cred = credentials.Certificate("firebase-key.json")
    firebase_admin.initialize_app(cred)
    db_cloud = firestore.client()
    print("파이어베이스 연결 성공!\n")
except Exception as e:
    print(f"파이어베이스 연결 실패 : {e}")
    exit()


# ==========================================
# 0-2. TINT 로컬 데이터베이스(SQLite) 세팅
# ==========================================
print("=== TINT 로컬 데이터베이스 연결 중 ===")
conn = sqlite3.connect('tint_logs.db')
cursor = conn.cursor()

cursor.execute('''
    CREATE TABLE IF NOT EXISTS tint_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        user_text TEXT,
        result_json TEXT
    )
''')
conn.commit()
print("DB 세팅 완료 ! (JSON 데이터 저장 준비 완료)\n")


# ==========================================
# 1. TINT 인공지능 모델 설정 및 불러오기
# ==========================================
MODEL_PATH = "./TiNT_Model/TiNT_Model"

print("=== TINT 인공지능 모델 불러오는 중 ===")
try:
    tokenizer = AutoTokenizer.from_pretrained("beomi/kcbert-base")
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    model.eval()
    print("TINT 모델 로드 완료 !\n")
except Exception as e:
    print(f"모델 로드 실패 : 에러 내용 : {e}")
    input("\n엔터(Enter) 키를 누르면 창이 닫힙니다...")
    exit()


# ==========================================
# 2. 마이크 무한 대기 및 실시간 판별 루프
# ==========================================
r = sr.Recognizer()
r.energy_threshold = 300  # 듣기 민감도 고정 (숫자가 낮을수록 예민해짐)
r.dynamic_energy_threshold = False  # 버그를 일으키는 자동 조절 기능 강제 종료

print("=== TINT 실시간 음성 필터링 테스트 봇 시작 ===")
print("마이크가 켜져 있습니다. 자유롭게 문장을 테스트해 보세요.")
print("(프로그램을 종료하시려면 마이크에 '종료' 또는 '그만'이라고 말씀하세요)")
print("-" * 50)

with sr.Microphone(device_index=1, sample_rate=44100, chunk_size=4096) as source:
    print("마이크 연결 성공! 이제 계속 듣고 있습니다.\n")

    while True:
        try:
            print("[녹음 대기 중] 말씀해 주세요.")
            audio = r.listen(source, timeout=5, phrase_time_limit=10)

            text = r.recognize_google(audio, language='ko-KR')
            print(f"\n인식된 음성: '{text}'")

            if "종료" in text or "그만" in text:
                print("\n'종료' 명령어가 인식되었습니다. TINT 테스트를 마칩니다.")
                break

            # ==========================================
            # 3. TINT 모델 실시간 판별 및 JSON 변환
            # ==========================================
            inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
            
            with torch.no_grad():
                outputs = model(**inputs)
                
            probs = F.softmax(outputs.logits, dim=1)
            predicted_class = torch.argmax(probs, dim=1).item()
            confidence = probs[0][predicted_class].item()
            
            if predicted_class == 0:
                danger_score = int(confidence * 40)
                danger_level = "Level 1"
                gpt_reason = "일상적이거나 친근한 긍정적 표현"
            elif predicted_class == 1:
                danger_score = int(41 + (confidence * 29))
                danger_level = "Level 2"
                gpt_reason = "상황을 향한 불만 및 짜증 토로"
            else:
                danger_score = int(71 + (confidence * 29))
                danger_level = "Level 3"
                gpt_reason = "타인을 향한 명백한 공격 및 위협"

            result_dict = {
                "danger_score": danger_score,
                "danger_level": danger_level,
                "gpt_reason": gpt_reason,
                "gpt_word": "N/A (분류 모델 자체 판별)"
            }
            
            json_output = json.dumps(result_dict, ensure_ascii=False, indent=4)
            print("\n[TINT JSON 분석 결과]")
            print(json_output)
            
            # ==========================================
            # 4. JSON 판별 결과를 DB에 저장
            # ==========================================
            now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.execute('INSERT INTO tint_results (timestamp, user_text, result_json) VALUES (?, ?, ?)', 
                           (now, text, json_output))
            conn.commit()
            
            doc_ref = db_cloud.collection('tint_results').document()
            doc_ref.set({
                'timestamp': now,
                'user_text': text,
                'danger_score': danger_score,
                'danger_level': danger_level,
                'gpt_reason': gpt_reason
            })
            print("[클라우드 업로드 성공] 앱으로 데이터가 전송되었어요!")
            print("-" * 50)

        except sr.WaitTimeoutError:
            continue 
        except sr.UnknownValueError:
            print("목소리를 정확히 인식하지 못했습니다. 다시 말씀해 주세요.\n")
            continue
        except sr.RequestError as e:
            print(f"\n구글 서버 인터넷 연결 오류 : {e}")
            break
        except Exception as e:
            print(f"\n알 수 없는 오류 발생: {e}")
            break

conn.close()
input("\n엔터(Enter) 키를 누르면 창이 완전히 닫힙니다")