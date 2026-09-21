""" 
프레임 단위 VAD(webrtcvad)로 발화 구간을 더 정교하게 구분할 수 있는지 테스트

pip install webrtcvad pyaudio
python mic_test2.py --list-devices
python mic_test2.py


튜닝 포인트 (라즈베리파이 환경/마이크에 맞춰 조정 필요) :
- VAD_AGGRESSIVENESS : 0(잡음도 음성으로 인식하기 쉬움) ~ 3(엄격함)
- PADDING_DURATION_MS : 이만큼 무음이 지속돼야 발화 종료로 판단
- RATIO_THRESHOLD : 링버퍼 안에서 음성/무음 프레임 비율이 이 값을 넘으면 발화 시작/종료로 판단
- MIN_PHRASE_DURATION_S : 이보다 짧은 조각은 잡음으로 간주하고 버림
"""

import audioop
import collections
import os
import sys
import time
import wave

import pyaudio
import webrtcvad

INPUT_DEVICE_INDEX = None

TARGET_SAMPLE_RATE = 16000   # webrtcvad에 넣을 샘플레이트 (8000/16000/32000/48000 중 하나)
FRAME_DURATION_MS = 30       # webrtcvad는 10/20/30ms 프레임만 지원
VAD_AGGRESSIVENESS = 2       # 라즈베리파이 실내 잡음 고려해 2로 
PADDING_DURATION_MS = 700    # 이 시간 이상 무음이면 발화 종료로 판단
RATIO_THRESHOLD = 0.7        # 링버퍼 내 음성/무음 프레임 비율 임계값
MIN_PHRASE_DURATION_S = 0.3  # 이보다 짧은 조각은 잡음으로 간주하고 버림
OUTPUT_DIR = "vad_test_output"

class Frame:
    def __init__(self, data, timestamp, duration):
        self.data = data
        self.timestamp = timestamp
        self.duration = duration

def frame_generator(frame_duration_ms, audio_stream, native_rate, target_rate):
    """
    마이크에서 native_rate로 캡처한 오디오를 target_rate(webrtcvad용)로 실시간 다운샘플링하면서 고정 길이(frame_duration_ms) 프레임을 자름
    native_rate와 target_rate가 다르면 audioop.ratecv로 변환
    변환 결과 바이트 수가 매번 정확히 딱 떨어지지 않을 수 있어서 leftover 버퍼에 남은 바이트를 계속 이어붙였다가 정확한 프레임 크기가 모이면 그만큼만 자름
    """
    target_frame_bytes = int(target_rate * (frame_duration_ms / 1000.0)) * 2 
    capture_chunk_samples = int(native_rate * (frame_duration_ms / 1000.0))
    timestamp = 0.0
    duration = frame_duration_ms / 1000.0
    ratecv_state = None
    leftover = b""

    while True:
        raw = audio_stream.read(capture_chunk_samples, exception_on_overflow=False)

        if native_rate != target_rate:
            converted, ratecv_state = audioop.ratecv(
                raw, 2, 1, native_rate, target_rate, ratecv_state
            )
        else:
            converted = raw

        leftover += converted
        while len(leftover) >= target_frame_bytes:
            chunk = leftover[:target_frame_bytes]
            leftover = leftover[target_frame_bytes:]
            yield Frame(chunk, timestamp, duration)
            timestamp += duration

