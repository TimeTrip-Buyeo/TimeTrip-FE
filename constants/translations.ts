export type Locale = 'ko' | 'en' | 'zh' | 'ja';

export type LocaleMeta = {
  code: Locale;
  /** Short code shown in the language badge, e.g. "KR". */
  badgeLabel: string;
  /** Language name written in its own language, shown in the legend modal. */
  nativeLabel: string;
};

export const LOCALES: LocaleMeta[] = [
  { code: 'ko', badgeLabel: 'KR', nativeLabel: '한국어' },
  { code: 'en', badgeLabel: 'EN', nativeLabel: 'English' },
  { code: 'zh', badgeLabel: 'CN', nativeLabel: '中文' },
  { code: 'ja', badgeLabel: 'JP', nativeLabel: '日本語' },
];

// Shared "— TimeTrip 부여" suffix appended to every Share.share() message
// across the app (collection.tsx, photo-save.tsx, album.tsx) — was hardcoded
// Korean at each call site regardless of locale.
export const shareSuffix: Record<Locale, string> = {
  ko: '— TimeTrip 부여',
  en: '— TimeTrip Buyeo',
  zh: '— TimeTrip 扶余',
  ja: '— TimeTrip 扶余',
};

type StepText = { title: string; description: string };

type OnboardingGuideText = {
  appTitle: string;
  appSubtitle: string;
  guideLabel: string;
  nextLabel: string;
  startLabel: string;
  prevLabel: string;
  nav: {
    map: string;
    collection: string;
    album: string;
    myPage: string;
  };
  pins: {
    museum: string;
    jeongnimsaji: string;
    gungnamji: string;
    busosanseong: string;
    pagoda: string;
  };
  steps: {
    language: StepText;
    map: StepText;
    basicGuide: StepText;
    specialGuide: StepText;
    arCamera: StepText;
  };
};

export const onboardingGuideText: Record<Locale, OnboardingGuideText> = {
  ko: {
    appTitle: 'TimeTrip',
    appSubtitle: '부여',
    guideLabel: '가이드',
    nextLabel: '다음',
    startLabel: '시작하기',
    prevLabel: '이전',
    nav: { map: '지도', collection: '도감', album: '앨범', myPage: '마이페이지' },
    pins: {
      museum: '국립부여박물관',
      jeongnimsaji: '정림사지',
      gungnamji: '궁남지',
      busosanseong: '부소산성',
      pagoda: '정림사지5층석탑',
    },
    steps: {
      language: {
        title: '다중언어 제공',
        description: '한·중·일·영어가 제공되어,\n원하는 언어를 선택할 수 있어요!',
      },
      map: {
        title: '백제 역사 탐험',
        description:
          '지도에 떠 있는 그림을 터치하여 부여 곳곳에\n숨겨진 백제의 이야기와 컬랙션을 획득할 수 있어요!',
      },
      basicGuide: {
        title: '기본 가이드 제공',
        description: '부여 백제의 대표적인 이야기를 들을 수 있어요.',
      },
      specialGuide: {
        title: '스페셜 가이드 제공',
        description:
          '특정 시기에만 들을 수 있는 스페셜 이야기를 제공해요.\n시기에 따라 스페셜 가이드를 제공하는 장소도 달라져요!',
      },
      arCamera: {
        title: 'AR 카메라',
        description: '스페셜 가이드와 함께 부여 백제로 타임슬립을 떠나는\nAR카메라도 즐길 수 있어요!',
      },
    },
  },
  en: {
    appTitle: 'TimeTrip',
    appSubtitle: 'Buyeo',
    guideLabel: 'Guide',
    nextLabel: 'Next',
    startLabel: 'Get Started',
    prevLabel: 'Back',
    nav: { map: 'Map', collection: 'Collection', album: 'Album', myPage: 'My Page' },
    pins: {
      museum: 'Buyeo National Museum',
      jeongnimsaji: 'Jeongnimsa Temple Site',
      gungnamji: 'Gungnamji Pond',
      busosanseong: 'Busosanseong Fortress',
      pagoda: 'Jeongnimsaji 5-Story Pagoda',
    },
    steps: {
      language: {
        title: 'Multilingual Support',
        description: 'Korean, Chinese, Japanese, and English are available —\nchoose the language you prefer!',
      },
      map: {
        title: 'Explore Baekje History',
        description: 'Tap the icons on the map to discover\nhidden Baekje stories and collectibles across Buyeo!',
      },
      basicGuide: {
        title: 'Basic Guide Included',
        description: 'Listen to the most iconic stories of Baekje in Buyeo.',
      },
      specialGuide: {
        title: 'Special Guides Available',
        description:
          'Special stories are available only during certain periods.\nThe locations offering them change depending on the season!',
      },
      arCamera: {
        title: 'AR Camera',
        description: 'Take a time slip back to Baekje-era Buyeo\nwith the AR camera, alongside the special guide!',
      },
    },
  },
  zh: {
    appTitle: 'TimeTrip',
    appSubtitle: '扶余',
    guideLabel: '导览',
    nextLabel: '下一步',
    startLabel: '开始',
    prevLabel: '上一步',
    nav: { map: '地图', collection: '图鉴', album: '相册', myPage: '我的' },
    pins: {
      museum: '国立扶余博物馆',
      jeongnimsaji: '定林寺址',
      gungnamji: '宫南池',
      busosanseong: '扶苏山城',
      pagoda: '定林寺址五层石塔',
    },
    steps: {
      language: {
        title: '支持多语言',
        description: '提供韩语、中文、日语和英语，\n可选择您喜欢的语言！',
      },
      map: {
        title: '探索百济历史',
        description: '点击地图上的图标，\n发现隐藏在扶余各地的百济故事与收藏品！',
      },
      basicGuide: {
        title: '提供基础导览',
        description: '可以聆听扶余百济最具代表性的故事。',
      },
      specialGuide: {
        title: '提供特别导览',
        description: '仅在特定时期才能听到的特别故事。\n提供特别导览的地点也会随时期而变化！',
      },
      arCamera: {
        title: 'AR相机',
        description: '与特别导览一起，通过AR相机\n穿越回百济时代的扶余吧！',
      },
    },
  },
  ja: {
    appTitle: 'TimeTrip',
    appSubtitle: '扶余',
    guideLabel: 'ガイド',
    nextLabel: '次へ',
    startLabel: 'はじめる',
    prevLabel: '戻る',
    nav: { map: '地図', collection: '図鑑', album: 'アルバム', myPage: 'マイページ' },
    pins: {
      museum: '国立扶余博物館',
      jeongnimsaji: '定林寺址',
      gungnamji: '宮南池',
      busosanseong: '扶蘇山城',
      pagoda: '定林寺址五重石塔',
    },
    steps: {
      language: {
        title: '多言語対応',
        description: '韓国語・中国語・日本語・英語に対応しており、\nお好きな言語を選択できます！',
      },
      map: {
        title: '百済の歴史を探検',
        description: '地図上のアイコンをタップして、\n扶余各地に隠された百済の物語とコレクションを手に入れよう！',
      },
      basicGuide: {
        title: '基本ガイド提供',
        description: '扶余百済を代表する物語を聞くことができます。',
      },
      specialGuide: {
        title: 'スペシャルガイド提供',
        description:
          '特定の時期にだけ聞けるスペシャルストーリーを提供します。\n時期によってスペシャルガイドを提供する場所も変わります！',
      },
      arCamera: {
        title: 'ARカメラ',
        description: 'スペシャルガイドと一緒に百済時代の扶余へ\nタイムスリップするARカメラも楽しめます！',
      },
    },
  },
};

