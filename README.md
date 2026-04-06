# AI热点日报

每日聚合AI领域热点事件，按热度排序，无限滚动浏览。

## 功能特性

- 🤖 每日自动爬取多个AI数据源
- 🔥 按热度排序展示热点事件
- 🔍 实时搜索和分类筛选
- ♾️ 无限滚动加载更多
- 📱 全响应式设计，支持移动端
- ⚡ 快速加载，静态部署

## 数据源

- Hugging Face Papers
- GitHub Trending (AI领域)
- Reddit r/MachineLearning
- Twitter/X AI话题
- 知乎AI板块

## 项目结构

```
ai-hot-daily/
├── crawler/              # 爬虫模块
│   ├── sources/          # 各个数据源爬虫
│   ├── utils.py          # 工具函数
│   └── main.py           # 爬虫主入口
├── frontend/             # 前端页面
│   ├── index.html        # 主页面
│   ├── style.css         # 样式（可内嵌也可独立）
│   └── app.js            # 主逻辑
├── data/                 # 数据目录
│   └── daily.json        # 每日热点数据（自动生成）
├── scripts/              # 辅助脚本
│   └── deploy.sh         # 部署脚本
├── .github/
│   └── workflows/
│       └── crawl.yml     # GitHub Actions定时爬取
└── requirements.txt      # Python依赖
```

## 本地开发

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 运行爬虫

```bash
python crawler/main.py
```

会在 `data/daily.json` 生成今日热点数据

### 3. 启动前端开发

```bash
cd frontend
python -m http.server 8000
# 访问 http://localhost:8000
```

## 部署

项目支持免费部署到 Vercel 或 Netlify：

- 爬虫每日自动通过 GitHub Actions 运行
- 自动提交数据到 Git
- Vercel/Netlify 自动部署前端
- **完全免费**

详细部署说明见下文。

## License

MIT
