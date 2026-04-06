/**
 * AI热点日报 - 前端主逻辑
 * 重构版本：分层展示 + AI学习板块
 * 功能：路由切换、今日焦点、今日速读、标签云、筛选、无限滚动、搜索
 */

// 全局状态
const AppState = {
    // 热点日报数据
    hotData: null,
    allHotItems: [],
    filteredHotItems: [],
    // AI学习数据
    learningData: null,
    allLearningVideos: [],
    filteredLearningVideos: [],
    // 路由
    currentRoute: 'hot', // 'hot' | 'learning'
    // 热点分页
    hotCurrentPage: 1,
    itemsPerPage: 6, // 调整为6，因为现在是两列
    hotCurrentCategory: 'all',
    searchQuery: '',
    sortBy: 'hot', // 'hot' | 'time'
    isLoading: false,
    hasMore: true,
    // AI学习分页
    learningCurrentPage: 1,
    videosPerPage: 9,
    learningCurrentCategory: 'all',
    learningIsLoading: false,
    learningHasMore: true,
    // 今日速读折叠状态
    quickReadCollapsed: false,
};

// DOM 元素缓存
const elements = {
    // 路由视图
    hotView: document.getElementById('hot-view'),
    learningView: document.getElementById('learning-view'),
    // 热点页面
    dateDisplay: document.getElementById('date-display'),
    categoryContainer: document.getElementById('category-container'),
    tagCloud: document.getElementById('tag-cloud'),
    focusContainer: document.getElementById('focus-container'),
    quickReadHeader: document.getElementById('quick-read-header'),
    quickReadIcon: document.getElementById('quick-read-icon'),
    quickReadList: document.getElementById('quick-read-list'),
    quickReadCount: document.getElementById('quick-read-count'),
    hotGrid: document.getElementById('hot-grid'),
    searchInput: document.getElementById('search-input'),
    sortSelect: document.getElementById('sort-select'),
    totalCount: document.getElementById('total-count'),
    filterInfo: document.getElementById('filter-info'),
    loading: document.getElementById('loading'),
    endMessage: document.getElementById('end-message'),
    noResults: document.getElementById('no-results'),
    // AI学习页面
    learningCategoryContainer: document.getElementById('learning-category-container'),
    videoGrid: document.getElementById('video-grid'),
    learningTotalCount: document.getElementById('learning-total-count'),
    learningFilterInfo: document.getElementById('learning-filter-info'),
    learningLoading: document.getElementById('learning-loading'),
    learningEndMessage: document.getElementById('learning-end-message'),
    learningNoResults: document.getElementById('learning-no-results'),
};

// 初始化
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        await loadAllData();
        setupRouting();
        if (AppState.currentRoute === 'hot') {
            initHotView();
        } else {
            initLearningView();
        }
        setupLazyLoading();
        // 无论如何，最终隐藏loading
        setTimeout(() => {
            elements.loading.classList.add('hidden');
        }, 1000);
    } catch (error) {
        console.error('初始化失败:', error);
        elements.loading.classList.add('hidden');
        showError('数据加载失败：' + error.message);
    }
}

/**
 * 加载所有数据
 */
async function loadAllData() {
    // 构建数据路径，开发环境和生产环境自适应
    const dataPath = window.location.hostname === 'localhost' 
        ? './data/daily.json' 
        : './data/daily.json';
    
    console.log('Loading data from:', dataPath);
    
    try {
        const response = await fetch(dataPath);
        if (!response.ok) {
            throw new Error(`HTTP error, status = ${response.status}`);
        }
        const data = await response.json();
        console.log('Data loaded successfully:', data);
        
        // 热点数据
        AppState.hotData = data;
        AppState.allHotItems = data.items || [];
        AppState.filteredHotItems = [...AppState.allHotItems];
        
        // AI学习数据（兼容旧数据，如果没有则为空）
        if (data.learning && data.learning.items) {
            AppState.learningData = data.learning;
            AppState.allLearningVideos = data.learning.items || [];
            AppState.filteredLearningVideos = [...AppState.allLearningVideos];
        } else {
            AppState.learningData = { total_count: 0, categories: [], items: [] };
            AppState.allLearningVideos = [];
            AppState.filteredLearningVideos = [];
        }
        
        // 更新界面信息
        elements.dateDisplay.textContent = `今日 ${data.date} · ${data.total_count} 条热点`;
        
        // 处理路由
        const hash = window.location.hash || '#/';
        if (hash === '#/learning') {
            AppState.currentRoute = 'learning';
        } else {
            AppState.currentRoute = 'hot';
        }
    } catch (err) {
        console.error('Failed to load data:', err);
        throw err;
    }
}

