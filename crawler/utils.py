"""
工具函数模块
包含数据处理、时间处理、热度计算等通用功能
"""

import json
import datetime
from typing import List, Dict, Any
from pathlib import Path

def get_today_date() -> str:
    """获取今天日期，格式 YYYY-MM-DD"""
    return datetime.datetime.now().strftime("%Y-%m-%d")

def calculate_hot_score(item: Dict[str, Any]) -> float:
    """
    计算热度分数
    综合考虑点赞数、评论数、发布时间衰减
    公式: (likes + comments * 2) * time_decay
    """
    likes = item.get('likes', 0)
    comments = item.get('comments', 0)
    created_at = item.get('created_at', '')
    
    # 基础分数
    base_score = likes + comments * 2
    
    # 时间衰减系数 - 越近热度越高
    # 24小时内保留100%，48小时内50%，以此类推
    try:
        if created_at:
            dt = datetime.datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            now = datetime.datetime.now(datetime.timezone.utc)
            hours_ago = (now - dt).total_seconds() / 3600
            # 指数衰减，每24小时衰减一半
            time_decay = 0.5 ** (hours_ago / 24)
        else:
            time_decay = 1.0
    except Exception:
        time_decay = 1.0
    
    return round(base_score * time_decay, 2)

def sort_by_hotness(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """按热度分数降序排序"""
    for item in items:
        if 'hot_score' not in item:
            item['hot_score'] = calculate_hot_score(item)
    
    return sorted(items, key=lambda x: x['hot_score'], reverse=True)

def deduplicate_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """去重 - 基于URL去重"""
    seen_urls = set()
    unique_items = []
    
    for item in items:
        url = item.get('url', '')
        if url not in seen_urls:
            seen_urls.add(url)
            unique_items.append(item)
    
    return unique_items

def save_data(items: List[Dict[str, Any]], output_path: Path) -> None:
    """
    保存数据到JSON文件
    添加元数据信息（生成时间、总数等）
    """
    # 去重和排序
    items = deduplicate_items(items)
    items = sort_by_hotness(items)
    
    today = get_today_date()
    
    data = {
        "date": today,
        "generated_at": datetime.datetime.now().isoformat(),
        "total_count": len(items),
        "categories": get_categories(items),
        "items": items
    }
    
    # 确保目录存在
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"数据已保存到 {output_path}, 共 {len(items)} 条记录")

def get_categories(items: List[Dict[str, Any]]) -> List[str]:
    """从所有item中提取所有分类，去重返回"""
    categories = set()
    for item in items:
        cat = item.get('category', '其他')
        if isinstance(cat, list):
            for c in cat:
                categories.add(c)
        else:
            categories.add(cat)
    return sorted(list(categories))

def fetch_with_retry(url: str, max_retries: int = 3, timeout: int = 10) -> str:
    """带重试的GET请求"""
    import requests
    
    for i in range(max_retries):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=timeout)
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f"请求失败 (尝试 {i+1}/{max_retries}): {e}")
            if i == max_retries - 1:
                raise
    
    return ""
