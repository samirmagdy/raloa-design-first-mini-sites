import type { BlockConfigValue, BlockType } from './block';
import type { LocalizedText } from './common';

export type BlockFieldKind =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'url'
  | 'embed'
  | 'image'
  | 'image-list'
  | 'video'
  | 'audio'
  | 'color'
  | 'number'
  | 'currency'
  | 'date'
  | 'select'
  | 'toggle'
  | 'phone'
  | 'email'
  | 'password'
  | 'options';

export interface BlockFieldOption {
  value: string;
  label: LocalizedText;
}

/**
 * D3 in docs/backend-plan.md: one descriptor per configurable field. The editor renders forms
 * from this, the client validates against it, and the same structure is what the server checks
 * `config` JSONB against — so the three can no longer drift.
 */
export interface BlockFieldDefinition {
  key: string;
  kind: BlockFieldKind;
  label: LocalizedText;
  help?: LocalizedText;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  options?: BlockFieldOption[];
  /** Hostnames an `embed` field accepts; also the iframe allowlist. */
  embedHosts?: string[];
  /** Only render/validate when another config key equals a value. */
  when?: { key: string; equals: BlockConfigValue };
}

export type BlockTextSlot = 'title' | 'subtitle' | 'content';

export type BlockCategory =
  | 'Basics'
  | 'Media'
  | 'Music'
  | 'Video'
  | 'Convert'
  | 'Contact'
  | 'Commerce'
  | 'Social'
  | 'Utility';

export interface BlockDefinition {
  key: BlockType;
  /** Component key the renderer maps to a view; the wire format never sends JSX. */
  rendererKey: string;
  label: LocalizedText;
  description: LocalizedText;
  category: BlockCategory;
  icon: string;
  /** Which localized text slots this type exposes, in editor order. */
  textSlots: BlockTextSlot[];
  titleRequired?: boolean;
  /** `url` is a first-class column on the block, not config. */
  hasUrl?: boolean;
  urlRequired?: boolean;
  /** Only `folder` nests today; the flag keeps the registry honest about it. */
  supportsChildren?: boolean;
  /** Structural blocks render no interaction (spacer, section header). */
  structural?: boolean;
  fields: BlockFieldDefinition[];
}

const EMBED_HOSTS = {
  youtube: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'],
  vimeo: ['vimeo.com'],
  tiktok: ['tiktok.com'],
  spotify: ['spotify.com'],
  'apple-music': ['music.apple.com', 'apple.co'],
  soundcloud: ['soundcloud.com']
} as const;

const embedField = (hosts: readonly string[], label: LocalizedText): BlockFieldDefinition => ({
  key: 'embedUrl',
  kind: 'embed',
  label,
  embedHosts: [...hosts],
  required: true
});

const text = (key: string, label: LocalizedText, extra: Partial<BlockFieldDefinition> = {}): BlockFieldDefinition => ({
  key,
  kind: 'text',
  label,
  ...extra
});