/**
 * 设置路由
 */
function setupRouting() {
    // 更新导航按钮状态
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.route === AppState.currentRoute);
    });
    
    // 显示对应视图
    if (AppState.currentRoute === 'hot') {
        elements.hotView.classList.remove('hidden');
        elements.learningView.classList.add('hidden');
    } else {
        elements.hotView.classList.add('hidden');
        elements.learningView.classList.remove('hidden');
    }
    
    // 监听导航点击
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            AppState.currentRoute = btn.dataset.route;
            if (AppState.currentRoute === 'learning') {
                window.location.hash = '#/learning';
            } else {
                window.location.hash = '#/';
            }
            document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (AppState.currentRoute === 'hot') {
                elements.hotView.classList.remove('hidden');
                elements.learningView.classList.add('hidden');
            } else {
                elements.hotView.classList.add('hidden');
                elements.learningView.classList.remove('hidden');
                // 第一次进入学习页面才初始化，保证只渲染一次
                if (AppState.allLearningVideos.length > 0 && elements.videoGrid.children.length === 0) {
                    console.log('initLearningView first time');
                    initLearningView();
                }
            }
            // 强制隐藏loading
            elements.loading.classList.add('hidden');
            elements.learningLoading.classList.add('hidden');
        });
    });
    
    // 监听hash变化
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash;
        if (hash === '#/learning' && AppState.currentRoute !== 'learning') {
            document.querySelector('.nav-tab[data-route="learning"]').click();
        } else if (hash === '#/' && AppState.currentRoute !== 'hot') {
            document.querySelector('.nav-tab[data-route="hot"]').click();
        }
    });
}

/**
 * 初始化热点日报视图
 */
function initHotView() {
    renderCategories();
    renderTagCloud();
    renderTodayFocus();
    initQuickRead();
    renderFirstBatch();
    setupHotEventListeners();
    setupInfiniteScroll();
}

/**
 * 渲染分类标签
 */
function renderCategories() {
    const categories = AppState.hotData.categories || [];
    
    // 保留"全部"按钮，追加其他分类
    categories.forEach(cat => {
        const button = document.createElement('button');
        button.className = 'category-tag px-3 py-1 rounded-full text-sm bg-gray-100';
        button.dataset.category = cat;
        button.textContent = cat;
        elements.categoryContainer.appendChild(button);
    });
}

/**
 * 渲染标签云
 */
function renderTagCloud() {
    const trendingTags = AppState.hotData.trending_tags || [];
    
    if (trendingTags.length === 0) {
        // 从items中提取标签
        const tagMap = {};
        AppState.allHotItems.forEach(item => {
            const tags = item.tags || [];
            tags.forEach(tag => {
                tagMap[tag] = (tagMap[tag] || 0) + 1;
            });
        });
        // 按出现次数排序，取前15个
        const sortedTags = Object.entries(tagMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([tag]) => tag);
        
        sortedTags.forEach(tag => {
            const a = document.createElement('a');
            const size = Math.min(1 + (tagMap[tag] * 0.2), 1.4);
            a.className = 'inline-block px-2 py-1 rounded bg-gray-100 text-gray-600 hover:text-white transition-all';
            a.style.fontSize = `${size}em`;
            a.textContent = `#${tag}`;
            a.href = '#';
            a.addEventListener('click', (e) => {
                e.preventDefault();
                elements.searchInput.value = tag;
                AppState.searchQuery = tag;
                reRenderHot();
            });
            elements.tagCloud.appendChild(a);
        });
    } else {
        trendingTags.forEach((tag, index) => {
            const a = document.createElement('a');
            // 热门程度不同，字体大小不同
            const size = 1 + (15 - index) * 0.02;
            a.className = 'inline-block px-2 py-1 rounded bg-gray-100 text-gray-600 hover:text-white transition-all';
            a.style.fontSize = `${size}em`;
            a.textContent = tag.startsWith('#') ? tag : `#${tag}`;
            a.href = '#';
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const cleanTag = tag.replace(/^#/, '');
                elements.searchInput.value = cleanTag;
                AppState.searchQuery = cleanTag;
                reRenderHot();
            });
            elements.tagCloud.appendChild(a);
        });
    }
}

