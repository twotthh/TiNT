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

from ctypes import *
try:
    ERROR_HANDLER_FUNC = CFUNCTYPE(None, c_char_p, c_int, c_char_p, c_int, c_char_p)
    def py_error_handler(filename, line, function, err, fmt):
        pass
    c_error_handler = ERROR_HANDLER_FUNC(py_error_handler)
    asound = cdll.LoadLibrary('libasound.so')
    asound.snd_lib_error_set_handler(c_error_handler)
except Exception:
    pass

# 0-0. Gemini API 연결

print("=== Gemini AI 연결 중 ===")
genai.configure(api_key=" ~ ")
model_gemini = genai.GenerativeModel('gemini-2.5-flash')  
print("Gemini 연결 성공\n")

# 0-1. 파이어베이스 클라우드 연결

print("=== 파이어베이스 클라우드 연결 중 ===")
try:
    cred = credentials.Certificate("firebase-key.json")
    firebase_admin.initialize_app(cred, {
        'storageBucket' : 'tint-da886.firebasestorage.app'
    })
    db_cloud = firestore.client()
    bucket = storage.bucket()
    print("파이어베이스 연결 성공\n")
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
print("DB 세팅 완료\n")

# 1. TiNT 인공지능 모델 불러오기

MODEL_PATH = "./TiNT_Model/TiNT_Model"

print("=== TINT 인공지능 모델 불러오는 중 ===")
try:
    tokenizer = AutoTokenizer.from_pretrained("beomi/kcbert-base")
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    model.eval()
    print("TINT 모델 로드 완료\n")
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
    print("마이크 연결 성공\n")

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

            # 3. TiNT 로컬 모델 1차 필터링 (안전 대화 쳐내기)
            inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
            
            with torch.no_grad():
                outputs = model(**inputs)
                
            probs = F.softmax(outputs.logits, dim=1)
            predicted_class = torch.argmax(probs, dim=1).item()
            
            local_danger_prob = (1.0 - probs[0][0].item()) * 100
            
            if predicted_class == 0:
                if local_danger_prob < 20:
                    print(f"\n[완전 안전] 로컬 위험도 {int(local_danger_prob)}점의 일상 대화입니다. 클라우드 전송 없이 영구 폐기합니다.\n")
                    continue
                else:
                    print(f"\n[안전 기록] 로컬 위험도 {int(local_danger_prob)}점(20점 이상)입니다. 텍스트 분석만 진행합니다. (오디오 미저장)")
                    
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
                
            print("[Gemini 심층 분석 및 채점 중]")
            
            gemini_prompt = f"""
            너는 심리 상담가 및 언어 분석 AI야. 사용자가 방금 '{text}' 라고 말했어.
            
            [위험도 점수(danger_score) 및 레벨(danger_level) 분류 가이드라인]
            이 시스템은 단순 단어 필터링 봇이 아니라 '언어 습관 교정' 시스템이다. 
            비속어가 포함되어 있더라도, 타인을 향한 공격성이 없는 단순 혼잣말이나 감정의 강조(투정) 표현이라면 점수를 대폭 낮춰서 평가해라.

            * 0~20점 (Level 1): 비속어가 없는 일상 대화, 가벼운 한탄. (예: "아 오늘 게임 진짜 안 풀리네", "과제하기 싫어 죽겠네", "쟤 진짜 왜저래")
            * 21~40점 (Level 2): 타인을 공격할 의도가 없는 혼잣말, 습관적 비속어(추임새), 단순 감정의 강조. (예: "아 존나 싫어", "개짜증나 진짜", "아 씨발 깜짝아")
            * 41~60점 (Level 2): 상황이나 타인을 향한 거친 비속어와 명확한 짜증 표출. (예: "아 게임 개좆같이 하네", "저 병신 진짜 뭐하냐")
            * 61~70점 (Level 2): 타인을 향한 강한 적대감, 욱하는 마음에 뱉은 과장된 폭력적 표현(일회성). (예: "저 새끼 진짜 모가지 꺾어버리고 싶네")
            * 71~84점 (Level 3): 통제력을 잃기 시작한 위험 단계. 심한 인신공격, 연속적인 폭언, 강한 적대감. (붉은 조명 경고만 주며 스피치 재머는 가동하지 않음) (예: "야 이 개새끼야 넌 생각이라는 게 없냐? 좆같은 새끼 진짜")
            * 85~100점 (Level 3): 스피치 재머를 즉시 가동해 물리적으로 입을 막아야 할 극도의 통제 불능 상태. 구체적이고 즉각적인 살해/폭력 협박, 극단적인 혐오/패드립 발언. (예: "당장 찾아가서 칼로 찔러 죽여버린다 씹새끼야")

            위 기준을 바탕으로 이 문장의 감정과 상황을 분석해서 반드시 아래 JSON 형식으로만 대답해줘. 다른 말은 절대 하지마.
            {{
                "danger_score": 0에서 100 사이의 숫자,
                "danger_level": "Level 1" 또는 "Level 2" 또는 "Level 3",
                "tint_word": "가장 부정적이거나 핵심이 되는 단어 1개 (없으면 '없음')",
                "tint_reason": "이 문장이 왜 그런 감정을 담고 있는지 2문장 이내로 분석",
                "tint_guide": "현재 상황에서 마음을 진정시키거나 해결할 수 있는 따뜻하고 현실적인 1줄 조언",
                "tint_emotions": {{
                    "분노" : 0에서 100 사이 숫자,
                    "부러움" : 0에서 100 사이 숫자,
                    "혐오" : 0에서 100 사이 숫자,
                    "불안" : 0에서 100 사이 숫자,
                    "슬픔" : 0에서 100 사이 숫자,
                    "기쁨" : 0에서 100 사이 숫자,
                    "공감" : 0에서 100 사이 숫자,
                    "놀람" : 0에서 100 사이 숫자
                }}
            }}
            주의사항: emotions 안의 8가지 숫자 합은 무조건 100이 되어야 해.
            """
    
            response = model_gemini.generate_content(gemini_prompt)
            
            clean_json_text = response.text.replace("```json", "").replace("```", "").strip()
            gemini_data = json.loads(clean_json_text)
            
            if gemini_data["danger_level"] == "Level 1":
                audio_url = ""
                print("\n Gemini가 안전으로 판별하여 오디오 폐기")
            
            result_dict = {
                "danger_score": gemini_data["danger_score"],
                "danger_level": gemini_data["danger_level"],
                "tint_reason": gemini_data["tint_reason"],
                "tint_word": gemini_data["tint_word"],
                "audio_url": audio_url,
                "tint_guide": gemini_data["tint_guide"],        
                "tint_emotions": gemini_data["tint_emotions"]     
            }
            
            json_output = json.dumps(result_dict, ensure_ascii=False, indent=4)
            print("\n[최종 TiNT x Gemini 통합 분석 결과]")
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
                'tint_danger_score': gemini_data["danger_score"],
                'tint_danger_level': gemini_data["danger_level"],
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
            time.sleep(2)
            continue
        except Exception as e:
            print(f"\n알 수 없는 오류 발생 : {e}")
            time.sleep(2)
            continue

conn.close()
input("\n엔터 키를 누르면 창이 완전히 닫힙니다...")
