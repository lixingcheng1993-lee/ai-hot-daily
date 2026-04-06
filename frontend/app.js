/**
 * AI热点日报 - 前端主逻辑
 * 功能：数据加载、筛选、无限滚动、搜索
 */

// 全局状态
const AppState = {
    allItems: [],           // 所有数据
    filteredItems: [],      // 筛选后的数据
    currentPage: 1,
    itemsPerPage: 12,       // 每页加载数量
    currentCategory: 'all',
    searchQuery: '',
    isLoading: false,
    hasMore: true,
    data: null              // 完整数据对象
};

// DOM 元素缓存
const elements = {
    hotGrid: document.getElementById('hot-grid'),
    categoryContainer: document.getElementById('category-container'),
    searchInput: document.getElementById('search-input'),
    dateDisplay: document.getElementById('date-display'),
    totalCount: document.getElementById('total-count'),
    filterInfo: document.getElementById('filter-info'),
    loading: document.getElementById('loading'),
    endMessage: document.getElementById('end-message'),
    noResults: document.getElementById('no-results')
};

// 初始化
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        await loadData();
        renderCategories();
        renderFirstBatch();
        setupEventListeners();
        setupInfiniteScroll();
    } catch (error) {
        console.error('初始化失败:', error);
        showError('数据加载失败，请刷新重试');
    }
}

/**
 * 加载数据JSON
 */
async function loadData() {
    // 构建数据路径，开发环境和生产环境自适应
    const dataPath = window.location.hostname === 'localhost' 
        ? '../data/daily.json' 
        : './data/daily.json';
    
    const response = await fetch(dataPath);
    if (!response.ok) {
        throw new Error(`HTTP error, status = ${response.status}`);
    }
    AppState.data = await response.json();
    AppState.allItems = AppState.data.items || [];
    AppState.filteredItems = [...AppState.allItems];
    
    // 更新界面信息
    elements.dateDisplay.textContent = `今日 ${AppState.data.date} · ${AppState.data.total_count} 条热点`;
    elements.totalCount.textContent = AppState.data.total_count;
}

/**
 * 渲染分类标签
 */
function renderCategories() {
    const categories = AppState.data.categories || [];
    
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
 * 筛选数据 - 根据分类和搜索词
 */
function filterItems() {
    let filtered = [...AppState.allItems];
    
    // 分类筛选
    if (AppState.currentCategory !== 'all') {
        filtered = filtered.filter(item => {
            const itemCat = item.category;
            if (Array.isArray(itemCat)) {
                return itemCat.includes(AppState.currentCategory);
            }
            return itemCat === AppState.currentCategory;
        });
    }
    
    // 搜索词筛选
    if (AppState.searchQuery && AppState.searchQuery.trim()) {
        const query = AppState.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const title = (item.title || '').toLowerCase();
            const desc = (item.description || '').toLowerCase();
            const author = (item.author || '').toLowerCase();
            return title.includes(query) || desc.includes(query) || author.includes(query);
        });
    }
    
    // 按热度重新排序（保持数据原本的热度排序）
    filtered.sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
    
    AppState.filteredItems = filtered;
    AppState.currentPage = 1;
    AppState.hasMore = filtered.length > AppState.itemsPerPage;
    
    return filtered;
}

/**
 * 重新渲染 - 筛选后清空重新加载
 */
function reRender() {
    filterItems();
    elements.hotGrid.innerHTML = '';
    
    if (AppState.filteredItems.length === 0) {
        elements.hotGrid.classList.add('hidden');
        elements.noResults.classList.remove('hidden');
        elements.loading.classList.add('hidden');
        elements.endMessage.classList.add('hidden');
    } else {
        elements.hotGrid.classList.remove('hidden');
        elements.noResults.classList.add('hidden');
        renderNextBatch();
    }
    
    // 更新统计信息
    updateFilterInfo();
}

/**
 * 更新筛选信息
 */
function updateFilterInfo() {
    const total = AppState.filteredItems.length;
    const shown = Math.min(total, AppState.currentPage * AppState.itemsPerPage);
    
    if (AppState.currentCategory === 'all' && !AppState.searchQuery) {
        elements.filterInfo.textContent = '';
    } else {
        elements.filterInfo.textContent = `找到 ${total} 条匹配结果，显示 ${shown} 条`;
    }
}

/**
 * 渲染单个卡片
 */
function renderCard(item) {
    const hotScore = item.hot_score || 0;
    const category = item.category || '其他';
    const categoryDisplay = Array.isArray(category) ? category[0] : category;
    const description = item.description || '';
    const author = item.author || '';
    
    const card = document.createElement('a');
    card.href = item.url;
    card.target = '_blank';
    card.className = 'hot-card bg-white rounded-xl p-5 block fade-in';
    
    card.innerHTML = `
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
    renderNextBatch();
}

/**
 * 渲染下一页
 */
function renderNextBatch() {
    if (AppState.isLoading || !AppState.hasMore) return;
    
    AppState.isLoading = true;
    elements.loading.classList.remove('hidden');
    
    // 计算本次需要渲染的范围
    const start = (AppState.currentPage - 1) * AppState.itemsPerPage;
    const end = start + AppState.itemsPerPage;
    const itemsToRender = AppState.filteredItems.slice(start, end);
    
    // 模拟一点加载延迟让效果更自然
    setTimeout(() => {
        itemsToRender.forEach(item => {
            const card = renderCard(item);
            elements.hotGrid.appendChild(card);
        });
        
        AppState.currentPage++;
        AppState.isLoading = false;
        
        // 检查是否还有更多
        if (end >= AppState.filteredItems.length) {
            AppState.hasMore = false;
            elements.loading.classList.add('hidden');
            if (AppState.filteredItems.length > 0) {
                elements.endMessage.classList.remove('hidden');
            }
        } else {
            elements.loading.classList.add('hidden');
        }
        
        updateFilterInfo();
    }, 300);
}

/**
 * 设置无限滚动 - 使用 IntersectionObserver
 */
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && AppState.hasMore && !AppState.isLoading) {
            renderNextBatch();
        }
    }, { rootMargin: '200px' });
    
    // 观察loading元素
    observer.observe(elements.loading);
}

/**
 * 设置事件监听
 */
function setupEventListeners() {
    // 分类点击
    elements.categoryContainer.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        
        // 更新active状态
        document.querySelectorAll('.category-tag').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        AppState.currentCategory = e.target.dataset.category;
        reRender();
    });
    
    // 搜索输入（防抖）
    let searchTimer = null;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            AppState.searchQuery = e.target.value;
            reRender();
        }, 300);
    });
    
    // 键盘回车不提交
    elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });
}

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
    elements.hotGrid.innerHTML = `
        <div class="col-span-full text-center py-20 text-red-500">
            <p class="text-xl">${message}</p>
        </div>
    `;
}
