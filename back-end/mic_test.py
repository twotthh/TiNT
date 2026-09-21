import os
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

import threading
import queue
import datetime
import json
import time
import urllib.parse
import io
import subprocess

import speech_recognition as sr
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np
import librosa

import firebase_admin
from firebase_admin import credentials, firestore, storage
import google.generativeai as genai

from dotenv import load_dotenv
load_dotenv()

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

# 콘솔 출력 동기화
# 마이크 스레드와 분석 스레드를 하나의 락으로 감싸서 동시에 print()를 호출 시 로그 혼잡 예방
print_lock = threading.Lock()

def safe_print(*args, **kwargs):
    with print_lock:
        print(*args, **kwargs)

# 0-0. Gemini API 연결
safe_print("=== Gemini AI 연결 중 ===")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY가 설정되지 않았습니다.\n"
        "  1) 프로젝트 폴더에 .env 파일을 만들고 GEMINI_API_KEY=발급받은키 를 추가하거나\n"
        "  2) 터미널에서 export GEMINI_API_KEY=발급받은키 로 설정한 뒤 다시 실행해주세요."
    )
genai.configure(api_key=GEMINI_API_KEY)
model_gemini = genai.GenerativeModel('gemini-2.5-flash')
safe_print("Gemini 연결 성공\n")

# 0-1. 파이어베이스 클라우드 연결
safe_print("=== 파이어베이스 클라우드 연결 중 ===")
try:
    cred = credentials.Certificate("firebase-key.json")
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'tint-da886.firebasestorage.app'
    })
    db_cloud = firestore.client()
    bucket = storage.bucket()
    safe_print("파이어베이스 연결 성공\n")
except Exception as e:
    safe_print(f"파이어베이스 연결 실패 : {e}")
    exit()

# 1. TiNT 인공지능 모델 불러오기
MODEL_PATH = "./TiNT_Model/TiNT_Model"

safe_print("=== TINT 인공지능 모델 불러오는 중 ===")
try:
    tokenizer = AutoTokenizer.from_pretrained("beomi/kcbert-base")
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    model.eval()
    safe_print("TINT 모델 로드 완료\n")
except Exception as e:
    safe_print(f"모델 로드 실패 - 에러 내용 : {e}")
    input("\n엔터 키를 누르면 창이 닫힙니다...")
    exit()

# 2. librosa 기반 음성 특징 추출
def extract_audio_features(audio):
    try:
        wav_bytes = audio.get_wav_data()
        y, sr_rate = librosa.load(io.BytesIO(wav_bytes), sr=None)

        if y.size == 0:
            return None

        rms = librosa.feature.rms(y=y)[0]
        avg_rms = float(np.mean(rms))
        volume_db = float(20 * np.log10(avg_rms)) if avg_rms > 1e-6 else -100.0

        # fmin은 60Hz 전원 노이즈 대역과 겹치지 않도록 90으로 설정
        f0, voiced_flag, voiced_prob = librosa.pyin(y, fmin=90, fmax=400, sr=sr_rate)
        voiced_f0 = f0[voiced_flag] if f0 is not None else np.array([])

        if voiced_f0.size >= 3:  
            avg_pitch = float(np.mean(voiced_f0))
            pitch_std = float(np.std(voiced_f0))
        else:
            avg_pitch = None
            pitch_std = None

        return {
            'volume_db': round(volume_db, 1),
            'pitch_hz': round(avg_pitch, 1) if avg_pitch is not None else None,
            'pitch_std': round(pitch_std, 1) if pitch_std is not None else None,
        }
    except Exception as e:
        safe_print(f"\n[librosa 분석 오류] {e}")
        return None


class VoiceBaseline:

    def __init__(self, window=20):
        self.window = window
        self.volumes = []
        self.pitch_stds = []

    def compare_and_update(self, features):
        if features is None:
            return None

        result = {'volume_spike': False, 'pitch_spike': False}

        if len(self.volumes) >= 5:
            baseline_vol = sum(self.volumes) / len(self.volumes)
            result['volume_spike'] = (features['volume_db'] - baseline_vol) > 6

            if features['pitch_std'] is not None and len(self.pitch_stds) >= 5:
                baseline_pitch_std = sum(self.pitch_stds) / len(self.pitch_stds)
                result['pitch_spike'] = (features['pitch_std'] - baseline_pitch_std) > 15

        self.volumes.append(features['volume_db'])
        if features['pitch_std'] is not None:
            self.pitch_stds.append(features['pitch_std'])

        if len(self.volumes) > self.window:
            self.volumes.pop(0)
        if len(self.pitch_stds) > self.window:
            self.pitch_stds.pop(0)

        return result

voice_baseline = VoiceBaseline()

# 스피치 재머
JAMMER_AUDIO_DEVICE = 'plughw:2,0'

# 볼륨 조절용 ALSA 믹서 컨트롤 이름과 카드 번호
JAMMER_VOLUME_CARD = '2'
JAMMER_VOLUME_CONTROL = 'PCM'


