import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  ArrowUpRight,
  Box,
  Download,
  ExternalLink,
  Github,
  Globe2,
  Laptop,
  MonitorDown,
  Search,
} from 'lucide-react';
import { tools, type Locale, type PlatformId, type ToolCategory, type ToolDefinition } from './toolCatalog';
import './styles.css';

type DownloadInfo = {
  platform: PlatformId;
  name: string;
  url: string;
  size?: number;
  digest?: string | null;
  contentType?: string | null;
};

type LatestRelease = {
  id: string;
  name: string;
  repo: string;
  version: string;
  tagName: string;
  publishedAt: string;
  releaseUrl: string;
  downloads: Partial<Record<PlatformId, DownloadInfo>>;
};

type ReleasePayload = {
  generatedAt: string;
  tools: Record<string, LatestRelease>;
};

type ToolWithRelease = ToolDefinition & {
  latestRelease: LatestRelease | null;
};

type Filter = 'all' | ToolCategory;

const platformLabels: Record<PlatformId, string> = {
  macos: 'macOS',
  'windows-portable': 'Windows Portable',
  web: 'Web App',
};

const translations = {
  en: {
    goHome: 'Go home',
    primaryNavigation: 'Primary navigation',
    toolsNav: 'Tools',
    releaseJson: 'Release JSON',
    heroCopy:
      'Browse team tools, open hosted workflows, and download the latest desktop builds for production work.',
    releaseDataStatus: 'Release data status',
    releaseDataNeedsAttention: 'Release data needs attention',
    releaseDataSynced: 'Release data synced',
    loadingReleases: 'Loading releases',
    catalogFilters: 'Tool catalog filters',
    searchTools: 'Search tools',
    searchPlaceholder: 'Search by tool name or workflow',
    toolCategory: 'Tool category',
    filters: {
      all: 'All',
      local: 'Local App',
      web: 'Web App',
    },
    releaseErrorPrefix: 'Release data could not be loaded',
    releaseErrorSuffix: 'The build should normally prevent this state by failing before deploy.',
    toolCatalog: 'Tool catalog',
    noTools: 'No tools match this filter',
    clearSearch: 'Clear the search or switch categories to see the full catalog.',
    latest: 'Latest',
    notApplicable: 'Not applicable',
    noDirectLaunch: 'No direct launch',
    openWebApp: 'Open Web App',
    details: 'Details',
    backToCatalog: 'Back to catalog',
    latestVersion: 'Latest version',
    noDesktopRelease: 'No desktop release',
    webOnlyNoDownloads: 'Web-only tools do not publish desktop downloads here.',
    operationNotes: 'Operation notes',
    actions: 'Actions',
    downloadsMetadata: 'Downloads and release metadata',
    noWebApp: 'No Web App available',
    githubRelease: 'GitHub Release',
    noDesktopReleaseAvailable: 'No desktop release available',
    noChecksum: 'No checksum',
    unknownSize: 'Unknown size',
    noDownload: 'No download available for this tool',
    language: 'Language',
    english: 'English',
    traditionalChinese: '繁體中文',
  },
  'zh-TW': {
    goHome: '回到首頁',
    primaryNavigation: '主要導覽',
    toolsNav: '工具',
    releaseJson: '版本 JSON',
    heroCopy: '瀏覽團隊工具、開啟線上流程，並下載最新桌面版工具。',
    releaseDataStatus: '版本資料狀態',
    releaseDataNeedsAttention: '版本資料需要檢查',
    releaseDataSynced: '版本資料已同步',
    loadingReleases: '正在載入版本資料',
    catalogFilters: '工具目錄篩選',
    searchTools: '搜尋工具',
    searchPlaceholder: '依工具名稱或工作流程搜尋',
    toolCategory: '工具分類',
    filters: {
      all: '全部',
      local: '本地端工具',
      web: 'Web App',
    },
    releaseErrorPrefix: '無法載入版本資料',
    releaseErrorSuffix: '正常情況下 build 應該會在部署前失敗並阻止這個狀態。',
    toolCatalog: '工具目錄',
    noTools: '沒有符合篩選條件的工具',
    clearSearch: '清除搜尋或切換分類以查看完整工具目錄。',
    latest: '最新版本',
    notApplicable: '不適用',
    noDirectLaunch: '沒有直接入口',
    openWebApp: '開啟 Web App',
    details: '詳細資料',
    backToCatalog: '回到工具目錄',
    latestVersion: '最新版本',
    noDesktopRelease: '沒有桌面版本',
    webOnlyNoDownloads: 'Web-only 工具不會在這裡發布桌面下載檔。',
    operationNotes: '操作簡述',
    actions: '操作',
    downloadsMetadata: '下載與版本資訊',
    noWebApp: '沒有 Web App',
    githubRelease: 'GitHub Release',
    noDesktopReleaseAvailable: '沒有桌面版本',
    noChecksum: '沒有 checksum',
    unknownSize: '未知大小',
    noDownload: '此工具沒有下載檔',
    language: '語言',
    english: 'English',
    traditionalChinese: '繁體中文',
  },
} satisfies Record<Locale, Record<string, unknown>>;

