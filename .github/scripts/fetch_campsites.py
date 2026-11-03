"""고캠핑(한국관광공사) 공공데이터에서 전국 캠핑장 목록을 받아 campsites.json으로 저장해요.
환경변수 GOCAMPING_KEY 에 공공데이터포털의 '일반 인증키(Decoding)'를 넣어 실행해요."""
import json, os, sys, time, urllib.parse, urllib.request

KEY = os.environ.get("GOCAMPING_KEY", "").strip()
if not KEY:
    sys.exit("GOCAMPING_KEY 시크릿이 비어 있어요.")
BASE = "https://apis.data.go.kr/B551011/GoCamping/basedList"
FIELDS = ["contentId", "facltNm", "lineIntro", "induty", "lctCl", "doNm", "sigunguNm", "addr1", "mapX", "mapY",
          "tel", "homepage", "resveUrl", "sbrsCl", "animalCmgCl", "firstImageUrl", "operPdCl", "operDeCl", "posblFcltyCl"]


def page(no, rows=1000):
    q = urllib.parse.urlencode({"serviceKey": KEY, "numOfRows": rows, "pageNo": no, "MobileOS": "ETC",
                                "MobileApp": "SoshaCamp", "_type": "json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(f"{BASE}?{q}", timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # 네트워크가 잠깐 끊기면 다시 시도해요
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def items_of(data):
    body = data.get("response", {}).get("body", {})
    items = body.get("items") or {}
    item = items.get("item", []) if isinstance(items, dict) else []
    return (item if isinstance(item, list) else [item]), int(body.get("totalCount") or 0)


out, no, total = [], 1, None
while True:
    items, total = items_of(page(no))
    out += [{k: (it.get(k) or "") for k in FIELDS} for it in items]
    if not items or len(out) >= total:
        break
    no += 1

if not out:
    sys.exit("받은 캠핑장이 없어요. 인증키가 맞는지 확인해 주세요.")
out.sort(key=lambda c: (c["doNm"], c["sigunguNm"], c["facltNm"]))
with open("campsites.json", "w", encoding="utf-8") as f:
    json.dump({"updated": time.strftime("%Y-%m-%d"), "count": len(out), "items": out}, f, ensure_ascii=False, separators=(",", ":"))
print(f"{len(out)}개 캠핑장을 저장했어요.")