def set_max_volume():
    try:
        subprocess.run(
            ['amixer', '-c', JAMMER_VOLUME_CARD, 'sset', JAMMER_VOLUME_CONTROL, '100%'],
            check=True, timeout=5,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
    except Exception as e:
        safe_print(f"\n[볼륨 설정 경고] 볼륨을 최대로 못 올렸습니다 (그래도 재생은 시도합니다): {e}")


def play_jammer_audio(wav_filename):
    try:
        safe_print("\n[스피치 재머 가동] 방금 발화를 스피커로 재생합니다.")
        set_max_volume()
        subprocess.run(['aplay', '-D', JAMMER_AUDIO_DEVICE, wav_filename], check=True, timeout=15)
    except FileNotFoundError:
        safe_print("\n[재머 재생 오류] 'aplay' 명령을 찾을 수 없습니다. 라즈베리파이 OS인지 확인해주세요.")
    except subprocess.CalledProcessError as e:
        safe_print(f"\n[재머 재생 오류] aplay 실행 실패: {e}")
    except subprocess.TimeoutExpired:
        safe_print("\n[재머 재생 오류] 재생이 15초 넘게 걸려 중단했습니다.")

audio_queue = queue.Queue(maxsize=20)   # 마이크 스레드 -> 분석 스레드
stop_event = threading.Event()          # 종료 신호 (양쪽 스레드가 공유)

# 마이크 수집 스레드 -> 듣기 담당
# r.listen()이 끝나자마자 바로 큐에 넣고 다음 문장으로
def listener_worker():
    r = sr.Recognizer()
    r.energy_threshold = 300
    r.dynamic_energy_threshold = False
    r.pause_threshold = 0.5
    r.non_speaking_duration = 0.3  

    with sr.Microphone(device_index=1, sample_rate=44100, chunk_size=4096) as source:
        safe_print("마이크 연결 성공 (수집 스레드 시작)\n")

        while not stop_event.is_set():
            try:
                audio = r.listen(source, timeout=5, phrase_time_limit=7)
            except sr.WaitTimeoutError:
                continue
            except Exception as e:
                safe_print(f"\n[마이크 스레드 오류] {e}")
                time.sleep(1)
                continue

            try:
                audio_queue.put_nowait(audio)
            except queue.Full:
                safe_print("\n[경고] 분석이 밀려서 큐가 가득 찼습니다. 가장 오래된 항목을 버립니다.")
                try:
                    audio_queue.get_nowait()
                    audio_queue.put_nowait(audio)
                except queue.Empty:
                    pass

    safe_print("[마이크 수집 스레드 종료]")

# AI 분석 스레드 
# 큐에서 오디오를 하나씩 꺼내 STT -> 로컬 필터링 -> Gemini 분석 -> 저장까지
def analysis_worker():
    recognizer = sr.Recognizer()
    safe_print("[분석 스레드 시작]\n")

    while not stop_event.is_set() or not audio_queue.empty():
        try:
            audio = audio_queue.get(timeout=1)
        except queue.Empty:
            continue

        try:
            text = recognizer.recognize_google(audio, language='ko-KR')
        except sr.UnknownValueError:
            safe_print("목소리 인식 불가 - 다시 말하기\n")
            continue
        except sr.RequestError as e:
            safe_print(f"\n구글 서버 인터넷 연결 오류 : {e}")
            time.sleep(2)
            continue

        safe_print(f"\n인식된 음성 : '{text}'")

        if len(text.strip()) <= 2:
            safe_print("너무 짧은 문장은 분석을 건너뜀\n")
            continue

        if "종료" in text or "그만" in text:
            safe_print("\n종료 명령어 인식 - TiNT 테스트 OFF")
            stop_event.set()
            break

        try:
            process_utterance(text, audio)
        except Exception as e:
            safe_print(f"\n[분석 처리 중 오류] {e}")
            time.sleep(1)
            continue

    safe_print("[분석 스레드 종료]")

def process_utterance(text, audio):
    # 2-1. librosa로 음성 특징 추출 + 세션 평소 톤과 비교
    audio_features = extract_audio_features(audio)
    voice_signal = voice_baseline.compare_and_update(audio_features)
    voice_flag = bool(voice_signal and (voice_signal['volume_spike'] or voice_signal['pitch_spike']))

    if voice_flag:
        spike_reasons = []
        if voice_signal['volume_spike']:
            spike_reasons.append("음량 급상승")
        if voice_signal['pitch_spike']:
            spike_reasons.append("피치 변동 급상승")
        safe_print(f"[음성 신호] 평소 대비 {', '.join(spike_reasons)} 감지")

    # 3. TiNT 로컬 모델 1차 필터링 
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)

    with torch.no_grad():
        outputs = model(**inputs)

    probs = F.softmax(outputs.logits, dim=1)
    predicted_class = torch.argmax(probs, dim=1).item()

    local_danger_prob = (1.0 - probs[0][0].item()) * 100

    if predicted_class == 0:
        if local_danger_prob < 20 and not voice_flag:
            safe_print(f"\n[완전 안전] 로컬 위험도 {int(local_danger_prob)}점의 일상 대화입니다. 클라우드 전송 없이 영구 폐기합니다.\n")
            return
        elif local_danger_prob < 20 and voice_flag:
            safe_print(f"\n[음성 신호로 계속 진행] 텍스트만 보면 안전(로컬 위험도 {int(local_danger_prob)}점)하지만 목소리 톤이 평소와 달라 분석을 이어갑니다.")
        else:
            safe_print(f"\n[안전 기록] 로컬 위험도 {int(local_danger_prob)}점(20점 이상)입니다. 텍스트 분석만 진행합니다. (오디오 미저장)")

    audio_url = ""
    wav_filename = None

    if predicted_class >= 1 or voice_flag:
        safe_print("[음성 저장 중] 주의/위험 발화 또는 평소와 다른 음성 신호가 감지되어 오디오를 클라우드에 업로드")

        file_time = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        wav_filename = f"record_{file_time}.wav"

        with open(wav_filename, "wb") as f:
            f.write(audio.get_wav_data())

        blob = bucket.blob(f"audio_logs/{wav_filename}")
        blob.upload_from_filename(wav_filename)

        encoded_path = urllib.parse.quote(f"audio_logs/{wav_filename}", safe='')
        audio_url = f"https://firebasestorage.googleapis.com/v0/b/tint-da886.firebasestorage.app/o/{encoded_path}?alt=media"

    safe_print("[Gemini 심층 분석 및 채점 중]")

    if audio_features:
        pitch_note = (
            f"{audio_features['pitch_std']}Hz"
            if audio_features['pitch_std'] is not None
            else "판단 불가 (유성음 구간 부족)"
        )
        voice_context = f"""
    [음성 특징 정보 (참고용)]
    평균 음량: {audio_features['volume_db']}dB ({'평소보다 확연히 큼' if voice_signal and voice_signal['volume_spike'] else '평소 수준'})
    피치 변동성: {pitch_note} ({'평소보다 톤 변화가 큼(격양된 어조)' if voice_signal and voice_signal['pitch_spike'] else '평소 수준'})
    위 음성 특징도 참고해라. 텍스트만 보면 순화된 표현이어도 목소리가 평소보다 커지거나 톤 변화가 크면 격양된 감정 상태일 가능성이 높으니 점수에 반영해라.
    """
    else:
        voice_context = ""

    gemini_prompt = f"""
    너는 심리 상담가 및 언어 분석 AI야. 사용자가 방금 '{text}' 라고 말했어.
    {voice_context}
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

    JAMMER_SCORE_THRESHOLD = 85
    is_jammer_tier = (
        gemini_data["danger_level"] == "Level 3"
        and gemini_data["danger_score"] >= JAMMER_SCORE_THRESHOLD
    )

    if is_jammer_tier and wav_filename:
        play_jammer_audio(wav_filename)
    elif is_jammer_tier and not wav_filename:
        safe_print("\n[재머 미가동] 85점 이상으로 판정됐지만 저장된 오디오 파일이 없어 재생을 건너뜁니다.")

    if gemini_data["danger_level"] == "Level 1":
        audio_url = ""
        safe_print("\n Gemini가 안전으로 판별하여 오디오 폐기")

    result_dict = {
        "danger_score": gemini_data["danger_score"],
        "danger_level": gemini_data["danger_level"],
        "tint_reason": gemini_data["tint_reason"],
        "tint_word": gemini_data["tint_word"],
        "audio_url": audio_url,
        "tint_guide": gemini_data["tint_guide"],
        "tint_emotions": gemini_data["tint_emotions"],
        "tint_voice_features": audio_features,
        "tint_voice_flag": voice_flag,
    }

    json_output = json.dumps(result_dict, ensure_ascii=False, indent=4)
    safe_print("\n[최종 TiNT x Gemini 통합 분석 결과]")
    safe_print(json_output)

    # 4. 분석 결과를 Firestore에 저장
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

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
        'tint_emotions': gemini_data["tint_emotions"],
        'tint_voice_features': audio_features,
        'tint_voice_flag': voice_flag,
    })
    safe_print("[클라우드 업로드 성공]")
    safe_print("-" * 50)

    # 업로드가 끝나면 로컬 임시 wav 파일 삭제
    if wav_filename and os.path.exists(wav_filename):
        os.remove(wav_filename)

if __name__ == "__main__":
    safe_print("=== TiNT 실시간 음성 필터링 (비동기 파이프라인) 시작 ===")
    safe_print("마이크 ON - 문장 테스트 가능")
    safe_print("프로그램 종료 시 마이크에 '종료' 또는 '그만'")
    safe_print("-" * 50)

    listener_thread = threading.Thread(target=listener_worker, name="MicListener", daemon=True)
    analysis_thread = threading.Thread(target=analysis_worker, name="AIAnalysis", daemon=True)

    listener_thread.start()
    analysis_thread.start()

    try:
        while analysis_thread.is_alive():
            analysis_thread.join(timeout=0.5)
    except KeyboardInterrupt:
        safe_print("\n[Ctrl+C 감지] 종료 처리 중...")
        stop_event.set()

    listener_thread.join(timeout=5)
    analysis_thread.join(timeout=5)

    safe_print("\n프로그램이 종료되었습니다.")
    input("엔터 키를 누르면 창이 완전히 닫힙니다...")