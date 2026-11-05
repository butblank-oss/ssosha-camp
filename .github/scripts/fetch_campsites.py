"""고캠핑(한국관광공사) 공공데이터에서 캠핑장 목록을 받아 campsites.json으로 저장해요.

환경변수 GOCAMPING_KEY 에 공공데이터포털 '한국관광공사_고캠핑 정보 조회서비스'의
일반 인증키(Decoding)를 넣어 실행해요. 집(범계역)에서 직선 160km 안쪽만 남겨요.
"""
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request

KEY = os.environ.get("GOCAMPING_KEY", "").strip()
if not KEY:
    sys.exit("GOCAMPING_KEY 시크릿이 비어 있어요.")

BASE = "https://apis.data.go.kr/B551011/GoCamping/basedList"
HOME = (37.3899, 126.9507)  # 안양 범계역
MAX_KM = 160


def page(no, rows=1000):
    q = urllib.parse.urlencode({"serviceKey": KEY, "numOfRows": rows, "pageNo": no, "MobileOS": "ETC",
                                "MobileApp": "SoshaCamp", "_type": "json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(f"{BASE}?{q}", timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:  # 네트워크가 잠깐 끊기면 다시 시도해요
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def items_of(data):
    body = data.get("response", {}).get("body", {})
    items = body.get("items") or {}
    item = items.get("item", []) if isinstance(items, dict) else []
    return (item if isinstance(item, list) else [item]), int(body.get("totalCount") or 0)


def km(lat, lng):
    r = 6371
    p1, p2 = math.radians(HOME[0]), math.radians(lat)
    dp, dl = p2 - p1, math.radians(lng - HOME[1])
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def num(v):
    try:
        return int(float(v or 0))
    except ValueError:
        return 0


raw, no = [], 1
while True:
    items, total = items_of(page(no))
    raw += items
    if not items or len(raw) >= total:
        break
    no += 1

out = []
for it in raw:
    try:
        lat, lng = float(it.get("mapY") or 0), float(it.get("mapX") or 0)
    except ValueError:
        continue
    if not lat or not lng:
        continue
    d = km(lat, lng)
    if d > MAX_KM:
        continue
    sbrs = [s.strip() for s in (it.get("sbrsCl") or "").split(",") if s.strip()]
    floor = {"잔디": num(it.get("siteBottomCl1")), "파쇄석": num(it.get("siteBottomCl2")), "데크": num(it.get("siteBottomCl3")),
             "자갈": num(it.get("siteBottomCl4")), "흙": num(it.get("siteBottomCl5"))}
    out.append({
        "id": it.get("contentId") or "",
        "name": (it.get("facltNm") or "").strip(),
        "intro": (it.get("lineIntro") or "").strip(),
        "type": it.get("induty") or "",
        "area": " ".join(x for x in [it.get("doNm"), it.get("sigunguNm")] if x),
        "addr": it.get("addr1") or "",
        "km": round(d, 1),
        "fire": it.get("brazierCl") or "",  # 개별 / 공용 / 불가
        "wood": "장작판매" in sbrs,
        "elec": "전기" in sbrs,
        "water": "온수" in sbrs,
        "pet": it.get("animalCmgCl") or "",  # 가능 / 가능(소형견) / 불가능
        "season": it.get("operPdCl") or "",
        "days": it.get("operDeCl") or "",
        "floor": {k: v for k, v in floor.items() if v},
        "book": it.get("resveCl") or "",
        "url": it.get("resveUrl") or it.get("homepage") or "",
        "tel": it.get("tel") or "",
        "img": it.get("firstImageUrl") or "",
    })

out.sort(key=lambda x: x["km"])
with open("campsites.json", "w", encoding="utf-8") as f:
    json.dump({"updated": time.strftime("%Y-%m-%d"), "home": "안양 범계역", "items": out}, f, ensure_ascii=False, separators=(",", ":"))
print(f"전체 {len(raw)}곳 중 {len(out)}곳 저장")