/**
 * 渲染今日焦点（Top 3最热）
 */
function renderTodayFocus() {
    // 获取Top 3最热
    const sortedItems = [...AppState.allHotItems].sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
    const focusItems = sortedItems.slice(0, 3);
    
    if (focusItems.length === 0) {
        elements.focusContainer.innerHTML = '<p class="text-gray-500">暂无焦点热点</p>';
        return;
    }
    
    focusItems.forEach((item, index) => {
        const card = createFocusCard(item, index);
        elements.focusContainer.appendChild(card);
    });
}

/**
 * 创建今日焦点卡片
 */
function createFocusCard(item, index) {
    const hotScore = item.hot_score || 0;
    const category = item.category || '其他';
    const categoryDisplay = Array.isArray(category) ? category[0] : category;
    const description = item.description || '';
    const author = item.author || '';
    const imageUrl = item.image_url;
    
    const card = document.createElement('a');
    card.href = item.url;
    card.target = '_blank';
    card.className = 'focus-card bg-white rounded-xl overflow-hidden block fade-in';
    
    // 根据位置决定布局
    const isFirst = index === 0;
    const layoutClass = isFirst ? 'grid grid-cols-1 md:grid-cols-2' : 'grid grid-cols-1';
    
    let imageHtml = '';
    if (imageUrl) {
        imageHtml = `
            <div class="relative ${isFirst ? 'h-64 md:h-full' : 'h-48'} bg-gray-100 overflow-hidden">
                <img data-src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover lazy">
                <div class="absolute top-3 left-3">
                    <span class="px-3 py-1 bg-black/60 text-white text-sm font-semibold rounded-full">
                        ${index === 0 ? '🔥 今日头条' : `焦点 ${index + 1}`}
                    </span>
                </div>
            </div>
        `;
    } else {
        // 无图，根据热度生成渐变背景
        const intensity = Math.min(1, hotScore / 100000);
        const hue1 = 200 + intensity * 80;
        const hue2 = 250 + intensity * 50;
        imageHtml = `
            <div class="h-48 bg-gradient-to-br from-[hsl(${hue1},80%,60%)] to-[hsl(${hue2},80%,50%)] relative">
                <div class="absolute top-3 left-3">
                    <span class="px-3 py-1 bg-black/40 text-white text-sm font-semibold rounded-full">
                        ${index === 0 ? '🔥 今日头条' : `焦点 ${index + 1}`}
                    </span>
                </div>
                <div class="absolute bottom-4 left-4 text-white">
                    <div class="text-2xl font-bold">${Math.round(hotScore)}</div>
                    <div class="text-sm opacity-80">热度</div>
                </div>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="${layoutClass}">
            ${imageHtml}
            <div class="p-6">
                <div class="flex justify-between items-start gap-3 mb-3">
                    <div>
                        <span class="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                            ${escapeHtml(item.source || '未知')}
                        </span>
                        ${categoryDisplay ? `<span class="inline-block px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded ml-1">${escapeHtml(categoryDisplay)}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="text-lg font-bold hot-score">${Math.round(hotScore)}</span>
                        <svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2C10 2 3 8 3 10a7 7 0 1014 0c0-2-7-8-7-8z"/>
                        </svg>
                    </div>
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-3 leading-snug">${escapeHtml(item.title)}</h3>
                ${description ? `<p class="text-gray-600 text-sm mb-4 line-clamp-3">${escapeHtml(description)}</p>` : ''}
                <div class="flex items-center justify-between text-xs text-gray-400">
                    <span>${author ? `by ${escapeHtml(author)}` : ''}</span>
                    <span>${item.likes ? `${item.likes} 赞` : ''}</span>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

/**
 * 初始化今日速读
 */
function initQuickRead() {
    // 今日焦点已经拿走了Top3，速读展示剩下的浓缩列表
    const sortedItems = [...AppState.allHotItems].sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
    const quickReadItems = sortedItems.slice(3); // 去掉前3个焦点
    
    elements.quickReadCount.textContent = `(${quickReadItems.length} 条)`;
    
    quickReadItems.slice(0, 15).forEach(item => {
        const itemEl = createQuickReadItem(item);
        elements.quickReadList.appendChild(itemEl);
    });
    
    // 折叠/展开点击
    elements.quickReadHeader.addEventListener('click', () => {
        AppState.quickReadCollapsed = !AppState.quickReadCollapsed;
        if (AppState.quickReadCollapsed) {
            document.getElementById('quick-read-content').classList.add('hidden');
            elements.quickReadIcon.style.transform = 'rotate(-90deg)';
        } else {
            document.getElementById('quick-read-content').classList.remove('hidden');
            elements.quickReadIcon.style.transform = 'rotate(0deg)';
        }
    });
}

/**
 * 创建今日速读项
 */
function createQuickReadItem(item) {
    const hotScore = Math.round(item.hot_score || 0);
    const source = item.source || '未知';
    
    const div = document.createElement('div');
    div.className = 'quick-read-item px-4 py-3 hover:bg-gray-50';
    
    div.innerHTML = `
        <a href="${escapeHtml(item.url)}" target="_blank" class="flex items-center justify-between gap-3 group">
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 group-hover:text-blue-600 truncate">
                    ${escapeHtml(item.title)}
                </p>
                <p class="text-xs text-gray-400 mt-1">
                    ${escapeHtml(source)} ${item.category ? `· ${Array.isArray(item.category) ? item.category[0] : item.category}` : ''}
                </p>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs font-semibold hot-score">${hotScore}</span>
                <svg class="w-4 h-4 text-gray-300 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
            </div>
        </a>
    `;
    
    return div;
}

/**
 * 筛选热点数据
 */
function filterHotItems() {
    let filtered = [...AppState.allHotItems];
    
    // 去掉今日焦点已经展示的Top3，列表展示剩下的
    filtered = filtered.sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0)).slice(3);
    
    // 分类筛选
    if (AppState.hotCurrentCategory !== 'all') {
        filtered = filtered.filter(item => {
            const itemCat = item.category;
            if (Array.isArray(itemCat)) {
                return itemCat.includes(AppState.hotCurrentCategory);
            }
            return itemCat === AppState.hotCurrentCategory;
        });
    }
    
    // 搜索词筛选
    if (AppState.searchQuery && AppState.searchQuery.trim()) {
        const query = AppState.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const title = (item.title || '').toLowerCase();
            const desc = (item.description || '').toLowerCase();
            const author = (item.author || '').toLowerCase();
            const source = (item.source || '').toLowerCase();
            const tags = (item.tags || []).join(' ').toLowerCase();
            return title.includes(query) || desc.includes(query) || author.includes(query) 
                || source.includes(query) || tags.includes(query);
        });
    }
    
    // 排序
    if (AppState.sortBy === 'hot') {
        filtered.sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
    } else {
        // 按时间排序，新的在前
        filtered.sort((a, b) => {
            const aTime = a.created_at || '';
            const bTime = b.created_at || '';
            return bTime.localeCompare(aTime);
        });
    }
    
    AppState.filteredHotItems = filtered;
    AppState.hotCurrentPage = 1;
    AppState.hasMore = filtered.length > AppState.itemsPerPage;
    
    return filtered;
}

