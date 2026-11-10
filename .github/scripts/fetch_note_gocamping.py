"""캠핑수첩(note/)에 붙일 고캠핑(한국관광공사) 정보를 받아 note/gocamping.json으로 저장해요.

- camps: 우리 후보 중 고캠핑에 있는 곳의 사진(여러 장)·한 줄 소개·전화·운영 기간·바닥·시설·반려동물·화로대
- nearby: 범계에서 가깝고(직선 90km 안) 반려동물 가능 + 개별 화로대인 고캠핑 캠핑장 (우리 후보에 없는 곳)
- 환경변수 GOCAMPING_KEY(공공데이터포털 일반 인증키, Decoding)가 있으면 API로 전체를 받고,
  없으면 레포의 campsites.json(쏘샤캠프가 매주 받는 목록)으로 대신 만들어요(사진 1장, 일부 정보만).
- 인증키는 Actions 시크릿에만 있고 페이지에는 들어가지 않아요.
- 고캠핑 정보 조회서비스는 공공누리 제1유형(출처 표시)이라 페이지에 "사진: 고캠핑(한국관광공사)"를 표시해요.
"""
import json
import math
import os
import re
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KEY = urllib.parse.unquote(os.environ.get("GOCAMPING_KEY", "").strip())
API = "https://apis.data.go.kr/B551011/GoCamping/"
HOME = (37.3899, 126.9507)  # 안양 범계역
NEAR_KM = 90
NEAR_MAX = 40
IMG_MAX = 10


def load(path, default):
    try:
        with open(os.path.join(ROOT, path), encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def call(op, **params):
    q = urllib.parse.urlencode({"serviceKey": KEY, "MobileOS": "ETC", "MobileApp": "CampingNote", "_type": "json", **params})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(f"{API}{op}?{q}", timeout=40) as r:
                body = json.loads(r.read().decode("utf-8")).get("response", {}).get("body", {})
            items = body.get("items") or {}
            item = items.get("item", []) if isinstance(items, dict) else []
            return (item if isinstance(item, list) else [item]), int(body.get("totalCount") or 0)
        except Exception as e:  # 공공데이터 서버가 잠깐 끊기면 다시 시도해요
            print(f"  {op} 실패 ({attempt + 1}/4): {e}")
            time.sleep(2 ** attempt)
    return [], 0


def km(lat, lng):
    p1, p2 = math.radians(HOME[0]), math.radians(lat)
    dp, dl = p2 - p1, math.radians(lng - HOME[1])
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(a))


def num(v):
    try:
        return int(float(v or 0))
    except ValueError:
        return 0


def clean_url(u):
    u = (u or "").strip().split()[0] if (u or "").strip() else ""
    if u and not u.startswith("http"):
        u = "http://" + u
    return u if re.match(r"^https?://[^\s\"'<>]+$", u) else ""


def from_api(it):
    try:
        lat, lng = float(it.get("mapY") or 0), float(it.get("mapX") or 0)
    except ValueError:
        lat = lng = 0
    floor = {"잔디": num(it.get("siteBottomCl1")), "파쇄석": num(it.get("siteBottomCl2")), "데크": num(it.get("siteBottomCl3")),
             "자갈": num(it.get("siteBottomCl4")), "흙": num(it.get("siteBottomCl5"))}
    return {
        "gc": str(it.get("contentId") or ""), "name": (it.get("facltNm") or "").strip(),
        "intro": (it.get("lineIntro") or "").strip(), "feature": (it.get("featureNm") or "").strip()[:300],
        "type": it.get("induty") or "", "addr": it.get("addr1") or "",
        "km": round(km(lat, lng), 1) if lat and lng else None,
        "tel": (it.get("tel") or "").strip(), "home": clean_url(it.get("homepage")), "book": clean_url(it.get("resveUrl")),
        "season": it.get("operPdCl") or "", "days": it.get("operDeCl") or "",
        "floor": {k: v for k, v in floor.items() if v},
        "sbrs": [s.strip() for s in (it.get("sbrsCl") or "").split(",") if s.strip()],
        "pet": it.get("animalCmgCl") or "", "fire": it.get("brazierCl") or "",
        "img": it.get("firstImageUrl") or "",
    }