def vad_collector(sample_rate, frame_duration_ms, padding_duration_ms, vad, frames):
    """
    프레임 스트림을 받아서 발화 구간(음성이 시작해서 끝날 때까지)을 자름

    동작 방식 :
    - 평소엔 최근 N개 프레임을 링버퍼에 담아두면서 그중 음성 비율이 RATIO_THRESHOLD를 넘으면 발화 시작으로 판단 (트리거 직전 프레임들도 같이 포함시켜서 발화 앞부분 유실 방지)
    - 발화 중엔 계속 프레임을 모으다가 최근 N개 프레임 중 무음 비율이 RATIO_THRESHOLD를 넘으면 발화 종료로 판단하고 지금까지 모은 프레임들을 하나의 구간으로 모음 
    """
    num_padding_frames = int(padding_duration_ms / frame_duration_ms)
    ring_buffer = collections.deque(maxlen=num_padding_frames)
    triggered = False
    voiced_frames = []
    phrase_start_ts = None

    for frame in frames:
        is_speech = vad.is_speech(frame.data, sample_rate)

        if not triggered:
            ring_buffer.append((frame, is_speech))
            num_voiced = len([f for f, speech in ring_buffer if speech])
            if num_voiced > RATIO_THRESHOLD * ring_buffer.maxlen:
                triggered = True
                phrase_start_ts = ring_buffer[0][0].timestamp
                for f, _ in ring_buffer:
                    voiced_frames.append(f)
                ring_buffer.clear()
        else:
            voiced_frames.append(frame)
            ring_buffer.append((frame, is_speech))
            num_unvoiced = len([f for f, speech in ring_buffer if not speech])
            if num_unvoiced > RATIO_THRESHOLD * ring_buffer.maxlen:
                duration = frame.timestamp + frame.duration - phrase_start_ts
                if duration >= MIN_PHRASE_DURATION_S:
                    yield phrase_start_ts, duration, voiced_frames
                triggered = False
                ring_buffer.clear()
                voiced_frames = []

def list_input_devices(pa):
    print("사용 가능한 입력 장치 목록:")
    for i in range(pa.get_device_count()):
        info = pa.get_device_info_by_index(i)
        if info.get("maxInputChannels", 0) > 0:
            rate = int(info["defaultSampleRate"])
            print(f"  [{i}] {info['name']}  (기본 샘플레이트: {rate}Hz)")

def pick_input_device(pa, requested_index):
    if requested_index is not None:
        info = pa.get_device_info_by_index(requested_index)
        return requested_index, int(info["defaultSampleRate"])

    for i in range(pa.get_device_count()):
        info = pa.get_device_info_by_index(i)
        if info.get("maxInputChannels", 0) > 0 and "usb" in info["name"].lower():
            return i, int(info["defaultSampleRate"])

    default_info = pa.get_default_input_device_info()
    return default_info["index"], int(default_info["defaultSampleRate"])

def save_wav(path, frames, sample_rate):
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16bit
        wf.setframerate(sample_rate)
        wf.writeframes(b"".join(f.data for f in frames))

def main():
    pa = pyaudio.PyAudio()

    if "--list-devices" in sys.argv:
        list_input_devices(pa)
        pa.terminate()
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    device_index, native_rate = pick_input_device(pa, INPUT_DEVICE_INDEX)
    device_name = pa.get_device_info_by_index(device_index)["name"]
    print(f"[mic_test2] 입력 장치: [{device_index}] {device_name} (캡처 {native_rate}Hz)")

    vad = webrtcvad.Vad(VAD_AGGRESSIVENESS)

    stream = pa.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=native_rate,
        input=True,
        input_device_index=device_index,
        frames_per_buffer=int(native_rate * FRAME_DURATION_MS / 1000),
    )

    print(
        f"[mic_test2] VAD 실험 시작 (aggressiveness={VAD_AGGRESSIVENESS}, "
        f"padding={PADDING_DURATION_MS}ms). Ctrl+C로 종료."
    )

    frames = frame_generator(FRAME_DURATION_MS, stream, native_rate, TARGET_SAMPLE_RATE)
    segments = vad_collector(
        TARGET_SAMPLE_RATE, FRAME_DURATION_MS, PADDING_DURATION_MS, vad, frames
    )

    count = 0
    try:
        for start_ts, duration, voiced_frames in segments:
            count += 1
            wall_time = time.strftime("%H:%M:%S")
            filename = os.path.join(OUTPUT_DIR, f"phrase_{count:03d}.wav")
            save_wav(filename, voiced_frames, TARGET_SAMPLE_RATE)
            print(
                f"[{wall_time}] 발화 #{count} 감지 — 길이 {duration:.2f}초 → {filename}"
            )
    except KeyboardInterrupt:
        print("\n[mic_test2] 종료합니다.")
    finally:
        stream.stop_stream()
        stream.close()
        pa.terminate()

if __name__ == "__main__":
    sys.exit(main())