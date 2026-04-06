#!/usr/bin/env python3
"""
Bilibili AI教程爬虫
爬取B站最热的AI相关短视频，用于AI学习板块
"""

import requests
import json
from typing import List, Dict, Any
from datetime import datetime
from crawler.base import BaseCrawler


class BilibiliAICrawler(BaseCrawler):
    """B站AI教程爬虫"""
    
    @property
    def name(self) -> str:
        return "Bilibili AI学习"
    
    # 预定义搜索关键词和分类
    SEARCH_KEYWORDS = [
        # 分类: 入门教程
        ("AI入门", "入门", "AI教程"),
        ("人工智能入门", "入门", "人工智能"),
        ("大模型入门", "入门", "大模型"),
        ("AI基础", "入门", "AI基础"),
        
        # 分类: 提示词工程
        ("提示词工程", "提示词", "提示词工程"),
        ("prompt工程", "提示词", "Prompt"),
        ("提示词技巧", "提示词", "提示词"),
        ("ChatGPT提示词", "提示词", "ChatGPT"),
        
        # 分类: 模型部署
        ("大模型部署", "部署", "大模型部署"),
        ("本地部署大模型", "部署", "本地部署"),
        ("ollama 部署", "部署", "ollama"),
        ("LLM部署", "部署", "LLM部署"),
        
        # 分类: 微调
        ("大模型微调", "微调", "微调"),
        ("LoRA微调", "微调", "LoRA"),
        ("QLoRA", "微调", "QLoRA"),
        ("参数高效微调", "微调", "微调"),
        
        # 分类: RAG
        ("RAG", "RAG", "RAG"),
        ("检索增强生成", "RAG", "检索增强"),
        ("RAG实战", "RAG", "RAG教程"),
        
        # 分类: Agent
        ("AI Agent", "Agent", "Agent"),
        ("智能体", "Agent", "智能体"),
        ("LangChain Agent", "Agent", "LangChain"),
        ("AutoGPT", "Agent", "AutoGPT"),
        
        # 分类: 应用开发
        ("AI应用开发", "开发", "AI开发"),
        ("LangChain 教程", "开发", "LangChain"),
        ("AI编程", "开发", "AI编程"),
        ("大模型应用", "开发", "大模型应用"),
        
        # 分类: 具体模型
        ("Llama 3 教程", "模型教程", "Llama"),
        ("Qwen 教程", "模型教程", "通义千问"),
        ("DeepSeek 教程", "模型教程", "DeepSeek"),
        ("Gemini 教程", "模型教程", "Gemini"),
        ("Stable Diffusion 教程", "绘图", "SD教程"),
        ("Midjourney 教程", "绘图", "Midjourney"),
    ]
    
    CATEGORY_MAP = {
        "入门": "入门教程",
        "提示词": "提示词工程",
        "部署": "模型部署",
        "微调": "模型微调",
        "RAG": "RAG",
        "Agent": "AI Agent",
        "开发": "应用开发",
        "模型教程": "模型教程",
        "绘图": "AI绘图",
    }
    
    def fetch(self) -> List[Dict[str, Any]]:
        """抓取B站AI视频"""
        print(f"开始抓取B站AI视频，共 {len(self.SEARCH_KEYWORDS)} 个关键词...")
        
        all_videos = []
        seen_bvids = set()
        
        for keyword, category, _ in self.SEARCH_KEYWORDS:
            try:
                videos = self.fetch_by_keyword(keyword, category)
                for video in videos:
                    if video['bvid'] not in seen_bvids:
                        seen_bvids.add(video['bvid'])
                        all_videos.append(video)
                print(f"  关键词 '{keyword}' 抓取到 {len(videos)} 个视频，累计 {len(all_videos)} 个")
            except Exception as e:
                print(f"  关键词 '{keyword}' 抓取失败: {e}")
                continue
        
        # 按热度排序
        all_videos.sort(key=lambda x: x['hot_score'], reverse=True)
        
        # 只保留热度最高的 50 个
        all_videos = all_videos[:50]
        
        print(f"B站抓取完成，共 {len(all_videos)} 个去重后的视频")
        return all_videos
    
    def fetch_by_keyword(self, keyword: str, category: str) -> List[Dict[str, Any]]:
        """按关键词搜索视频"""
        # 使用B站搜索API
        url = "https://api.bilibili.com/x/web-interface/search/type"
        
        params = {
            "keyword": keyword,
            "order": "click",  # 按点击最多排序
            "duration": 1,  # 时长筛选 1-10分钟
            "page": 1,
            "search_type": "video",
        }
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.bilibili.com/',
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data['code'] != 0:
            raise Exception(f"API错误: {data.get('message', '未知错误')}")
        
        result = data.get('data', {})
        videos = result.get('result', [])
        
        processed_videos = []
        
        for video in videos:
            # 过滤条件
            duration = video.get('duration', 0)
            if isinstance(duration, str):
                # 格式 "MM:SS"
                if ':' in duration:
                    parts = duration.split(':')
                    if len(parts) == 2:
                        duration = int(parts[0]) * 60 + int(parts[1])
                    else:
                        duration = 0
            
            # 时长过滤: 1分钟 ≤ 时长 ≤ 30分钟
            if duration < 60 or duration > 30 * 60:
                continue
            
            play_num = video.get('play', 0)
            if isinstance(play_num, str):
                play_num = int(play_num) if play_num.isdigit() else 0
            
            # 播放量过滤: 至少1000播放
            if play_num < 1000:
                continue
            
            bvid = video.get('bvid', '')
            if not bvid:
                continue
            
            # 计算综合热度评分
            # 公式: 播放量 + 点赞*10 + 投币*20 + 收藏*15
            like_num = video.get('like', 0)
            coin_num = video.get('coin', 0)
            favorite_num = video.get('favorite', 0)
            hot_score = play_num + like_num * 10 + coin_num * 20 + favorite_num * 15
            
            display_category = self.CATEGORY_MAP.get(category, category)
            
            processed = {
                'id': bvid,
                'bvid': bvid,
                'title': video.get('title', ''),
                'description': video.get('description', ''),
                'cover_url': video.get('pic', ''),
                'up_name': video.get('author', ''),
                'duration': duration,
                'play_num': play_num,
                'like_num': like_num,
                'coin_num': coin_num,
                'favorite_num': favorite_num,
                'tags': [keyword, category],
                'category': display_category,
                'hot_score': hot_score,
                'url': f"https://www.bilibili.com/video/{bvid}",
                'created_at': datetime.now().isoformat(),
            }
            
            processed_videos.append(processed)
        
        return processed_videos
    
    def get_categories(self) -> List[str]:
        """获取所有分类"""
        return sorted(list(set(self.CATEGORY_MAP.values())))
