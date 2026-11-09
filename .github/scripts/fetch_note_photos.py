"""캠핑수첩(note/)의 캠핑장마다 고캠핑(한국관광공사) 대표 사진을 찾아 note/photos.json으로 저장해요.

- 고캠핑에 있는 곳만 사진을 붙여요. 못 찾으면 그림 썸네일이 그대로 나와요.
- 환경변수 GOCAMPING_KEY(공공데이터포털 일반 인증키, Decoding)가 있으면 캠핑장 이름으로 검색하고,
  없으면 레포의 campsites.json(쏘샤캠프가 매주 받는 목록)에서만 찾아요.
- 인증키는 Actions 시크릿에만 있고 페이지에는 들어가지 않아요. 사진 주소(gocamping.or.kr)만 저장해요.
- 고캠핑 정보 조회서비스는 공공누리 제1유형(출처 표시)이라 페이지에 "사진: 고캠핑(한국관광공사)"를 꼭 표시해요.
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KEY = urllib.parse.unquote(os.environ.get("GOCAMPING_KEY", "").strip())
SEARCH = "https://apis.data.go.kr/B551011/GoCamping/searchList"


def load(path, default):
    try:
        with open(os.path.join(ROOT, path), encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def core(name):
    """비교용 이름: 공백·괄호·흔한 꼬리말을 뺀 글자만 남겨요."""
    s = re.sub(r"\(.*?\)|\s", "", name or "")
    for tail in ("오토캠핑장", "캠핑장", "야영장", "캠핑", "캠프", "오토"):
        s = s.replace(tail, "")
    return s


def town(addr):
    """주소에서 시·군·구 이름(예: 강화군, 제천시)을 찾아요."""
    m = re.search(r"(\S+[시군구])(?:\s|$)", addr or "")
    return m.group(1) if m else ""


def search(keyword):
    q = urllib.parse.urlencode({"serviceKey": KEY, "numOfRows": 20, "pageNo": 1, "MobileOS": "ETC",
                                "MobileApp": "CampingNote", "_type": "json", "keyword": keyword})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(f"{SEARCH}?{q}", timeout=30) as r:
                body = json.loads(r.read().decode("utf-8")).get("response", {}).get("body", {})
            items = (body.get("items") or {})
            item = items.get("item", []) if isinstance(items, dict) else []
            return [{"id": it.get("contentId") or "", "name": it.get("facltNm") or "", "addr": it.get("addr1") or "",
                     "img": it.get("firstImageUrl") or ""} for it in (item if isinstance(item, list) else [item])]
        except Exception as e:  # 잠깐 끊기면 다시 시도해요
            print(f"  검색 실패 ({attempt + 1}/3): {keyword}: {e}")
            time.sleep(2 ** attempt)
    return []


def pick(camp, pool):
    if camp.get("gc"):
        for c in pool:
            if str(c["id"]) == str(camp["gc"]):
                return c
    short = re.sub(r"^\S+\s", "", camp["n"])  # "강화 스톤캠핑장" → "스톤캠핑장"
    names = {core(camp.get("kw") or ""), core(short), core(camp["n"])} - {""}
    t = town(camp.get("a", ""))
    best = None
    for c in pool:
        theirs = core(c["name"])
        if not theirs or not c.get("img"):
            continue
        if t and t not in c["addr"]:
            continue  # 같은 이름이라도 다른 동네면 건너뛰어요
        if theirs in names:
            return c
        if any(min(len(n), len(theirs)) >= 4 and (n in theirs or theirs in n) for n in names):
            best = best or c
    return best


data = load("note/camps.json", {"camps": []})
pool = [{"id": it["id"], "name": it["name"], "addr": it["addr"], "img": it["img"]} for it in load("campsites.json", {"items": []})["items"]]
old = load("note/photos.json", {"items": {}}).get("items", {})
out = {}
for camp in data["camps"]:
    cands = list(pool)
    if KEY:
        words = {camp.get("kw") or "", re.sub(r"^\S+\s", "", camp["n"]), camp["n"]}
        for w in [w for w in words if w]:
            cands = search(w) + cands
            time.sleep(0.2)
    hit = pick(camp, cands)
    if hit:
        out[camp["id"]] = {"img": hit["img"], "gc": str(hit["id"]), "name": hit["name"]}
        print(f"찾음  {camp['n']} → {hit['name']}")
    elif camp["id"] in old and not KEY:
        out[camp["id"]] = old[camp["id"]]  # 키 없이 돌릴 땐 예전에 찾은 사진을 지켜요
    else:
        print(f"없음  {camp['n']}")

with open(os.path.join(ROOT, "note/photos.json"), "w", encoding="utf-8") as f:
    json.dump({"updated": time.strftime("%Y-%m-%d"), "source": "고캠핑(한국관광공사) 공공누리 제1유형", "items": out},
              f, ensure_ascii=False, indent=1)
print(f"{len(data['camps'])}곳 중 {len(out)}곳 사진 저장")
