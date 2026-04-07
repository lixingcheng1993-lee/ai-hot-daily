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
    @property
    def name(self) -> str:
        return 'github_trending'
    
    # 中文描述模板
    DESCRIPTION_TEMPLATES = {
        '大语言模型': '这是一个GitHub上热门的大语言模型开源项目，目前获得 {stars} 星标。{desc}',
        'AI工具': '这是一个实用的AI开发工具开源项目，帮助开发者更便捷地构建AI应用，目前有 {stars} 星标。{desc}',
        '生成式AI': '这是一个生成式AI相关开源项目，当前在GitHub上获得 {stars} 星标。{desc}',
        '深度学习': '这是一个深度学习框架或研究项目，获得 {stars} 开发者星标。{desc}',
        '数据集': '这是一个开源AI数据集，供研究者训练模型使用，目前在GitHub上有 {stars} 星标。{desc}',
    }
    
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
                           'transformer', 'diffusion', 'chatbot', 'agi', 'generative', 'kimi', 'deepseek', 'qwen', 'gemma', 'ollama']
                text_to_check = (full_name + description).lower()
                is_ai = any(k.lower() in text_to_check for k in keywords)
                if not is_ai:
                    continue
                
                category = self._classify(full_name + description)
                
                # 生成中文总结
                template = self.DESCRIPTION_TEMPLATES.get(category, self.DESCRIPTION_TEMPLATES['AI工具'])
                summary_cn = template.format(stars=stars, desc=description)
                
                # 提取标签
                tags = []
                if language:
                    tags.append(language.lower())
                tags.append(category.lower())
                
                item = {
                    'title': full_name,
                    'url': repo_url,
                    'description': description,
                    'summary_cn': summary_cn,
                    'likes': stars,
                    'forks': forks,
                    'language': language,
                    'source': 'GitHub Trending',
                    'category': category,
                    'created_at': None,
                    'author': full_name.split('/')[0],
                    'tags': tags
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
        if any(w in text for w in ['llm', 'large-language', 'gpt', 'chat', 'llama', 'qwen', 'gemma', 'kimi', 'deepseek', 'ollama']):
            return '大语言模型'
        if any(w in text for w in ['diffusion', 'stable-diffusion', 'image', 'generative', 'midjourney', 'sdxl']):
            return '生成式AI'
        if any(w in text for w in ['deep-learning', 'neural', 'transformer', 'pytorch', 'tensorflow']):
            return '深度学习'
        if any(w in text for w in ['dataset', 'data', 'benchmark']):
            return '数据集'
        if any(w in text for w in ['agent', 'autogpt', 'langchain']):
            return 'AI Agent'
        return 'AI工具'