type LoginText = {
  appTitle: string;
  appSubtitle: string;
  description: string;
  kakaoButton: string;
  googleButton: string;
  terms: string;
  socialLoginError: string;
};

export const loginText: Record<Locale, LoginText> = {
  ko: {
    appTitle: 'TimeTrip',
    appSubtitle: '부여',
    description: 'AR과 지도로 떠나는\n백제 역사 여행',
    kakaoButton: '카카오로 시작하기',
    googleButton: '구글로 시작하기',
    terms: '로그인 시 서비스 이용약관 및 개인정보처리방침에 동의합니다.',
    socialLoginError: '로그인에 실패했어요. 다시 시도해주세요.',
  },
  en: {
    appTitle: 'TimeTrip',
    appSubtitle: 'Buyeo',
    description: 'A journey through Baekje history\nwith AR and the map',
    kakaoButton: 'Continue with Kakao',
    googleButton: 'Continue with Google',
    terms: 'By logging in, you agree to the Terms of Service and Privacy Policy.',
    socialLoginError: 'Login failed. Please try again.',
  },
  zh: {
    appTitle: 'TimeTrip',
    appSubtitle: '扶余',
    description: '用AR和地图开启的\n百济历史之旅',
    kakaoButton: '使用Kakao继续',
    googleButton: '使用Google继续',
    terms: '登录即表示您同意服务条款及隐私政策。',
    socialLoginError: '登录失败，请重试。',
  },
  ja: {
    appTitle: 'TimeTrip',
    appSubtitle: '扶余',
    description: 'ARと地図でめぐる\n百済歴史の旅',
    kakaoButton: 'カカオで始める',
    googleButton: 'Googleで始める',
    terms: 'ログインすると、利用規約およびプライバシーポリシーに同意したものとみなされます。',
    socialLoginError: 'ログインに失敗しました。もう一度お試しください。',
  },
};


type MyPageText = {
  title: string;
  guestLabel: string;
  settingsSectionLabel: string;
  languageRowLabel: string;
  logoutRowLabel: string;
  languageModalTitle: string;
  languageModalCloseLabel: string;
  withdrawRowLabel: string;
  withdrawConfirmTitle: string;
  withdrawConfirmMessage: string;
  withdrawConfirmButton: string;
  withdrawCancelButton: string;
  withdrawErrorMessage: string;
  withdrawSessionExpiredMessage: string;
};

export const myPageText: Record<Locale, MyPageText> = {
  ko: {
    title: '마이페이지',
    guestLabel: '소셜 로그인 계정',
    settingsSectionLabel: '기본설정',
    languageRowLabel: '언어 설정',
    logoutRowLabel: '로그아웃',
    languageModalTitle: '언어 선택',
    languageModalCloseLabel: '닫기',
    withdrawRowLabel: '회원탈퇴',
    withdrawConfirmTitle: '정말 탈퇴하시겠습니까?',
    withdrawConfirmMessage: '사진/도감 데이터가 즉시 삭제되며 복구할 수 없습니다.',
    withdrawConfirmButton: '탈퇴하기',
    withdrawCancelButton: '취소',
    withdrawErrorMessage: '탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해주세요.',
    withdrawSessionExpiredMessage: '로그인이 만료되어 탈퇴가 처리되지 않았습니다. 다시 로그인 후 시도해주세요.',
  },
  en: {
    title: 'My Page',
    guestLabel: 'Social Login Account',
    settingsSectionLabel: 'Settings',
    languageRowLabel: 'Language',
    logoutRowLabel: 'Log Out',
    languageModalTitle: 'Select Language',
    languageModalCloseLabel: 'Close',
    withdrawRowLabel: 'Delete Account',
    withdrawConfirmTitle: 'Delete your account?',
    withdrawConfirmMessage: 'Your photos and collection progress will be deleted immediately and cannot be recovered.',
    withdrawConfirmButton: 'Delete Account',
    withdrawCancelButton: 'Cancel',
    withdrawErrorMessage: 'Failed to delete your account. Please try again later.',
    withdrawSessionExpiredMessage: 'Your session expired before the account could be deleted. Please log in again and retry.',
  },
  zh: {
    title: '我的',
    guestLabel: '社交登录账号',
    settingsSectionLabel: '基本设置',
    languageRowLabel: '语言设置',
    logoutRowLabel: '退出登录',
    languageModalTitle: '选择语言',
    languageModalCloseLabel: '关闭',
    withdrawRowLabel: '注销账号',
    withdrawConfirmTitle: '确定要注销账号吗？',
    withdrawConfirmMessage: '照片和图鉴数据将立即删除且无法恢复。',
    withdrawConfirmButton: '注销账号',
    withdrawCancelButton: '取消',
    withdrawErrorMessage: '账号注销失败，请稍后重试。',
    withdrawSessionExpiredMessage: '登录已过期，账号未被注销。请重新登录后再试。',
  },
  ja: {
    title: 'マイページ',
    guestLabel: 'ソーシャルログインアカウント',
    settingsSectionLabel: '基本設定',
    languageRowLabel: '言語設定',
    logoutRowLabel: 'ログアウト',
    languageModalTitle: '言語を選択',
    languageModalCloseLabel: '閉じる',
    withdrawRowLabel: '退会する',
    withdrawConfirmTitle: '本当に退会しますか？',
    withdrawConfirmMessage: '写真・図鑑データは即座に削除され、復元できません。',
    withdrawConfirmButton: '退会する',
    withdrawCancelButton: 'キャンセル',
    withdrawErrorMessage: '退会処理に失敗しました。しばらくしてから再度お試しください。',
    withdrawSessionExpiredMessage: 'ログインが期限切れのため退会は処理されませんでした。再度ログインしてからお試しください。',
  },
};

