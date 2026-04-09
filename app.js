/**
 * AI热点日报 - 重构版本
 * 核心功能：
 * - 多模块首页展示（头条、快讯、产品、视频）
 * - AI新闻分类展示（时政政策/行业动态/技术突破/企业动态/投融资）
 * - AI产品专区
 * - AI工具推荐
 * - B站AI视频（支持站内播放）
 * - 深色/浅色模式切换
 * - 响应式设计
 */

// 全局App状态
const AppState = {
    // 路由
    currentRoute: 'home',
    // 数据
    data: null,
    // 新闻
    allNews: [],
    filteredNews: [],
    newsCurrentPage: 1,
    newsPerPage: 10,
    newsCurrentCategory: 'all',
    newsSortBy: 'hot',
    newsLoading: false,
    newsHasMore: true,
    // 产品
    allProducts: [],
    filteredProducts: [],
    productsCurrentCategory: 'all',
    // 工具
    allTools: [],
    filteredTools: [],
    toolsCurrentCategory: 'all',
    // 视频
    allVideos: [],
    filteredVideos: [],
    videosCurrentCategory: 'all',
    // 主题
    darkMode: false,
    // 搜索
    searchQuery: '',
};

// DOM元素缓存
const $ = {
    // 视图
    homeView: document.getElementById('home-view'),
    newsView: document.getElementById('news-view'),
    productsView: document.getElementById('products-view'),
    toolsView: document.getElementById('tools-view'),
    videosView: document.getElementById('videos-view'),
    techView: document.getElementById('tech-view'),
    // 导航
    navLinks: document.querySelectorAll('.nav-link'),
    mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
    mobileMenu: document.getElementById('mobile-menu'),
    // 首页
    homeDateDisplay: document.getElementById('home-date-display'),
    topHeadlines: document.getElementById('top-headlines'),
    breakingNews: document.getElementById('breaking-news'),
    homeProducts: document.getElementById('home-products'),
    homeVideos: document.getElementById('home-videos'),
    // 新闻
    newsCategories: document.getElementById('news-categories'),
    newsList: document.getElementById('news-list'),
    newsTotalCount: document.getElementById('news-total-count'),
    newsSort: document.getElementById('news-sort'),
    newsLoading: document.getElementById('news-loading'),
    newsEnd: document.getElementById('news-end'),
    // 产品
    productsCategories: document.getElementById('products-categories'),
    productsGrid: document.getElementById('products-grid'),
    productsTotalCount: document.getElementById('products-total-count'),
    // 工具
    toolsCategories: document.getElementById('tools-categories'),
    toolsGrid: document.getElementById('tools-grid'),
    toolsTotalCount: document.getElementById('tools-total-count'),
    // 视频
    videosCategories: document.getElementById('videos-categories'),
    videosGrid: document.getElementById('videos-grid'),
    videosTotalCount: document.getElementById('videos-total-count'),
    videosShuffle: document.getElementById('videos-shuffle'),
    videoModal: document.getElementById('video-modal'),
    videoIframe: document.getElementById('video-iframe'),
    videoModalTitle: document.getElementById('video-modal-title'),
    videoModalAuthor: document.getElementById('video-modal-author'),
    closeVideoModal: document.getElementById('close-video-modal'),
    // 主题切换
    themeToggle: document.getElementById('theme-toggle'),
    iconSun: document.getElementById('icon-sun'),
    iconMoon: document.getElementById('icon-moon'),
    // 搜索
    searchToggle: document.getElementById('search-toggle'),
    searchContainer: document.getElementById('search-container'),
    searchInput: document.getElementById('search-input'),
};

// 新闻分类定义（需求中的五大分类）
const NEWS_CATEGORIES = [
    {key: 'policy', name: '时政政策'},
    {key: 'industry', name: '行业动态'},
    {key: 'tech', name: '技术突破'},
    {key: 'business', name: '企业动态'},
    {key: 'investment', name: '投融资事件'},
];

// 产品分类定义
const PRODUCT_CATEGORIES = [
    {key: 'llm', name: 'AI大模型'},
    {key: 'image', name: 'AI绘画'},
    {key: 'writing', name: 'AI写作'},
    {key: 'video', name: 'AI视频生成'},
    {key: 'office', name: 'AI办公'},
    {key: 'code', name: 'AI编程'},
    {key: 'audio', name: 'AI语音交互'},
];