def from_cached(it):
    sbrs = [n for n, on in (("전기", it.get("elec")), ("온수", it.get("water")), ("장작판매", it.get("wood"))) if on]
    return {"gc": str(it.get("id") or ""), "name": it.get("name") or "", "intro": it.get("intro") or "", "feature": "",
            "type": it.get("type") or "", "addr": it.get("addr") or "", "km": it.get("km"), "tel": it.get("tel") or "",
            "home": clean_url(it.get("url")), "book": "", "season": it.get("season") or "", "days": it.get("days") or "",
            "floor": it.get("floor") or {}, "sbrs": sbrs, "pet": it.get("pet") or "", "fire": it.get("fire") or "",
            "img": it.get("img") or ""}


def core(name):
    s = re.sub(r"\(.*?\)|\s", "", name or "")
    for tail in ("오토캠핑장", "캠핑장", "야영장", "캠핑", "캠프", "오토"):
        s = s.replace(tail, "")
    return s


def town(addr):
    m = re.search(r"(\S+[시군구])(?:\s|$)", addr or "")
    return m.group(1) if m else ""


def pick(camp, pool):
    if camp.get("gc"):
        for c in pool:
            if c["gc"] == str(camp["gc"]):
                return c
    short = re.sub(r"^\S+\s", "", camp["n"])  # "강화 스톤캠핑장" → "스톤캠핑장"
    names = {core(camp.get("kw") or ""), core(short), core(camp["n"])} - {""}
    t = town(camp.get("a", ""))
    best = None
    for c in pool:
        theirs = core(c["name"])
        if not theirs or (t and t not in c["addr"]):
            continue  # 같은 이름이라도 다른 동네면 건너뛰어요
        if theirs in names:
            return c
        if any(min(len(n), len(theirs)) >= 4 and (n in theirs or theirs in n) for n in names):
            best = best or c
    return best


# 1) 고캠핑 전체 목록
if KEY:
    raw, no = [], 1
    while True:
        items, total = call("basedList", numOfRows=1000, pageNo=no)
        raw += items
        if not items or len(raw) >= total:
            break
        no += 1
    pool = [from_api(it) for it in raw]
    print(f"고캠핑 전체 {len(pool)}곳")
else:
    pool = [from_cached(it) for it in load("campsites.json", {"items": []})["items"]]
    print(f"인증키 없음: campsites.json {len(pool)}곳으로 만들어요")
if not pool:
    raise SystemExit("고캠핑 목록을 받지 못했어요. 예전 파일을 그대로 둬요.")

# 2) 우리 후보와 짝맞추기 + 사진 여러 장
data = load("note/camps.json", {"camps": []})
camps, used = {}, set()
for camp in data["camps"]:
    hit = pick(camp, pool)
    if not hit:
        print(f"없음  {camp['n']}")
        continue
    info = dict(hit)
    imgs = [hit["img"]] if hit["img"] else []
    if KEY:
        items, _ = call("imageList", contentId=hit["gc"], numOfRows=IMG_MAX, pageNo=1)
        imgs += [i.get("imageUrl") for i in items if i.get("imageUrl")]
        time.sleep(0.2)
    info["imgs"] = list(dict.fromkeys(imgs))[:IMG_MAX]
    camps[camp["id"]] = info
    used.add(hit["gc"])
    print(f"찾음  {camp['n']} → {hit['name']} (사진 {len(info['imgs'])}장)")

# 3) 범계 근처, 반려동물 가능 + 개별 화로대 + 야영장, 사진 있는 곳 ("안 되는 곳"으로 알아본 곳은 빼요)
dropped = {core(x) for d in data.get("drop", []) for x in re.split(r"\s*·\s*", re.sub(r"^\S+\s", "", d["n"]))}
nearby = [c for c in pool if c["gc"] not in used and c["km"] is not None and c["km"] <= NEAR_KM
          and c["pet"].startswith("가능") and c["fire"] == "개별" and c["img"] and "야영장" in c["type"]
          and not any(x and (x in core(c["name"]) or core(c["name"]) in x) for x in dropped)]
nearby.sort(key=lambda c: c["km"])
nearby = nearby[:NEAR_MAX]
for c in nearby:
    c["imgs"] = [c["img"]]

with open(os.path.join(ROOT, "note/gocamping.json"), "w", encoding="utf-8") as f:
    json.dump({"updated": time.strftime("%Y-%m-%d"), "source": "고캠핑(한국관광공사) 공공누리 제1유형",
               "full": bool(KEY), "camps": camps, "nearby": nearby}, f, ensure_ascii=False, indent=1)
print(f"후보 {len(data['camps'])}곳 중 {len(camps)}곳 짝맞춤 · 주변 추천 {len(nearby)}곳")