type MapLocationText = {
  museum: string;
  royalTombs: string;
  busosanseong: string;
  pagoda: string;
  gungnamji: string;
};

type MapScreenText = {
  appTitle: string;
  appSubtitle: string;
  guideLabel: string;
  mapLoading: string;
  mapLoadError: string;
  nav: { map: string; collection: string; album: string; myPage: string };
  pins: MapLocationText;
  heritageTag: string;
  audioBasicGuideOnly: string;
  audioSpecialGuideAvailable: string;
  specialGuideMessage: string;
  specialGuideFutureMessage: string;
  tourBasicGuideMessage: string;
  /** Shown for locations that never rotate into the special guide (e.g. the museum). */
  visitInPersonMessage: string;
};

export const mapScreenText: Record<Locale, MapScreenText> = {
  ko: {
    appTitle: 'TimeTrip',
    appSubtitle: '부여',
    guideLabel: '가이드',
    mapLoading: '지도 장소를 불러오는 중...',
    mapLoadError: '지도 장소를 불러오지 못했어요.',
    nav: { map: '지도', collection: '도감', album: '앨범', myPage: '마이페이지' },
    pins: {
      museum: '국립부여박물관',
      royalTombs: '부여왕릉원',
      busosanseong: '부소산성',
      pagoda: '정림사지5층석탑',
      gungnamji: '궁남지',
    },
    heritageTag: '백제 유적',
    audioBasicGuideOnly: '일반 가이드 이용 가능',
    audioSpecialGuideAvailable: '스페셜 가이드 이용 가능',
    specialGuideMessage: 'AR, 셀카, 컬렉션으로 즐기는 스페셜 가이드를 지금 만나보세요!',
    specialGuideFutureMessage: '스페셜 달에 방문하면 AR, 셀카, 컬렉션을 즐길 수 있어요!',
    tourBasicGuideMessage: '관광·전시 중심 장소입니다. 현장에서 일반 오디오 가이드로 천천히 둘러보세요!',
    visitInPersonMessage: '해당 유적지에 직접 방문해 더 많은 가이드를 경험해보세요!',
  },
  en: {
    appTitle: 'TimeTrip',
    appSubtitle: 'Buyeo',
    guideLabel: 'Guide',
    mapLoading: 'Loading map spots...',
    mapLoadError: 'Could not load map spots.',
    nav: { map: 'Map', collection: 'Collection', album: 'Album', myPage: 'My Page' },
    pins: {
      museum: 'Buyeo National Museum',
      royalTombs: 'Buyeo Royal Tombs',
      busosanseong: 'Busosanseong Fortress',
      pagoda: 'Jeongnimsaji 5-Story Pagoda',
      gungnamji: 'Gungnamji Pond',
    },
    heritageTag: 'Baekje Heritage',
    audioBasicGuideOnly: 'General Guide Available',
    audioSpecialGuideAvailable: 'Special Guide Available',
    specialGuideMessage: 'Enjoy the special guide now — AR, photo booth, and collectibles!',
    specialGuideFutureMessage: 'Visit during a special month to enjoy AR, photo booth, and collectibles!',
    tourBasicGuideMessage: 'This is a tour-focused spot. Explore it with the general audio guide on site.',
    visitInPersonMessage: 'Visit this heritage site in person to experience more guides!',
  },
  zh: {
    appTitle: 'TimeTrip',
    appSubtitle: '扶余',
    guideLabel: '导览',
    mapLoading: '正在加载地图地点...',
    mapLoadError: '无法加载地图地点。',
    nav: { map: '地图', collection: '图鉴', album: '相册', myPage: '我的' },
    pins: {
      museum: '国立扶余博物馆',
      royalTombs: '扶余王陵苑',
      busosanseong: '扶苏山城',
      pagoda: '定林寺址五层石塔',
      gungnamji: '宫南池',
    },
    heritageTag: '百济遗迹',
    audioBasicGuideOnly: '可使用普通导览',
    audioSpecialGuideAvailable: '可使用特别导览',
    specialGuideMessage: '现在就体验AR、拍照和收藏品特别导览吧!',
    specialGuideFutureMessage: '在特别月份到访即可体验AR、拍照和收藏品!',
    tourBasicGuideMessage: '这里是观光与展示为主的地点。到现场使用普通语音导览慢慢参观吧!',
    visitInPersonMessage: '请直接前往该遗迹，体验更多导览内容!',
  },
  ja: {
    appTitle: 'TimeTrip',
    appSubtitle: '扶余',
    guideLabel: 'ガイド',
    mapLoading: '地図スポットを読み込み中...',
    mapLoadError: '地図スポットを読み込めませんでした。',
    nav: { map: '地図', collection: '図鑑', album: 'アルバム', myPage: 'マイページ' },
    pins: {
      museum: '国立扶余博物館',
      royalTombs: '扶余王陵苑',
      busosanseong: '扶蘇山城',
      pagoda: '定林寺址五重石塔',
      gungnamji: '宮南池',
    },
    heritageTag: '百済遺跡',
    audioBasicGuideOnly: '一般ガイド利用可能',
    audioSpecialGuideAvailable: 'スペシャルガイド利用可能',
    specialGuideMessage: 'AR・フォト・コレクションで楽しむスペシャルガイドを今すぐ体験!',
    specialGuideFutureMessage: 'スペシャル月に訪れると、AR・フォト・コレクションを楽しめます!',
    tourBasicGuideMessage: '観光・展示が中心のスポットです。現地で一般音声ガイドを聞きながら巡ってみてください!',
    visitInPersonMessage: 'この遺跡に直接訪れて、より多くのガイドを体験してみてください!',
  },
};

type ArCameraText = {
  arActiveLabel: string;
  timeSlipCameraTitle: string;
  cameraPermissionMessage: string;
  grantCameraAccessLabel: string;
  searchingHintText: string;
  locationPermissionMessage: string;
  locationPermissionDeniedMessage: string;
  grantLocationAccessLabel: string;
  openSettingsLabel: string;
  loadingText: string;
  emptyStateTitle: string;
  emptyStateMessage: string;
  audioGuideLabel: string;
  aiImageDisclosure: string;
};

