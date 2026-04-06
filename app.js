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

function init() {
    try {
        console.log('init starting...');
        loadAllData().then(function() {
            setupRouting();
            if (AppState.currentRoute === 'hot') {
                initHotView();
            } else {
                initLearningView();
            }
            setupLazyLoading();
            // 无论如何，最终隐藏loading
            setTimeout(function() {
                console.log('init done, hiding loading');
                elements.loading.classList.add('hidden');
                elements.learningLoading.classList.add('hidden');
            }, 1000);
        });
    } catch (error) {
        console.error('初始化失败:', error);
        elements.loading.classList.add('hidden');
        showError('数据加载失败：' + error.message);
    }
}

/**
 * 加载所有数据 - 双路径fallback保证加载成功
 */
async function loadAllData() {
    let data = null;
    let loadSuccess = false;

    // 尝试绝对路径
    try {
        const dataPath = window.location.origin + '/data/daily.json';
        console.log('Trying absolute path:', dataPath);
        const response = await fetch(dataPath);
        if (response.ok) {
            data = await response.json();
            loadSuccess = true;
            console.log('✅ Data loaded from absolute path');
        }
    } catch (e) {
        console.warn('Absolute path failed:', e);
    }

    // 绝对路径失败尝试相对路径
    if (!loadSuccess) {
        try {
            const dataPath = './data/daily.json';
            console.log('Trying relative path:', dataPath);
            const response = await fetch(dataPath);
            if (response.ok) {
                data = await response.json();
                loadSuccess = true;
                console.log('✅ Data loaded from relative path');
            }
        } catch (e) {
            console.error('Relative path also failed:', e);
        }
    }

    if (!loadSuccess || !data) {
        throw new Error('无法加载数据文件，请检查路径配置');
    }

    console.log('Final data loaded:', {
        date: data.date,
        total_count: data.total_count,
        items_count: (data.items || []).length,
        has_learning: !!(data.learning && data.learning.items)
    });

    // 热点数据
    AppState.hotData = data;
    AppState.allHotItems = data.items || [];
    AppState.filteredHotItems = AppState.allHotItems.slice();

    // AI学习数据（兼容旧数据，如果没有则为空）
    if (data.learning && data.learning.items) {
        AppState.learningData = data.learning;
        AppState.allLearningVideos = data.learning.items || [];
        AppState.filteredLearningVideos = AppState.allLearningVideos.slice();
    } else {
        AppState.learningData = { total_count: 0, categories: [], items: [] };
        AppState.allLearningVideos = [];
        AppState.filteredLearningVideos = [];
    }

    // 更新界面信息
    elements.dateDisplay.textContent = '今日 ' + data.date + ' · ' + data.total_count + ' 条热点';

    // 处理路由
    const hash = window.location.hash || '#/';
    if (hash === '#/learning') {
        AppState.currentRoute = 'learning';
    } else {
        AppState.currentRoute = 'hot';
    }
}

/**
 * 设置路由
 */