/**
 * 重新渲染热点
 */
function reRenderHot() {
    filterHotItems();
    elements.hotGrid.innerHTML = '';
    
    console.log('reRenderHot: filteredHotItems length =', AppState.filteredHotItems.length);
    
    if (AppState.filteredHotItems.length === 0) {
        elements.hotGrid.classList.add('hidden');
        elements.noResults.classList.remove('hidden');
        elements.loading.classList.add('hidden');
        elements.endMessage.classList.add('hidden');
    } else {
        elements.hotGrid.classList.remove('hidden');
        elements.noResults.classList.add('hidden');
        renderNextHotBatch();
    }
    
    updateHotFilterInfo();
    // 强制隐藏loading
    setTimeout(() => {
        elements.loading.classList.add('hidden');
    }, 500);
}

/**
 * 更新筛选信息
 */
function updateHotFilterInfo() {
    const total = AppState.filteredHotItems.length;
    const shown = Math.min(total, AppState.hotCurrentPage * AppState.itemsPerPage);
    
    if (AppState.hotCurrentCategory === 'all' && !AppState.searchQuery && AppState.sortBy === 'hot') {
        elements.filterInfo.textContent = '';
    } else {
        elements.filterInfo.textContent = `找到 ${total} 条匹配结果，显示 ${shown} 条`;
    }
    
    elements.totalCount.textContent = AppState.allHotItems.length;
}