export const arCameraText: Record<Locale, ArCameraText> = {
  ko: {
    arActiveLabel: 'AR 작동 중',
    timeSlipCameraTitle: '타임슬립 카메라',
    cameraPermissionMessage: 'AR 카메라를 사용하려면 카메라 권한이 필요해요.',
    grantCameraAccessLabel: '카메라 권한 허용하기',
    searchingHintText: '유적지에 가까이 다가가면 타임슬립이 시작돼요',
    locationPermissionMessage: '위치 권한을 켜면 타임슬립을 시작할 수 있어요',
    locationPermissionDeniedMessage: '설정에서 위치 권한을 허용해주세요',
    grantLocationAccessLabel: '위치 권한 허용하기',
    openSettingsLabel: '설정으로 이동',
    loadingText: '불러오는 중...',
    emptyStateTitle: '이번 달은 준비 중이에요',
    emptyStateMessage: '이 장소는 이번 달엔 특별 테마가 없어요. 다음 달에 다시 찾아주세요!',
    audioGuideLabel: '오디오 가이드',
    aiImageDisclosure: '*AI로 생성된 이미지입니다.',
  },
  en: {
    arActiveLabel: 'AR ACTIVE',
    timeSlipCameraTitle: 'Time Slip Camera',
    cameraPermissionMessage: 'Camera access is needed to use the AR camera.',
    grantCameraAccessLabel: 'Grant Camera Access',
    searchingHintText: 'Get closer to the site to start the time slip',
    locationPermissionMessage: 'Turn on location access to start the time slip',
    locationPermissionDeniedMessage: 'Please allow location access in Settings',
    grantLocationAccessLabel: 'Allow Location Access',
    openSettingsLabel: 'Open Settings',
    loadingText: 'Loading...',
    emptyStateTitle: 'Nothing special this month',
    emptyStateMessage: "This site doesn't have a special theme this month. Please check back next month!",
    audioGuideLabel: 'Audio Guide',
    aiImageDisclosure: '*AI-generated image.',
  },
  zh: {
    arActiveLabel: 'AR 已启用',
    timeSlipCameraTitle: '时空穿越相机',
    cameraPermissionMessage: '使用AR相机需要相机权限。',
    grantCameraAccessLabel: '允许使用相机',
    searchingHintText: '靠近遗址即可开始时空穿越',
    locationPermissionMessage: '开启位置权限即可开始时空穿越',
    locationPermissionDeniedMessage: '请在设置中允许位置权限',
    grantLocationAccessLabel: '允许位置权限',
    openSettingsLabel: '前往设置',
    loadingText: '加载中...',
    emptyStateTitle: '本月暂无特别主题',
    emptyStateMessage: '该地点本月没有特别主题，请下个月再来看看！',
    audioGuideLabel: '语音导览',
    aiImageDisclosure: '*AI生成图像。',
  },
  ja: {
    arActiveLabel: 'AR起動中',
    timeSlipCameraTitle: 'タイムスリップカメラ',
    cameraPermissionMessage: 'ARカメラを使用するにはカメラへのアクセス許可が必要です。',
    grantCameraAccessLabel: 'カメラへのアクセスを許可',
    searchingHintText: '遺跡に近づくとタイムスリップが始まります',
    locationPermissionMessage: '位置情報の権限をオンにするとタイムスリップを始められます',
    locationPermissionDeniedMessage: '設定で位置情報へのアクセスを許可してください',
    grantLocationAccessLabel: '位置情報へのアクセスを許可',
    openSettingsLabel: '設定を開く',
    loadingText: '読み込み中...',
    emptyStateTitle: '今月は準備中です',
    emptyStateMessage: 'この場所は今月特別なテーマがありません。来月また訪れてください！',
    audioGuideLabel: '音声ガイド',
    aiImageDisclosure: '*AI生成画像です。',
  },
};

type CollectionScreenText = {
  listTitle: string;
  listSubtitle: string;
  lifespanLabel: string;
  productionPeriodLabel: string;
  locationLabel: string;
  keyFeaturesLabel: string;
  listenToAudioGuide: string;
  takePhotoWithFigure: string;
  audioGuideModalTitle: string;
  audioGuideUnavailableMessage: string;
  audioGuidePlayLabel: string;
  audioGuidePauseLabel: string;
  comingSoonTitle: string;
  comingSoonMessage: string;
  loadingMessage: string;
  emptyTopicMessage: string;
  emptyItemMessage: string;
  loadErrorMessage: string;
  lockedItemMessage: string;
  detailUnavailableMessage: string;
  personTypeLabel: string;
  artifactTypeLabel: string;
  aiImageDisclosure: string;
  sourceDisclosurePrefix: string;
};

