#!/usr/bin/env python3
"""
AI热点日报爬虫主程序
汇总所有数据源，生成每日热点JSON
"""

import sys
import json
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from crawler.utils import save_data, get_today_date, get_categories, deduplicate_items, sort_by_hotness
from crawler.github_trending import GitHubTrendingCrawler
from crawler.huggingface_papers import HuggingFacePapersCrawler
from crawler.zhihu import ZhihuHotCrawler
from crawler.bilibili import BilibiliAICrawler
from crawler.juejin import JuejinCrawler

from datetime import datetime

def main():
    """主爬取流程"""
    print("=" * 50)
    print("AI热点日报 - 每日爬虫开始运行")
    print("=" * 50)
    
    # 注册所有热点爬虫
    hot_crawlers = [
        GitHubTrendingCrawler(),
        HuggingFacePapersCrawler(),
        ZhihuHotCrawler(),
        JuejinCrawler(),  # 新增掘金中文数据源
        # 可以继续添加更多爬虫
    ]
    
    # 先抓取热点内容
    all_items = []
    
    for crawler in hot_crawlers:
        try:
            print(f"\n开始爬取热点: {crawler.name}")
            items = crawler.fetch()
            all_items.extend(items)
        except Exception as e:
            print(f"爬虫 {crawler.name} 运行失败: {e}")
            continue
    
    print(f"\n热点抓取完成，共抓取 {len(all_items)} 条记录")
    
    # 抓取B站AI学习视频
    print("\n开始抓取B站AI学习视频...")
    learning_videos = []
    try:
        bilibili_crawler = BilibiliAICrawler()
        learning_videos = bilibili_crawler.fetch()
        print(f"AI学习视频抓取完成，共 {len(learning_videos)} 个视频")
    except Exception as e:
        print(f"B站爬虫运行失败: {e}")
        learning_videos = []
    
    # 提取热门标签（从所有热点项目的标签中提取）
    trending_tags = []
    tag_counts = {}
    for item in all_items:
        tags = item.get('tags', [])
        for tag in tags:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    # 按出现次数排序，取前10个热门标签
    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
    trending_tags = [tag for tag, count in sorted_tags[:10]]
    
    print(f"\n提取热门标签: {trending_tags}")
    
    # 去重和排序热点
    all_items = deduplicate_items(all_items)
    all_items = sort_by_hotness(all_items)
    
    # 获取所有分类
    categories = get_categories(all_items)
    
    # 获取AI学习分类
    learning_categories = []
    if learning_videos:
        learning_categories = list(set(v['category'] for v in learning_videos))
        learning_categories = sorted(learning_categories)
    
    # 保存完整数据（包含热点和AI学习）
    today = get_today_date()
    
    data = {
        "date": today,
        "generated_at": datetime.now().isoformat(),
        "total_count": len(all_items),
        "categories": categories,
        "trending_tags": trending_tags,
        "items": all_items,
        "learning": {
            "total_count": len(learning_videos),
            "categories": learning_categories,
            "items": learning_videos
        }
    }
    
    # 确保目录存在
    output_path = Path(__file__).parent.parent / 'frontend' / 'data' / 'daily.json'
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n数据已保存到 {output_path}")
    print(f"  - 热点: {len(all_items)} 条")
    print(f"  - AI学习视频: {len(learning_videos)} 个")
    print(f"  - 热门标签: {len(trending_tags)} 个")
    
    print("\n爬取完成！")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