/**
 * 渲染单个热点卡片
 */
function renderHotCard(item) {
    const hotScore = item.hot_score || 0;
    const category = item.category || '其他';
    const categoryDisplay = Array.isArray(category) ? category[0] : category;
    const description = item.description || '';
    const author = item.author || '';
    const imageUrl = item.image_url;
    
    const card = document.createElement('a');
    card.href = item.url;
    card.target = '_blank';
    card.className = 'hot-card bg-white rounded-xl p-5 block fade-in';
    
    // 如果有图片，显示缩略图
    let imageHtml = '';
    if (imageUrl) {
        imageHtml = `
            <div class="mb-3 h-36 bg-gray-100 rounded-lg overflow-hidden">
                <img data-src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover lazy">
            </div>
        `;
    }
    
    card.innerHTML = `
        ${imageHtml}
        <div class="flex justify-between items-start gap-3 mb-3">
            <div>
                <span class="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                    ${escapeHtml(item.source || '未知')}
                </span>
                ${categoryDisplay ? `<span class="inline-block px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded ml-1">${escapeHtml(categoryDisplay)}</span>` : ''}
            </div>
            <div class="flex items-center gap-1">
                <span class="text-lg font-bold hot-score">${Math.round(hotScore)}</span>
                <svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2C10 2 3 8 3 10a7 7 0 1014 0c0-2-7-8-7-8z"/>
                </svg>
            </div>
        </div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2 leading-snug">${escapeHtml(item.title)}</h3>
        ${description ? `<p class="text-gray-500 text-sm mb-3 line-clamp-2">${escapeHtml(description)}</p>` : ''}
        <div class="flex items-center justify-between text-xs text-gray-400">
            <span>${author ? `by ${escapeHtml(author)}` : ''}</span>
            <span>${item.likes ? `${item.likes} 赞` : ''}</span>
        </div>
    `;
    
    return card;
}

/**
 * 渲染第一页
 */
function renderFirstBatch() {
    elements.hotGrid.innerHTML = '';
    filterHotItems();
    renderNextHotBatch();
}

/**
 * 渲染下一页热点
 */
function renderNextHotBatch() {
    if (AppState.isLoading || !AppState.hasMore) return;
    
    AppState.isLoading = true;
    elements.loading.classList.remove('hidden');
    
    // 计算本次需要渲染的范围
    const start = (AppState.hotCurrentPage - 1) * AppState.itemsPerPage;
    const end = start + AppState.itemsPerPage;
    const itemsToRender = AppState.filteredHotItems.slice(start, end);
    
    // 模拟一点加载延迟让效果更自然
    setTimeout(() => {
        itemsToRender.forEach(item => {
            const card = renderHotCard(item);
            elements.hotGrid.appendChild(card);
        });
        
        // 懒加载图片
        lazyLoadImages();
        
        AppState.hotCurrentPage++;
        AppState.isLoading = false;
        
        // 检查是否还有更多
        if (end >= AppState.filteredHotItems.length) {
            AppState.hasMore = false;
            elements.loading.classList.add('hidden');
            if (AppState.filteredHotItems.length > 0) {
                elements.endMessage.classList.remove('hidden');
            }
        } else {
            elements.loading.classList.add('hidden');
        }
        
        updateHotFilterInfo();
    }, 300);
}