export const collectionScreenText: Record<Locale, CollectionScreenText> = {
  ko: {
    listTitle: '부여 백제 도감',
    listSubtitle: '다양한 장소의 유물&인물을 수집해보시오',
    lifespanLabel: '생애',
    productionPeriodLabel: '제작 시기',
    locationLabel: '발굴 위치',
    keyFeaturesLabel: '주요 특징',
    listenToAudioGuide: '오디오 가이드 듣기',
    takePhotoWithFigure: '인물과 사진 찍기',
    audioGuideModalTitle: '기본 가이드',
    audioGuideUnavailableMessage: '재생할 오디오 가이드가 없어요.',
    audioGuidePlayLabel: '재생',
    audioGuidePauseLabel: '멈춤',
    comingSoonTitle: '준비 중이에요',
    comingSoonMessage: '이 장소의 컬렉션은 곧 공개될 예정이에요.',
    loadingMessage: '불러오는 중이에요.',
    emptyTopicMessage: '아직 획득한 스페셜 도감이 없어요.',
    emptyItemMessage: '아직 획득한 도감 아이템이 없어요.',
    loadErrorMessage: '도감 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
    lockedItemMessage: 'AR카메라에서 먼저 만나보세요.',
    detailUnavailableMessage: '획득한 아이템만 상세 정보를 볼 수 있어요.',
    personTypeLabel: '인물',
    artifactTypeLabel: '유물',
    aiImageDisclosure: '*AI로 생성된 이미지입니다.',
    sourceDisclosurePrefix: '*출처 -',
  },
  en: {
    listTitle: 'Buyeo Baekje Almanac',
    listSubtitle: 'Collect artifacts & figures from every location',
    lifespanLabel: 'Lifespan',
    productionPeriodLabel: 'Production Period',
    locationLabel: 'Location',
    keyFeaturesLabel: 'Key Features',
    listenToAudioGuide: 'Listen to Audio Guide',
    takePhotoWithFigure: 'Take a Photo Together',
    audioGuideModalTitle: 'Basic Guide',
    audioGuideUnavailableMessage: 'No audio guide is available.',
    audioGuidePlayLabel: 'Play',
    audioGuidePauseLabel: 'Pause',
    comingSoonTitle: 'Coming Soon',
    comingSoonMessage: "This location's collectible hasn't been revealed yet.",
    loadingMessage: 'Loading...',
    emptyTopicMessage: 'No acquired special collections yet.',
    emptyItemMessage: 'No acquired collection items yet.',
    loadErrorMessage: "Couldn't load collection data. Please try again later.",
    lockedItemMessage: 'Meet it in AR Camera first.',
    detailUnavailableMessage: 'Only acquired items can be viewed in detail.',
    personTypeLabel: 'Figure',
    artifactTypeLabel: 'Artifact',
    aiImageDisclosure: '*AI-generated image.',
    sourceDisclosurePrefix: '*Source -',
  },
  zh: {
    listTitle: '扶余百济图鉴',
    listSubtitle: '收集各地的文物与人物',
    lifespanLabel: '生平',
    productionPeriodLabel: '制作时期',
    locationLabel: '发现地点',
    keyFeaturesLabel: '主要特点',
    listenToAudioGuide: '收听语音导览',
    takePhotoWithFigure: '与人物合影',
    audioGuideModalTitle: '基础导览',
    audioGuideUnavailableMessage: '暂无可播放的语音导览。',
    audioGuidePlayLabel: '播放',
    audioGuidePauseLabel: '暂停',
    comingSoonTitle: '即将开放',
    comingSoonMessage: '该地点的收藏内容尚未公开。',
    loadingMessage: '加载中。',
    emptyTopicMessage: '暂无已获得的特别图鉴。',
    emptyItemMessage: '暂无已获得的图鉴项目。',
    loadErrorMessage: '无法加载图鉴信息。请稍后再试。',
    lockedItemMessage: '请先在 AR 相机中遇见它。',
    detailUnavailableMessage: '只有已获得的项目可以查看详情。',
    personTypeLabel: '人物',
    artifactTypeLabel: '文物',
    aiImageDisclosure: '*AI生成图像。',
    sourceDisclosurePrefix: '*来源 -',
  },
  ja: {
    listTitle: '扶余百済図鑑',
    listSubtitle: 'さまざまな場所の遺物と人物を集めよう',
    lifespanLabel: '生涯',
    productionPeriodLabel: '制作時期',
    locationLabel: '発見場所',
    keyFeaturesLabel: '主な特徴',
    listenToAudioGuide: '音声ガイドを聞く',
    takePhotoWithFigure: '人物と写真を撮る',
    audioGuideModalTitle: '基本ガイド',
    audioGuideUnavailableMessage: '再生できる音声ガイドがありません。',
    audioGuidePlayLabel: '再生',
    audioGuidePauseLabel: '停止',
    comingSoonTitle: '準備中です',
    comingSoonMessage: 'この場所のコレクションはまもなく公開されます。',
    loadingMessage: '読み込み中です。',
    emptyTopicMessage: '獲得済みのスペシャル図鑑はまだありません。',
    emptyItemMessage: '獲得済みの図鑑アイテムはまだありません。',
    loadErrorMessage: '図鑑情報を読み込めませんでした。しばらくしてからもう一度お試しください。',
    lockedItemMessage: '先にARカメラで出会ってください。',
    detailUnavailableMessage: '獲得済みアイテムのみ詳細を表示できます。',
    personTypeLabel: '人物',
    artifactTypeLabel: '遺物',
    aiImageDisclosure: '*AI生成画像です。',
    sourceDisclosurePrefix: '*出典 -',
  },
};

type CollectibleAcquiredText = {
  newAcquiredPrefix: string;
  personLabel: string;
  artifactLabel: string;
  newAcquiredSuffix: string;
  /** Appended directly after the collectible's name (Figma's own example hardcodes the 이/가 particle rather than varying it per name). */
  addedToCollectionSuffix: string;
  /** Item-card caption — deliberately name-free since the name is already shown in the subtitle above and on the card itself. */
  genericAcquiredMessage: string;
  takePhotoButtonLabel: string;
  viewCollectionButtonLabel: string;
  closeButtonAccessibilityLabel: string;
};

// Matches Figma "인물카드 획득" / "유물 카드 획득" (nodes 0:2718 / 0:2821) — the
// celebratory popup shown right when a location-based acquisition happens.
// That real GPS-triggered acquisition flow doesn't exist yet, so this is
// wired to two known collection-grid taps for now (see collection.tsx).
export const collectibleAcquiredText: Record<Locale, CollectibleAcquiredText> = {
  ko: {
    newAcquiredPrefix: '신규 ',
    personLabel: '인물',
    artifactLabel: '유물',
    newAcquiredSuffix: '  획득!',
    addedToCollectionSuffix: '이 컬렉션에 추가되었어요.',
    genericAcquiredMessage: '획득 완료! 도감에서 확인해보세요.',
    takePhotoButtonLabel: '사진 찍기',
    viewCollectionButtonLabel: '도감 보기',
    closeButtonAccessibilityLabel: '닫기',
  },
  en: {
    newAcquiredPrefix: 'New ',
    personLabel: 'Figure',
    artifactLabel: 'Artifact',
    newAcquiredSuffix: ' Acquired!',
    addedToCollectionSuffix: ' has been added to your collection.',
    genericAcquiredMessage: 'Acquired! Check it out in your collection.',
    takePhotoButtonLabel: 'Take a Photo',
    viewCollectionButtonLabel: 'View Collection',
    closeButtonAccessibilityLabel: 'Close',
  },
  zh: {
    newAcquiredPrefix: '新',
    personLabel: '人物',
    artifactLabel: '文物',
    newAcquiredSuffix: '获得！',
    addedToCollectionSuffix: '已添加到收藏。',
    genericAcquiredMessage: '获得成功！快去图鉴查看吧。',
    takePhotoButtonLabel: '去拍照',
    viewCollectionButtonLabel: '查看图鉴',
    closeButtonAccessibilityLabel: '关闭',
  },
  ja: {
    newAcquiredPrefix: '新規',
    personLabel: '人物',
    artifactLabel: '遺物',
    newAcquiredSuffix: '獲得！',
    addedToCollectionSuffix: 'がコレクションに追加されました。',
    genericAcquiredMessage: '獲得完了！図鑑で確認してみてください。',
    takePhotoButtonLabel: '写真を撮る',
    viewCollectionButtonLabel: '図鑑を見る',
    closeButtonAccessibilityLabel: '閉じる',
  },
};

