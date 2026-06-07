import os
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

import speech_recognition as sr
import torch
import torch.nn.functional as F 
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import sqlite3
import datetime
import json  
import time
import urllib.parse

import firebase_admin
from firebase_admin import credentials, firestore, storage
import google.generativeai as genai

# 0-0. Gemini API 연결

print("=== Gemini AI 연결 중 ===")
genai.configure(api_key="...")
model_gemini = genai.GenerativeModel('gemini-2.5-flash')  
print("Gemini 연결 성공~\n")

# 0-1. 파이어베이스 클라우드 연결

print("=== 파이어베이스 클라우드 연결 중 ===")
try:
    cred = credentials.Certificate("firebase-key.json")
    firebase_admin.initialize_app(cred, {
        'storageBucket' : 'tint-da886.firebasestorage.app'
    })
    db_cloud = firestore.client()
    bucket = storage.bucket()
    print("파이어베이스 연결 성공~\n")
except Exception as e:
    print(f"파이어베이스 연결 실패 : {e}")
    exit()

# 0-2. TiNT 로컬 데이터베이스(SQLite) 세팅

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
print("DB 세팅 완료~ \n")

# 1. TiNT 인공지능 모델 불러오기

MODEL_PATH = "./TiNT_Model/TiNT_Model"

print("=== TINT 인공지능 모델 불러오는 중 ===")
try:
    tokenizer = AutoTokenizer.from_pretrained("beomi/kcbert-base")
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    model.eval()
    print("TINT 모델 로드 완료 !\n")
except Exception as e:
    print(f"모델 로드 실패 - 에러 내용 : {e}")
    input("\n엔터 키를 누르면 창이 닫힙니다...")
    exit()

# 2. 마이크 무한 대기 & 판별 루프

r = sr.Recognizer()
r.energy_threshold = 300 
r.dynamic_energy_threshold = False  

print("=== TiNT 실시간 음성 필터링 테스트  시작 ===")
print("마이크 ON - 문장 테스트 가능")
print("프로그램 종료 시 마이크에 '종료' 또는 '그만'")
print("-" * 50)

with sr.Microphone(device_index=1, sample_rate=44100, chunk_size=4096) as source:
    print("마이크 연결 성공~\n")

    while True:
        try:
            print("[녹음 대기 중]")
            audio = r.listen(source, timeout=5, phrase_time_limit=10)

            text = r.recognize_google(audio, language='ko-KR')
            print(f"\n인식된 음성 : '{text}'")
            
            if len(text.strip()) <= 2:
                print("너무 짧은 문장은 분석을 건너뜀\n")
                continue

            if "종료" in text or "그만" in text:
                print("\n종료 명령어 인식 - TiNT 테스트 OFF")
                break

            # 3. TiNT 모델 판별 & JSON 변환

            inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
            
            with torch.no_grad():
                outputs = model(**inputs)
                
            probs = F.softmax(outputs.logits, dim=1)
            predicted_class = torch.argmax(probs, dim=1).item()
            confidence = probs[0][predicted_class].item()
            
            if predicted_class == 0:
                tint_danger_score = int(confidence * 40)
                tint_danger_level = "Level 1"
            elif predicted_class == 1:
                tint_danger_score = int(41 + (confidence * 29))
                tint_danger_level = "Level 2"
            else:
                tint_danger_score = int(71 + (confidence * 29))
                tint_danger_level = "Level 3"
                
            audio_url = ""
            
            if predicted_class >= 1:
                print("[음성 저장 중] 주의/위험 발화가 감지되어 오디오를 클라우드에 업로드")
                
                file_time = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
                wav_filename = f"record_{file_time}.wav"
                
                with open(wav_filename, "wb") as f:
                    f.write(audio.get_wav_data())
                
                blob = bucket.blob(f"audio_logs/{wav_filename}")
                blob.upload_from_filename(wav_filename)
                
                encoded_path = urllib.parse.quote(f"audio_logs/{wav_filename}", safe='')
                audio_url = f"https://firebasestorage.googleapis.com/v0/b/tint-da886.firebasestorage.app/o/{encoded_path}?alt=media" 
                
            print("[Gemini 분석 중]")
            
            gemini_prompt = f"""
            너는 심리 상담가 및 언어 분석 AI야. 사용자가 방금 '{text}' 라고 말했어.
            이 문장의 감정과 상황을 분석해서 반드시 아래 JSON 형식으로만 대답해줘. 다른 말은 절대 하지마.
            {{
                "tint_detailed_level": {tint_danger_score},
                "tint_word": "가장 부정적이거나 핵심이 되는 단어 1개 (없으면 '없음')",
                "tint_reason": "이 문장이 왜 그런 감정을 담고 있는지 2문장 이내로 분석",
                "tint_guide": "현재 상황에서 마음을 진정시키거나 해결할 수 있는 따뜻하고 현실적인 1줄 조언",
                "tint_emotions": {{
                    "재미" : 0에서 100 사이 숫자,
                    "안정" : 0에서 100 사이 숫자,
                    "초조" : 0에서 100 사이 숫자,
                    "분노" : 0에서 100 사이 숫자,
                    "불안" : 0에서 100 사이 숫자,
                    "짜증" : 0에서 100 사이 숫자
                }}
            }}
            주의사항: emotions 안의 6가지 숫자 합은 무조건 100이 되어야 해.
            """
    
            response = model_gemini.generate_content(gemini_prompt)
            
            clean_json_text = response.text.replace("```json", "").replace("```", "").strip()
            gemini_data = json.loads(clean_json_text)
            
            result_dict = {
                "danger_score": tint_danger_score,
                "danger_level": tint_danger_level,
                "tint_reason": gemini_data["tint_reason"],
                "tint_word": gemini_data["tint_word"],
                "audio_url": audio_url,
                "tint_guide": gemini_data["tint_guide"],        
                "tint_emotions": gemini_data["tint_emotions"]     
            }
            
            json_output = json.dumps(result_dict, ensure_ascii=False, indent=4)
            print("\n[최종 TINT x Gemini 통합 분석 결과]")
            print(json_output)
            
            # 4. JSON 판별 결과를 DB에 저장
            
            now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.execute('INSERT INTO tint_results (timestamp, user_text, result_json) VALUES (?, ?, ?)', 
                        (now, text, json_output))
            conn.commit()
            
            doc_ref = db_cloud.collection('tint_results').document()
            doc_ref.set({
                'timestamp': now,
                'user_text': text,
                'tint_danger_score': tint_danger_score,
                'tint_danger_level': tint_danger_level,
                'tint_reason': gemini_data["tint_reason"],
                'tint_word': gemini_data["tint_word"],
                'audio_url': audio_url,
                'tint_guide': gemini_data["tint_guide"],
                'tint_emotions': gemini_data["tint_emotions"]
            })
            print("[클라우드 업로드 성공]")
            print("-" * 50)
            
            time.sleep(3)

        except sr.WaitTimeoutError:
            continue 
        except sr.UnknownValueError:
            print("목소리 인식 불가 - 다시 말하기\n")
            continue
        except sr.RequestError as e:
            print(f"\n구글 서버 인터넷 연결 오류 : {e}")
            break
        except Exception as e:
            print(f"\n알 수 없는 오류 발생 : {e}")
            break

conn.close()
input("\n엔터 키를 누르면 창이 완전히 닫힙니다...")