export const blockDefinitions: BlockDefinition[] = [
  {
    key: 'link',
    rendererKey: 'link',
    label: { en: 'Link', ar: 'رابط' },
    description: { en: 'A button that opens a URL.', ar: 'زر يفتح رابطاً.' },
    category: 'Basics',
    icon: 'Link2',
    textSlots: ['title', 'subtitle'],
    titleRequired: true,
    hasUrl: true,
    urlRequired: true,
    fields: [text('buttonStyle', { en: 'Button style', ar: 'شكل الزر' })]
  },
  {
    key: 'section',
    rendererKey: 'section',
    label: { en: 'Section header', ar: 'عنوان قسم' },
    description: { en: 'A divider label above a group of blocks.', ar: 'فاصل نصي فوق مجموعة كتل.' },
    category: 'Basics',
    icon: 'Heading',
    textSlots: ['title'],
    titleRequired: true,
    structural: true,
    fields: []
  },
  {
    key: 'folder',
    rendererKey: 'folder',
    label: { en: 'Link folder', ar: 'مجلد روابط' },
    description: { en: 'Collapsible group of nested links.', ar: 'مجموعة قابلة للطي من الروابط.' },
    category: 'Basics',
    icon: 'FolderTree',
    textSlots: ['title', 'subtitle'],
    titleRequired: true,
    supportsChildren: true,
    fields: [
      {
        key: 'expanded',
        kind: 'toggle',
        label: { en: 'Start expanded', ar: 'مفتوح بالبداية' }
      }
    ]
  },
  {
    key: 'spacer',
    rendererKey: 'spacer',
    label: { en: 'Spacer', ar: 'مسافة' },
    description: { en: 'Vertical space between blocks.', ar: 'مسافة عمودية بين الكتل.' },
    category: 'Basics',
    icon: 'MoveVertical',
    textSlots: [],
    structural: true,
    fields: [
      { key: 'height', kind: 'number', label: { en: 'Height (px)', ar: 'الارتفاع (بكسل)' }, min: 8, max: 240, step: 4 }
    ]
  },
  {
    key: 'rich-text',
    rendererKey: 'rich-text',
    label: { en: 'Rich text', ar: 'نص منسق' },
    description: { en: 'A paragraph block with limited HTML.', ar: 'فقرة نصية مع HTML محدود.' },
    category: 'Basics',
    icon: 'Type',
    textSlots: ['content'],
    fields: []
  },
  {
    key: 'image',
    rendererKey: 'image',
    label: { en: 'Image', ar: 'صورة' },
    description: { en: 'A single image, optional caption and link.', ar: 'صورة واحدة مع وصف اختياري.' },
    category: 'Media',
    icon: 'Image',
    textSlots: ['subtitle'],
    hasUrl: true,
    fields: [
      { key: 'imageUrl', kind: 'image', label: { en: 'Image', ar: 'الصورة' }, required: true },
      { key: 'alt', kind: 'text', label: { en: 'Alt text', ar: 'النص البديل' }, required: true },
      {
        key: 'fit',
        kind: 'select',
        label: { en: 'Fit', ar: 'التعبئة' },
        options: [
          { value: 'cover', label: { en: 'Cover', ar: 'تغطية' } },
          { value: 'contain', label: { en: 'Contain', ar: 'احتواء' } }
        ]
      }
    ]
  },
  {
    key: 'gallery',
    rendererKey: 'gallery',
    label: { en: 'Gallery', ar: 'معرض صور' },
    description: { en: 'Grid of images.', ar: 'شبكة من الصور.' },
    category: 'Media',
    icon: 'Images',
    textSlots: ['title'],
    fields: [
      { key: 'images', kind: 'image-list', label: { en: 'Images', ar: 'الصور' }, required: true },
      { key: 'columns', kind: 'number', label: { en: 'Columns', ar: 'الأعمدة' }, min: 1, max: 4 }
    ]
  },
  {
    key: 'carousel',
    rendererKey: 'carousel',
    label: { en: 'Carousel', ar: 'شريط صور' },
    description: { en: 'Swipeable row of images.', ar: 'صور قابلة للسحب الأفقي.' },
    category: 'Media',
    icon: 'GalleryHorizontalEnd',
    textSlots: ['title'],
    fields: [
      { key: 'images', kind: 'image-list', label: { en: 'Images', ar: 'الصور' }, required: true },
      { key: 'autoplay', kind: 'toggle', label: { en: 'Autoplay', ar: 'تشغيل تلقائي' } }
    ]
  },
  {
    key: 'video',
    rendererKey: 'video',
    label: { en: 'Video file', ar: 'ملف فيديو' },
    description: { en: 'Plays a hosted video file.', ar: 'تشغيل ملف فيديو مستضاف.' },
    category: 'Media',
    icon: 'Video',
    textSlots: ['title'],
    fields: [
      { key: 'videoUrl', kind: 'video', label: { en: 'Video URL', ar: 'رابط الفيديو' }, required: true },
      { key: 'poster', kind: 'image', label: { en: 'Poster image', ar: 'صورة الغلاف' } }
    ]
  },
  {
    key: 'direct-video',
    rendererKey: 'video',
    label: { en: 'Direct video', ar: 'فيديو مباشر' },
    description: { en: 'Autoplaying muted clip.', ar: 'مقطع يعمل تلقائياً بدون صوت.' },
    category: 'Media',
    icon: 'Clapperboard',
    textSlots: ['title'],
    fields: [
      { key: 'videoUrl', kind: 'video', label: { en: 'Video URL', ar: 'رابط الفيديو' }, required: true },
      { key: 'poster', kind: 'image', label: { en: 'Poster image', ar: 'صورة الغلاف' } },
      { key: 'autoplay', kind: 'toggle', label: { en: 'Autoplay', ar: 'تشغيل تلقائي' } }
    ]
  },
  {
    key: 'audio',
    rendererKey: 'audio',
    label: { en: 'Audio player', ar: 'مشغل صوت' },
    description: { en: 'A hosted audio track with controls.', ar: 'مقطع صوتي مع أزرار التحكم.' },
    category: 'Music',
    icon: 'Volume2',
    textSlots: ['title', 'subtitle'],
    fields: [{ key: 'audioUrl', kind: 'audio', label: { en: 'Audio URL', ar: 'رابط الصوت' }, required: true }]
  },
  {
    key: 'mp3',
    rendererKey: 'audio',
    label: { en: 'MP3', ar: 'ملف MP3' },
    description: { en: 'Single MP3 upload.', ar: 'رفع ملف MP3 واحد.' },
    category: 'Music',
    icon: 'FileAudio',
    textSlots: ['title', 'subtitle'],
    fields: [
      { key: 'audioUrl', kind: 'audio', label: { en: 'MP3 URL', ar: 'رابط MP3' }, required: true },
      { key: 'coverUrl', kind: 'image', label: { en: 'Cover art', ar: 'غلاف المقطع' } }
    ]
  },
  {
    key: 'youtube',
    rendererKey: 'embed',
    label: { en: 'YouTube', ar: 'يوتيوب' },
    description: { en: 'Embedded YouTube player.', ar: 'مشغل يوتيوب مضمّن.' },
    category: 'Video',
    icon: 'Youtube',
    textSlots: ['title'],
    fields: [embedField(EMBED_HOSTS.youtube, { en: 'YouTube URL', ar: 'رابط يوتيوب' })]
  },
  {
    key: 'vimeo',
    rendererKey: 'embed',
    label: { en: 'Vimeo', ar: 'فيميو' },
    description: { en: 'Embedded Vimeo player.', ar: 'مشغل فيميو مضمّن.' },
    category: 'Video',
    icon: 'Video',
    textSlots: ['title'],
    fields: [embedField(EMBED_HOSTS.vimeo, { en: 'Vimeo URL', ar: 'رابط فيميو' })]
  },
  {
    key: 'tiktok',
    rendererKey: 'embed',
    label: { en: 'TikTok', ar: 'تيك توك' },
    description: { en: 'Embedded TikTok post.', ar: 'منشور تيك توك مضمّن.' },
    category: 'Video',
    icon: 'Music2',
    textSlots: ['title'],
    fields: [embedField(EMBED_HOSTS.tiktok, { en: 'TikTok URL', ar: 'رابط تيك توك' })]
  },
  {
    key: 'spotify',
    rendererKey: 'embed',
    label: { en: 'Spotify', ar: 'سبوتيفاي' },
    description: { en: 'Track, album or playlist embed.', ar: 'تضمين أغنية أو ألبوم أو قائمة.' },
    category: 'Music',
    icon: 'Music2',
    textSlots: ['title'],
    fields: [embedField(EMBED_HOSTS.spotify, { en: 'Spotify URL', ar: 'رابط سبوتيفاي' })]
  },
  {
    key: 'apple-music',
    rendererKey: 'embed',
    label: { en: 'Apple Music', ar: 'أبل ميوزك' },
    description: { en: 'Apple Music embed.', ar: 'تضمين أبل ميوزك.' },
    category: 'Music',
    icon: 'Music',
    textSlots: ['title'],
    fields: [embedField(EMBED_HOSTS['apple-music'], { en: 'Apple Music URL', ar: 'رابط أبل ميوزك' })]
  },
  {
    key: 'soundcloud',
    rendererKey: 'embed',
    label: { en: 'SoundCloud', ar: 'ساوند كلاود' },
    description: { en: 'SoundCloud player embed.', ar: 'مشغل ساوند كلاود مضمّن.' },
    category: 'Music',
    icon: 'Soundcloud',
    textSlots: ['title'],
    fields: [embedField(EMBED_HOSTS.soundcloud, { en: 'SoundCloud URL', ar: 'رابط ساوند كلاود' })]
  },
  {
    key: 'newsletter',
    rendererKey: 'newsletter',
    label: { en: 'Newsletter', ar: 'النشرة البريدية' },
    description: { en: 'Email capture with double opt-in.', ar: 'التقاط البريد بتأكيد مزدوج.' },
    category: 'Convert',
    icon: 'MailPlus',
    textSlots: ['title', 'subtitle'],
    fields: [
      text('buttonLabel', { en: 'Button label', ar: 'نص الزر' }),
      { key: 'successMessage', kind: 'textarea', label: { en: 'Success message', ar: 'رسالة النجاح' } },
      { key: 'formId', kind: 'text', label: { en: 'List id', ar: 'معرف القائمة' } }
    ]
  },
  {
    key: 'contact-form',
    rendererKey: 'contact-form',
    label: { en: 'Contact form', ar: 'نموذج تواصل' },
    description: { en: 'Multi-field form built in the form builder.', ar: 'نموذج متعدد الحقول من منشئ النماذج.' },
    category: 'Convert',
    icon: 'FormInput',
    textSlots: ['title', 'subtitle'],
    fields: [
      { key: 'formId', kind: 'text', label: { en: 'Form', ar: 'النموذج' }, required: true },
      { key: 'successMessage', kind: 'textarea', label: { en: 'Success message', ar: 'رسالة النجاح' } }
    ]
  },
  {
    key: 'faq',
    rendererKey: 'faq',
    label: { en: 'FAQ', ar: 'أسئلة شائعة' },
    description: { en: 'Collapsible question and answer.', ar: 'سؤال وجواب قابل للطي.' },
    category: 'Convert',
    icon: 'CircleHelp',
    textSlots: ['title', 'content'],
    titleRequired: true,
    fields: []
  },
  {
    key: 'testimonial',
    rendererKey: 'testimonial',
    label: { en: 'Testimonial', ar: 'شهادة عميل' },
    description: { en: 'Quoted review with attribution.', ar: 'اقتباس مع اسم صاحب الشهادة.' },
    category: 'Convert',
    icon: 'Quote',
    textSlots: ['title', 'content'],
    fields: [
      { key: 'rating', kind: 'number', label: { en: 'Rating', ar: 'التقييم' }, min: 0, max: 5 },
      { key: 'authorUrl', kind: 'url', label: { en: 'Author link', ar: 'رابط صاحب الشهادة' } }
    ]
  },
  {
    key: 'product',
    rendererKey: 'product',
    label: { en: 'Product', ar: 'منتج' },
    description: { en: 'Product card with price and link.', ar: 'بطاقة منتج مع السعر والرابط.' },
    category: 'Commerce',
    icon: 'ShoppingBag',
    textSlots: ['title', 'subtitle'],
    titleRequired: true,
    hasUrl: true,
    urlRequired: true,
    fields: [
      { key: 'imageUrl', kind: 'image', label: { en: 'Product image', ar: 'صورة المنتج' } },
      { key: 'price', kind: 'currency', label: { en: 'Price', ar: 'السعر' }, min: 0 },
      {
        key: 'currency',
        kind: 'select',
        label: { en: 'Currency', ar: 'العملة' },
        options: [
          { value: 'USD', label: { en: 'USD', ar: 'دولار' } },
          { value: 'EUR', label: { en: 'EUR', ar: 'يورو' } },
          { value: 'GBP', label: { en: 'GBP', ar: 'جنيه' } },
          { value: 'AED', label: { en: 'AED', ar: 'درهم' } },
          { value: 'EGP', label: { en: 'EGP', ar: 'جنيه مصري' } }
        ]
      }
    ]
  },
  {
    key: 'event',
    rendererKey: 'event',
    label: { en: 'Event', ar: 'فعالية' },
    description: { en: 'Date, venue and ticket link.', ar: 'التاريخ والمكان ورابط التذكرة.' },
    category: 'Commerce',
    icon: 'CalendarDays',
    textSlots: ['title', 'subtitle'],
    titleRequired: true,
    hasUrl: true,
    fields: [
      { key: 'startsAt', kind: 'date', label: { en: 'Starts', ar: 'يبدأ' }, required: true },
      { key: 'endsAt', kind: 'date', label: { en: 'Ends', ar: 'ينتهي' } },
      text('venue', { en: 'Venue', ar: 'المكان' })
    ]
  },
  {
    key: 'map',
    rendererKey: 'map',
    label: { en: 'Map', ar: 'خريطة' },
    description: { en: 'Static map preview of a place.', ar: 'معاينة خريطة لمكان.' },
    category: 'Commerce',
    icon: 'Map',
    textSlots: ['title', 'subtitle'],
    hasUrl: true,
    fields: [
      text('address', { en: 'Address', ar: 'العنوان' }, { required: true }),
      { key: 'latitude', kind: 'number', label: { en: 'Latitude', ar: 'خط العرض' }, min: -90, max: 90 },
      { key: 'longitude', kind: 'number', label: { en: 'Longitude', ar: 'خط الطول' }, min: -180, max: 180 }
    ]
  },
  {
    key: 'location',
    rendererKey: 'location',
    label: { en: 'Location link', ar: 'رابط موقع' },
    description: { en: 'Opens a location in maps.', ar: 'يفتح الموقع في الخرائط.' },
    category: 'Contact',
    icon: 'MapPin',
    textSlots: ['title', 'subtitle'],
    hasUrl: true,
    urlRequired: true,
    fields: []
  },
  {
    key: 'phone',
    rendererKey: 'phone',
    label: { en: 'Phone', ar: 'هاتف' },
    description: { en: 'Tap-to-call row.', ar: 'صف للاتصال المباشر.' },
    category: 'Contact',
    icon: 'Phone',
    textSlots: ['title'],
    urlRequired: true,
    fields: [{ key: 'hideNumber', kind: 'toggle', label: { en: 'Mask number', ar: 'إخفاء الرقم' } }]
  },
  {
    key: 'email',
    rendererKey: 'email',
    label: { en: 'Email', ar: 'بريد' },
    description: { en: 'Compose-mail row.', ar: 'صف لكتابة بريد.' },
    category: 'Contact',
    icon: 'Mail',
    textSlots: ['title'],
    urlRequired: true,
    fields: [text('subject', { en: 'Prefilled subject', ar: 'موضوع مسبق' })]
  },
  {
    key: 'calendly',
    rendererKey: 'booking',
    label: { en: 'Calendly', ar: 'كاليندلي' },
    description: { en: 'Booking link.', ar: 'رابط حجز موعد.' },
    category: 'Convert',
    icon: 'CalendarClock',
    textSlots: ['title', 'subtitle'],
    hasUrl: true,
    urlRequired: true,
    fields: []
  },
  {
    key: 'file-download',
    rendererKey: 'file-download',
    label: { en: 'File download', ar: 'تحميل ملف' },
    description: { en: 'A resource the visitor can save.', ar: 'ملف يمكن للزوار تحميله.' },
    category: 'Utility',
    icon: 'Download',
    textSlots: ['title', 'subtitle'],
    hasUrl: true,
    urlRequired: true,
    fields: [
      { key: 'fileSize', kind: 'text', label: { en: 'Size label', ar: 'حجم الملف' }, placeholder: '2.4 MB' },
      { key: 'fileType', kind: 'text', label: { en: 'Type label', ar: 'نوع الملف' }, placeholder: 'PDF' }
    ]
  },
  {
    key: 'music-pre-save',
    rendererKey: 'booking',
    label: { en: 'Pre-save', ar: 'حفظ مسبق' },
    description: { en: 'Pre-save or pre-save campaign link.', ar: 'رابط حملة الحفظ المسبق.' },
    category: 'Music',
    icon: 'Disc3',
    textSlots: ['title', 'subtitle'],
    hasUrl: true,
    urlRequired: true,
    fields: [{ key: 'releaseAt', kind: 'date', label: { en: 'Release date', ar: 'تاريخ الإصدار' } }]
  },
  {
    key: 'instagram-grid',
    rendererKey: 'instagram-grid',
    label: { en: 'Instagram grid', ar: 'شبكة انستغرام' },
    description: { en: 'Recent posts from the connected account.', ar: 'أحدث منشورات الحساب المرتبط.' },
    category: 'Social',
    icon: 'Instagram',
    textSlots: ['title'],
    fields: [
      { key: 'mediaCount', kind: 'number', label: { en: 'Posts to show', ar: 'عدد المنشورات' }, min: 3, max: 12 },
      { key: 'captionLinks', kind: 'toggle', label: { en: 'Link captions', ar: 'ربط المنشورات' } }
    ]
  },
  {
    key: 'password-gate',
    rendererKey: 'password-gate',
    label: { en: 'Password gate', ar: 'حماية بكلمة مرور' },
    description: { en: 'Reveals its child blocks after a passphrase.', ar: 'يظهر كتله بعد إدخال كلمة المرور.' },
    category: 'Utility',
    icon: 'LockKeyhole',
    textSlots: ['title', 'content'],
    supportsChildren: true,
    fields: [
      {
        key: 'gateMode',
        kind: 'select',
        label: { en: 'Gate mode', ar: 'نوع الحماية' },
        options: [
          { value: 'local', label: { en: 'Client check (demo)', ar: 'تحقق محلي (تجريبي)' } },
          { value: 'server', label: { en: 'Server check', ar: 'تحقق من الخادم' } }
        ]
      }
    ]
  }
];

export const blockCategories: BlockCategory[] = [
  'Basics',
  'Media',
  'Music',
  'Video',
  'Convert',
  'Contact',
  'Commerce',
  'Social',
  'Utility'
];

export const ALL_EMBED_HOSTS: string[] = Object.values(EMBED_HOSTS).flat();

export const getBlockDefinition = (type: BlockType): BlockDefinition | undefined =>
  blockDefinitions.find((definition) => definition.key === type);
