import sqlite3

# DB 파일 연결
conn = sqlite3.connect('tint_logs.db')
cursor = conn.cursor()

print("=== 저장된 TINT 판별 로그 확인 ===")
# filter_logs 테이블에 있는 모든 데이터를 가져오기
cursor.execute("SELECT * FROM filter_logs")
rows = cursor.fetchall()

if not rows:
    print("아직 저장된 데이터가 없습니다.")
else:
    for row in rows:
        # row[0]: id, row[1]: 시간, row[2]: 텍스트, row[3]: 라벨
        print(f"[{row[1]}] 문장: '{row[2]}'  판정 레벨: {row[3]}")

conn.close()