type AlbumScreenText = {
  subtitle: string;
  photoCountSuffix: string;
  loadErrorText: string;
  themeLabel: string;
  buyeoCutLabel: string;
  personCameraLabel: string;
  emptyTitle: string;
  emptyBodyLine1: string;
  emptyBodyLine2: string;
  emptyPrimaryButton: string;
  emptySecondaryButton: string;
};

export const albumScreenText: Record<Locale, AlbumScreenText> = {
  ko: {
    subtitle: '부여의 유서 깊은 유적지에서 모아둔 소중한 흔적들을 모아보시오.',
    photoCountSuffix: '장',
    loadErrorText: '앨범을 불러오지 못했어요. 다시 시도해주세요.',
    themeLabel: '테마',
    buyeoCutLabel: '부여세컷',
    personCameraLabel: '인물 카메라',
    emptyTitle: '아직 촬영된 사진이 없습니다!',
    emptyBodyLine1: '부여에 잠들어있는 백제의 유물과 인물들을 발견하고 획득해보세요.',
    emptyBodyLine2: '획득 후, 소중한 기념사진을 촬영하여 앨범에 보관할 수 있습니다.',
    emptyPrimaryButton: '유물 · 인물 획득하러 가기',
    emptySecondaryButton: '지도 홈',
  },
  en: {
    subtitle: "Gather the precious traces you've collected from Buyeo's storied heritage sites.",
    photoCountSuffix: ' photos',
    loadErrorText: "Couldn't load the album. Please try again.",
    themeLabel: 'Theme',
    buyeoCutLabel: 'Buyeo 4-Cut',
    personCameraLabel: 'Portrait Camera',
    emptyTitle: "You haven't taken any photos yet!",
    emptyBodyLine1: "Discover and collect Baekje's artifacts and figures resting around Buyeo.",
    emptyBodyLine2: 'Once collected, capture a keepsake photo to save here in your album.',
    emptyPrimaryButton: 'Go Collect Artifacts & Figures',
    emptySecondaryButton: 'Map Home',
  },
  zh: {
    subtitle: '收集在扶余悠久遗迹中留下的珍贵痕迹吧。',
    photoCountSuffix: '张',
    loadErrorText: '相册加载失败，请重试。',
    themeLabel: '主题',
    buyeoCutLabel: '扶余四格',
    personCameraLabel: '人物相机',
    emptyTitle: '还没有拍摄的照片！',
    emptyBodyLine1: '发现并收集沉睡在扶余的百济文物与人物吧。',
    emptyBodyLine2: '收集后可以拍摄珍贵的纪念照并保存在相册中。',
    emptyPrimaryButton: '去收集文物·人物',
    emptySecondaryButton: '地图首页',
  },
  ja: {
    subtitle: '扶余の由緒ある遺跡地で集めた大切な痕跡を集めてみよう。',
    photoCountSuffix: '枚',
    loadErrorText: 'アルバムを読み込めませんでした。もう一度お試しください。',
    themeLabel: 'テーマ',
    buyeoCutLabel: '扶余フォーカット',
    personCameraLabel: '人物カメラ',
    emptyTitle: 'まだ撮影された写真がありません！',
    emptyBodyLine1: '扶余に眠る百済の遺物と人物を発見して手に入れましょう。',
    emptyBodyLine2: '獲得後は大切な記念写真を撮影してアルバムに保存できます。',
    emptyPrimaryButton: '遺物・人物を獲得しに行く',
    emptySecondaryButton: '地図ホーム',
  },
};

type BuyeoCutScreenText = {
  headerTitle: string;
  headerSubtitle: string;
  selectionCounter: (count: number, total: number) => string;
  progressStatus: (selected: number, total: number) => string;
  emptyTitle: string;
  emptyBody: string;
  emptyPrimaryButton: string;
  generateButton: string;
  filterSheetTitle: string;
  filterCloseLabel: string;
  filterAllLabel: string;
  filterAppliedToast: (themeLabel: string) => string;
  collageHeaderTitle: string;
  collageHeaderSubtitle: string;
  aiGeneratedDisclaimerText: string;
  frameSectionLabel: string;
  frameOnLabel: string;
  frameOffLabel: string;
  frameLoadErrorText: string;
  selfiesLoadErrorText: string;
  collageCaption: string;
  saveButtonLabel: string;
  shareButtonAccessibilityLabel: string;
  shareUnavailableToastTitle: string;
  shareUnavailableToastBody: string;
  shareUnsupportedToastTitle: string;
  shareUnsupportedToastBody: string;
  saveToastTitle: string;
  saveToastBody: string;
  saveErrorToastTitle: string;
  saveErrorToastBody: string;
  saveUnsupportedToastTitle: string;
  saveUnsupportedToastBody: string;
  unsyncedSelectionWarningText: string;
};

