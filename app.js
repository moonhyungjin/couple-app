(function () {
  "use strict";

  const STORAGE_KEY = "couple_app_mvp_state_v2";
  const ROLE_KEY = "couple_app_role_v1";
  const THEME_KEY = "couple_app_theme_v1";

  const MOOD_PRESETS = [
    "출근길 🚇",
    "열일중 💻",
    "칼퇴예정 🏃",
    "배고파 🍖",
    "보고싶어 💛",
    "집안일중 🧹",
    "휴식중 🛋️",
    "외출중 🌿"
  ];

  const DAILY_QUESTIONS = [
    "이번 주말에 둘이서 꼭 같이 먹고 싶은 음식이나 가고 싶은 곳은?",
    "요즘 배우자에게 가장 고마웠던 사소한 순간 하나는?",
    "오늘 하루 중 가장 피곤했거나 위로받고 싶었던 순간은?",
    "우리가 올해 안에 꼭 같이 해보고 싶은 버킷리스트 1가지는?",
    "서로에게 해주고 싶은 칭찬 한마디를 적어본다면?",
    "내일 저녁 메뉴로 가장 끌리는 음식 장르는?",
    "최근에 같이 본 영상·드라마·장소 중 제일 좋았던 것은?"
  ];

  // 남한 일러스트 지도 권역 정의 (viewBox 0 0 420 510 기준)
  const KOREA_REGIONS = [
    {
      id: "gyeonggi",
      name: "경기도",
      sub: "경기·인천",
      cx: 152,
      cy: 146,
      pinX: 156,
      pinY: 84,
      fill: "#fff1d6",
      activeFill: "#ffdf9e",
      keywords: ["경기", "경기도", "인천", "수원", "성남", "분당", "고양", "일산", "용인", "가평", "양평", "파주", "김포", "화성", "동탄", "평택", "남양주", "하남", "부천", "안양", "강화"],
      path: "M 105,58 L 140,46 L 172,42 L 185,95 L 195,150 L 152,168 L 108,168 L 98,148 L 80,122 L 86,84 Z"
    },
    {
      id: "gangwon",
      name: "강원도",
      sub: "강릉·속초·춘천",
      cx: 252,
      cy: 118,
      pinX: 258,
      pinY: 112,
      fill: "#dcf3e7",
      activeFill: "#b5e7ce",
      keywords: ["강원", "강원도", "강릉", "속초", "양양", "춘천", "원주", "동해", "삼척", "평창", "정선", "홍천", "인제", "고성"],
      path: "M 172,42 L 215,34 L 255,28 L 288,72 L 308,118 L 324,172 L 232,175 L 195,150 L 185,95 Z"
    },
    {
      id: "chungcheong",
      name: "충청도",
      sub: "대전·충남·충북",
      cx: 154,
      cy: 218,
      pinX: 150,
      pinY: 215,
      fill: "#fef4c7",
      activeFill: "#fde488",
      keywords: ["충청", "충청도", "충남", "충북", "대전", "세종", "천안", "아산", "청주", "충주", "단양", "제천", "태안", "보령", "대천", "공주", "부여", "당진", "서산"],
      path: "M 108,168 L 152,168 L 195,150 L 232,175 L 222,222 L 200,268 L 148,268 L 95,268 L 82,240 L 62,204 L 84,180 Z"
    },
    {
      id: "jeolla",
      name: "전라도",
      sub: "전주·여수·순천",
      cx: 150,
      cy: 300,
      pinX: 168,
      pinY: 404,
      fill: "#e3f2ce",
      activeFill: "#c7e79c",
      keywords: ["전라", "전라도", "전북", "전남", "전주", "여수", "순천", "목포", "군산", "익산", "남원", "담양", "보성", "해남", "완도", "구례", "고창", "부안"],
      path: "M 95,268 L 148,268 L 200,268 L 202,330 L 205,405 L 175,426 L 125,436 L 82,426 L 70,390 L 78,350 L 86,310 Z"
    },
    {
      id: "gyeongsang",
      name: "경상도",
      sub: "대구·경주·포항",
      cx: 268,
      cy: 262,
      pinX: 274,
      pinY: 256,
      fill: "#ebe4fa",
      activeFill: "#d2c3f5",
      keywords: ["경상", "경상도", "경북", "경남", "대구", "울산", "경주", "포항", "안동", "통영", "거제", "남해", "창원", "진주", "김해", "구미", "문경", "울진", "영덕"],
      path: "M 232,175 L 324,172 L 334,225 L 346,282 L 336,312 L 334,336 L 278,342 L 268,392 L 235,398 L 205,405 L 202,330 L 200,268 L 222,222 Z"
    },
    {
      id: "busan",
      name: "부산",
      sub: "해운대·광안리",
      cx: 302,
      cy: 366,
      pinX: 304,
      pinY: 364,
      fill: "#d4eefc",
      activeFill: "#9fd8f8",
      keywords: ["부산", "해운대", "광안리", "서면", "남포동", "기장", "송정", "영도", "감천"],
      path: "M 278,342 L 334,336 L 326,368 L 302,388 L 268,392 Z"
    },
    {
      id: "jeju",
      name: "제주도",
      sub: "제주·서귀포",
      cx: 155,
      cy: 480,
      pinX: 155,
      pinY: 478,
      fill: "#ffe4ed",
      activeFill: "#ffbed4",
      keywords: ["제주", "제주도", "서귀포", "애월", "협재", "성산", "우도", "함덕", "중문", "한라산"],
      path: "M 110,464 C 125,448 185,448 200,464 C 212,476 205,494 185,500 C 160,506 130,504 110,494 C 96,486 96,474 110,464 Z"
    },
    // 내륙 포위 권역(서울, 광주)은 위쪽 레이어에 그려져 클릭이 잘 되도록 뒤에 배치
    {
      id: "seoul",
      name: "서울",
      sub: "한강·성수·남산",
      cx: 126,
      cy: 112,
      pinX: 126,
      pinY: 110,
      fill: "#ffe0da",
      activeFill: "#ffbdb0",
      keywords: ["서울", "성수", "한강", "강남", "홍대", "연남", "이태원", "잠실", "여의도", "남산", "종로", "익선동", "명동", "혜화", "망원", "반포"],
      path: "M 104,96 L 144,95 L 154,112 L 143,128 L 106,128 L 96,112 Z"
    },
    {
      id: "gwangju",
      name: "광주",
      sub: "광주광역시",
      cx: 130,
      cy: 358,
      pinX: 130,
      pinY: 356,
      fill: "#ffd8be",
      activeFill: "#ffb888",
      keywords: ["광주", "광주광역시", "양림동", "동명동", "충장로", "상무지구", "수완지구", "무등산", "송정역"],
      path: "M 100,338 L 158,338 L 170,358 L 158,378 L 100,378 L 88,358 Z"
    }
  ];

  // 탭 버튼 등에 표시할 순서
  const REGION_ORDER = [
    "gyeonggi",
    "seoul",
    "gangwon",
    "chungcheong",
    "jeolla",
    "gwangju",
    "gyeongsang",
    "busan",
    "jeju"
  ];

  function getRegionById(regionId) {
    return (
      KOREA_REGIONS.find(function (r) {
        return r.id === regionId;
      }) || KOREA_REGIONS[0]
    );
  }

  // 텍스트(장소명)에서 지역 덩어리 자동 추론
  function inferRegionFromText(text) {
    if (!text) return null;
    const cleaned = String(text).trim();
    // 서울, 광주, 부산을 먼저 검사 (예: '광주 양림동' vs '경기도 광주시' 구분)
    if (cleaned.includes("경기도 광주") || cleaned.includes("경기 광주")) {
      return getRegionById("gyeonggi");
    }
    const checkOrder = ["gwangju", "seoul", "busan", "jeju", "gyeonggi", "gangwon", "chungcheong", "jeolla", "gyeongsang"];
    for (let i = 0; i < checkOrder.length; i++) {
      const reg = getRegionById(checkOrder[i]);
      for (let k = 0; k < reg.keywords.length; k++) {
        if (cleaned.includes(reg.keywords[k])) return reg;
      }
    }
    return null;
  }

  // GPS 위도/경도 → 남한 일러스트 지도 권역 및 (mapX, mapY) 변환
  function latLngToKoreaRegion(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return getRegionById("gyeonggi");
    if (lat < 34.15) return getRegionById("jeju");
    if (lat >= 37.42 && lat <= 37.70 && lng >= 126.76 && lng <= 127.18) {
      return getRegionById("seoul");
    }
    if (lat >= 35.05 && lat <= 35.25 && lng >= 126.74 && lng <= 127.02) {
      return getRegionById("gwangju");
    }
    if (lat >= 34.98 && lat <= 35.35 && lng >= 128.85 && lng <= 129.32) {
      return getRegionById("busan");
    }
    if (lat >= 36.95) {
      return lng >= 127.65 ? getRegionById("gangwon") : getRegionById("gyeonggi");
    }
    if (lat >= 35.98) {
      return lng >= 127.85 ? getRegionById("gyeongsang") : getRegionById("chungcheong");
    }
    return lng >= 127.62 ? getRegionById("gyeongsang") : getRegionById("jeolla");
  }

  // 초기 샘플 추억용 일러스트 썸네일 (SVG Data URL)
  function createSampleSvgPhoto(bg1, bg2, emoji, title) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg1}"/>
          <stop offset="100%" stop-color="${bg2}"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#g)"/>
      <circle cx="200" cy="125" r="58" fill="rgba(255,255,255,0.22)"/>
      <text x="200" y="145" font-size="64" text-anchor="middle">${emoji}</text>
      <text x="200" y="235" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${title}</text>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function createSampleMemories() {
    return [
      {
        id: "mem1",
        date: "2026-10-18",
        author: "wife",
        regionId: "gyeonggi",
        placeName: "가평 북한강 드라이브",
        mapX: 162,
        mapY: 78,
        caption: "주말 오후 경기도 가평 리버뷰 카페에서 커피 마시며 힐링 ☕",
        photoDataUrl: createSampleSvgPhoto("#e86c52", "#d84b6b", "🚗", "경기도 가평 드라이브")
      },
      {
        id: "mem2",
        date: "2026-10-03",
        author: "husband",
        regionId: "gwangju",
        placeName: "광주 양림동 & 동명동",
        mapX: 130,
        mapY: 356,
        caption: "광주 골목길 산책하고 맛있는 저녁 먹었던 날 🌇",
        photoDataUrl: createSampleSvgPhoto("#d48c29", "#e05d44", "🧡", "광주 데이트")
      },
      {
        id: "mem3",
        date: "2026-09-14",
        author: "wife",
        regionId: "jeolla",
        placeName: "여수 돌산공원 밤바다",
        mapX: 172,
        mapY: 406,
        caption: "전라도 여행 가서 반짝이는 여수 밤바다 보며 손잡고 산책 🌙",
        photoDataUrl: createSampleSvgPhoto("#3b5bdb", "#7048e8", "🌊", "전라도 여수 여행")
      },
      {
        id: "mem4",
        date: "2026-08-22",
        author: "husband",
        regionId: "jeju",
        placeName: "제주 애월 해안도로",
        mapX: 155,
        mapY: 478,
        caption: "푸른 제주 바다 앞에서 둘이 삼각대 세워놓고 찍은 사진 🌴",
        photoDataUrl: createSampleSvgPhoto("#2c8c74", "#38b2ac", "🌴", "제주도 여름 휴가")
      }
    ];
  }

  function createInitialState() {
    return {
      updatedAt: Date.now(),
      couple: {
        husbandName: "여보(남편)",
        wifeName: "자기(아내)",
        startDate: "2021-05-22",
        anniversaryTitle: "결혼기념일"
      },
      status: {
        husband: {
          mood: "열일중 💻",
          message: "오늘 저녁 맛있는 거 먹자!",
          updatedAt: "방금"
        },
        wife: {
          mood: "보고싶어 💛",
          message: "퇴근할 때 우유 하나만 사와줘~",
          updatedAt: "10분 전"
        }
      },
      activeAlert: {
        id: "welcome-alert",
        from: "wife",
        type: "poke",
        text: "🍎 자기(아내)님이 하트 콕! 찔렀어요: “오늘도 화이팅 💛”",
        time: "방금"
      },
      qa: {
        questionIndex: 0,
        customQuestion: "",
        husbandAnswer: "주말에 삼겹살 구워 먹고 근처 공원 산책하기!",
        wifeAnswer: ""
      },
      todos: [
        { id: "t1", text: "우유 1L · 계란 한 판 사기", category: "장보기", assignee: "남편", done: false },
        { id: "t2", text: "양파 · 대파 · 다진마늘", category: "장보기", assignee: "함께", done: false },
        { id: "t3", text: "건조기 돌리고 빨래 개기", category: "집안일", assignee: "함께", done: true },
        { id: "t4", text: "분리수거 및 음식물 쓰레기 버리기", category: "집안일", assignee: "남편", done: false },
        { id: "t5", text: "주말 본가 방문 선물 챙기기", category: "챙길것", assignee: "아내", done: false }
      ],
      coupons: [
        { id: "c1", title: "어깨·다리 안마 20분권", target: "남편", desc: "퇴근 후 정성스럽게 마사지해주기", remaining: 3, usedCount: 1 },
        { id: "c2", title: "설거지 1회 완전 면제권", target: "남편", desc: "식사 후 뒷정리 쿨하게 패스!", remaining: 2, usedCount: 0 },
        { id: "c3", title: "주말 아침 늦잠 보장권", target: "아내", desc: "오전 11시까지 깨우지 않고 조용히 해주기", remaining: 2, usedCount: 1 },
        { id: "c4", title: "야식 무조건 쏘기권", target: "함께", desc: "치킨·떡볶이 묻지도 따지지도 않고 시켜주기", remaining: 2, usedCount: 0 },
        { id: "c5", title: "잔소리 1회 방어권", target: "아내", desc: "한 번은 웃으면서 넘어가 주기", remaining: 1, usedCount: 0 }
      ],
      dinner: {
        selectedMenu: "차돌박이 된장찌개 + 계란말이",
        selectedCategory: "전체",
        menus: [
          { id: "m1", name: "차돌박이 된장찌개 + 계란말이", category: "집밥" },
          { id: "m2", name: "삼겹살 구이 + 비빔면", category: "집밥" },
          { id: "m3", name: "김치볶음밥 + 반숙 계란후라이", category: "집밥" },
          { id: "m4", name: "바삭한 후라이드·양념 반반 치킨", category: "배달·외식" },
          { id: "m5", name: "초밥 모둠 세트 + 우동", category: "배달·외식" },
          { id: "m6", name: "마라탕 & 꿔바로우", category: "배달·외식" },
          { id: "m7", name: "샤브샤브 & 칼국수", category: "배달·외식" },
          { id: "m8", name: "떡볶이 + 모둠튀김 + 순대", category: "야식·안주" },
          { id: "m9", name: "연어회 + 하이볼 한 잔", category: "야식·안주" }
        ]
      },
      wiki: {
        husband: {
          coffee: "아이스 아메리카노 (산미 없는 고소한 원두, 샷 추가)",
          sizes: "상의 105(XL) · 하의 32 · 신발 275mm",
          foodNote: "국물 요리, 돈까스, 제육볶음 좋아함 / 고수 못 먹음",
          wishlist: "무선 충전 거치대, 편한 라운지웨어"
        },
        wife: {
          coffee: "아이스 바닐라 라떼 (덜 달게, 디카페인 선호)",
          sizes: "상의 55(S) · 신발 235mm · 반지 11호",
          foodNote: "초밥, 파스타, 떡볶이, 복숭아 좋아함 / 너무 매운 건 못 먹음",
          wishlist: "향 좋은 핸드크림, 귀여운 파자마"
        }
      },
      cat: createDefaultCatState(),
      memories: createSampleMemories()
    };
  }

  function createDefaultCatState() {
    return {
      profile: {
        name: "치즈",
        birthDate: "2023-04-15",
        weightKg: "4.6",
        hospital: "우리동네 고양이병원"
      },
      today: {
        peeCount: 2,
        poopCount: 1,
        lastLitterBy: "오늘 오전 · 아내",
        duties: {
          morningMeal: "08:10 · 남편",
          eveningMeal: "",
          water: "08:15 · 남편",
          snack: "",
          play: "",
          brush: ""
        }
      },
      cycles: [
        { id: "cy1", title: "🪣 화장실 모래 전체갈이", lastDate: "2026-10-18", cycleDays: 21 },
        { id: "cy2", title: "💧 심장사상충 (레볼루션/브로드라인)", lastDate: "2026-10-05", cycleDays: 30 },
        { id: "cy3", title: "✂️ 발톱 깎기 & 귀 청소", lastDate: "2026-10-20", cycleDays: 14 },
        { id: "cy4", title: "⛲ 정수기 세척 · 필터 교체", lastDate: "2026-10-16", cycleDays: 14 }
      ],
      prefs: {
        favFood: "참치·치킨 베이스 주식캔, 가다랑어 츄르, 동결건조 트릿",
        hateFood: "연어 단독 습식캔(남김), 너무 큰 알갱이 사료",
        supplyNote: "벤토나이트 무향 가는 모래 / 아침 건사료 + 저녁 습식 1캔"
      },
      logs: [
        { id: "cl1", date: "2026-10-28", tag: "⚖️ 몸무게", text: "집에서 안고 잰 몸무게 4.6kg 유지중!", author: "husband" },
        { id: "cl2", date: "2026-10-21", tag: "🤮 헤어볼", text: "아침에 작은 헤어볼 한 번 토함, 이후 우다다 잘하고 밥 잘 먹음", author: "wife" }
      ]
    };
  }

  function normalizeMemories(list) {
    if (!Array.isArray(list)) return createSampleMemories();
    // 이전 버전의 기본 서울 샘플 3개만 그대로 남아 있는 경우 권역별 샘플로 업그레이드
    const isOldDefault =
      list.length === 3 &&
      list[0] &&
      list[0].id === "mem1" &&
      !list[0].regionId &&
      list[0].placeName === "성수동 카페거리";
    if (isOldDefault) {
      return createSampleMemories();
    }
    return list.map(function (m) {
      if (m.regionId && Number.isFinite(m.mapX) && Number.isFinite(m.mapY)) {
        return m;
      }
      const byText = inferRegionFromText(m.placeName);
      const reg = byText || latLngToKoreaRegion(m.lat, m.lng);
      return Object.assign({}, m, {
        regionId: reg.id,
        mapX: Number.isFinite(m.mapX) ? m.mapX : reg.pinX,
        mapY: Number.isFinite(m.mapY) ? m.mapY : reg.pinY
      });
    });
  }

  let state = loadState();
  let currentRole = localStorage.getItem(ROLE_KEY) || "husband";
  let currentTab = "home";
  let todoFilter = "전체";
  let dinnerFilter = "전체";
  let showCoupleSettings = false;
  let editingWikiRole = null;
  let editingCatProfile = false;
  let editingCatPrefs = false;
  let serverConnected = false;

  // 일러스트 남한 추억 지도 & 사진 등록용 상태
  let selectedMemoryId = null;
  let memoryRegionFilter = "전체";
  let draftMemory = {
    regionId: "gyeonggi",
    mapX: 156,
    mapY: 84,
    placeName: "",
    locSource: "📍 경기도 선택됨",
    photoDataUrl: "",
    date: new Date().toISOString().slice(0, 10)
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createInitialState();
      const parsed = JSON.parse(raw);
      const merged = Object.assign(createInitialState(), parsed);
      merged.memories = normalizeMemories(merged.memories);
      merged.cat = Object.assign(createDefaultCatState(), parsed.cat || {});
      return merged;
    } catch (_) {
      return createInitialState();
    }
  }

  function saveState(options) {
    const opts = options || {};
    state.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
    renderAll();
    if (!opts.skipRemote) {
      pushStateToServer();
    }
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTimeNow() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function calcDaysTogether(startDateStr) {
    const start = new Date(`${startDateStr}T00:00:00`);
    if (Number.isNaN(start.getTime())) return { days: 1, nextLabel: "" };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;

    let nextAnniv = new Date(today.getFullYear(), start.getMonth(), start.getDate());
    if (nextAnniv < today) {
      nextAnniv = new Date(today.getFullYear() + 1, start.getMonth(), start.getDate());
    }
    const remainDays = Math.round((nextAnniv - today) / (1000 * 60 * 60 * 24));
    const years = nextAnniv.getFullYear() - start.getFullYear();
    const nextLabel =
      remainDays === 0
        ? `🎉 오늘이 ${years}주년 기념일이에요!`
        : `다음 ${years}주년(${start.getMonth() + 1}/${start.getDate()})까지 D-${remainDays}`;

    return {
      days: Math.max(1, diffDays),
      nextLabel
    };
  }

  function roleLabel(role) {
    return role === "husband" ? state.couple.husbandName : state.couple.wifeName;
  }

  function partnerRole() {
    return currentRole === "husband" ? "wife" : "husband";
  }

  function updateSyncPill(modeText, isLive) {
    const syncText = document.getElementById("syncText");
    const syncDot = document.querySelector(".sync-dot");
    if (syncText) syncText.textContent = modeText;
    if (syncDot) {
      syncDot.style.background = isLive ? "var(--mint)" : "var(--accent)";
    }
  }

  async function initRealtimeSync() {
    if (location.protocol === "file:") {
      updateSyncPill("로컬 저장됨", false);
      return;
    }
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error("No backend");
      const remote = await res.json();
      if (remote && remote.updatedAt && remote.updatedAt > (state.updatedAt || 0)) {
        state = Object.assign(createInitialState(), remote);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        renderAll();
      } else {
        await pushStateToServer();
      }
      serverConnected = true;
      updateSyncPill("Wi-Fi 실시간 동기화 중", true);

      const es = new EventSource("/api/stream");
      es.onmessage = function (ev) {
        try {
          const incoming = JSON.parse(ev.data);
          if (incoming && incoming.updatedAt && incoming.updatedAt > (state.updatedAt || 0)) {
            state = Object.assign(createInitialState(), incoming);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            renderAll();
          }
        } catch (_) {}
      };
      es.onerror = function () {
        updateSyncPill("로컬 저장됨 (오프라인)", false);
      };
    } catch (_) {
      updateSyncPill("로컬 저장됨", false);
    }
  }

  async function pushStateToServer() {
    if (!serverConnected && location.protocol === "file:") return;
    try {
      await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state)
      });
    } catch (_) {}
  }

  window.addEventListener("storage", function (e) {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        state = Object.assign(createInitialState(), JSON.parse(e.newValue));
        renderAll();
      } catch (_) {}
    }
  });

  // =========================================================================
  // 사진 EXIF GPS 위도·경도·촬영일 파서 (외부 라이브러리 없이 JPEG 바이너리 직접 해석)
  // =========================================================================
  function parseExifGpsFromArrayBuffer(buffer) {
    try {
      const view = new DataView(buffer);
      if (view.byteLength < 12 || view.getUint16(0, false) !== 0xffd8) return null;
      let offset = 2;
      while (offset + 4 < view.byteLength) {
        const marker = view.getUint16(offset, false);
        offset += 2;
        if (marker === 0xffe1) {
          const length = view.getUint16(offset, false);
          if (view.getUint32(offset + 2, false) === 0x45786966) {
            return readTiffHeader(view, offset + 8);
          }
          offset += length;
        } else if ((marker & 0xff00) !== 0xff00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }
    } catch (_) {}
    return null;
  }

  function readTiffHeader(view, tiffStart) {
    const endian = view.getUint16(tiffStart, false);
    const little = endian === 0x4949;
    const firstIfdOffset = view.getUint32(tiffStart + 4, little);
    const ifd0 = tiffStart + firstIfdOffset;
    const entries = view.getUint16(ifd0, little);

    let gpsIfdPointer = 0;
    let exifIfdPointer = 0;

    for (let i = 0; i < entries; i++) {
      const entryOffset = ifd0 + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;
      const tag = view.getUint16(entryOffset, little);
      if (tag === 0x8825) {
        gpsIfdPointer = view.getUint32(entryOffset + 8, little);
      } else if (tag === 0x8769) {
        exifIfdPointer = view.getUint32(entryOffset + 8, little);
      }
    }

    let dateStr = "";
    if (exifIfdPointer) {
      const exifStart = tiffStart + exifIfdPointer;
      if (exifStart + 2 <= view.byteLength) {
        const exifCount = view.getUint16(exifStart, little);
        for (let i = 0; i < exifCount; i++) {
          const eo = exifStart + 2 + i * 12;
          if (eo + 12 > view.byteLength) break;
          const tag = view.getUint16(eo, little);
          if (tag === 0x9003 || tag === 0x0132) {
            const valOffset = tiffStart + view.getUint32(eo + 8, little);
            if (valOffset + 10 <= view.byteLength) {
              let s = "";
              for (let k = 0; k < 10; k++) {
                s += String.fromCharCode(view.getUint8(valOffset + k));
              }
              if (/^\d{4}:\d{2}:\d{2}$/.test(s)) {
                dateStr = s.replace(/:/g, "-");
              }
            }
          }
        }
      }
    }

    if (!gpsIfdPointer) return dateStr ? { date: dateStr } : null;

    const gpsStart = tiffStart + gpsIfdPointer;
    if (gpsStart + 2 > view.byteLength) return null;
    const gpsEntries = view.getUint16(gpsStart, little);

    let latRef = "N";
    let lonRef = "E";
    let latVals = null;
    let lonVals = null;

    function readThreeRationals(valOffset) {
      if (valOffset + 24 > view.byteLength) return null;
      const out = [];
      for (let k = 0; k < 3; k++) {
        const num = view.getUint32(valOffset + k * 8, little);
        const den = view.getUint32(valOffset + k * 8 + 4, little) || 1;
        out.push(num / den);
      }
      return out;
    }

    for (let i = 0; i < gpsEntries; i++) {
      const go = gpsStart + 2 + i * 12;
      if (go + 12 > view.byteLength) break;
      const tag = view.getUint16(go, little);
      if (tag === 1) {
        latRef = String.fromCharCode(view.getUint8(go + 8));
      } else if (tag === 2) {
        latVals = readThreeRationals(tiffStart + view.getUint32(go + 8, little));
      } else if (tag === 3) {
        lonRef = String.fromCharCode(view.getUint8(go + 8));
      } else if (tag === 4) {
        lonVals = readThreeRationals(tiffStart + view.getUint32(go + 8, little));
      }
    }

    if (latVals && lonVals) {
      let lat = latVals[0] + latVals[1] / 60 + latVals[2] / 3600;
      let lng = lonVals[0] + lonVals[1] / 60 + lonVals[2] / 3600;
      if (latRef === "S") lat = -lat;
      if (lonRef === "W") lng = -lng;
      if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
        return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), date: dateStr };
      }
    }
    return dateStr ? { date: dateStr } : null;
  }

  function extractExifFromFile(file) {
    return new Promise(function (resolve) {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = function (ev) {
        resolve(parseExifGpsFromArrayBuffer(ev.target.result));
      };
      reader.onerror = function () {
        resolve(null);
      };
      reader.readAsArrayBuffer(file.slice(0, 256 * 1024));
    });
  }

  // 좌표 → 동네/장소 이름 변환 (OpenStreetMap Nominatim 무료 역지오코딩)
  async function reverseGeocodeName(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=ko`;
      const res = await fetch(url);
      if (!res.ok) return "";
      const data = await res.json();
      const addr = data.address || {};
      const parts = [
        addr.city || addr.province || addr.county || "",
        addr.borough || addr.suburb || addr.town || addr.village || "",
        addr.Gup || addr.neighbourhood || addr.road || data.name || ""
      ].filter(Boolean);
      return parts.slice(0, 3).join(" ") || data.display_name?.split(",").slice(0, 2).join(" ") || "";
    } catch (_) {
      return "";
    }
  }

  function renderRoleBar() {
    document.querySelectorAll(".role-btn").forEach(function (btn) {
      const role = btn.getAttribute("data-role");
      btn.classList.toggle("is-active", role === currentRole);
    });
  }

  function renderHero() {
    const hero = document.getElementById("heroSection");
    if (!hero) return;
    const dday = calcDaysTogether(state.couple.startDate);
    const hStatus = state.status.husband;
    const wStatus = state.status.wife;

    hero.innerHTML = `
      <div class="hero-top">
        <div>
          <div class="couple-names">
            <span>${escapeHtml(state.couple.husbandName)}</span>
            <span>❤️</span>
            <span>${escapeHtml(state.couple.wifeName)}</span>
          </div>
          <div class="hero-sub">
            ${escapeHtml(state.couple.anniversaryTitle)} (${escapeHtml(state.couple.startDate)}) · ${escapeHtml(dday.nextLabel)}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="dday-badge">D+${dday.days.toLocaleString()}</span>
          <button type="button" class="icon-btn" id="openCoupleConfigBtn" title="부부 정보 수정" style="width:28px;height:28px;font-size:13px;background:rgba(255,255,255,0.22);color:#fff;border:0;">⚙️</button>
        </div>
      </div>

      ${
        showCoupleSettings
          ? `
        <form id="coupleConfigForm" style="margin-top:12px;background:rgba(0,0,0,0.18);padding:12px;border-radius:12px;display:grid;gap:8px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            <input type="text" name="husbandName" value="${escapeHtml(state.couple.husbandName)}" placeholder="남편 애칭" required>
            <input type="text" name="wifeName" value="${escapeHtml(state.couple.wifeName)}" placeholder="아내 애칭" required>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            <input type="text" name="anniversaryTitle" value="${escapeHtml(state.couple.anniversaryTitle)}" placeholder="기념일 이름">
            <input type="date" name="startDate" value="${escapeHtml(state.couple.startDate)}" required>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:6px;">
            <button type="button" class="btn secondary" id="cancelCoupleConfigBtn" style="padding:6px 11px;font-size:12px;">닫기</button>
            <button type="submit" class="btn" style="padding:6px 12px;font-size:12px;background:#fff;color:#d84b6b;">저장</button>
          </div>
        </form>
      `
          : ""
      }

      <div class="status-pair">
        <div class="status-box">
          <div class="status-who">
            <span>🤖 ${escapeHtml(state.couple.husbandName)}</span>
            <span>${escapeHtml(hStatus.updatedAt)}</span>
          </div>
          <div class="status-mood">${escapeHtml(hStatus.mood)}</div>
          <div class="status-msg" title="${escapeHtml(hStatus.message)}">${escapeHtml(hStatus.message)}</div>
        </div>
        <div class="status-box">
          <div class="status-who">
            <span>🍎 ${escapeHtml(state.couple.wifeName)}</span>
            <span>${escapeHtml(wStatus.updatedAt)}</span>
          </div>
          <div class="status-mood">${escapeHtml(wStatus.mood)}</div>
          <div class="status-msg" title="${escapeHtml(wStatus.message)}">${escapeHtml(wStatus.message)}</div>
        </div>
      </div>
    `;
  }

  function renderAlertSlot() {
    const slot = document.getElementById("alertSlot");
    if (!slot) return;
    if (!state.activeAlert) {
      slot.innerHTML = "";
      return;
    }
    slot.innerHTML = `
      <div class="poke-toast">
        <span>${escapeHtml(state.activeAlert.text)} <small style="opacity:0.75;font-weight:400;">(${escapeHtml(state.activeAlert.time)})</small></span>
        <button type="button" class="pill" id="dismissAlertBtn" style="padding:3px 9px;font-size:11.5px;">확인</button>
      </div>
    `;
  }

  function renderHomeTab() {
    const myStatus = state.status[currentRole];
    const partnerName = roleLabel(partnerRole());
    const qText =
      state.qa.customQuestion ||
      DAILY_QUESTIONS[state.qa.questionIndex % DAILY_QUESTIONS.length];
    const myAnswerKey = currentRole === "husband" ? "husbandAnswer" : "wifeAnswer";
    const myAnswer = state.qa[myAnswerKey] || "";
    const bothAnswered = Boolean(state.qa.husbandAnswer.trim() && state.qa.wifeAnswer.trim());

    return `
      <section class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">👋 지금 내 상태 · 한마디</h2>
            <div class="card-sub">현재 선택된 시점: <strong>${currentRole === "husband" ? "🤖 " + escapeHtml(state.couple.husbandName) : "🍎 " + escapeHtml(state.couple.wifeName)}</strong></div>
          </div>
          <button type="button" class="btn rose" id="pokePartnerBtn" style="padding:7px 12px;font-size:12.5px;">
            💌 ${escapeHtml(partnerName)} 콕 찌르기
          </button>
        </div>

        <div class="mood-grid">
          ${MOOD_PRESETS.map(function (m) {
            const active = myStatus.mood === m ? "is-active" : "";
            return `<button type="button" class="mood-chip ${active}" data-mood="${escapeHtml(m)}">${escapeHtml(m)}</button>`;
          }).join("")}
        </div>

        <form class="input-row" id="statusMsgForm">
          <input type="text" id="statusMsgInput" value="${escapeHtml(myStatus.message)}" maxlength="50" placeholder="배우자에게 보낼 상태 한마디 (예: 퇴근길에 맥주 사갈까?)">
          <button type="submit" class="btn">업데이트</button>
        </form>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">💬 오늘의 부부 블라인드 문답</h2>
            <div class="card-sub">둘 다 답변을 적어야 서로의 대답이 열려요!</div>
          </div>
          <button type="button" class="btn secondary" id="nextQuestionBtn" style="padding:6px 10px;font-size:12px;">🔄 다른 질문</button>
        </div>

        <div class="qa-question">Q. ${escapeHtml(qText)}</div>

        <form id="qaForm" style="display:grid;gap:8px;">
          <textarea id="qaAnswerInput" placeholder="${escapeHtml(roleLabel(currentRole))}의 답변을 적어주세요...">${escapeHtml(myAnswer)}</textarea>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <span class="card-sub">💡 상단에서 남편/아내 버튼을 눌러 양쪽 답변을 테스트해 보세요</span>
            <button type="submit" class="btn">${myAnswer ? "답변 수정" : "답변 등록"}</button>
          </div>
        </form>

        <div class="qa-answers">
          <div class="qa-box ${bothAnswered || currentRole === "husband" ? "" : "locked"}">
            <div style="font-weight:700;font-size:12px;color:var(--muted);margin-bottom:4px;">🤖 ${escapeHtml(state.couple.husbandName)}의 답변</div>
            <div>
              ${
                !state.qa.husbandAnswer.trim()
                  ? "아직 답변을 작성하지 않았어요."
                  : bothAnswered || currentRole === "husband"
                  ? escapeHtml(state.qa.husbandAnswer)
                  : "🔒 내가 답변을 등록하면 남편의 답변이 공개됩니다!"
              }
            </div>
          </div>

          <div class="qa-box ${bothAnswered || currentRole === "wife" ? "" : "locked"}">
            <div style="font-weight:700;font-size:12px;color:var(--muted);margin-bottom:4px;">🍎 ${escapeHtml(state.couple.wifeName)}의 답변</div>
            <div>
              ${
                !state.qa.wifeAnswer.trim()
                  ? "아직 답변을 작성하지 않았어요."
                  : bothAnswered || currentRole === "wife"
                  ? escapeHtml(state.qa.wifeAnswer)
                  : "🔒 내가 답변을 등록하면 아내의 답변이 공개됩니다!"
              }
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderTodoTab() {
    const categories = ["전체", "장보기", "집안일", "챙길것"];
    const filtered = state.todos.filter(function (item) {
      return todoFilter === "전체" || item.category === todoFilter;
    });
    const remainCount = state.todos.filter(function (t) {
      return !t.done;
    }).length;

    return `
      <section class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">🛒 공유 장보기 · 집안일 체크리스트</h2>
            <div class="card-sub">남은 할 일 <strong>${remainCount}건</strong> · 마트에서 실시간으로 함께 체크해요</div>
          </div>
          <button type="button" class="btn secondary" id="clearDoneTodosBtn" style="padding:6px 10px;font-size:12px;">완료 항목 정리</button>
        </div>

        <div class="filter-pills">
          ${categories
            .map(function (cat) {
              return `<button type="button" class="pill ${todoFilter === cat ? "is-active" : ""}" data-todo-filter="${cat}">${cat}</button>`;
            })
            .join("")}
        </div>

        <form id="addTodoForm" style="display:grid;gap:7px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            <select id="todoCatSelect">
              <option value="장보기">🥬 장보기</option>
              <option value="집안일">🧹 집안일</option>
              <option value="챙길것">📌 챙길것</option>
            </select>
            <select id="todoAssigneeSelect">
              <option value="함께">👫 함께</option>
              <option value="남편">🤖 남편 담당</option>
              <option value="아내">🍎 아내 담당</option>
            </select>
          </div>
          <div class="input-row">
            <input type="text" id="todoTextInput" placeholder="예: 양파 1망, 세탁세제 리필 사기" required>
            <button type="submit" class="btn">추가</button>
          </div>
        </form>

        <div class="todo-list">
          ${
            filtered.length === 0
              ? `<div class="qa-box locked">등록된 항목이 없어요. 위에서 새로 추가해 보세요!</div>`
              : filtered
                  .map(function (item) {
                    const assigneeClass =
                      item.assignee === "남편" ? "mint" : item.assignee === "아내" ? "rose" : "";
                    return `
                      <div class="todo-item ${item.done ? "is-done" : ""}">
                        <input type="checkbox" data-todo-toggle="${escapeHtml(item.id)}" ${item.done ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--primary);cursor:pointer;">
                        <span class="todo-text">${escapeHtml(item.text)}</span>
                        <span class="tag">${escapeHtml(item.category)}</span>
                        <span class="tag ${assigneeClass}">${escapeHtml(item.assignee)}</span>
                        <button type="button" class="pill" data-todo-del="${escapeHtml(item.id)}" style="padding:3px 7px;font-size:11px;">삭제</button>
                      </div>
                    `;
                  })
                  .join("")
          }
        </div>
      </section>
    `;
  }

  function renderCouponTab() {
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">🎟️ 부부 소환 쿠폰북</h2>
            <div class="card-sub">쿠폰을 쓰면 상단 배너로 배우자에게 즉시 호출 알림이 가요!</div>
          </div>
        </div>

        <div class="coupon-list">
          ${state.coupons
            .map(function (c) {
              const exhausted = c.remaining <= 0;
              return `
                <div class="coupon-ticket ${exhausted ? "is-used" : ""}">
                  <div class="coupon-info">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                      <span class="tag ${c.target === "남편" ? "mint" : c.target === "아내" ? "rose" : ""}">${escapeHtml(c.target)} 소환</span>
                      <span class="coupon-meta">남은 횟수 <strong>${c.remaining}회</strong> · 누적 사용 ${c.usedCount}회</span>
                    </div>
                    <h4>${escapeHtml(c.title)}</h4>
                    <div class="coupon-meta">${escapeHtml(c.desc)}</div>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:5px;">
                    <button type="button" class="btn ${exhausted ? "secondary" : ""}" data-use-coupon="${escapeHtml(c.id)}" ${exhausted ? "disabled" : ""} style="padding:7px 11px;font-size:12.5px;">
                      ${exhausted ? "소진됨" : "⚡ 소환 쓰기"}
                    </button>
                    <button type="button" class="pill" data-refill-coupon="${escapeHtml(c.id)}" style="font-size:11px;padding:3px 8px;">+1 충전</button>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>

        <form id="addCouponForm" style="border-top:1px solid var(--line);padding-top:12px;display:grid;gap:7px;">
          <div style="font-size:13px;font-weight:700;">➕ 새 쿠폰 직접 발행하기</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            <input type="text" id="couponTitleInput" placeholder="쿠폰 이름 (예: 카페 디저트 쏘기권)" required>
            <select id="couponTargetSelect">
              <option value="남편">🤖 남편이 해주는 쿠폰</option>
              <option value="아내">🍎 아내가 해주는 쿠폰</option>
              <option value="함께">👫 함께 쓰는 쿠폰</option>
            </select>
          </div>
          <div class="input-row">
            <input type="text" id="couponDescInput" placeholder="약속 내용 한 줄 설명" required>
            <button type="submit" class="btn">발행</button>
          </div>
        </form>
      </section>
    `;
  }

  function renderDinnerTab() {
    const categories = ["전체", "집밥", "배달·외식", "야식·안주"];
    const pool = state.dinner.menus.filter(function (m) {
      return dinnerFilter === "전체" || m.category === dinnerFilter;
    });

    return `
      <section class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">🍽️ 오늘 저녁 뭐 먹지? 룰렛</h2>
            <div class="card-sub">매일 퇴근길 최대 난제! 우리 집 단골 메뉴판에서 골라보세요</div>
          </div>
        </div>

        <div class="filter-pills">
          ${categories
            .map(function (cat) {
              return `<button type="button" class="pill ${dinnerFilter === cat ? "is-active" : ""}" data-dinner-filter="${cat}">${cat}</button>`;
            })
            .join("")}
        </div>

        <div class="roulette-stage">
          <div style="font-size:12px;color:var(--muted);font-weight:600;">오늘의 추천 메뉴</div>
          <div class="roulette-pick" id="rouletteDisplay">${escapeHtml(state.dinner.selectedMenu || "버튼을 눌러 메뉴를 뽑아보세요!")}</div>
          <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn" id="spinDinnerBtn">🎲 랜덤 메뉴 뽑기</button>
            <button type="button" class="btn mint" id="confirmDinnerBtn">📣 오늘 저녁 이걸로 콜!</button>
          </div>
        </div>

        <form class="input-row" id="addMenuForm">
          <select id="menuCatSelect" style="max-width:125px;">
            <option value="집밥">🍚 집밥</option>
            <option value="배달·외식">🛵 배달·외식</option>
            <option value="야식·안주">🍺 야식·안주</option>
          </select>
          <input type="text" id="menuNameInput" placeholder="우리 부부 좋아하는 메뉴 추가" required>
          <button type="submit" class="btn secondary">추가</button>
        </form>

        <div class="todo-list">
          ${pool
            .map(function (m) {
              return `
                <div class="todo-item">
                  <span class="tag">${escapeHtml(m.category)}</span>
                  <span class="todo-text">${escapeHtml(m.name)}</span>
                  <button type="button" class="pill" data-pick-menu="${escapeHtml(m.name)}" style="font-size:11.5px;">선택</button>
                  <button type="button" class="pill" data-del-menu="${escapeHtml(m.id)}" style="font-size:11.5px;">삭제</button>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function renderWikiCardFor(roleKey, icon, title) {
    const info = state.wiki[roleKey];
    const isEditing = editingWikiRole === roleKey;

    if (isEditing) {
      return `
        <form class="card" data-save-wiki="${roleKey}">
          <div class="card-head">
            <h3 class="card-title">${icon} ${escapeHtml(title)} 취향·사이즈 수정</h3>
            <button type="submit" class="btn" style="padding:6px 12px;font-size:12px;">저장 완료</button>
          </div>
          <label class="wiki-label">☕ 최애 커피·음료 주문법
            <input type="text" name="coffee" value="${escapeHtml(info.coffee)}">
          </label>
          <label class="wiki-label">👟 옷·신발·반지 사이즈
            <input type="text" name="sizes" value="${escapeHtml(info.sizes)}">
          </label>
          <label class="wiki-label">🍲 좋아하는 음식 / 못 먹는 것
            <input type="text" name="foodNote" value="${escapeHtml(info.foodNote)}">
          </label>
          <label class="wiki-label">🎁 갖고 싶어 하는 위시리스트
            <input type="text" name="wishlist" value="${escapeHtml(info.wishlist)}">
          </label>
        </form>
      `;
    }

    return `
      <section class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">${icon} ${escapeHtml(title)} 취향 도감</h2>
            <div class="card-sub">심부름하거나 깜짝 선물할 때 컨닝하는 메모장</div>
          </div>
          <button type="button" class="btn secondary" data-edit-wiki="${roleKey}" style="padding:6px 10px;font-size:12px;">✏️ 수정</button>
        </div>
        <div class="wiki-grid">
          <div class="wiki-item">
            <div class="wiki-label">☕ 최애 카페 메뉴</div>
            <div class="wiki-val">${escapeHtml(info.coffee)}</div>
          </div>
          <div class="wiki-item">
            <div class="wiki-label">👟 옷·신발·반지 사이즈</div>
            <div class="wiki-val">${escapeHtml(info.sizes)}</div>
          </div>
          <div class="wiki-item">
            <div class="wiki-label">🍲 음식 호불호</div>
            <div class="wiki-val">${escapeHtml(info.foodNote)}</div>
          </div>
          <div class="wiki-item">
            <div class="wiki-label">🎁 선물 위시리스트</div>
            <div class="wiki-val">${escapeHtml(info.wishlist)}</div>
          </div>
        </div>
      </section>
    `;
  }

  // 같은 지역에 여러 핀이 겹치지 않도록 살짝 퍼뜨려주는 좌표 계산
  function computeSpreadPositions(memories) {
    const offsets = [
      [0, 0],
      [-24, -10],
      [24, -8],
      [-18, 18],
      [22, 16],
      [0, -24],
      [-32, 4],
      [32, 4]
    ];
    const usedByRegion = {};
    return memories.map(function (mem) {
      const reg = getRegionById(mem.regionId);
      const baseX = Number.isFinite(mem.mapX) ? mem.mapX : reg.pinX;
      const baseY = Number.isFinite(mem.mapY) ? mem.mapY : reg.pinY;
      const key = reg.id;
      const idx = usedByRegion[key] || 0;
      usedByRegion[key] = idx + 1;

      // 사용자가 직접 클릭해 기본 좌표와 다른 곳을 찍었으면 그대로 쓰고, 기본 좌표면 살짝 분산
      const isDefaultSpot = Math.abs(baseX - reg.pinX) < 4 && Math.abs(baseY - reg.pinY) < 4;
      const off = isDefaultSpot ? offsets[idx % offsets.length] : [0, 0];
      const x = Math.max(36, Math.min(384, baseX + off[0]));
      const y = Math.max(44, Math.min(492, baseY + off[1]));
      return {
        mem,
        reg,
        x,
        y,
        leftPct: ((x / 420) * 100).toFixed(2),
        topPct: ((y / 510) * 100).toFixed(2)
      };
    });
  }

  function buildPhotoPinHtml(photoUrl, authorRole, isDraft, labelText) {
    const badge = isDraft ? "➕" : authorRole === "husband" ? "🤖" : "🍎";
    const inner = photoUrl
      ? `<img src="${photoUrl}" alt="pin">`
      : `<span class="photo-pin-fallback">📸</span>`;
    return `
      <div class="photo-pin ${isDraft ? "is-draft" : ""}">
        ${inner}
        <span class="photo-pin-badge">${badge}</span>
        ${labelText ? `<span class="photo-pin-label">${escapeHtml(labelText)}</span>` : ""}
      </div>
    `;
  }

  function renderIllustratedKoreaMap() {
    const selectedRegion = getRegionById(draftMemory.regionId);
    const placedPins = computeSpreadPositions(state.memories);
    const activeMem = state.memories.find(function (m) {
      return m.id === selectedMemoryId;
    });

    // 권역별 추억 개수 집계
    const countByRegion = {};
    state.memories.forEach(function (m) {
      const rid = m.regionId || "gyeonggi";
      countByRegion[rid] = (countByRegion[rid] || 0) + 1;
    });

    const draftLeftPct = (((draftMemory.mapX || selectedRegion.pinX) / 420) * 100).toFixed(2);
    const draftTopPct = (((draftMemory.mapY || selectedRegion.pinY) / 510) * 100).toFixed(2);

    return `
      <div class="memory-map-wrap">
        <div class="korea-map-stage" id="koreaMapStage" title="원하는 지역(경기도, 전라도, 광주 등)을 터치해 사진 마커 위치를 골라보세요!">
          <svg class="korea-map-svg" id="koreaMapSvg" viewBox="0 0 420 510" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="islandShadow" x="-10%" y="-10%" width="125%" height="125%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#1e4e68" flood-opacity="0.18"/>
              </filter>
            </defs>

            <!-- 바다 물결 & 나침반 일러스트 장식 -->
            <g opacity="0.55" stroke="#7ab8d9" stroke-width="1.8" fill="none" stroke-linecap="round">
              <path d="M 22,95 Q 30,89 38,95 T 54,95" />
              <path d="M 30,105 Q 38,99 46,105" />
              <path d="M 24,325 Q 32,319 40,325 T 56,325" />
              <path d="M 356,235 Q 364,229 372,235 T 388,235" />
              <path d="M 345,425 Q 353,419 361,425 T 377,425" />
              <path d="M 42,468 Q 50,462 58,468 T 74,468" />
            </g>

            <text x="42" y="255" class="kr-sea-label">서 해</text>
            <text x="376" y="210" class="kr-sea-label">동 해</text>
            <text x="255" y="445" class="kr-sea-label">남 해</text>

            <!-- 울릉도 · 독도 귀여운 섬 표현 -->
            <g filter="url(#islandShadow)">
              <circle cx="366" cy="138" r="9" fill="#e6f4ea" stroke="#ffffff" stroke-width="2"/>
              <circle cx="392" cy="146" r="4.5" fill="#e6f4ea" stroke="#ffffff" stroke-width="1.8"/>
            </g>
            <text x="378" y="164" class="kr-region-sub" style="font-size:9px;">울릉도·독도</text>

            <!-- 남한 큰 덩어리 권역 폴리곤 -->
            <g filter="url(#islandShadow)">
              ${KOREA_REGIONS.map(function (reg) {
                const isSel = draftMemory.regionId === reg.id;
                const hasMem = (countByRegion[reg.id] || 0) > 0;
                const fill = isSel || hasMem ? reg.activeFill : reg.fill;
                return `
                  <path
                    class="kr-region ${isSel ? "is-selected" : ""}"
                    data-region-id="${reg.id}"
                    d="${reg.path}"
                    fill="${fill}"
                  />
                `;
              }).join("")}
            </g>

            <!-- 권역 이름 라벨 (경기도, 전라도, 광주 등 큰 글씨) -->
            <g>
              ${KOREA_REGIONS.map(function (reg) {
                const cnt = countByRegion[reg.id] || 0;
                return `
                  <text x="${reg.cx}" y="${reg.cy}" class="kr-region-label">
                    ${escapeHtml(reg.name)}${cnt > 0 ? ` (${cnt})` : ""}
                  </text>
                `;
              }).join("")}
            </g>
          </svg>

          <!-- 사진 마커 레이어 -->
          <div class="kr-pins-layer">
            ${placedPins
              .map(function (item) {
                const m = item.mem;
                const isActive = m.id === selectedMemoryId;
                const shortLabel = (m.placeName || item.reg.name).slice(0, 8);
                return `
                  <div
                    class="kr-pin-anchor ${isActive ? "is-active" : ""}"
                    data-pin-mem="${escapeHtml(m.id)}"
                    style="left:${item.leftPct}%;top:${item.topPct}%;"
                    title="${escapeHtml(item.reg.name)} · ${escapeHtml(m.placeName)}"
                  >
                    ${buildPhotoPinHtml(m.photoDataUrl, m.author, false, shortLabel)}
                  </div>
                `;
              })
              .join("")}

            <!-- 새로 등록할 위치 미리보기 핀 (초록색 + 핀) -->
            <div
              class="kr-pin-anchor is-draft"
              style="left:${draftLeftPct}%;top:${draftTopPct}%;"
              title="새 추억이 등록될 위치 (${escapeHtml(selectedRegion.name)})"
            >
              ${buildPhotoPinHtml(
                draftMemory.photoDataUrl,
                currentRole,
                true,
                draftMemory.photoDataUrl ? "새 사진 위치" : selectedRegion.name + "에 추가"
              )}
            </div>
          </div>

          ${
            activeMem
              ? (function () {
                  const reg = getRegionById(activeMem.regionId);
                  const who =
                    activeMem.author === "husband"
                      ? "🤖 " + state.couple.husbandName
                      : "🍎 " + state.couple.wifeName;
                  return `
                    <div class="map-floating-popup" id="mapFloatingPopup">
                      ${activeMem.photoDataUrl ? `<img src="${activeMem.photoDataUrl}" alt="추억 사진">` : ""}
                      <div class="map-floating-body">
                        <div style="display:flex;align-items:center;gap:5px;margin-bottom:2px;">
                          <span class="tag">${escapeHtml(reg.name)}</span>
                          <strong style="font-size:12.5px;color:var(--primary);">${escapeHtml(activeMem.placeName)}</strong>
                        </div>
                        <div style="font-size:13px;font-weight:600;color:var(--ink);">${escapeHtml(activeMem.caption)}</div>
                        <div style="font-size:11px;color:var(--muted);margin-top:2px;">${escapeHtml(activeMem.date)} · ${escapeHtml(who)}</div>
                      </div>
                      <button type="button" class="pill" id="closeMapPopupBtn" style="padding:4px 8px;font-size:11px;">닫기</button>
                    </div>
                  `;
                })()
              : ""
          }
        </div>

        <div class="map-hint-bar">
          <span>👆 지도의 <strong>경기도·전라도·광주</strong> 등 원하는 지역을 터치해 사진 마커를 꽂아보세요!</span>
          <span class="tag mint">${escapeHtml(selectedRegion.name)} 선택됨</span>
        </div>
      </div>
    `;
  }

  function renderWikiTab() {
    const pinnedCount = state.memories.length;
    const selectedRegion = getRegionById(draftMemory.regionId);

    const countByRegion = {};
    state.memories.forEach(function (m) {
      const rid = m.regionId || "gyeonggi";
      countByRegion[rid] = (countByRegion[rid] || 0) + 1;
    });

    const filteredMemories = state.memories.filter(function (m) {
      return memoryRegionFilter === "전체" || m.regionId === memoryRegionFilter;
    });

    return `
      <!-- 1. 우리 둘만의 포토 추억 지도 (일러스트 남한 권역 지도) -->
      <section class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">🗺️ 우리 둘만의 포토 추억 지도</h2>
            <div class="card-sub">남한 지도에 꽂힌 추억 사진 마커 <strong>${pinnedCount}개</strong> · 지역을 터치해 사진을 남겨보세요</div>
          </div>
          ${
            selectedMemoryId
              ? `<button type="button" class="btn secondary" id="clearSelectedPinBtn" style="padding:6px 10px;font-size:12px;">핀 선택 해제</button>`
              : ""
          }
        </div>

        <!-- 큰 덩어리 지역 빠른 선택 버튼 -->
        <div class="region-chips-bar" role="group" aria-label="지역 선택">
          ${REGION_ORDER.map(function (rid) {
            const reg = getRegionById(rid);
            const cnt = countByRegion[rid] || 0;
            const active = draftMemory.regionId === rid ? "is-active" : "";
            return `
              <button type="button" class="region-chip ${active}" data-select-region="${reg.id}">
                <span>${escapeHtml(reg.name)}</span>
                ${cnt > 0 ? `<span class="cnt">${cnt}</span>` : ""}
              </button>
            `;
          }).join("")}
        </div>

        ${renderIllustratedKoreaMap()}

        <!-- 사진 촬영/업로드 + 지도 마커 등록 폼 -->
        <form id="addMemoryForm" style="display:grid;gap:8px;background:var(--surface-soft);padding:12px;border-radius:12px;border:1px solid var(--line);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="font-size:13px;font-weight:700;">📸 [${escapeHtml(selectedRegion.name)}]에 새 사진 마커 남기기</span>
            <span class="tag" id="exifStatusTag">${escapeHtml(draftMemory.locSource)}</span>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            <label class="btn secondary" style="cursor:pointer;font-size:12.5px;padding:8px 10px;">
              📷 사진 촬영 / 앨범 선택
              <input type="file" id="memPhotoInput" accept="image/*" style="display:none;">
            </label>
            <input type="date" id="memDateInput" value="${escapeHtml(draftMemory.date)}" required>
          </div>

          ${
            draftMemory.photoDataUrl
              ? `
            <div style="display:flex;align-items:center;gap:10px;background:var(--surface);padding:8px;border-radius:10px;border:1px solid var(--line);">
              <img src="${draftMemory.photoDataUrl}" alt="미리보기" style="width:54px;height:54px;object-fit:cover;border-radius:8px;">
              <div style="font-size:12px;color:var(--muted);">사진 준비 완료! 지도 위 <strong>${escapeHtml(selectedRegion.name)}</strong>의 초록색 미리보기 핀에 등록됩니다.</div>
            </div>
          `
              : ""
          }

          <div style="display:grid;grid-template-columns:115px 1fr;gap:6px;">
            <select id="memRegionSelect" aria-label="지역 선택">
              ${REGION_ORDER.map(function (rid) {
                const reg = getRegionById(rid);
                return `<option value="${reg.id}" ${draftMemory.regionId === reg.id ? "selected" : ""}>📍 ${escapeHtml(reg.name)}</option>`;
              }).join("")}
            </select>
            <input type="text" id="memPlaceInput" value="${escapeHtml(draftMemory.placeName)}" placeholder="세부 장소 (예: ${escapeHtml(selectedRegion.sub)})">
          </div>

          <div class="input-row">
            <input type="text" id="memCaptionInput" placeholder="오늘의 추억 한 줄 기록..." required>
            <button type="submit" class="btn">📍 지도에 등록</button>
          </div>
        </form>

        <!-- 지역별 필터 및 폴라로이드 추억 리스트 -->
        <div class="filter-pills">
          <button type="button" class="pill ${memoryRegionFilter === "전체" ? "is-active" : ""}" data-mem-filter="전체">전체 (${state.memories.length})</button>
          ${REGION_ORDER.filter(function (rid) {
            return (countByRegion[rid] || 0) > 0;
          })
            .map(function (rid) {
              const reg = getRegionById(rid);
              return `<button type="button" class="pill ${memoryRegionFilter === rid ? "is-active" : ""}" data-mem-filter="${rid}">${escapeHtml(reg.name)} (${countByRegion[rid]})</button>`;
            })
            .join("")}
        </div>

        <div class="polaroid-list">
          ${
            filteredMemories.length === 0
              ? `<div class="qa-box locked">아직 이 지역에 등록된 사진 추억이 없어요. 위 지도를 눌러 첫 사진 마커를 꽂아보세요!</div>`
              : filteredMemories
                  .map(function (mem) {
                    const who = mem.author === "husband" ? "🤖 " + state.couple.husbandName : "🍎 " + state.couple.wifeName;
                    const reg = getRegionById(mem.regionId);
                    return `
                      <article class="polaroid">
                        ${mem.photoDataUrl ? `<img src="${mem.photoDataUrl}" alt="추억 사진">` : ""}
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px;">
                          <div style="display:flex;align-items:center;gap:5px;">
                            <span class="tag mint">${escapeHtml(reg.name)}</span>
                            <span class="tag">${escapeHtml(mem.placeName || reg.name)}</span>
                          </div>
                          <button type="button" class="pill" data-focus-mem="${escapeHtml(mem.id)}" style="font-size:11.5px;padding:3px 9px;color:var(--primary);border-color:var(--primary);">📍 지도에서 보기</button>
                        </div>
                        <div class="polaroid-cap">${escapeHtml(mem.caption)}</div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                          <span class="polaroid-date">${escapeHtml(mem.date)} · ${escapeHtml(who)}</span>
                          <button type="button" class="pill" data-del-mem="${escapeHtml(mem.id)}" style="font-size:11px;padding:2px 8px;">삭제</button>
                        </div>
                      </article>
                    `;
                  })
                  .join("")
          }
        </div>
      </section>

      <!-- 2. 배우자 취향 도감 -->
      ${renderWikiCardFor("wife", "🍎", state.couple.wifeName)}
      ${renderWikiCardFor("husband", "🤖", state.couple.husbandName)}
    `;
  }

  function calcDaysSince(dateStr) {
    if (!dateStr) return 0;
    const past = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(past.getTime())) return 0;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(0, Math.floor((today - past) / (1000 * 60 * 60 * 24)));
  }

  function renderCatTab() {
    const cat = state.cat || createDefaultCatState();
    const prof = cat.profile;
    const today = cat.today;
    const daysWithCat = calcDaysSince(prof.birthDate) + 1;

    const dutyItems = [
      { key: "morningMeal", icon: "🍚", label: "아침밥 · 습식" },
      { key: "eveningMeal", icon: "🌙", label: "저녁밥 · 습식" },
      { key: "water", icon: "💧", label: "물그릇 세척 · 리필" },
      { key: "snack", icon: "🍭", label: "츄르·간식 (중복방지)" },
      { key: "play", icon: "🎣", label: "사냥놀이 15분" },
      { key: "brush", icon: "🪥", label: "양치 · 빗질" }
    ];

    return `
      <!-- 1. 외동냥이 프로필 & 오늘의 데일리 집사 체크 -->
      <section class="card">
        <div class="cat-banner">
          <div>
            <div style="font-size:17px;font-weight:800;display:flex;align-items:center;gap:6px;">
              <span>🐱 ${escapeHtml(prof.name)}</span>
              <span class="tag">${escapeHtml(prof.weightKg)}kg</span>
              <span class="tag mint">함께한 지 D+${daysWithCat.toLocaleString()}</span>
            </div>
            <div style="font-size:12px;color:var(--muted);margin-top:3px;">
              생일/입양일: ${escapeHtml(prof.birthDate)} · 주치의: ${escapeHtml(prof.hospital)}
            </div>
          </div>
          <button type="button" class="btn secondary" id="toggleCatProfileBtn" style="padding:6px 10px;font-size:12px;">✏️ 수정</button>
        </div>

        ${
          editingCatProfile
            ? `
          <form id="catProfileForm" style="background:var(--surface-soft);padding:11px;border-radius:12px;border:1px solid var(--line);display:grid;gap:7px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              <input type="text" name="name" value="${escapeHtml(prof.name)}" placeholder="냥이 이름" required>
              <input type="text" name="weightKg" value="${escapeHtml(prof.weightKg)}" placeholder="몸무게 (예: 4.6)" required>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              <input type="date" name="birthDate" value="${escapeHtml(prof.birthDate)}" required>
              <input type="text" name="hospital" value="${escapeHtml(prof.hospital)}" placeholder="다니는 동물병원">
            </div>
            <div style="display:flex;justify-content:flex-end;gap:6px;">
              <button type="submit" class="btn" style="padding:6px 12px;font-size:12px;">저장</button>
            </div>
          </form>
        `
            : ""
        }

        <div class="card-head" style="margin-top:2px;">
          <div>
            <h2 class="card-title">🪏 오늘의 감자 · 맛동산 & 급여 체크</h2>
            <div class="card-sub">누가 언제 밥·간식 줬는지, 오늘 감자 몇 개 캤는지 공유해요</div>
          </div>
          <button type="button" class="pill" id="resetCatTodayBtn" style="font-size:11.5px;">🔄 오늘 초기화</button>
        </div>

        <!-- 감자(소변) / 맛동산(대변) 카운터 -->
        <div class="cat-litter-grid">
          <div class="cat-litter-box">
            <div>
              <div style="font-size:12px;color:var(--muted);font-weight:600;">🥔 오늘 캔 감자(소변)</div>
              <div style="font-size:20px;font-weight:800;color:var(--ink);">${today.peeCount}개</div>
            </div>
            <div style="display:flex;gap:4px;">
              <button type="button" class="pill" data-cat-litter="pee:-1" style="padding:5px 9px;">-</button>
              <button type="button" class="btn" data-cat-litter="pee:1" style="padding:6px 11px;font-size:12.5px;">+1</button>
            </div>
          </div>

          <div class="cat-litter-box">
            <div>
              <div style="font-size:12px;color:var(--muted);font-weight:600;">🍠 오늘 캔 맛동산(대변)</div>
              <div style="font-size:20px;font-weight:800;color:var(--ink);">${today.poopCount}개</div>
            </div>
            <div style="display:flex;gap:4px;">
              <button type="button" class="pill" data-cat-litter="poop:-1" style="padding:5px 9px;">-</button>
              <button type="button" class="btn" data-cat-litter="poop:1" style="padding:6px 11px;font-size:12.5px;">+1</button>
            </div>
          </div>
        </div>
        <div style="font-size:11.5px;color:var(--muted);text-align:right;margin-top:-6px;">
          마지막 화장실 청소: <strong>${escapeHtml(today.lastLitterBy || "아직 기록 없음")}</strong>
        </div>

        <!-- 데일리 밥·물·츄르·놀이 원터치 스탬프 -->
        <div class="cat-duty-grid">
          ${dutyItems
            .map(function (d) {
              const stamp = today.duties[d.key] || "";
              return `
                <button type="button" class="cat-duty-btn ${stamp ? "is-done" : ""}" data-cat-duty="${d.key}">
                  <div style="font-size:13px;font-weight:700;">${d.icon} ${escapeHtml(d.label)}</div>
                  <div style="font-size:11.5px;color:${stamp ? "var(--mint)" : "var(--muted)"};font-weight:600;">
                    ${stamp ? `✅ ${escapeHtml(stamp)}` : "미완료 (터치해 기록)"}
                  </div>
                </button>
              `;
            })
            .join("")}
        </div>
      </section>

      <!-- 2. 까먹기 쉬운 고양이 주기 관리 -->
      <section class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">🗓️ 모래 전체갈이 · 심장사상충 주기</h2>
            <div class="card-sub">마지막으로 해준 날부터 며칠 지났는지 자동으로 계산해요</div>
          </div>
        </div>

        <div class="todo-list">
          ${cat.cycles
            .map(function (cy) {
              const elapsed = calcDaysSince(cy.lastDate);
              const due = elapsed >= cy.cycleDays;
              return `
                <div class="todo-item">
                  <div style="flex:1;">
                    <div style="font-size:13.5px;font-weight:700;">${escapeHtml(cy.title)}</div>
                    <div style="font-size:11.5px;color:var(--muted);">
                      마지막: ${escapeHtml(cy.lastDate)} · 권장주기 ${cy.cycleDays}일
                    </div>
                  </div>
                  <span class="tag ${due ? "rose" : "mint"}">${elapsed === 0 ? "오늘 완료!" : `${elapsed}일 경과`}</span>
                  <button type="button" class="btn secondary" data-cat-cycle-done="${escapeHtml(cy.id)}" style="padding:6px 10px;font-size:12px;">오늘 함</button>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>

      <!-- 3. 건강 특이사항(구토/몸무게/병원) 기록 & 기호성 도감 -->
      <section class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">🏥 냥이 건강 · 특이사항 기록장</h2>
            <div class="card-sub">헤어볼 구토, 몸무게 변화, 병원 진료 메모를 남겨두세요</div>
          </div>
        </div>

        <form id="addCatLogForm" style="display:grid;gap:6px;">
          <div style="display:grid;grid-template-columns:125px 1fr;gap:6px;">
            <select id="catLogTagSelect">
              <option value="🤮 헤어볼/구토">🤮 헤어볼/구토</option>
              <option value="⚖️ 몸무게">⚖️ 몸무게</option>
              <option value="🏥 병원진료">🏥 병원진료</option>
              <option value="😿 특이사항">😿 특이사항</option>
            </select>
            <div class="input-row">
              <input type="text" id="catLogTextInput" placeholder="예: 아침에 헤어볼 토함, 컨디션은 좋음" required>
              <button type="submit" class="btn">기록</button>
            </div>
          </div>
        </form>

        <div class="todo-list">
          ${cat.logs
            .map(function (lg) {
              const who = lg.author === "husband" ? "남편" : "아내";
              return `
                <div class="todo-item">
                  <span class="tag">${escapeHtml(lg.tag)}</span>
                  <div style="flex:1;">
                    <div style="font-size:13px;font-weight:600;">${escapeHtml(lg.text)}</div>
                    <div style="font-size:11px;color:var(--muted);">${escapeHtml(lg.date)} · ${who}</div>
                  </div>
                  <button type="button" class="pill" data-del-cat-log="${escapeHtml(lg.id)}" style="font-size:11px;padding:3px 7px;">삭제</button>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>

      <!-- 4. 까다로운 냥이 기호성 도감 -->
      <section class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">🥫 ${escapeHtml(prof.name)} 입맛 · 모래 도감</h2>
            <div class="card-sub">사료·간식·모래 주문할 때 헷갈리지 않게 적어두는 메모</div>
          </div>
          <button type="button" class="btn secondary" id="toggleCatPrefsBtn" style="padding:6px 10px;font-size:12px;">✏️ 수정</button>
        </div>

        ${
          editingCatPrefs
            ? `
          <form id="catPrefsForm" style="display:grid;gap:8px;">
            <label class="wiki-label">👍 환장하고 잘 먹는 주식캔 · 간식 (극호)
              <input type="text" name="favFood" value="${escapeHtml(cat.prefs.favFood)}">
            </label>
            <label class="wiki-label">👎 안 먹거나 알러지 있는 것 (불호)
              <input type="text" name="hateFood" value="${escapeHtml(cat.prefs.hateFood)}">
            </label>
            <label class="wiki-label">🪣 현재 쓰는 사료 · 화장실 모래 메모
              <input type="text" name="supplyNote" value="${escapeHtml(cat.prefs.supplyNote)}">
            </label>
            <button type="submit" class="btn">저장 완료</button>
          </form>
        `
            : `
          <div class="wiki-grid" style="grid-template-columns:1fr;">
            <div class="wiki-item">
              <div class="wiki-label">👍 극호 (잘 먹는 캔·간식)</div>
              <div class="wiki-val">${escapeHtml(cat.prefs.favFood)}</div>
            </div>
            <div class="wiki-item">
              <div class="wiki-label">👎 불호 / 주의할 것</div>
              <div class="wiki-val">${escapeHtml(cat.prefs.hateFood)}</div>
            </div>
            <div class="wiki-item">
              <div class="wiki-label">🪣 사료 · 모래 세팅</div>
              <div class="wiki-val">${escapeHtml(cat.prefs.supplyNote)}</div>
            </div>
          </div>
        `
        }
      </section>
    `;
  }

  function renderMainView() {
    const main = document.getElementById("mainView");
    if (!main) return;
    if (currentTab === "home") main.innerHTML = renderHomeTab();
    else if (currentTab === "todo") main.innerHTML = renderTodoTab();
    else if (currentTab === "cat") main.innerHTML = renderCatTab();
    else if (currentTab === "coupon") main.innerHTML = renderCouponTab();
    else if (currentTab === "dinner") main.innerHTML = renderDinnerTab();
    else if (currentTab === "wiki") main.innerHTML = renderWikiTab();
  }

  function renderNavTabs() {
    document.querySelectorAll(".nav-tab").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-tab") === currentTab);
    });
  }

  function renderAll() {
    renderRoleBar();
    renderHero();
    renderAlertSlot();
    renderMainView();
    renderNavTabs();
  }

  function compressImageFile(file) {
    return new Promise(function (resolve) {
      if (!file) return resolve("");
      const reader = new FileReader();
      reader.onload = function (ev) {
        const img = new Image();
        img.onload = function () {
          const maxW = 720;
          const scale = img.width > maxW ? maxW / img.width : 1;
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.78));
        };
        img.onerror = function () {
          resolve("");
        };
        img.src = ev.target.result;
      };
      reader.onerror = function () {
        resolve("");
      };
      reader.readAsDataURL(file);
    });
  }

  // Global Event Delegation
  document.addEventListener("click", function (e) {
    const roleBtn = e.target.closest("[data-role]");
    if (roleBtn) {
      currentRole = roleBtn.getAttribute("data-role");
      localStorage.setItem(ROLE_KEY, currentRole);
      renderAll();
      return;
    }

    const tabBtn = e.target.closest("[data-tab]");
    if (tabBtn) {
      currentTab = tabBtn.getAttribute("data-tab");
      renderAll();
      return;
    }

    if (e.target.closest("#themeBtn")) {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      const next = isDark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
      return;
    }

    if (e.target.closest("#openCoupleConfigBtn")) {
      showCoupleSettings = !showCoupleSettings;
      renderHero();
      return;
    }

    if (e.target.closest("#cancelCoupleConfigBtn")) {
      showCoupleSettings = false;
      renderHero();
      return;
    }

    if (e.target.closest("#dismissAlertBtn")) {
      state.activeAlert = null;
      saveState();
      return;
    }

    const moodChip = e.target.closest("[data-mood]");
    if (moodChip) {
      const mood = moodChip.getAttribute("data-mood");
      state.status[currentRole].mood = mood;
      state.status[currentRole].updatedAt = formatTimeNow();
      saveState();
      return;
    }

    if (e.target.closest("#pokePartnerBtn")) {
      const me = roleLabel(currentRole);
      const myIcon = currentRole === "husband" ? "🤖" : "🍎";
      const myMsg = state.status[currentRole].message || state.status[currentRole].mood;
      state.activeAlert = {
        id: "poke-" + Date.now(),
        from: currentRole,
        type: "poke",
        text: `${myIcon} ${me}님이 하트 콕! 찔렀어요: “${myMsg}”`,
        time: formatTimeNow()
      };
      saveState();
      return;
    }

    if (e.target.closest("#nextQuestionBtn")) {
      state.qa.questionIndex = (state.qa.questionIndex + 1) % DAILY_QUESTIONS.length;
      state.qa.customQuestion = "";
      state.qa.husbandAnswer = "";
      state.qa.wifeAnswer = "";
      saveState();
      return;
    }

    const todoFilterBtn = e.target.closest("[data-todo-filter]");
    if (todoFilterBtn) {
      todoFilter = todoFilterBtn.getAttribute("data-todo-filter");
      renderMainView();
      return;
    }

    const todoDelBtn = e.target.closest("[data-todo-del]");
    if (todoDelBtn) {
      const id = todoDelBtn.getAttribute("data-todo-del");
      state.todos = state.todos.filter(function (t) {
        return t.id !== id;
      });
      saveState();
      return;
    }

    if (e.target.closest("#clearDoneTodosBtn")) {
      state.todos = state.todos.filter(function (t) {
        return !t.done;
      });
      saveState();
      return;
    }

    const useCouponBtn = e.target.closest("[data-use-coupon]");
    if (useCouponBtn) {
      const id = useCouponBtn.getAttribute("data-use-coupon");
      const coupon = state.coupons.find(function (c) {
        return c.id === id;
      });
      if (coupon && coupon.remaining > 0) {
        coupon.remaining -= 1;
        coupon.usedCount += 1;
        const me = roleLabel(currentRole);
        state.activeAlert = {
          id: "coupon-" + Date.now(),
          from: currentRole,
          type: "coupon",
          text: `🎟️ ${me}님이 [${coupon.title}] 쿠폰을 사용했어요!`,
          time: formatTimeNow()
        };
        saveState();
      }
      return;
    }

    const refillCouponBtn = e.target.closest("[data-refill-coupon]");
    if (refillCouponBtn) {
      const id = refillCouponBtn.getAttribute("data-refill-coupon");
      const coupon = state.coupons.find(function (c) {
        return c.id === id;
      });
      if (coupon) {
        coupon.remaining += 1;
        saveState();
      }
      return;
    }

    const dinnerFilterBtn = e.target.closest("[data-dinner-filter]");
    if (dinnerFilterBtn) {
      dinnerFilter = dinnerFilterBtn.getAttribute("data-dinner-filter");
      renderMainView();
      return;
    }

    if (e.target.closest("#spinDinnerBtn")) {
      const pool = state.dinner.menus.filter(function (m) {
        return dinnerFilter === "전체" || m.category === dinnerFilter;
      });
      if (pool.length === 0) return;
      const display = document.getElementById("rouletteDisplay");
      let ticks = 0;
      const timer = setInterval(function () {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (display) display.textContent = "🎲 " + pick.name;
        ticks += 1;
        if (ticks >= 10) {
          clearInterval(timer);
          state.dinner.selectedMenu = pick.name;
          saveState();
        }
      }, 65);
      return;
    }

    if (e.target.closest("#confirmDinnerBtn")) {
      const menu = state.dinner.selectedMenu;
      if (!menu) return;
      const me = roleLabel(currentRole);
      state.activeAlert = {
        id: "dinner-" + Date.now(),
        from: currentRole,
        type: "dinner",
        text: `🍽️ ${me}님의 저녁 메뉴 콜: “오늘 저녁은 [${menu}] 어때?”`,
        time: formatTimeNow()
      };
      saveState();
      return;
    }

    const pickMenuBtn = e.target.closest("[data-pick-menu]");
    if (pickMenuBtn) {
      state.dinner.selectedMenu = pickMenuBtn.getAttribute("data-pick-menu");
      saveState();
      return;
    }

    const delMenuBtn = e.target.closest("[data-del-menu]");
    if (delMenuBtn) {
      const id = delMenuBtn.getAttribute("data-del-menu");
      state.dinner.menus = state.dinner.menus.filter(function (m) {
        return m.id !== id;
      });
      saveState();
      return;
    }

    const editWikiBtn = e.target.closest("[data-edit-wiki]");
    if (editWikiBtn) {
      editingWikiRole = editWikiBtn.getAttribute("data-edit-wiki");
      renderMainView();
      return;
    }

    // 🐱 외동냥이 탭 액션들
    if (e.target.closest("#toggleCatProfileBtn")) {
      editingCatProfile = !editingCatProfile;
      renderMainView();
      return;
    }

    if (e.target.closest("#toggleCatPrefsBtn")) {
      editingCatPrefs = !editingCatPrefs;
      renderMainView();
      return;
    }

    if (e.target.closest("#resetCatTodayBtn")) {
      state.cat.today = {
        peeCount: 0,
        poopCount: 0,
        lastLitterBy: "오늘 기록 초기화됨",
        duties: {
          morningMeal: "",
          eveningMeal: "",
          water: "",
          snack: "",
          play: "",
          brush: ""
        }
      };
      saveState();
      return;
    }

    const catLitterBtn = e.target.closest("[data-cat-litter]");
    if (catLitterBtn) {
      const raw = catLitterBtn.getAttribute("data-cat-litter") || "";
      const parts = raw.split(":");
      const kind = parts[0];
      const delta = Number(parts[1] || 0);
      const who = currentRole === "husband" ? "남편" : "아내";
      if (kind === "pee") {
        state.cat.today.peeCount = Math.max(0, (state.cat.today.peeCount || 0) + delta);
      } else if (kind === "poop") {
        state.cat.today.poopCount = Math.max(0, (state.cat.today.poopCount || 0) + delta);
      }
      if (delta > 0) {
        state.cat.today.lastLitterBy = `${formatTimeNow()} · ${who}`;
      }
      saveState();
      return;
    }

    const catDutyBtn = e.target.closest("[data-cat-duty]");
    if (catDutyBtn) {
      const key = catDutyBtn.getAttribute("data-cat-duty");
      const currentVal = state.cat.today.duties[key];
      const who = currentRole === "husband" ? "남편" : "아내";
      state.cat.today.duties[key] = currentVal ? "" : `${formatTimeNow()} · ${who}`;
      saveState();
      return;
    }

    const catCycleBtn = e.target.closest("[data-cat-cycle-done]");
    if (catCycleBtn) {
      const id = catCycleBtn.getAttribute("data-cat-cycle-done");
      const item = state.cat.cycles.find(function (c) {
        return c.id === id;
      });
      if (item) {
        item.lastDate = new Date().toISOString().slice(0, 10);
        saveState();
      }
      return;
    }

    const delCatLogBtn = e.target.closest("[data-del-cat-log]");
    if (delCatLogBtn) {
      const id = delCatLogBtn.getAttribute("data-del-cat-log");
      state.cat.logs = state.cat.logs.filter(function (l) {
        return l.id !== id;
      });
      saveState();
      return;
    }

    function syncDraftInputsFromDom() {
      const placeEl = document.getElementById("memPlaceInput");
      const dateEl = document.getElementById("memDateInput");
      if (placeEl) draftMemory.placeName = placeEl.value;
      if (dateEl && dateEl.value) draftMemory.date = dateEl.value;
    }

    // 지도 위 사진 마커 클릭 시 해당 추억 팝업 표시
    const pinMemEl = e.target.closest("[data-pin-mem]");
    if (pinMemEl) {
      syncDraftInputsFromDom();
      const id = pinMemEl.getAttribute("data-pin-mem");
      selectedMemoryId = selectedMemoryId === id ? null : id;
      renderMainView();
      return;
    }

    if (e.target.closest("#closeMapPopupBtn") || e.target.closest("#clearSelectedPinBtn")) {
      syncDraftInputsFromDom();
      selectedMemoryId = null;
      renderMainView();
      return;
    }

    // 상단 지역 칩 버튼 클릭 시 해당 권역 선택
    const selectRegionBtn = e.target.closest("[data-select-region]");
    if (selectRegionBtn) {
      syncDraftInputsFromDom();
      const rid = selectRegionBtn.getAttribute("data-select-region");
      const reg = getRegionById(rid);
      draftMemory.regionId = reg.id;
      draftMemory.mapX = reg.pinX;
      draftMemory.mapY = reg.pinY;
      draftMemory.locSource = `📍 ${reg.name} 선택됨`;
      renderMainView();
      return;
    }

    // 일러스트 남한 지도에서 권역(경기도, 전라도, 광주 등) 직접 터치 시
    const regionPath = e.target.closest("[data-region-id]");
    if (regionPath) {
      syncDraftInputsFromDom();
      const rid = regionPath.getAttribute("data-region-id");
      const reg = getRegionById(rid);
      const svgEl = document.getElementById("koreaMapSvg");
      let clickX = reg.pinX;
      let clickY = reg.pinY;
      if (svgEl) {
        const rect = svgEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          clickX = Math.round(((e.clientX - rect.left) / rect.width) * 420);
          clickY = Math.round(((e.clientY - rect.top) / rect.height) * 510);
          clickX = Math.max(40, Math.min(380, clickX));
          clickY = Math.max(45, Math.min(490, clickY));
        }
      }
      draftMemory.regionId = reg.id;
      draftMemory.mapX = clickX;
      draftMemory.mapY = clickY;
      draftMemory.locSource = `👆 지도에서 [${reg.name}] 터치함`;
      selectedMemoryId = null;
      renderMainView();
      return;
    }

    // 폴라로이드 리스트 지역 필터
    const memFilterBtn = e.target.closest("[data-mem-filter]");
    if (memFilterBtn) {
      syncDraftInputsFromDom();
      memoryRegionFilter = memFilterBtn.getAttribute("data-mem-filter");
      renderMainView();
      return;
    }

    // 추억 카드에서 '📍 지도에서 보기' 클릭 시 해당 마커 팝업 열기 & 지도 스크롤
    const focusMemBtn = e.target.closest("[data-focus-mem]");
    if (focusMemBtn) {
      syncDraftInputsFromDom();
      const id = focusMemBtn.getAttribute("data-focus-mem");
      selectedMemoryId = id;
      renderMainView();
      const stageEl = document.getElementById("koreaMapStage");
      if (stageEl) {
        stageEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const delMemBtn = e.target.closest("[data-del-mem]");
    if (delMemBtn) {
      const id = delMemBtn.getAttribute("data-del-mem");
      if (selectedMemoryId === id) selectedMemoryId = null;
      state.memories = state.memories.filter(function (m) {
        return m.id !== id;
      });
      saveState();
    }
  });

  // 사진 선택 및 지역 드롭다운 변경 처리
  document.addEventListener("change", async function (e) {
    const toggle = e.target.closest("[data-todo-toggle]");
    if (toggle) {
      const id = toggle.getAttribute("data-todo-toggle");
      const item = state.todos.find(function (t) {
        return t.id === id;
      });
      if (item) {
        item.done = Boolean(toggle.checked);
        saveState();
      }
      return;
    }

    if (e.target.id === "memRegionSelect") {
      const reg = getRegionById(e.target.value);
      const placeEl = document.getElementById("memPlaceInput");
      if (placeEl) draftMemory.placeName = placeEl.value;
      draftMemory.regionId = reg.id;
      draftMemory.mapX = reg.pinX;
      draftMemory.mapY = reg.pinY;
      draftMemory.locSource = `📍 ${reg.name} 선택됨`;
      renderMainView();
      return;
    }

    if (e.target.id === "memPhotoInput") {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const placeEl = document.getElementById("memPlaceInput");
      if (placeEl) draftMemory.placeName = placeEl.value;

      const [photoDataUrl, exif] = await Promise.all([
        compressImageFile(file),
        extractExifFromFile(file)
      ]);

      draftMemory.photoDataUrl = photoDataUrl;
      if (exif && exif.date) {
        draftMemory.date = exif.date;
      }

      if (exif && Number.isFinite(exif.lat) && Number.isFinite(exif.lng)) {
        const reg = latLngToKoreaRegion(exif.lat, exif.lng);
        draftMemory.regionId = reg.id;
        draftMemory.mapX = reg.pinX;
        draftMemory.mapY = reg.pinY;
        draftMemory.locSource = `📷 사진 위치(${reg.name}) 자동 인식!`;
        const geoName = await reverseGeocodeName(exif.lat, exif.lng);
        if (geoName && !draftMemory.placeName) {
          draftMemory.placeName = geoName;
        }
      } else {
        const reg = getRegionById(draftMemory.regionId);
        draftMemory.locSource = `📍 ${reg.name}에 마커 준비됨`;
      }

      renderMainView();
    }
  });

  document.addEventListener("submit", async function (e) {
    if (e.target.id === "coupleConfigForm") {
      e.preventDefault();
      const fd = new FormData(e.target);
      state.couple.husbandName = String(fd.get("husbandName") || "남편").trim();
      state.couple.wifeName = String(fd.get("wifeName") || "아내").trim();
      state.couple.anniversaryTitle = String(fd.get("anniversaryTitle") || "결혼기념일").trim();
      state.couple.startDate = String(fd.get("startDate") || "2021-05-22");
      showCoupleSettings = false;
      saveState();
      return;
    }

    if (e.target.id === "statusMsgForm") {
      e.preventDefault();
      const input = document.getElementById("statusMsgInput");
      if (input) {
        state.status[currentRole].message = input.value.trim() || "오늘도 화이팅!";
        state.status[currentRole].updatedAt = formatTimeNow();
        saveState();
      }
      return;
    }

    if (e.target.id === "qaForm") {
      e.preventDefault();
      const input = document.getElementById("qaAnswerInput");
      if (!input) return;
      if (currentRole === "husband") {
        state.qa.husbandAnswer = input.value.trim();
      } else {
        state.qa.wifeAnswer = input.value.trim();
      }
      saveState();
      return;
    }

    if (e.target.id === "addTodoForm") {
      e.preventDefault();
      const textEl = document.getElementById("todoTextInput");
      const catEl = document.getElementById("todoCatSelect");
      const assignEl = document.getElementById("todoAssigneeSelect");
      if (!textEl || !textEl.value.trim()) return;
      state.todos.unshift({
        id: "t-" + Date.now(),
        text: textEl.value.trim(),
        category: catEl ? catEl.value : "장보기",
        assignee: assignEl ? assignEl.value : "함께",
        done: false
      });
      saveState();
      return;
    }

    if (e.target.id === "addCouponForm") {
      e.preventDefault();
      const titleEl = document.getElementById("couponTitleInput");
      const targetEl = document.getElementById("couponTargetSelect");
      const descEl = document.getElementById("couponDescInput");
      if (!titleEl || !titleEl.value.trim()) return;
      state.coupons.unshift({
        id: "c-" + Date.now(),
        title: titleEl.value.trim(),
        target: targetEl ? targetEl.value : "함께",
        desc: descEl ? descEl.value.trim() : "",
        remaining: 2,
        usedCount: 0
      });
      saveState();
      return;
    }

    if (e.target.id === "addMenuForm") {
      e.preventDefault();
      const catEl = document.getElementById("menuCatSelect");
      const nameEl = document.getElementById("menuNameInput");
      if (!nameEl || !nameEl.value.trim()) return;
      const newMenu = {
        id: "m-" + Date.now(),
        name: nameEl.value.trim(),
        category: catEl ? catEl.value : "집밥"
      };
      state.dinner.menus.unshift(newMenu);
      state.dinner.selectedMenu = newMenu.name;
      saveState();
      return;
    }

    const wikiForm = e.target.closest("[data-save-wiki]");
    if (wikiForm) {
      e.preventDefault();
      const roleKey = wikiForm.getAttribute("data-save-wiki");
      const fd = new FormData(wikiForm);
      state.wiki[roleKey] = {
        coffee: String(fd.get("coffee") || "").trim(),
        sizes: String(fd.get("sizes") || "").trim(),
        foodNote: String(fd.get("foodNote") || "").trim(),
        wishlist: String(fd.get("wishlist") || "").trim()
      };
      editingWikiRole = null;
      saveState();
      return;
    }

    if (e.target.id === "catProfileForm") {
      e.preventDefault();
      const fd = new FormData(e.target);
      state.cat.profile = {
        name: String(fd.get("name") || "냥이").trim(),
        weightKg: String(fd.get("weightKg") || "4.5").trim(),
        birthDate: String(fd.get("birthDate") || "2023-04-15"),
        hospital: String(fd.get("hospital") || "").trim()
      };
      editingCatProfile = false;
      saveState();
      return;
    }

    if (e.target.id === "catPrefsForm") {
      e.preventDefault();
      const fd = new FormData(e.target);
      state.cat.prefs = {
        favFood: String(fd.get("favFood") || "").trim(),
        hateFood: String(fd.get("hateFood") || "").trim(),
        supplyNote: String(fd.get("supplyNote") || "").trim()
      };
      editingCatPrefs = false;
      saveState();
      return;
    }

    if (e.target.id === "addCatLogForm") {
      e.preventDefault();
      const tagEl = document.getElementById("catLogTagSelect");
      const textEl = document.getElementById("catLogTextInput");
      if (!textEl || !textEl.value.trim()) return;
      state.cat.logs.unshift({
        id: "cl-" + Date.now(),
        date: new Date().toISOString().slice(0, 10),
        tag: tagEl ? tagEl.value : "😿 특이사항",
        text: textEl.value.trim(),
        author: currentRole
      });
      saveState();
      return;
    }

    // 사진 + 일러스트 남한 지도 권역 마커 저장
    if (e.target.id === "addMemoryForm") {
      e.preventDefault();
      const dateEl = document.getElementById("memDateInput");
      const regionEl = document.getElementById("memRegionSelect");
      const placeEl = document.getElementById("memPlaceInput");
      const capEl = document.getElementById("memCaptionInput");
      if (!capEl || !capEl.value.trim()) return;

      const typedPlace = placeEl && placeEl.value.trim() ? placeEl.value.trim() : "";
      const inferredReg = inferRegionFromText(typedPlace);
      const chosenRegionId = regionEl ? regionEl.value : draftMemory.regionId;
      const reg = inferredReg || getRegionById(chosenRegionId);

      // 입력한 장소명에서 다른 권역이 추론되었고 기존 좌표가 다른 권역이면 해당 권역 중심핀으로 맞춤
      let mapX = draftMemory.mapX;
      let mapY = draftMemory.mapY;
      if (reg.id !== draftMemory.regionId) {
        mapX = reg.pinX;
        mapY = reg.pinY;
      }

      const placeName = typedPlace || `${reg.name} 나들이`;
      const photoUrl =
        draftMemory.photoDataUrl ||
        createSampleSvgPhoto("#e05d44", "#d94b72", "📸", placeName.slice(0, 10));

      const newMem = {
        id: "mem-" + Date.now(),
        date: dateEl ? dateEl.value : draftMemory.date,
        author: currentRole,
        regionId: reg.id,
        placeName,
        mapX,
        mapY,
        caption: capEl.value.trim(),
        photoDataUrl: photoUrl
      };

      state.memories.unshift(newMem);
      draftMemory.regionId = reg.id;
      draftMemory.photoDataUrl = "";
      draftMemory.placeName = "";
      draftMemory.locSource = `📍 ${reg.name} 선택됨`;
      selectedMemoryId = newMem.id;
      saveState();
    }
  });

  // Initialize theme, service worker, and render
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  }

  renderAll();
  initRealtimeSync();
})();