/**
 * 设置无限滚动 - 使用 IntersectionObserver
 */
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && AppState.hasMore && !AppState.isLoading && AppState.currentRoute === 'hot') {
            renderNextHotBatch();
        }
    }, { rootMargin: '200px' });
    
    // 观察loading元素
    observer.observe(elements.loading);
    
    // 为AI学习也设置观察
    const learningObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && AppState.learningHasMore && !AppState.learningIsLoading && AppState.currentRoute === 'learning') {
            renderNextLearningBatch();
        }
    }, { rootMargin: '200px' });
    learningObserver.observe(elements.learningLoading);
}

/**
 * 设置事件监听
 */
function setupHotEventListeners() {
    // 分类点击
    elements.categoryContainer.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        
        // 更新active状态
        document.querySelectorAll('#category-container .category-tag').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        AppState.hotCurrentCategory = e.target.dataset.category;
        reRenderHot();
    });
    
    // 搜索输入（防抖）
    let searchTimer = null;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            AppState.searchQuery = e.target.value;
            reRenderHot();
        }, 300);
    });
    
    // 排序变化
    elements.sortSelect.addEventListener('change', (e) => {
        AppState.sortBy = e.target.value;
        reRenderHot();
    });
    
    // 键盘回车不提交
    elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });
}

/**
 * ========== AI学习板块 ==========
 */

/**
 * 初始化AI学习视图
 */
function initLearningView() {
    if (AppState.allLearningVideos.length === 0) {
        elements.learningNoResults.classList.remove('hidden');
        elements.learningTotalCount.textContent = '0';
        return;
    }
    
    renderLearningCategories();
    filterLearningItems();
    renderFirstLearningBatch();
    setupLearningEventListeners();
}

/**
 * 渲染AI学习分类
 */
function renderLearningCategories() {
    const categories = AppState.learningData.categories || [];
    
    categories.forEach(cat => {
        const button = document.createElement('button');
        button.className = 'category-tag px-3 py-1 rounded-full text-sm bg-gray-100';
        button.dataset.category = cat;
        button.textContent = cat;
        elements.learningCategoryContainer.appendChild(button);
    });
}

/**
 * 筛选AI学习视频
 */
function filterLearningItems() {
    let filtered = [...AppState.allLearningVideos];
    
    // 分类筛选
    if (AppState.learningCurrentCategory !== 'all') {
        filtered = filtered.filter(item => item.category === AppState.learningCurrentCategory);
    }
    
    // 按热度排序
    filtered.sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
    
    AppState.filteredLearningVideos = filtered;
    AppState.learningCurrentPage = 1;
    AppState.learningHasMore = filtered.length > AppState.videosPerPage;
    
    return filtered;
}

/**
 * 重新渲染AI学习
 */
function reRenderLearning() {
    filterLearningItems();
    elements.videoGrid.innerHTML = '';
    
    if (AppState.filteredLearningVideos.length === 0) {
        elements.videoGrid.classList.add('hidden');
        elements.learningNoResults.classList.remove('hidden');
        elements.learningLoading.classList.add('hidden');
        elements.learningEndMessage.classList.add('hidden');
    } else {
        elements.videoGrid.classList.remove('hidden');
        elements.learningNoResults.classList.add('hidden');
        renderNextLearningBatch();
    }
    
    updateLearningFilterInfo();
}

/**
 * 更新学习筛选信息
 */
function updateLearningFilterInfo() {
    const total = AppState.filteredLearningVideos.length;
    const shown = Math.min(total, AppState.learningCurrentPage * AppState.videosPerPage);
    elements.learningTotalCount.textContent = AppState.allLearningVideos.length;
    
    if (AppState.learningCurrentCategory === 'all') {
        elements.learningFilterInfo.textContent = '';
    } else {
        elements.learningFilterInfo.textContent = `找到 ${total} 个匹配视频，显示 ${shown} 个`;
    }
}