// Note: "부여세컷" literally means "Buyeo 3-cut" (세 = three, as opposed to
// 네컷/"4-cut") — matches Figma's own progress example ("2 / 3", node
// 0:1418), so the picker targets 3 photos, not 4.
export const buyeoCutScreenText: Record<Locale, BuyeoCutScreenText> = {
  ko: {
    headerTitle: '부여세컷 선택',
    headerSubtitle: '부여세컷을 완성할 사진을 선택하시오',
    selectionCounter: (count, total) => `${count}/${total} 선택`,
    progressStatus: (selected, total) => `현재 ${total}장 중 ${selected}장 선택완료`,
    emptyTitle: '아직 모은 사진이 없어요',
    emptyBody: '인물 카메라로 사진을 찍으면 여기서 부여세컷을 만들 수 있어요.',
    emptyPrimaryButton: '사진 찍으러 가기',
    generateButton: '부여세컷 생성하기',
    filterSheetTitle: '테마 필터',
    filterCloseLabel: '닫기',
    filterAllLabel: '전체',
    filterAppliedToast: (themeLabel) => `${themeLabel} 테마만 보기`,
    collageHeaderTitle: '부여세컷 완성',
    collageHeaderSubtitle: '백제의 추억을 부여세컷으로 간직하십시오',
    aiGeneratedDisclaimerText: '*AI로 생성된 이미지 입니다.',
    frameSectionLabel: '프레임 선택',
    frameOnLabel: '프레임',
    frameOffLabel: '프레임 없음',
    frameLoadErrorText: '프레임을 불러오지 못했어요.',
    selfiesLoadErrorText: '셀카 사진을 불러오지 못했어요.',
    collageCaption: 'TimeTrip 부여',
    saveButtonLabel: '세컷 저장하기',
    shareButtonAccessibilityLabel: '공유하기',
    shareUnavailableToastTitle: '공유할 수 없어요',
    shareUnavailableToastBody: '잠시 후 다시 시도해 주세요.',
    shareUnsupportedToastTitle: '아직 공유 기능을 쓸 수 없어요',
    shareUnsupportedToastBody: '앱을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.',
    saveToastTitle: '저장완료!',
    saveToastBody: '다른 사진조합으로도 만들어 보시오',
    saveErrorToastTitle: '저장하지 못했어요',
    saveErrorToastBody: '잠시 후 다시 시도해 주세요.',
    saveUnsupportedToastTitle: '아직 저장 기능을 쓸 수 없어요',
    saveUnsupportedToastBody: '앱을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.',
    unsyncedSelectionWarningText: '선택한 사진 중 서버에 저장되지 않은 사진이 있어요. 앨범/부여세컷 목록에서 서버에 저장된 사진으로 다시 선택해 주세요.',
  },
  en: {
    headerTitle: 'Select Buyeo 3-Cut',
    headerSubtitle: 'Choose the photos to complete your Buyeo 3-cut',
    selectionCounter: (count, total) => `${count}/${total} selected`,
    progressStatus: (selected, total) => `${selected} of ${total} photos selected`,
    emptyTitle: "You haven't collected any photos yet",
    emptyBody: 'Take photos with the portrait camera to build a Buyeo 3-cut here.',
    emptyPrimaryButton: 'Go Take a Photo',
    generateButton: 'Create Buyeo 3-Cut',
    filterSheetTitle: 'Theme Filter',
    filterCloseLabel: 'Close',
    filterAllLabel: 'All',
    filterAppliedToast: (themeLabel) => `Showing ${themeLabel} only`,
    collageHeaderTitle: 'Your Buyeo 3-Cut',
    collageHeaderSubtitle: 'Keep your Baekje memories in a Buyeo 3-cut',
    aiGeneratedDisclaimerText: '*This image was generated by AI.',
    frameSectionLabel: 'Choose a Frame',
    frameOnLabel: 'Frame',
    frameOffLabel: 'No Frame',
    frameLoadErrorText: 'Could not load frames.',
    selfiesLoadErrorText: 'Could not load selfie photos.',
    collageCaption: 'TimeTrip Buyeo',
    saveButtonLabel: 'Save 3-Cut',
    shareButtonAccessibilityLabel: 'Share',
    shareUnavailableToastTitle: "Can't share right now",
    shareUnavailableToastBody: 'Please try again in a moment.',
    shareUnsupportedToastTitle: 'Sharing isn’t available yet',
    shareUnsupportedToastBody: 'Please update the app to the latest version and try again.',
    saveToastTitle: 'Saved!',
    saveToastBody: 'Try a different photo combination too',
    saveErrorToastTitle: "Couldn't save",
    saveErrorToastBody: 'Please try again in a moment.',
    saveUnsupportedToastTitle: 'Saving isn’t available yet',
    saveUnsupportedToastBody: 'Please update the app to the latest version and try again.',
    unsyncedSelectionWarningText:
      "Some of the selected photos haven't finished saving to the server yet. Please choose photos from your album or Buyeo 3-cut list instead.",
  },
  zh: {
    headerTitle: '选择扶余三格',
    headerSubtitle: '选择照片以完成你的扶余三格',
    selectionCounter: (count, total) => `已选择 ${count}/${total}`,
    progressStatus: (selected, total) => `已选择 ${total} 张中的 ${selected} 张`,
    emptyTitle: '还没有收集到照片',
    emptyBody: '使用人物相机拍照后，就可以在这里制作扶余三格了。',
    emptyPrimaryButton: '去拍照',
    generateButton: '生成扶余三格',
    filterSheetTitle: '主题筛选',
    filterCloseLabel: '关闭',
    filterAllLabel: '全部',
    filterAppliedToast: (themeLabel) => `仅显示 ${themeLabel}`,
    collageHeaderTitle: '完成的扶余三格',
    collageHeaderSubtitle: '将百济的回忆珍藏在扶余三格里',
    aiGeneratedDisclaimerText: '*此图像由AI生成。',
    frameSectionLabel: '选择相框',
    frameOnLabel: '相框',
    frameOffLabel: '无相框',
    frameLoadErrorText: '无法加载相框。',
    selfiesLoadErrorText: '无法加载自拍照片。',
    collageCaption: 'TimeTrip 扶余',
    saveButtonLabel: '保存三格',
    shareButtonAccessibilityLabel: '分享',
    shareUnavailableToastTitle: '暂时无法分享',
    shareUnavailableToastBody: '请稍后再试一次。',
    shareUnsupportedToastTitle: '分享功能暂不可用',
    shareUnsupportedToastBody: '请将应用更新到最新版本后重试。',
    saveToastTitle: '保存完成！',
    saveToastBody: '也可以尝试其他照片组合',
    saveErrorToastTitle: '保存失败',
    saveErrorToastBody: '请稍后再试一次。',
    saveUnsupportedToastTitle: '保存功能暂不可用',
    saveUnsupportedToastBody: '请将应用更新到最新版本后重试。',
    unsyncedSelectionWarningText: '所选照片中有尚未保存到服务器的照片。请从相册/扶余三格列表中重新选择已保存的照片。',
  },
  ja: {
    headerTitle: '扶余三カットを選ぶ',
    headerSubtitle: '扶余三カットを完成させる写真を選んでください',
    selectionCounter: (count, total) => `${count}/${total} 選択`,
    progressStatus: (selected, total) => `${total}枚中${selected}枚選択済み`,
    emptyTitle: 'まだ集めた写真がありません',
    emptyBody: '人物カメラで写真を撮ると、ここで扶余三カットを作れます。',
    emptyPrimaryButton: '写真を撮りに行く',
    generateButton: '扶余三カットを生成する',
    filterSheetTitle: 'テーマフィルター',
    filterCloseLabel: '閉じる',
    filterAllLabel: 'すべて',
    filterAppliedToast: (themeLabel) => `${themeLabel}のみ表示`,
    collageHeaderTitle: '完成した扶余三カット',
    collageHeaderSubtitle: '百済の思い出を扶余三カットで残しましょう',
    aiGeneratedDisclaimerText: '*この画像はAIによって生成されました。',
    frameSectionLabel: 'フレームを選ぶ',
    frameOnLabel: 'フレーム',
    frameOffLabel: 'フレームなし',
    frameLoadErrorText: 'フレームを読み込めませんでした。',
    selfiesLoadErrorText: 'セルフィー写真を読み込めませんでした。',
    collageCaption: 'TimeTrip 扶余',
    saveButtonLabel: '三カットを保存',
    shareButtonAccessibilityLabel: '共有する',
    shareUnavailableToastTitle: '共有できませんでした',
    shareUnavailableToastBody: 'しばらくしてからもう一度お試しください。',
    shareUnsupportedToastTitle: 'まだ共有機能が使えません',
    shareUnsupportedToastBody: 'アプリを最新バージョンに更新してからもう一度お試しください。',
    saveToastTitle: '保存完了！',
    saveToastBody: '他の写真の組み合わせも作ってみましょう',
    saveErrorToastTitle: '保存できませんでした',
    saveErrorToastBody: 'しばらくしてからもう一度お試しください。',
    saveUnsupportedToastTitle: 'まだ保存機能が使えません',
    saveUnsupportedToastBody: 'アプリを最新バージョンに更新してからもう一度お試しください。',
    unsyncedSelectionWarningText:
      '選択した写真の中にまだサーバーに保存されていないものがあります。アルバム/扶余三カット一覧から保存済みの写真を選び直してください。',
  },
};

