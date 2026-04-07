#!/usr/bin/env python3
"""
掘金AI板块爬虫
抓取掘金上热门的AI相关技术文章，补充中文数据源
"""

import requests
import json
from typing import List, Dict, Any
from datetime import datetime
from crawler.base import BaseCrawler


class JuejinCrawler(BaseCrawler):
    """掘金AI文章爬虫"""
    
    @property
    def name(self) -> str:
        return "掘金"
    
    # AI相关分类标签ID
    AI_TAGS = [
        "6809690048780316685",  # 人工智能
        "6809690048849834004",  # 机器学习
        "6809690048783083533",  # 深度学习
        "6809690048813051935",  # 计算机视觉
        "6809690048796563493",  # 自然语言处理
        "6901191930539524100",  # LLM
        "6883320439413669902",  # ChatGPT
        "7031825657790523422",  # AIGC
        "6874696315100719118",  # 大语言模型
        "6999483361450048526",  # Stable Diffusion
        "6920485003993439246",  # Midjourney
        "7126981748389159973",  # GPT
        "7102474046590286883",  # LangChain
        "7165611925642006047",  # Llama
        "7195557394393383460",  # 大模型
        "7219635680352913957",  # AI生成
        "7323112346763476003",  # Llama 3
    ]
    
    CATEGORY_MAP = {
        "6809690048780316685": "人工智能",
        "6809690048849834004": "机器学习",
        "6809690048783083533": "深度学习",
        "7102474046590286883": "LangChain",
        "6883320439413669902": "ChatGPT",
        "7165611925642006047": "大语言模型",
        "6999483361450048526": "AI绘图",
        "6920485003993439246": "AI绘图",
    }
    
    def fetch(self) -> List[Dict[str, Any]]:
        """抓取掘金热门AI文章"""
        print("开始抓取掘金AI热门文章...")
        
        all_articles = []
        
        for tag_id in self.AI_TAGS:
            try:
                articles = self.fetch_by_tag(tag_id)
                all_articles.extend(articles)
                print(f"  标签 {tag_id} 抓取到 {len(articles)} 篇文章，累计 {len(all_articles)} 篇")
            except Exception as e:
                print(f"  标签 {tag_id} 抓取失败: {e}")
                continue
        
        # 去重（按URL）
        seen_urls = set()
        unique_articles = []
        for article in all_articles:
            if article['url'] not in seen_urls:
                seen_urls.add(article['url'])
                unique_articles.append(article)
        
        # 按热度排序
        unique_articles.sort(key=lambda x: x['hot_score'], reverse=True)
        
        # 只保留热度最高的 30 篇
        unique_articles = unique_articles[:30]
        
        print(f"掘金抓取完成，共 {len(unique_articles)} 篇去重后的文章")
        return unique_articles
    
    def fetch_by_tag(self, tag_id: str) -> List[Dict[str, Any]]:
        """按标签抓取文章"""
        url = "https://api.juejin.cn/recommend_api/v1/article/recommend_tag_feed"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'Origin': 'https://juejin.cn',
            'Referer': 'https://juejin.cn/',
        }
        
        data = {
            "id_type": 2,
            "tag_id": tag_id,
            "limit": 20,
            "cursor": "0",
            "sort_type": 3,  # 3代表按热度排序
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=10)
        response.raise_for_status()
        result = response.json()
        
        articles_data = result.get('data', [])
        processed_articles = []
        
        for item in articles_data:
            article_info = item.get('article_info', {})
            
            article_id = article_info.get('article_id', '')
            if not article_id:
                continue
            
            title = article_info.get('title', '')
            description = article_info.get('brief_content', '')
            author = item.get('author_user_info', {}).get('user_name', '')
            ctime = article_info.get('ctime', 0)
            created_at = datetime.fromtimestamp(ctime).isoformat()
            
            # 热度计算: 点赞 + 收藏*2 + 评论*3
            like_count = article_info.get('digg_count', 0)
            collect_count = article_info.get('collect_count', 0)
            comment_count = article_info.get('comment_count', 0)
            hot_score = like_count + collect_count * 2 + comment_count * 3
            
            # 中文内容加权（乘以1.2，让中文内容排在更前面）
            hot_score = hot_score * 1.2
            
            # 确定分类
            category = self.CATEGORY_MAP.get(tag_id, "AI")
            
            article_url = f"https://juejin.cn/post/{article_id}"
            
            # 获取封面图
            cover_image = article_info.get('cover_image', '')
            if cover_image and not cover_image.startswith('http'):
                cover_image = f"https://p3-juejin.byteimg.com/{cover_image}"
            
            processed = {
                'item_id': article_id,
                'title': title,
                'url': article_url,
                'description': description,
                'summary_cn': f"这是掘金上一篇热门AI技术文章：{description}",
                'author': author,
                'source': '掘金',
                'category': category,
                'likes': like_count,
                'comments': comment_count,
                'image_url': cover_image,
                'hot_score': hot_score,
                'created_at': created_at,
                'tags': ['中文', '掘金', category.lower()],
                'is_chinese': True,
            }
            
            processed_articles.append(processed)
        
        return processed_articles