function setupRouting() {
    // 更新导航按钮状态
    document.querySelectorAll('.nav-tab').forEach(function(btn) {
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
    document.querySelectorAll('.nav-tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
            AppState.currentRoute = btn.dataset.route;
            if (AppState.currentRoute === 'learning') {
                window.location.hash = '#/learning';
            } else {
                window.location.hash = '#/';
            }
            document.querySelectorAll('.nav-tab').forEach(function(b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');

            if (AppState.currentRoute === 'hot') {
                elements.hotView.classList.remove('hidden');
                elements.learningView.classList.add('hidden');
                elements.loading.classList.add('hidden');
                elements.learningLoading.classList.add('hidden');
            } else {
                elements.hotView.classList.add('hidden');
                elements.learningView.classList.remove('hidden');
                // 第一次进入学习页面才初始化，保证只渲染一次
                if (AppState.allLearningVideos.length > 0 && elements.videoGrid.children.length === 0) {
                    console.log('initLearningView first time');
                    initLearningView();
                }
                elements.loading.classList.add('hidden');
                elements.learningLoading.classList.add('hidden');
            }
        });
    });

    // 监听hash变化
    window.addEventListener('hashchange', function() {
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
    categories.forEach(function(cat) {
        const button = document.createElement('button');
        button.className = 'category-tag active px-3 py-1 rounded-full text-sm bg-gray-100';
        button.dataset.category = cat;
        button.textContent = cat;
        elements.categoryContainer.appendChild(button);
    });
}

/**
 * 渲染标签云
 */
function renderTagCloud() {
    let trendingTags = AppState.hotData.trending_tags || [];

    if (trendingTags.length === 0) {
        // 从items中提取标签
        const tagMap = {};
        AppState.allHotItems.forEach(function(item) {
            const tags = item.tags || [];
            tags.forEach(function(tag) {
                tagMap[tag] = (tagMap[tag] || 0) + 1;
            });
        });
        // 按出现次数排序，取前15个
        trendingTags = Object.entries(tagMap)
            .sort(function(a, b) { return b[1] - a[1]; })
            .slice(0, 15)
            .map(function(entry) { return entry[0]; });
    }

    trendingTags.forEach(function(tag, index) {
        const size = 1 + (15 - index) * 0.02;
        const a = document.createElement('a');
        // 热门程度不同，字体大小不同
        a.className = 'inline-block px-2 py-1 rounded bg-gray-100 text-gray-600 hover:text-white transition-all';
        a.style.fontSize = size + 'em';
        a.textContent = tag.startsWith('#') ? tag : '#' + tag;
        a.href = '#';
        a.addEventListener('click', function(e) {
            e.preventDefault();
            const cleanTag = tag.replace(/^#/, '');
            elements.searchInput.value = cleanTag;
            AppState.searchQuery = cleanTag;
            reRenderHot();
        });
        elements.tagCloud.appendChild(a);
    });
}

/**
 * 渲染今日焦点（Top 3最热）
 */
function renderTodayFocus() {
    // 获取Top 3最热
    const sortedItems = AppState.allHotItems.slice().sort(function(a, b) {
        return (b.hot_score || 0) - (a.hot_score || 0);
    });
    const focusItems = sortedItems.slice(0, 3);

    if (focusItems.length === 0) {
        elements.focusContainer.innerHTML = '<p class="text-gray-500">暂无焦点热点</p>';
        return;
    }

    focusItems.forEach(function(item, index) {
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
        imageHtml = '<div class="relative ' + (isFirst ? 'h-64 md:h-full' : 'h-48') + ' bg-gray-100 overflow-hidden">' +
            '<img data-src="' + escapeHtml(imageUrl) + '" alt="' + escapeHtml(item.title) + '" class="w-full h-full object-cover lazy">' +
            '<div class="absolute top-3 left-3">' +
            '<span class="px-3 py-1 bg-black/60 text-white text-sm font-semibold rounded-full">' +
            (index === 0 ? '🔥 今日头条' : '焦点 ' + (index + 1)) +
            '</span>' +
            '</div>' +
            '</div>';
    } else {
        // 无图，根据热度生成渐变背景
        const intensity = Math.min(1, hotScore / 100000);
        const hue1 = 200 + intensity * 80;
        const hue2 = 250 + intensity * 50;
        imageHtml = '<div class="h-48 bg-gradient-to-br from-[hsl(' + hue1 + ',80%,60%)] to-[hsl(' + hue2 + ',80%,50%)] relative">' +
            '<div class="absolute top-3 left-3">' +
            '<span class="px-3 py-1 bg-black/40 text-white text-sm font-semibold rounded-full">' +
            (index === 0 ? '🔥 今日头条' : '焦点 ' + (index + 1)) +
            '</span>' +
            '</div>' +
            '<div class="absolute bottom-4 left-4 text-white">' +
            '<div class="text-2xl font-bold">' + Math.round(hotScore) + '</div>' +
            '<div class="text-sm opacity-80">热度</div>' +
            '</div>' +
            '</div>';
    }

    card.innerHTML = '<div class="' + layoutClass + '">' +
        imageHtml +
        '<div class="p-6">' +
            '<div class="flex justify-between items-start gap-3 mb-3">' +
                '<div>' +
                    '<span class="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">' +
                        escapeHtml(item.source || '未知') +
                    '</span>' +
                    (categoryDisplay ? '<span class="inline-block px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded ml-1">' + escapeHtml(categoryDisplay) + '</span>' : '') +
                '</div>' +
                '<div class="flex items-center gap-1">' +
                    '<span class="text-lg font-bold hot-score">' + Math.round(hotScore) + '</span>' +
                    '<svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">' +
                        '<path d="M10 2C10 2 3 8 3 10a7 7 0 1014 0c0-2-7-8-7-8z"/>' +
                    '</svg>' +
                '</div>' +
            '</div>' +
            '<h3 class="text-xl font-bold text-gray-900 mb-2">' + escapeHtml(item.title) + '</h3>' +
            (description ? '<p class="text-gray-600 text-line-clamp-2">' + escapeHtml(description) + '</p>' : '') +
        '</div>' +
    '</div>';

    return card;
}

/**
 * 初始化今日速读
 */
function initQuickRead() {
    // 所有热点都放速读里
    const allItems = AppState.allHotItems.slice().sort(function(a, b) {
        return (b.hot_score || 0) - (a.hot_score || 0);
    });
    elements.quickReadCount.textContent = '(' + allItems.length + ' 条)';

    allItems.forEach(function(item) {
        const div = document.createElement('div');
        div.className = 'quick-read-item px-4 py-3';
        div.innerHTML = '<a href="' + escapeHtml(item.url) + '" target="_blank" class="flex items-start justify-between gap-3 group">' +
            '<div class="flex-1">' +
                '<div class="font-medium text-gray-900 group-hover:text-blue-600">' + escapeHtml(item.title) + '</div>' +
                (item.description ? '<div class="text-sm text-gray-500 mt-1 text-line-clamp-1">' + escapeHtml(item.description) + '</div>' : '') +
            '</div>' +
            '<span class="inline-block px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded whitespace-nowrap">' +
                escapeHtml(item.source) +
            '</span>' +
        '</a></div>';
        elements.quickReadList.appendChild(div);
    });

    // 点击折叠/展开
    elements.quickReadHeader.addEventListener('click', function() {
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
 * 渲染第一页
 */
function renderFirstBatch() {
    elements.hotGrid.innerHTML = '';
    filterHotItems();
}

/**
 * 筛选热点
 */
function filterHotItems() {
    let filtered = AppState.allHotItems.slice();

    // 分类筛选
    if (AppState.hotCurrentCategory !== 'all') {
        filtered = filtered.filter(function(item) {
            const itemCat = item.category || '';
            const itemCatArray = Array.isArray(itemCat) ? itemCat : [itemCat];
            return itemCatArray.includes(AppState.hotCurrentCategory);
        });
    }

    // 搜索词筛选
    if (AppState.searchQuery && AppState.searchQuery.trim()) {
        const query = AppState.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(function(item) {
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
        filtered.sort(function(a, b) {
            return (b.hot_score || 0) - (a.hot_score || 0);
        });
    } else {
        // 按时间排序，新的在前
        filtered.sort(function(a, b) {
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
    setTimeout(function() {
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
        elements.filterInfo.textContent = '找到 ' + total + ' 条匹配结果，显示 ' + shown + ' 条';
    }

    elements.totalCount.textContent = AppState.allHotItems.length;
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
    setTimeout(function() {
        itemsToRender.forEach(function(item) {
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
 * 渲染单个热点卡片
 */
function renderHotCard(item) {
    const hotScore = item.hot_score || 0;
    const category = item.category || '其他';
    const categoryDisplay = Array.isArray(category) ? category[0] : category;
    const description = item.description || '';

    const card = document.createElement('div');
    card.className = 'hot-card bg-white rounded-xl p-5 overflow-hidden';
    card.innerHTML = '<div class="flex justify-between items-start gap-4 mb-3">' +
            '<div>' +
                '<span class="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">' +
                    escapeHtml(item.source || '未知') +
                '</span>' +
                (categoryDisplay ? '<span class="inline-block px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded ml-1">' + escapeHtml(categoryDisplay) + '</span>' : '') +
            '</div>' +
            '<div class="flex items-center gap-1">' +
                '<span class="text-lg font-bold hot-score">' + Math.round(hotScore) + '</span>' +
                '<svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">' +
                    '<path d="M10 2C10 2 3 8 3 10a7 7 0 1014 0c0-2-7-8-7-8z"/>' +
                '</svg>' +
            '</div>' +
        '</div>' +
        '<h3 class="text-xl font-bold text-gray-900 mb-2">' +
            '<a href="' + escapeHtml(item.url) + '" target="_blank" class="hover:text-blue-600">' + escapeHtml(item.title) + '</a>' +
        '</h3>' +
        (description ? '<p class="text-gray-600 text-line-clamp-2 mb-0">' + escapeHtml(description) + '</p>' : '') +
    '</div>';

    return card;
}

/**
 * 设置热点事件监听
 */
function setupHotEventListeners() {
    // 分类筛选点击
    elements.categoryContainer.addEventListener('click', function(e) {
        if (e.target.tagName !== 'BUTTON') return;

        // 更新active状态
        document.querySelectorAll('#category-container .category-tag').forEach(function(btn) {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        AppState.hotCurrentCategory = e.target.dataset.category;
        reRenderHot();
    });

    // 搜索输入
    elements.searchInput.addEventListener('input', debounce(function() {
        AppState.searchQuery = elements.searchInput.value.trim();
        reRenderHot();
    }, 300));

    // 排序变化
    elements.sortSelect.addEventListener('change', function() {
        AppState.sortBy = elements.sortSelect.value;
        reRenderHot();
    });
}

/**
 * 设置无限滚动 - 使用 IntersectionObserver
 */
function setupInfiniteScroll() {
    const observer = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting && AppState.hasMore && !AppState.isLoading) {
            renderNextHotBatch();
        }
    });

    // 观察loading元素
    observer.observe(elements.loading);
}

// ========== AI学习板块 ==========

/**
 * 初始化AI学习视图
 */
function initLearningView() {
    renderLearningCategories();
    renderFirstLearningBatch();
    setupLearningEventListeners();
    setupLearningInfiniteScroll();
}

/**
 * 渲染学习分类
 */
function renderLearningCategories() {
    const categories = AppState.learningData.categories || [];

    // 保留"全部"按钮，追加其他分类
    categories.forEach(function(cat) {
        const button = document.createElement('button');
        button.className = 'category-tag active px-3 py-1 rounded-full text-sm bg-gray-100';
        button.dataset.category = cat;
        button.textContent = cat;
        elements.learningCategoryContainer.appendChild(button);
    });
}

/**
 * 渲染第一页学习视频
 */
function renderFirstLearningBatch() {
    filterLearningVideos();
}

/**
 * 筛选学习视频
 */
function filterLearningVideos() {
    let filtered = AppState.allLearningVideos.slice();

    // 分类筛选
    if (AppState.learningCurrentCategory !== 'all') {
        filtered = filtered.filter(function(item) {
            return item.category === AppState.learningCurrentCategory;
        });
    }

    AppState.filteredLearningVideos = filtered;
    AppState.learningCurrentPage = 1;
    AppState.learningHasMore = filtered.length > AppState.videosPerPage;

    updateLearningFilterInfo();
    renderNextLearningBatch();
}

/**
 * 重新渲染学习视频
 */
function reRenderLearning() {
    filterLearningVideos();
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

    if (AppState.learningCurrentCategory === 'all') {
        elements.learningFilterInfo.textContent = '';
    } else {
        elements.learningFilterInfo.textContent = '找到 ' + total + ' 条匹配结果，显示 ' + shown + ' 条';
    }

    elements.learningTotalCount.textContent = AppState.allLearningVideos.length;
}

/**
 * 渲染下一页学习视频
 */
function renderNextLearningBatch() {
    if (AppState.learningIsLoading || !AppState.learningHasMore) return;

    AppState.learningIsLoading = true;
    elements.learningLoading.classList.remove('hidden');

    const start = (AppState.learningCurrentPage - 1) * AppState.videosPerPage;
    const end = start + AppState.videosPerPage;
    const itemsToRender = AppState.filteredLearningVideos.slice(start, end);

    setTimeout(function() {
        itemsToRender.forEach(function(item) {
            const card = createLearningVideoCard(item);
            elements.videoGrid.appendChild(card);
        });

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
 * 创建学习视频卡片
 */
function createLearningVideoCard(item) {
    const card = document.createElement('a');
    card.href = item.bvid ? 'https://www.bilibili.com/video/' + item.bvid : item.url;
    card.target = '_blank';
    card.className = 'hot-card bg-white rounded-xl overflow-hidden fade-in';

    card.innerHTML = '<div class="relative aspect-video bg-gray-100">' +
            '<img data-src="' + item.cover + '" alt="' + escapeHtml(item.title) + '" class="w-full h-full object-cover lazy">' +
            '<div class="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">' +
                formatNumber(item.play) + ' 播放' +
            '</div>' +
        '</div>' +
        '<div class="p-4">' +
            '<h3 class="font-semibold text-gray-900 mb-2 line-clamp-2">' + escapeHtml(item.title) + '</h3>' +
            '<div class="flex justify-between items-center text-sm text-gray-500">' +
                '<span>' + escapeHtml(item.author) + '</span>' +
                '<span>' + formatNumber(item.like) + ' 👍</span>' +
            '</div>' +
            '<div class="mt-2">' +
                '<span class="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">' +
                    escapeHtml(item.category) +
                '</span>' +
            '</div>' +
        '</div>' +
    '</a>';

    return card;
}

/**
 * 设置学习视频事件监听
 */
function setupLearningEventListeners() {
    elements.learningCategoryContainer.addEventListener('click', function(e) {
        if (e.target.tagName !== 'BUTTON') return;

        document.querySelectorAll('#learning-category-container .category-tag').forEach(function(btn) {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        AppState.learningCurrentCategory = e.target.dataset.category;
        reRenderLearning();
    });
}

/**
 * 设置学习无限滚动
 */
function setupLearningInfiniteScroll() {
    const observer = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting && AppState.learningHasMore && !AppState.learningIsLoading) {
            renderNextLearningBatch();
        }
    });

    observer.observe(elements.learningLoading);
}

// ========== 工具函数 ==========

/**
 * HTML转义防止XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 防抖
 */
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * 格式化数字
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

/**
 * 图片懒加载
 */
function lazyLoadImages() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img.lazy').forEach(function(img) {
            imageObserver.observe(img);
        });
    } else {
        // 不支持 IntersectionObserver 直接全部加载
        document.querySelectorAll('img.lazy').forEach(function(img) {
            img.src = img.dataset.src;
            img.classList.remove('lazy');
        });
    }
}

/**
 * 设置懒加载
 */
function setupLazyLoading() {
    // 初始加载完后再处理一次懒加载
    lazyLoadImages();
}

/**
 * 显示错误
 */
function showError(message) {
    const container = AppState.currentRoute === 'hot' ? elements.hotGrid : elements.videoGrid;
    container.innerHTML = '<div class="col-span-full text-center py-20 text-red-500">' +
        '<p class="text-xl">' + message + '</p>' +
    '</div>';
}