type PersonCameraText = {
  posePickerLabel: string;
  poseSelectedLabel: (index: number) => string;
  photoWithFigureLabel: string;
  locationSubtitlePrefix: string;
  cameraPermissionMessage: string;
  grantCameraAccessLabel: string;
  saveButton: string;
  timerButtonAccessibilityLabel: string;
  timerOffLabel: string;
  timerOptionLabel: (seconds: number) => string;
  photoSavedToastTitle: string;
  photoSavedToastBody: string;
  shareUnavailableToastTitle: string;
  shareUnavailableToastBody: string;
  aiImageDisclosure: string;
};

export const personCameraText: Record<Locale, PersonCameraText> = {
  ko: {
    posePickerLabel: '인물 포즈 설정',
    poseSelectedLabel: (index) => `포즈 ${index} 선택됨`,
    photoWithFigureLabel: '인물과 함께 사진을 찍어보세요!',
    locationSubtitlePrefix: '장소1 : ',
    cameraPermissionMessage: '인물 카메라를 사용하려면 카메라 권한이 필요해요.',
    grantCameraAccessLabel: '카메라 권한 허용하기',
    saveButton: '저장하기',
    timerButtonAccessibilityLabel: '셀프 타이머',
    timerOffLabel: '끄기',
    timerOptionLabel: (seconds) => `${seconds}초`,
    photoSavedToastTitle: '앨범에 저장되었습니다',
    photoSavedToastBody: '확인해 보세요!',
    shareUnavailableToastTitle: '공유할 수 없어요',
    shareUnavailableToastBody: '잠시 후 다시 시도해 주세요.',
    aiImageDisclosure: '*AI로 생성된 이미지입니다.',
  },
  en: {
    posePickerLabel: 'Choose a Pose',
    poseSelectedLabel: (index) => `Pose ${index} selected`,
    photoWithFigureLabel: 'Take a photo with the figure!',
    locationSubtitlePrefix: 'Spot 1: ',
    cameraPermissionMessage: 'Camera access is needed to use the portrait camera.',
    grantCameraAccessLabel: 'Grant Camera Access',
    saveButton: 'Save',
    timerButtonAccessibilityLabel: 'Self-timer',
    timerOffLabel: 'Off',
    timerOptionLabel: (seconds) => `${seconds}s`,
    photoSavedToastTitle: 'Saved to your album',
    photoSavedToastBody: 'Take a look!',
    shareUnavailableToastTitle: "Can't share right now",
    shareUnavailableToastBody: 'Please try again in a moment.',
    aiImageDisclosure: '*AI-generated image.',
  },
  zh: {
    posePickerLabel: '选择姿势',
    poseSelectedLabel: (index) => `已选择姿势 ${index}`,
    photoWithFigureLabel: '和人物一起拍张照吧！',
    locationSubtitlePrefix: '地点1：',
    cameraPermissionMessage: '使用人物相机需要相机权限。',
    grantCameraAccessLabel: '允许使用相机',
    saveButton: '保存',
    timerButtonAccessibilityLabel: '自拍定时器',
    timerOffLabel: '关闭',
    timerOptionLabel: (seconds) => `${seconds}秒`,
    photoSavedToastTitle: '已保存到相册',
    photoSavedToastBody: '快去看看吧！',
    shareUnavailableToastTitle: '暂时无法分享',
    shareUnavailableToastBody: '请稍后再试一次。',
    aiImageDisclosure: '*AI生成图像。',
  },
  ja: {
    posePickerLabel: 'ポーズ設定',
    poseSelectedLabel: (index) => `ポーズ${index}選択中`,
    photoWithFigureLabel: '人物と一緒に写真を撮ってみましょう！',
    locationSubtitlePrefix: 'スポット1：',
    cameraPermissionMessage: '人物カメラを使用するにはカメラへのアクセス許可が必要です。',
    grantCameraAccessLabel: 'カメラへのアクセスを許可',
    saveButton: '保存する',
    timerButtonAccessibilityLabel: 'セルフタイマー',
    timerOffLabel: 'オフ',
    timerOptionLabel: (seconds) => `${seconds}秒`,
    photoSavedToastTitle: 'アルバムに保存しました',
    photoSavedToastBody: '確認してみてください！',
    shareUnavailableToastTitle: '共有できませんでした',
    shareUnavailableToastBody: 'しばらくしてからもう一度お試しください。',
    aiImageDisclosure: '*AI生成画像です。',
  },
};
