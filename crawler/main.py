#!/usr/bin/env python3
"""
AI热点日报爬虫主程序
汇总所有数据源，生成每日热点JSON
"""

import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from crawler.utils import save_data
from crawler.github_trending import GitHubTrendingCrawler
from crawler.huggingface_papers import HuggingFacePapersCrawler
from crawler.zhihu import ZhihuHotCrawler

def main():
    """主爬取流程"""
    print("=" * 50)
    print("AI热点日报 - 每日爬虫开始运行")
    print("=" * 50)
    
    # 注册所有爬虫
    crawlers = [
        GitHubTrendingCrawler(),
        HuggingFacePapersCrawler(),
        ZhihuHotCrawler(),
        # 可以继续添加更多爬虫
    ]
    
    all_items = []
    
    # 依次运行每个爬虫
    for crawler in crawlers:
        try:
            print(f"\n开始爬取: {crawler.name}")
            items = crawler.fetch()
            all_items.extend(items)
        except Exception as e:
            print(f"爬虫 {crawler.name} 运行失败: {e}")
            continue
    
    print(f"\n所有爬虫完成，共抓取 {len(all_items)} 条记录")
    
    # 保存数据
    output_path = Path(__file__).parent.parent / 'data' / 'daily.json'
    save_data(all_items, output_path)
    
    print("\n爬取完成！")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
