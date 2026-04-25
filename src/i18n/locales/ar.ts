import type { LocaleResources } from "./en";

/**
 * Arabic locale (RTL). Any missing key falls back to English (`en.ts`).
 *
 * The locale resolver in `src/i18n/index.ts` flips `<html dir="rtl">` when this
 * locale is active. Layout primitives in the codebase use logical-property
 * Tailwind utilities (`ms-*`/`me-*`/`start-*`/`end-*`) so flipping is automatic.
 */
export const ar: LocaleResources = {
  app: {
    name: "Neptune TV",
    tagline: "مشغّل IPTV M3U8 فائق السرعة",
  },

  header: {
    search: {
      label: "بحث",
      placeholder: "ابحث في المجموعات والقنوات…",
    },
    menu: {
      label: "القائمة",
      home: "الرئيسية",
      openGroups: "فتح المجموعات",
    },
    sort: {
      group: "وضع الفرز",
      defaultShort: "افتراضي",
      defaultAbbrev: "افت",
      defaultFull: "الفرز حسب ترتيب القائمة",
      nameShort: "الاسم",
      nameAbbrev: "أ–ي",
      nameFull: "الفرز حسب الاسم (أ–ي)",
    },
    theme: {
      switchToLight: "التبديل إلى المظهر الفاتح",
      switchToDark: "التبديل إلى المظهر الداكن",
      switchToSystem: "التبديل إلى مظهر النظام",
      currentLight: "المظهر الفاتح (انقر للداكن)",
      currentDark: "المظهر الداكن (انقر للنظام)",
      currentSystem: "مظهر النظام (انقر للفاتح)",
    },
    playlistMenu: {
      sectionLabel: "قائمة التشغيل",
      openDifferent: "فتح قائمة تشغيل أخرى…",
      closePlaylist: "إغلاق قائمة التشغيل",
      themeLabel: "المظهر",
      themeLight: "فاتح",
      themeDark: "داكن",
      themeSystem: "النظام",
      languageLabel: "اللغة",
      languageEnglish: "English",
      languageFrench: "Français",
      languageArabic: "العربية",
      languageSystem: "النظام",
      blocked: "المحظورة",
      shortcuts: "اختصارات لوحة المفاتيح",
    },
    progress: "جارٍ الاستيراد… {{count, number}} قناة",
    badge: {
      imported: "تم الاستيراد {{when}}",
      stats: "{{channels, number}} قناة · {{groups, number}} مجموعات",
      detailsButton: "تفاصيل الاستيراد",
    },
  },

  search: {
    loading: "جارٍ البحث…",
    groups: "المجموعات",
    channels: "القنوات",
    noGroups: "لا توجد مجموعات مطابقة",
    noChannels: "لا توجد قنوات مطابقة",
  },

  hero: {
    title: "Neptune TV",
    description:
      "افتح ملف M3U / M3U8 محلي أو رابط HTTP(S) عن بُعد. يتم بثّ القوائم الكبيرة سطرًا بسطر — لا يتم تحميل أي شيء بالكامل في الذاكرة.",
    cancelImport: "إلغاء الاستيراد",
    openLocal: "فتح ملف محلي",
    openRemote: "فتح رابط بعيد",
  },

  home: {
    favoriteChannels: "القنوات المفضّلة",
    recentlyWatched: "شوهد مؤخّرًا",
    favoriteGroups: "المجموعات المفضّلة",
    allGroups: "كل المجموعات",
    seeAll: "عرض الكل",
    empty: {
      noFavoritesTitle: "لا توجد إشارات مرجعية بعد",
      noFavoritesDescription: "انقر على ★ على أي قناة داخل مجموعة.",
      nothingWatchedTitle: "لم يتم مشاهدة أي شيء بعد",
      nothingWatchedDescription: "افتح قناة للبدء.",
      noFavoriteGroupsTitle: "لا توجد مجموعات مفضّلة",
      noFavoriteGroupsDescription: "ضع نجمة على مجموعة من الشبكة أدناه.",
      noGroupsTitle: "لا توجد مجموعات",
      noGroupsDescription: "لا تحتوي قائمة التشغيل هذه على أي مجموعات.",
    },
  },

  groupDetail: {
    home: "الرئيسية",
    breadcrumbSeparator: "‹",
    actions: "إجراءات المجموعة",
    scopedSearch: "ابحث داخل هذه المجموعة…",
    favoriteChannels: "القنوات المفضّلة",
    recentInGroup: "شوهد مؤخّرًا في هذه المجموعة",
    empty: {
      noChannelsTitle: "لا توجد قنوات",
      noChannelsDescription: "لا توجد قنوات في هذا العرض.",
    },
  },

  virtualGroups: {
    favoriteChannels: "القنوات المفضّلة",
    favoriteGroups: "المجموعات المفضّلة",
    recentlyWatched: "شوهد مؤخّرًا",
  },

  blocked: {
    back: "رجوع",
    nothingTitle: "لا يوجد محظور",
    nothingDescription: "ليس لديك أي مجموعات أو قنوات محظورة.",
    groupsHeading: "المجموعات المحظورة",
    channelsHeading: "القنوات المحظورة",
    groupsEmptyWithChannels: "لا توجد مجموعات محظورة. لديك فقط قنوات محظورة.",
    channelsEmptyWithGroups: "لا توجد قنوات محظورة. لديك فقط مجموعات محظورة.",
    unblock: "إلغاء الحظر",
    loadMore: "تحميل المزيد",
  },

  confirm: {
    cancel: "إلغاء",
    confirm: "تأكيد",
    openDifferent: {
      title: "فتح قائمة تشغيل أخرى؟",
      description: "ستتم إزالة قائمة التشغيل الحالية. لا يمكن التراجع عن هذا الإجراء.",
      confirmLabel: "متابعة",
    },
    closePlaylist: {
      title: "إغلاق قائمة التشغيل؟",
      description: "سيتم حذف جميع البيانات نهائيًا من هذا الجهاز.",
      confirmLabel: "حذف",
    },
  },

  remote: {
    title: "فتح قائمة تشغيل بعيدة",
    description: "أدخل رابط HTTP أو HTTPS صالحًا لقائمة تشغيل M3U / M3U8.",
    placeholder: "https://example.com/playlist.m3u8",
    cancel: "إلغاء",
    import: "استيراد",
  },

  shortcuts: {
    title: "اختصارات لوحة المفاتيح",
    rows: {
      navigate: "التنقّل داخل اللوحة المحدّدة",
      switchPanel: "التبديل بين الشريط الجانبي والمحتوى الرئيسي",
      activate: "تشغيل القناة أو فتح المجموعة المحدّدة",
      bookmark: "تبديل الإشارة المرجعية للقناة المحدّدة",
      focusSearch: "تركيز شريط البحث الشامل",
      escape: "مسح البحث / إغلاق النافذة",
      help: "فتح اختصارات لوحة المفاتيح",
    },
  },

  card: {
    bookmarkChannel: "إشارة مرجعية",
    bookmarkGroup: "إشارة على المجموعة",
    channelCount_zero: "لا توجد قنوات",
    channelCount_one: "قناة واحدة",
    channelCount_two: "قناتان",
    channelCount_few: "{{count, number}} قنوات",
    channelCount_many: "{{count, number}} قناة",
    channelCount_other: "{{count, number}} قناة",
    channelCountUnknown: "—",
  },

  sidebar: {
    heading: "المجموعات",
    closeSheet: "إغلاق",
  },

  contextMenu: {
    blockChannel: "حظر القناة",
    blockGroup: "حظر المجموعة",
    copyStreamUrl: "نسخ رابط البث",
  },

  list: {
    loadingMore: "جارٍ التحميل…",
  },

  toast: {
    importProgress: "جارٍ الاستيراد… {{count, number}} قناة",
    importCompleteSkipped_one:
      "تم استيراد {{channels, number}} قناة و {{groups, number}} مجموعة. تم تخطّي إدخال واحد.",
    importCompleteSkipped_other:
      "تم استيراد {{channels, number}} قناة و {{groups, number}} مجموعة. تم تخطّي {{skipped, number}} إدخال.",
    importCancelled: "تم إلغاء الاستيراد.",
    ipcFailed: "حدث خطأ ({{command}}): {{message}}",
  },

  windowTitle: {
    base: "Neptune TV",
    importing: "Neptune TV — جارٍ الاستيراد…",
    blocked: "Neptune TV — المحظورة",
    search: 'Neptune TV — بحث: "{{query}}"',
    group: "Neptune TV — {{title}} ({{count, number}} قناة)",
  },

  errors: {
    invalidInput: "مدخل غير صالح",
    invalidQuery: "استعلام غير صالح",
    invalidUrl: "رابط غير صالح",
    urlRequired: "الرابط مطلوب",
    invalidUrlFormat: "يجب أن يكون رابطًا صالحًا",
    schemeNotAllowed: "يُسمح فقط بمخططَي http و https",
    pathRequired: "المسار مطلوب",
    queryEmpty: "لا يمكن أن يكون الاستعلام فارغًا",
    queryTooLong: "الاستعلام طويل جدًا",
    cursorEmpty: "لا يمكن أن يكون المؤشّر فارغًا",
  },

  picker: {
    playlist: "قائمة تشغيل",
  },
};
