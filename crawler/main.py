#!/usr/bin/env python3
"""
AI热点日报爬虫主程序
汇总所有数据源，生成每日热点JSON
功能：
- 多数据源爬取
- 每条热点生成中文总结
- 保留最近7天历史数据
- AI学习板块B站视频爬取
"""

import sys
import json
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from crawler.utils import (
    get_today_date, 
    get_categories, 
    deduplicate_items, 
    sort_by_hotness,
    summarize_url,
    load_history_data,
    save_daily_history,
    cleanup_old_history
)
from crawler.github_trending import GitHubTrendingCrawler
from crawler.huggingface_papers import HuggingFacePapersCrawler
from crawler.zhihu import ZhihuHotCrawler
from crawler.bilibili import BilibiliAICrawler
from crawler.juejin import JuejinCrawler

from datetime import datetime

def main():
    """主爬取流程"""
    print("=" * 60)
    print("AI热点日报 - 每日爬虫开始运行")
    print("  - 支持多条数据源爬取")
    print("  - 自动生成中文内容总结")
    print("  - 保留最近7天历史数据")
    print("  - AI学习板块B站视频")
    print("=" * 60)
    
    # 数据目录
    data_dir = Path(__file__).parent.parent / 'data'
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # 配置
    KEEP_DAYS = 7  # 保留最近7天数据
    ENABLE_SUMMARY = True  # 启用中文总结
    
    # 注册所有热点爬虫
    hot_crawlers = [
        GitHubTrendingCrawler(),
        HuggingFacePapersCrawler(),
        ZhihuHotCrawler(),
        JuejinCrawler(),  # 掘金中文数据源
        # 可以继续添加更多爬虫
    ]
    
    # 先抓取今日热点内容
    today_items = []
    
    for crawler in hot_crawlers:
        try:
            print(f"\n开始爬取热点: {crawler.name}")
            items = crawler.fetch()
            today_items.extend(items)
            print(f"  完成，获取 {len(items)} 条记录")
        except Exception as e:
            print(f"  ❌ 爬虫 {crawler.name} 运行失败: {e}")
            continue
    
    print(f"\n✅ 今日热点抓取完成，共抓取 {len(today_items)} 条记录")
    
    # 为每条今日热点添加中文总结
    if ENABLE_SUMMARY:
        print("\n开始生成中文内容总结...")
        success_count = 0
        for i, item in enumerate(today_items):
            url = item.get('url', '')
            title = item.get('title', '')
            if url and (not item.get('summary_cn')):
                print(f"  [{i+1}/{len(today_items)}] 总结: {title[:30]}...")
                summary = summarize_url(url, title)
                if summary:
                    item['summary_cn'] = summary
                    success_count += 1
                    print(f"    ✅ 完成: {summary[:50]}...")
                else:
                    print(f"    ⚠️  总结失败，使用原有描述")
        print(f"\n✅ 中文总结生成完成，共 {success_count}/{len(today_items)} 条成功")
    
    # 添加今日日期标记
    today = get_today_date()
    for item in today_items:
        item['date'] = today
    
    # 加载历史数据（最近7天）
    print(f"\n加载最近 {KEEP_DAYS} 天历史数据...")
    history_items = load_history_data(data_dir, KEEP_DAYS)
    print(f"  加载完成，历史数据共 {len(history_items)} 条")
    
    # 合并今日数据 + 历史数据
    all_items = history_items + today_items
    
    # 抓取B站AI学习视频
    print("\n开始抓取B站AI学习视频...")
    learning_videos = []
    try:
        bilibili_crawler = BilibiliAICrawler()
        learning_videos = bilibili_crawler.fetch()
        print(f"✅ AI学习视频抓取完成，共 {len(learning_videos)} 个去重后的视频")
    except Exception as e:
        print(f"❌ B站爬虫运行失败: {e}")
        learning_videos = []
    
    # 提取热门标签（从所有热点项目的标签中提取）
    trending_tags = []
    tag_counts = {}
    for item in all_items:
        tags = item.get('tags', [])
        for tag in tags:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    # 按出现次数排序，取前15个热门标签
    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
    trending_tags = [tag for tag, count in sorted_tags[:15]]
    
    print(f"\n提取热门标签: {trending_tags}")
    
    # 去重和排序热点（按热度）
    all_items = deduplicate_items(all_items)
    all_items = sort_by_hotness(all_items)
    
    # 获取所有分类
    categories = get_categories(all_items)
    
    # 获取AI学习分类
    learning_categories = []
    if learning_videos:
        learning_categories = list(set(v['category'] for v in learning_videos))
        learning_categories = sorted(learning_categories)
    
    # 保存今日数据作为历史记录
    today_data = {
        "date": today,
        "generated_at": datetime.now().isoformat(),
        "total_count": len(today_items),
        "categories": get_categories(today_items),
        "items": today_items,
    }
    save_daily_history(data_dir, today_data)
    
    # 清理过期历史数据
    cleanup_old_history(data_dir, KEEP_DAYS)
    
    # 保存完整数据（包含热点（今日+历史）和AI学习）
    data = {
        "date": today,
        "generated_at": datetime.now().isoformat(),
        "keep_days": KEEP_DAYS,
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
    output_path = data_dir / 'daily.json'
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 60)
    print("✅ 爬取完成!")
    print(f"  - 总热点数据（含历史）: {len(all_items)} 条")
    print(f"  - 今日新增: {len(today_items)} 条")
    print(f"  - AI学习视频: {len(learning_videos)} 个")
    print(f"  - 热门标签: {len(trending_tags)} 个")
    print(f"  - 数据保存到: {output_path}")
    print("=" * 60)
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