// 工具分类定义
const TOOL_CATEGORIES = [
    {key: 'utility', name: '实用工具'},
    {key: 'efficiency', name: '效率工具'},
    {key: 'creative', name: '创意工具'},
    {key: 'dev', name: '开发工具'},
];

// 初始化
document.addEventListener('DOMContentLoaded', init);

function init() {
    // 初始化主题
    initTheme();
    // 加载数据
    loadAllData().then(() => {
        // 分类数据到各模块
        categorizeData();
        // 渲染当前路由
        renderRoute();
        // 绑定事件
        bindEvents();
        // 设置年份
        document.getElementById('footer-year').textContent = new Date().getFullYear();
    }).catch(err => {
        console.error('初始化失败:', err);
        showError($.topHeadlines, '数据加载失败: ' + err.message);
    });
}

/**
 * 初始化主题（深色/浅色）
 */
function initTheme() {
    // 从localStorage读取
    const saved = localStorage.getItem('aihot-dark-mode');
    AppState.darkMode = saved === 'true' || 
        (saved === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    applyTheme();
}

function applyTheme() {
    if (AppState.darkMode) {
        document.documentElement.classList.add('dark');
        $.iconSun.classList.remove('hidden');
        $.iconMoon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        $.iconSun.classList.add('hidden');
        $.iconMoon.classList.remove('hidden');
    }
    localStorage.setItem('aihot-dark-mode', AppState.darkMode);
}

function toggleTheme() {
    AppState.darkMode = !AppState.darkMode;
    applyTheme();
}

/**
 * 加载数据
 */
async function loadAllData() {
    let data = null;
    let success = false;

    // 尝试绝对路径
    try {
        const url = window.location.origin + '/data/daily.json';
        console.log('Trying load data from', url);
        const res = await fetch(url);
        if (res.ok) {
            data = await res.json();
            success = true;
        }
    } catch (e) {
        console.warn('Absolute path failed:', e);
    }

    // 尝试相对路径
    if (!success) {
        try {
            const url = './data/daily.json';
            console.log('Trying load data from', url);
            const res = await fetch(url);
            if (res.ok) {
                data = await res.json();
                success = true;
            }
        } catch (e) {
            console.error('Relative path failed:', e);
        }
    }

    if (!success || !data) {
        throw new Error('无法加载数据文件');
    }

    AppState.data = data;
    console.log('Data loaded:', {
        date: data.date,
        totalItems: (data.items || []).length,
        hasVideos: !!(data.learning && data.learning.items)
    });

    return;
}

/**
 * 将数据分类到各模块
 */
function categorizeData() {
    const allItems = AppState.data.items || [];

    // 分类到新闻（基于原有category）
    // 原有分类映射到新分类
    const categoryMap = {
        '大语言模型': 'tech',
        'AI工具': 'utility',
        '论文': 'tech',
        '人工智能': 'industry',
        '行业动态': 'industry',
        '时政政策': 'policy',
        '技术突破': 'tech',
        '企业动态': 'business',
        '投融资': 'investment',
    };

    // 分离新闻、产品、工具
    AppState.allNews = allItems.filter(item => {
        // 判断类型：新闻类
        const cat = item.category || '';
        return !isProduct(item) && !isTool(item);
    }).map(item => {
        // 映射分类
        const oldCat = item.category || '';
        let newCat = categoryMap[oldCat] || 'industry';
        return {...item, category_new: newCat};
    });

    AppState.allProducts = allItems.filter(item => isProduct(item)).map(item => {
        let productCat = mapProductCategory(item);
        return {...item, category_new: productCat};
    });

    AppState.allTools = allItems.filter(item => isTool(item)).map(item => {
        let toolCat = mapToolCategory(item);
        return {...item, category_new: toolCat};
    });

    // 视频数据
    if (AppState.data.learning && AppState.data.learning.items) {
        AppState.allVideos = AppState.data.learning.items || [];
    } else {
        AppState.allVideos = [];
    }

    console.log('Data categorized:', {
        news: AppState.allNews.length,
        products: AppState.allProducts.length,
        tools: AppState.allTools.length,
        videos: AppState.allVideos.length,
    });
}

function isProduct(item) {
    // 判断是否是AI产品
    const title = (item.title || '').toLowerCase();
    const desc = (item.summary_cn || item.description || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    return cat.includes('model') || cat.includes('product') || 
           title.includes('gpt') || title.includes('model') || 
           desc.includes('产品') || desc.includes('发布');
}

function isTool(item) {
    // 判断是否是AI工具
    const title = (item.title || '').toLowerCase();
    const desc = (item.summary_cn || item.description || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    return cat.includes('tool') || cat.includes('utility') ||
           title.includes('tool') || title.includes('工具') ||
           desc.includes('工具');
}

function mapProductCategory(item) {
    const title = (item.title || '').toLowerCase();
    const desc = (item.summary_cn || item.description || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();

    if (cat.includes('llm') || cat.includes('大模型') || title.includes('gpt') || title.includes('llama') || title.includes('qwen')) {
        return 'llm';
    }
    if (cat.includes('image') || cat.includes('绘画') || title.includes('sd') || title.includes('midjourney') || title.includes('stable diffusion')) {
        return 'image';
    }
    if (cat.includes('writing') || cat.includes('写作') || title.includes('write')) {
        return 'writing';
    }
    if (cat.includes('video') || cat.includes('视频') || title.includes('sora') || title.includes('video')) {
        return 'video';
    }
    if (cat.includes('office') || cat.includes('办公') || title.includes('office') || title.includes('notion')) {
        return 'office';
    }
    if (cat.includes('code') || cat.includes('编程') || title.includes('code') || title.includes('github-copilot')) {
        return 'code';
    }
    if (cat.includes('audio') || cat.includes('语音') || title.includes('voice') || title.includes('tts')) {
        return 'audio';
    }
    return 'llm';
}

function mapToolCategory(item) {
    const title = (item.title || '').toLowerCase();
    const desc = (item.summary_cn || item.description || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();

    if (cat.includes('dev') || cat.includes('开发') || title.includes('dev') || title.includes('developer')) {
        return 'dev';
    }
    if (cat.includes('creative') || cat.includes('创意') || title.includes('creative') || title.includes('art')) {
        return 'creative';
    }
    if (cat.includes('efficiency') || cat.includes('效率') || title.includes('efficiency') || title.includes('productivity')) {
        return 'efficiency';
    }
    if (cat.includes('utility') || cat.includes('实用') || title.includes('utility') || title.includes('tool')) {
        return 'utility';
    }
    return 'utility';
}

/**
 * 路由渲染
 */
function renderRoute() {
    // 隐藏所有视图
    $.homeView.classList.add('hidden');
    $.newsView.classList.add('hidden');
    $.productsView.classList.add('hidden');
    $.toolsView.classList.add('hidden');
    $.videosView.classList.add('hidden');
    $.techView.classList.add('hidden');

    // 更新导航active状态
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.classList.toggle('bg-primary', btn.dataset.route === AppState.currentRoute);
        btn.classList.toggle('text-white', btn.dataset.route === AppState.currentRoute);
        btn.classList.toggle('text-gray-600', btn.dataset.route !== AppState.currentRoute);
        btn.classList.toggle('dark:text-gray-300', btn.dataset.route !== AppState.currentRoute);
        btn.classList.toggle('hover:bg-gray-100', btn.dataset.route !== AppState.currentRoute);
        btn.classList.toggle('dark:hover:bg-slate-800', btn.dataset.route !== AppState.currentRoute);
    });

    // 显示当前视图
    switch (AppState.currentRoute) {
        case 'home':
            $.homeView.classList.remove('hidden');
            renderHome();
            break;
        case 'news':
            $.newsView.classList.remove('hidden');
            initNewsView();
            break;
        case 'products':
            $.productsView.classList.remove('hidden');
            initProductsView();
            break;
        case 'tools':
            $.toolsView.classList.remove('hidden');
            initToolsView();
            break;
        case 'videos':
            $.videosView.classList.remove('hidden');
            initVideosView();
            break;
        case 'tech':
            $.techView.classList.remove('hidden');
            break;
    }

    // 更新hash
    window.location.hash = `#/${AppState.currentRoute}`;
}

function navigateTo(route) {
    AppState.currentRoute = route;
    // 关闭移动端菜单
    $.mobileMenu.classList.add('hidden');
    renderRoute();
    // 滚动到顶部
    window.scrollTo({top: 0, behavior: 'smooth'});
}

/**
 * 渲染首页
 */
function renderHome() {
    // 日期显示
    const today = AppState.data.date;
    $.homeDateDisplay.textContent = `今天是 ${today} · 每日更新不中断`;

    // 渲染头条（置顶3条）
    const sorted = AppState.allNews.sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
    const top3 = sorted.slice(0, 3);
    $.topHeadlines.innerHTML = '';
    top3.forEach(item => {
        const card = createTopHeadlineCard(item);
        $.topHeadlines.appendChild(card);
    });

    // 渲染新闻快讯（最多10条）
    const news = sorted.slice(3, 13);
    $.breakingNews.innerHTML = '';
    news.forEach(item => {
        const div = createBreakingNewsItem(item);
        $.breakingNews.appendChild(div);
    });

    // 渲染最新产品（最多4条）
    const productsSorted = AppState.allProducts.sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
    const products = productsSorted.slice(0, 4);
    $.homeProducts.innerHTML = '';
    products.forEach(item => {
        const div = createHomeProductItem(item);
        $.homeProducts.appendChild(div);
    });

    // 渲染热门视频（最多4条）
    if (AppState.allVideos.length > 0) {
        const videosSorted = AppState.allVideos.sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
        const videos = videosSorted.slice(0, 4);
        $.homeVideos.innerHTML = '';
        videos.forEach(item => {
            const div = createHomeVideoItem(item);
            $.homeVideos.appendChild(div);
        });
    }
}

function createTopHeadlineCard(item) {
    const div = document.createElement('div');
    const timeBadge = getTimeBadge(item.date || AppState.data.date);
    const summary = item.summary_cn || item.description || '';

    div.className = 'bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-slate-700 fade-in';
    div.innerHTML = `
        <div class="p-5">
            <div class="flex flex-wrap gap-2 mb-3">
                <span class="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs rounded">
                    ${escapeHtml(item.source || '未知')}
                </span>
                <span class="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 text-xs rounded">
                    ${getNewsCategoryName(item.category_new)}
                </span>
                ${timeBadge}
            </div>
            <h3 class="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                <a href="${escapeHtml(item.url)}" target="_blank" class="hover:text-primary">${escapeHtml(item.title)}</a>
            </h3>
            ${summary ? `<p class="text-gray-600 dark:text-gray-300 text-line-clamp-3 leading-relaxed">${escapeHtml(summary)}</p>` : ''}
        </div>
    `;
    return div;
}

function createBreakingNewsItem(item) {
    const div = document.createElement('div');
    const timeBadge = getTimeBadge(item.date || AppState.data.date);
    const summary = item.summary_cn || item.description || '';

    div.className = 'px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors';
    div.innerHTML = `
        <a href="${escapeHtml(item.url)}" target="_blank" class="flex items-start justify-between gap-3 group">
            <div class="flex-1">
                <div class="font-medium text-gray-900 dark:text-white group-hover:text-primary">
                    ${escapeHtml(item.title)}
                </div>
                ${summary ? `<div class="text-sm text-gray-500 dark:text-gray-400 mt-1 text-line-clamp-1">${escapeHtml(summary)}</div>` : ''}
            </div>
            <div class="flex flex-col items-end gap-1">
                <span class="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 text-xs rounded">
                    ${escapeHtml(item.source || '')}
                </span>
                ${timeBadge}
            </div>
        </a>
    `;
    return div;
}

function createHomeProductItem(item) {
    const categoryName = getProductCategoryName(item.category_new);
    const summary = item.summary_cn || item.description || '';
    const isFree = guessFree(item);

    const div = document.createElement('div');
    div.className = 'bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover-card hot-card fade-in';
    div.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <span class="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs rounded">
                ${categoryName}
            </span>
            ${isFree ? `<span class="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 text-xs rounded">免费</span>` : `<span class="px-2 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 text-xs rounded">付费</span>`}
        </div>
        <h3 class="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
            <a href="${escapeHtml(item.url)}" target="_blank" class="hover:text-primary">${escapeHtml(item.title)}</a>
        </h3>
        ${summary ? `<p class="text-gray-600 dark:text-gray-300 text-sm text-line-clamp-2 leading-relaxed mb-2">${escapeHtml(summary)}</p>` : ''}
        <div class="text-xs text-gray-400 flex justify-between">
            <span>作者: ${escapeHtml(item.author || '未知')}</span>
            <span>热度: ${Math.round(item.hot_score || 0)}</span>
        </div>
    `;
    return div;
}

function createHomeVideoItem(item) {
    const coverUrl = item.cover_url || '';
    const categoryName = getVideoCategoryName(item.category);

    const div = document.createElement('div');
    div.className = 'bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 hot-card fade-in cursor-pointer';
    div.addEventListener('click', () => openVideoModal(item));

    div.innerHTML = `
        <div class="relative aspect-video bg-gray-100">
            <img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover">
            <div class="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                ${formatNumber(item.play_num || item.play_num || 0)} 播放
            </div>
            <div class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                <div class="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                    <svg class="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"></path>
                    </svg>
                </div>
            </div>
        </div>
        <div class="p-3">
            <h4 class="font-semibold text-gray-900 dark:text-white mb-1 text-line-clamp-2">${escapeHtml(item.title)}</h4>
            <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>${escapeHtml(item.up_name || item.author || '未知')}</span>
                <span class="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded">${categoryName}</span>
            </div>
        </div>
    `;
    return div;
}

/**
 * 新闻视图初始化
 */
function initNewsView() {
    // 渲染分类
    $.newsCategories.innerHTML = '<button class="category-btn active px-4 py-2 rounded-full text-sm font-medium bg-primary text-white" data-category="all">全部</button>';
    NEWS_CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn px-4 py-2 rounded-full text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600';
        btn.dataset.category = cat.key;
        btn.textContent = cat.name;
        $.newsCategories.appendChild(btn);
    });

    // 筛选和渲染
    filterAndRenderNews();
}

function filterAndRenderNews() {
    let filtered = AppState.allNews.slice();

    if (AppState.newsCurrentCategory !== 'all') {
        filtered = filtered.filter(item => item.category_new === AppState.newsCurrentCategory);
    }

    if (AppState.newsSortBy === 'hot') {
        filtered.sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
    } else {
        filtered.sort((a, b) => {
            const aDate = a.date || '';
            const bDate = b.date || '';
            return bDate.localeCompare(aDate);
        });
    }

    AppState.filteredNews = filtered;
    AppState.newsCurrentPage = 1;
    $.newsTotalCount.textContent = filtered.length;

    $.newsList.innerHTML = '';
    if (filtered.length === 0) {
        $.newsList.innerHTML = '<div class="text-center py-20 text-gray-400"><p class="text-xl">暂无内容 😕</p></div>';
        $.newsLoading.classList.add('hidden');
        $.newsEnd.classList.add('hidden');
        return;
    }

    // 渲染第一页
    renderNextNewsPage();
}

function renderNextNewsPage() {
    if (AppState.newsLoading || !AppState.newsHasMore) return;

    AppState.newsLoading = true;
    $.newsLoading.classList.remove('hidden');

    const start = (AppState.newsCurrentPage - 1) * AppState.newsPerPage;
    const end = start + AppState.newsPerPage;
    const items = AppState.filteredNews.slice(start, end);

    setTimeout(() => {
        items.forEach(item => {
            const div = createNewsListItem(item);
            $.newsList.appendChild(div);
        });

        AppState.newsCurrentPage++;
        AppState.newsLoading = false;
        $.newsLoading.classList.add('hidden');

        if (end >= AppState.filteredNews.length) {
            AppState.newsHasMore = false;
            $.newsEnd.classList.remove('hidden');
        } else {
            AppState.newsHasMore = true;
            $.newsEnd.classList.add('hidden');
        }
    }, 200);
}

function createNewsListItem(item) {
    const div = document.createElement('div');
    div.className = 'bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 hot-card fade-in';

    const timeBadge = getTimeBadge(item.date || AppState.data.date);
    const summary = item.summary_cn || item.description || '';
    const categoryName = getNewsCategoryName(item.category_new);

    div.innerHTML = `
        <div class="flex flex-wrap gap-2 mb-3">
            <span class="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs rounded">
                ${escapeHtml(item.source || '未知')}
            </span>
            <span class="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 text-xs rounded">
                ${categoryName}
            </span>
            ${timeBadge}
        </div>
        <h3 class="text-xl font-bold mb-3 text-gray-900 dark:text-white">
            <a href="${escapeHtml(item.url)}" target="_blank" class="hover:text-primary">${escapeHtml(item.title)}</a>
        </h3>
        ${summary ? `<p class="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">${escapeHtml(summary)}</p>` : ''}
        <div class="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <span>${escapeHtml(item.author || '')}</span>
            <span>热度 ${Math.round(item.hot_score || 0)}</span>
        </div>
    `;
    return div;
}

/**
 * 产品视图
 */
function initProductsView() {
    $.productsCategories.innerHTML = '<button class="category-btn active px-4 py-2 rounded-full text-sm font-medium bg-primary text-white" data-category="all">全部</button>';
    PRODUCT_CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn px-4 py-2 rounded-full text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600';
        btn.dataset.category = cat.key;
        btn.textContent = cat.name;
        $.productsCategories.appendChild(btn);
    });

    filterAndRenderProducts();
}

function filterAndRenderProducts() {
    let filtered = AppState.allProducts.slice();

    if (AppState.productsCurrentCategory !== 'all') {
        filtered = filtered.filter(item => item.category_new === AppState.productsCurrentCategory);
    }

    filtered.sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
    AppState.filteredProducts = filtered;
    $.productsTotalCount.textContent = filtered.length;

    $.productsGrid.innerHTML = '';
    if (filtered.length === 0) {
        $.productsGrid.innerHTML = '<div class="col-span-full text-center py-20 text-gray-400"><p class="text-xl">暂无产品 😕</p></div>';
        return;
    }

    filtered.forEach(item => {
        const card = createProductCard(item);
        $.productsGrid.appendChild(card);
    });
}

function createProductCard(item) {
    const card = document.createElement('div');
    const categoryName = getProductCategoryName(item.category_new);
    const summary = item.summary_cn || item.description || '';
    const isFree = guessFree(item);
    const pricing = isFree ? '免费' : '付费';
    const pricingClass = isFree ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300';

    card.className = 'hot-card bg-white dark:bg-slate-800 rounded-xl p-5 overflow-hidden fade-in';
    card.innerHTML = `
        <div class="flex justify-between items-start gap-2 mb-3">
            <div class="flex flex-wrap gap-2">
                <span class="inline-block px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs rounded">
                    ${categoryName}
                </span>
                <span class="inline-block px-2 py-1 ${pricingClass} text-xs rounded">
                    ${pricing}
                </span>
            </div>
            <div class="flex items-center gap-1">
                <span class="text-base font-bold hot-score">${Math.round(item.hot_score || 0)}</span>
            </div>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            <a href="${escapeHtml(item.url)}" target="_blank" class="hover:text-primary">${escapeHtml(item.title)}</a>
        </h3>
        ${summary ? `<p class="text-gray-600 dark:text-gray-300 text-line-clamp-3 leading-relaxed mb-3">${escapeHtml(summary)}</p>` : ''}
        <div class="text-xs text-gray-400 dark:text-gray-500">
            开发者: ${escapeHtml(item.author || '未知')}
        </div>
    `;
    return card;
}

/**
 * 工具视图
 */
function initToolsView() {
    $.toolsCategories.innerHTML = '<button class="category-btn active px-4 py-2 rounded-full text-sm font-medium bg-primary text-white" data-category="all">全部</button>';
    TOOL_CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn px-4 py-2 rounded-full text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600';
        btn.dataset.category = cat.key;
        btn.textContent = cat.name;
        $.toolsCategories.appendChild(btn);
    });

    filterAndRenderTools();
}

function filterAndRenderTools() {
    let filtered = AppState.allTools.slice();

    if (AppState.toolsCurrentCategory !== 'all') {
        filtered = filtered.filter(item => item.category_new === AppState.toolsCurrentCategory);
    }

    filtered.sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
    AppState.filteredTools = filtered;
    $.toolsTotalCount.textContent = filtered.length;

    $.toolsGrid.innerHTML = '';
    if (filtered.length === 0) {
        $.toolsGrid.innerHTML = '<div class="col-span-full text-center py-20 text-gray-400"><p class="text-xl">暂无工具 😕</p></div>';
        return;
    }

    filtered.forEach(item => {
        const card = createToolCard(item);
        $.toolsGrid.appendChild(card);
    });
}

function createToolCard(item) {
    const card = document.createElement('div');
    const categoryName