/**
 * 创建视频卡片
 */
function createVideoCard(video) {
    const duration = video.duration || 0;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const playCount = formatNumber(video.play_num || 0);
    const likeCount = formatNumber(video.like_num || 0);
    
    const card = document.createElement('a');
    card.href = video.url;
    card.target = '_blank';
    card.className = 'video-card hot-card bg-white rounded-xl overflow-hidden block fade-in';
    
    card.innerHTML = `
        <div class="relative aspect-video bg-gray-100">
            <img data-src="${escapeHtml(video.cover_url)}" alt="${escapeHtml(video.title)}" class="w-full h-full object-cover lazy">
            <div class="play-overlay absolute inset-0 flex items-center justify-center">
                <div class="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center">
                    <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 4l12 6-12 6V4z"/>
                    </svg>
                </div>
            </div>
            <div class="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                ${durationStr}
            </div>
        </div>
        <div class="p-4">
            <h3 class="text-base font-semibold text-gray-800 mb-2 line-clamp-2 leading-snug">
                ${escapeHtml(video.title)}
            </h3>
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-500">${escapeHtml(video.up_name)}</span>
                <span class="text-xs text-gray-400">${playCount} 播放</span>
            </div>
            <div class="flex items-center justify-between text-xs text-gray-400">
                <span>❤️ ${likeCount}</span>
                ${video.category ? `<span class="px-2 py-1 bg-gray-100 rounded">${escapeHtml(video.category)}</span>` : ''}
            </div>
        </div>
    `;
    
    return card;
}

/**
 * 格式化数字
 */
function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'w';
    }
    return num.toString();
}

/**
 * 渲染第一页视频
 */
function renderFirstLearningBatch() {
    elements.videoGrid.innerHTML = '';
    renderNextLearningBatch();
}

/**
 * 渲染下一页视频
 */
function renderNextLearningBatch() {
    if (AppState.learningIsLoading || !AppState.learningHasMore) return;
    
    AppState.learningIsLoading = true;
    elements.learningLoading.classList.remove('hidden');
    
    const start = (AppState.learningCurrentPage - 1) * AppState.videosPerPage;
    const end = start + AppState.videosPerPage;
    const itemsToRender = AppState.filteredLearningVideos.slice(start, end);
    
    setTimeout(() => {
        itemsToRender.forEach(video => {
            const card = createVideoCard(video);
            elements.videoGrid.appendChild(card);
        });
        
        lazyLoadImages();
        
        AppState.learningCurrentPage++;
        AppState.learningIsLoading = false;
        
        if (end >= AppState.filteredLearningVideos.length) {
            AppState.learningHasMore = false;
            elements.learningLoading.classList.add('hidden');
            if (AppState.filteredLearningVideos.length > 0) {
                elements.learningEndMessage.classList.remove('hidden');
            }
        } else {
            elements.learningLoading.classList.add('hidden');
        }
        
        updateLearningFilterInfo();
    }, 300);
}

/**
 * 设置AI学习事件监听
 */
function setupLearningEventListeners() {
    elements.learningCategoryContainer.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        
        // 更新active状态
        document.querySelectorAll('#learning-category-container .category-tag').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        AppState.learningCurrentCategory = e.target.dataset.category;
        reRenderLearning();
    });
}

/**
 * ========== 图片懒加载 ==========
 */

function setupLazyLoading() {
    // 使用 IntersectionObserver 实现懒加载
    const lazyImages = document.querySelectorAll('img.lazy');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });
    
    lazyImages.forEach(img => imageObserver.observe(img));
}

function lazyLoadImages() {
    // 新加载的图片也需要懒加载
    const lazyImages = document.querySelectorAll('img.lazy');
    setupLazyLoading();
}

/**
 * ========== 工具函数 ==========
 */

/**
 * HTML转义，防止XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 显示错误
 */
function showError(message) {
    const container = AppState.currentRoute === 'hot' ? elements.hotGrid : elements.videoGrid;
    container.innerHTML = `
        <div class="col-span-full text-center py-20 text-red-500">
            <p class="text-xl">${message}</p>
        </div>
    `;
}
