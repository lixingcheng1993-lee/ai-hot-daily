"""
GitHub Trending 爬虫
抓取AI相关的热门仓库
"""

import re
from typing import List, Dict, Any
from bs4 import BeautifulSoup

from .base import BaseCrawler
from .utils import fetch_with_retry

class GitHubTrendingCrawler(BaseCrawler):
    """GitHub Trending 热门仓库爬虫"""
    
    @property
    def name(self) -> str:
        return 'github_trending'
    
    def fetch(self) -> List[Dict[str, Any]]:
        url = 'https://github.com/trending?since=daily'
        html = fetch_with_retry(url)
        soup = BeautifulSoup(html, 'lxml')
        
        items = []
        articles = soup.select('article.Box-row')
        
        for article in articles[:20]:  # 只取前20个
            try:
                # 提取仓库名
                h2 = article.select_one('h2 a')
                if not h2:
                    continue
                    
                full_name = h2.get_text(strip=True).replace(' ', '').replace('\n', '')
                repo_url = 'https://github.com/' + full_name
                
                # 描述
                desc_elem = article.select_one('p')
                description = desc_elem.get_text(strip=True) if desc_elem else ''
                
                # 星标数
                stars_elem = article.select_one('a[href$="/stargazers"]')
                stars = self._parse_number(stars_elem.get_text(strip=True)) if stars_elem else 0
                
                # forks
                forks_elem = article.select_one('a[href$="/forks"]')
                forks = self._parse_number(forks_elem.get_text(strip=True)) if forks_elem else 0
                
                # 语言
                lang_elem = article.select_one('span[itemprop="programmingLanguage"]')
                language = lang_elem.get_text(strip=True) if lang_elem else ''
                
                # 判断是否是AI相关项目
                keywords = ['ai', 'machine-learning', 'deep-learning', 'llm', 'gpt', 'model', 'neural', 
                           'transformer', 'diffusion', 'chatbot', 'agi', 'generative']
                is_ai = any(k.lower() in (full_name + description).lower() for k in keywords)
                if not is_ai:
                    continue
                
                item = {
                    'title': full_name,
                    'url': repo_url,
                    'description': description,
                    'likes': stars,
                    'forks': forks,
                    'language': language,
                    'source': 'GitHub Trending',
                    'category': self._classify(full_name + description),
                    'created_at': None,  # GitHub Trending 不提供今日创建时间
                    'author': full_name.split('/')[0]
                }
                
                items.append(item)
                
            except Exception as e:
                print(f"解析GitHub项目出错: {e}")
                continue
        
        print(f"GitHub Trending 抓取完成，获得 {len(items)} 个AI相关项目")
        return items
    
    def _parse_number(self, text: str) -> int:
        """解析数字，比如 '1.2k' → 1200"""
        text = text.strip().lower()
        if 'k' in text:
            return int(float(text.replace('k', '')) * 1000)
        if 'm' in text:
            return int(float(text.replace('m', '')) * 1000000)
        try:
            return int(text.replace(',', ''))
        except:
            return 0
    
    def _classify(self, text: str) -> str:
        """简单分类"""
        text = text.lower()
        if any(w in text for w in ['llm', 'large-language', 'gpt', 'chat', 'llama']):
            return '大语言模型'
        if any(w in text for w in ['diffusion', 'stable-diffusion', 'image', 'generative']):
            return '生成式AI'
        if any(w in text for w in ['deep-learning', 'neural', 'transformer']):
            return '深度学习'
        if any(w in text for w in ['dataset', 'data']):
            return '数据集'
        return 'AI工具'