type Translation = typeof translations.en;

const localeOptions: Locale[] = ['en', 'zh-TW'];

function getInitialLocale(): Locale {
  const savedLocale = window.localStorage.getItem('vulcan-tools-locale');
  if (savedLocale === 'en' || savedLocale === 'zh-TW') {
    return savedLocale;
  }

  return window.navigator.languages.some((language) => language.toLowerCase().startsWith('zh'))
    ? 'zh-TW'
    : 'en';
}

function localize(tool: ToolDefinition, field: 'summary' | 'description', locale: Locale) {
  return tool[field][locale];
}

function localizeName(tool: ToolDefinition, locale: Locale) {
  return tool.name[locale];
}

function localizeNotes(tool: ToolDefinition, locale: Locale) {
  return tool.operationNotes[locale];
}

function App() {
  const [releasePayload, setReleasePayload] = useState<ReleasePayload | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [route, setRoute] = useState(() => getRouteFromPath());
  const [locale, setLocale] = useState<Locale>(() => getInitialLocale());
  const t = translations[locale] as Translation;

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem('vulcan-tools-locale', locale);
  }, [locale]);

  useEffect(() => {
    fetch('/releases.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<ReleasePayload>;
      })
      .then(setReleasePayload)
      .catch((error: unknown) => {
        setReleaseError(error instanceof Error ? error.message : 'Unknown release data error');
      });
  }, []);

  useEffect(() => {
    const onPopState = () => setRoute(getRouteFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const catalog = useMemo<ToolWithRelease[]>(
    () =>
      tools.map((tool) => ({
        ...tool,
        latestRelease: releasePayload?.tools[tool.id] || null,
      })),
    [releasePayload],
  );

  const selectedTool = catalog.find((tool) => tool.id === route.toolId) || catalog[0];

  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return catalog.filter((tool) => {
      const matchesFilter = filter === 'all' || tool.category === filter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [tool.name, tool.summary, tool.description].some((value) =>
          (typeof value === 'string' ? value : value[locale]).toLowerCase().includes(normalizedQuery),
        );

      return matchesFilter && matchesQuery;
    });
  }, [catalog, filter, locale, query]);
  function navigateToTool(toolId: string) {
    window.history.pushState({}, '', `/tools/${toolId}`);
    setRoute({ toolId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigateHome() {
    window.history.pushState({}, '', '/');
    setRoute({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const isDetailPage = Boolean(route.toolId);

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand-button" type="button" onClick={navigateHome} aria-label={t.goHome}>
          <span className="brand-mark">V</span>
          <span>Vulcan Tools Hub</span>
        </button>
        <nav className="top-nav" aria-label={t.primaryNavigation}>
          <a href="#catalog" onClick={navigateHome}>
            {t.toolsNav}
          </a>
          <a href="/releases.json">{t.releaseJson}</a>
          <label className="language-switcher">
            <span className="sr-only">{t.language}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              aria-label={t.language}
            >
              {localeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'en' ? t.english : t.traditionalChinese}
                </option>
              ))}
            </select>
          </label>
        </nav>
      </header>

      <main>
        {isDetailPage ? (
          <ToolDetailPage
            tool={selectedTool}
            locale={locale}
            t={t}
            onBack={navigateHome}
            releaseError={releaseError}
          />
        ) : (
          <CatalogPage
            tools={filteredTools}
            locale={locale}
            t={t}
            query={query}
            filter={filter}
            releaseError={releaseError}
            generatedAt={releasePayload?.generatedAt}
            onQueryChange={setQuery}
            onFilterChange={setFilter}
            onSelectTool={navigateToTool}
          />
        )}
      </main>
    </div>
  );
}

function CatalogPage({
  tools: visibleTools,
  locale,
  t,
  query,
  filter,
  releaseError,
  generatedAt,
  onQueryChange,
  onFilterChange,
  onSelectTool,
}: {
  tools: ToolWithRelease[];
  locale: Locale;
  t: Translation;
  query: string;
  filter: Filter;
  releaseError: string | null;
  generatedAt?: string;
  onQueryChange: (value: string) => void;
  onFilterChange: (value: Filter) => void;
  onSelectTool: (toolId: string) => void;
}) {
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <h1>Vulcan Tools Hub</h1>
          <p>{t.heroCopy}</p>
        </div>
        <div className="hero-panel" aria-label={t.releaseDataStatus}>
          <div>
            <span className="status-dot" />
            <span>{releaseError ? t.releaseDataNeedsAttention : t.releaseDataSynced}</span>
          </div>
          <strong>{generatedAt ? formatDate(generatedAt, locale) : t.loadingReleases}</strong>
        </div>
      </section>

      <section className="catalog-toolbar" aria-label={t.catalogFilters}>
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">{t.searchTools}</span>
          <input
            type="search"
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <div className="filter-tabs" role="tablist" aria-label={t.toolCategory}>
          {(['all', 'local', 'web'] as Filter[]).map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'active' : ''}
              onClick={() => onFilterChange(item)}
            >
              {t.filters[item]}
            </button>
          ))}
        </div>
      </section>

      {releaseError ? (
        <div className="alert" role="status">
          {t.releaseErrorPrefix}: {releaseError}. {t.releaseErrorSuffix}
        </div>
      ) : null}

      <section id="catalog" className="catalog-layout" aria-label={t.toolCatalog}>
        <div className="tool-grid">
          {visibleTools.length > 0 ? (
            visibleTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                locale={locale}
                t={t}
                onSelect={() => onSelectTool(tool.id)}
              />
            ))
          ) : (
            <div className="empty-state">
              <Box size={28} aria-hidden="true" />
              <strong>{t.noTools}</strong>
              <p>{t.clearSearch}</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function ToolCard({
  tool,
  locale,
  t,
  onSelect,
}: {
  tool: ToolWithRelease;
  locale: Locale;
  t: Translation;
  onSelect: () => void;
}) {
  const cardDownloads = [tool.latestRelease?.downloads.macos, tool.latestRelease?.downloads['windows-portable']].filter(
    Boolean,
  ) as DownloadInfo[];

  return (
    <article className="tool-card">
      <div className="card-topline">
        <span className="category-label">{t.filters[tool.category]}</span>
        <PlatformIcons platforms={tool.platforms} />
      </div>
      <h2>
        <a
          className="tool-title-link"
          href={`/tools/${tool.id}`}
          onClick={(event) => {
            event.preventDefault();
            onSelect();
          }}
        >
          {localizeName(tool, locale)}
        </a>
      </h2>
      <p>{localize(tool, 'summary', locale)}</p>
      <div className="version-line">
        <span>{t.latest}</span>
        <strong>{tool.latestRelease ? `v${tool.latestRelease.version}` : t.notApplicable}</strong>
      </div>
      <div className="card-actions">
        {cardDownloads.length > 0 ? (
          cardDownloads.map((download) => (
            <a
              key={download.platform}
              className="primary-link compact-action"
              href={download.url}
              target="_blank"
              rel="noreferrer"
            >
              {download.platform === 'macos' ? 'Mac' : 'PC'}
              <Download size={15} aria-hidden="true" />
            </a>
          ))
        ) : tool.webAppUrl ? (
          <a className="primary-link" href={tool.webAppUrl} target="_blank" rel="noreferrer">
            {t.openWebApp}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        ) : (
          <span className="disabled-link">{t.noDirectLaunch}</span>
        )}
        <button type="button" onClick={onSelect}>
          {t.details}
        </button>
      </div>
    </article>
  );
}

function ToolDetailPage({
  tool,
  locale,
  t,
  onBack,
  releaseError,
}: {
  tool: ToolWithRelease;
  locale: Locale;
  t: Translation;
  onBack: () => void;
  releaseError: string | null;
}) {
  return (
    <section className="detail-page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        {t.backToCatalog}
      </button>
      <div className="detail-hero">
        <div>
          <span className="category-label">{t.filters[tool.category]}</span>
          <h1>{localizeName(tool, locale)}</h1>
          <p className="detail-summary">{localize(tool, 'summary', locale)}</p>
          <p className="detail-description">{localize(tool, 'description', locale)}</p>
        </div>
        <div className="release-box">
          <span>{t.latestVersion}</span>
          <strong>{tool.latestRelease ? `v${tool.latestRelease.version}` : t.noDesktopRelease}</strong>
          <small>
            {tool.latestRelease ? formatDate(tool.latestRelease.publishedAt, locale) : t.webOnlyNoDownloads}
          </small>
        </div>
      </div>

      {releaseError ? <div className="alert">{t.releaseErrorPrefix}: {releaseError}</div> : null}

      <div className="detail-grid">
        <section className="detail-section">
          <h2>{t.operationNotes}</h2>
          <ol>
            {localizeNotes(tool, locale).map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ol>
        </section>
        <section className="detail-section">
          <h2>{t.actions}</h2>
          <ActionRows tool={tool} t={t} />
        </section>
      </div>

      <section className="detail-section downloads-section">
        <h2>{t.downloadsMetadata}</h2>
        <DownloadRows tool={tool} t={t} />
      </section>
    </section>
  );
}

function ActionRows({ tool, t }: { tool: ToolWithRelease; t: Translation }) {
  return (
    <div className="action-list">
      {tool.webAppUrl ? (
        <a href={tool.webAppUrl} target="_blank" rel="noreferrer">
          <Globe2 size={18} aria-hidden="true" />
          {t.openWebApp}
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      ) : (
        <span className="disabled-row">
          <Globe2 size={18} aria-hidden="true" />
          {t.noWebApp}
        </span>
      )}

      {tool.latestRelease?.releaseUrl ? (
        <a href={tool.latestRelease.releaseUrl} target="_blank" rel="noreferrer">
          <Github size={18} aria-hidden="true" />
          {t.githubRelease}
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      ) : (
        <span className="disabled-row">
          <Github size={18} aria-hidden="true" />
          {t.noDesktopReleaseAvailable}
        </span>
      )}
    </div>
  );
}

function DownloadRows({ tool, t, compact = false }: { tool: ToolWithRelease; t: Translation; compact?: boolean }) {
  const rows: PlatformId[] = ['macos', 'windows-portable'];

  return (
    <div className={compact ? 'download-list compact' : 'download-list'}>
      {rows.map((platform) => {
        const download = tool.latestRelease?.downloads[platform];

        return download ? (
          <a key={platform} href={download.url} target="_blank" rel="noreferrer">
            {platform === 'macos' ? <Laptop size={18} /> : <MonitorDown size={18} />}
            <span>
              <strong>{platformLabels[platform]}</strong>
              <small>{formatBytes(download.size, t)} · {download.digest || t.noChecksum}</small>
            </span>
            <Download size={16} aria-hidden="true" />
          </a>
        ) : (
          <span key={platform} className="disabled-row">
            {platform === 'macos' ? <Laptop size={18} /> : <MonitorDown size={18} />}
            <span>
              <strong>{platformLabels[platform]}</strong>
              <small>{t.noDownload}</small>
            </span>
          </span>
        );
      })}
    </div>
  );
}

function PlatformIcons({ platforms }: { platforms: PlatformId[] }) {
  return (
    <div className="platform-icons" aria-label={platforms.map((platform) => platformLabels[platform]).join(', ')}>
      {platforms.includes('web') ? <Globe2 size={16} aria-hidden="true" /> : null}
      {platforms.includes('macos') ? <Laptop size={16} aria-hidden="true" /> : null}
      {platforms.includes('windows-portable') ? <MonitorDown size={16} aria-hidden="true" /> : null}
    </div>
  );
}

function getRouteFromPath() {
  const match = window.location.pathname.match(/^\/tools\/([^/]+)\/?$/);
  return match ? { toolId: match[1] } : {};
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatBytes(value: number | undefined, t: Translation) {
  if (!value) {
    return t.unknownSize;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
