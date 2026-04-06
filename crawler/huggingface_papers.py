"""
Hugging Face Papers 每日热门论文爬虫
"""

import json
from typing import List, Dict, Any

from .base import BaseCrawler
from .utils import fetch_with_retry

class HuggingFacePapersCrawler(BaseCrawler):
    """Hugging Face Papers 热门论文爬虫"""
    
    @property
    def name(self) -> str:
        return 'huggingface_papers'
    
    def fetch(self) -> List[Dict[str, Any]]:
        # Hugging Face Papers API 端点
        url = 'https://huggingface.co/api/daily_papers'
        # 参数：获取最近一天的论文
        html = fetch_with_retry(url)
        try:
            data = json.loads(html)
        except Exception as e:
            print(f"解析HuggingFace数据失败: {e}")
            return []
        
        items = []
        
        for paper in data[:30]:  # 取前30篇
            try:
                paper_data = paper.get('paper', {})
                if not paper_data:
                    continue
                
                title = paper_data.get('title', '').strip()
                if not title:
                    continue
                
                authors = [a.get('name', '') for a in paper_data.get('authors', [])]
                author_str = ', '.join(authors) if authors else ''
                
                paper_id = paper_data.get('id', '')
                url = f'https://huggingface.co/papers/{paper_id}'
                
                # 点赞数
                likes = paper.get('numLikes', 0)
                comments = paper.get('numComments', 0)
                
                # 发布时间
                published_at = paper_data.get('publishedAt', '')
                created_at = published_at if published_at else None
                
                # 摘要
                summary = paper_data.get('summary', '').strip()
                
                # 分类
                categories = paper_data.get('categories', [])
                category = categories[0] if categories else '论文'
                
                item = {
                    'title': title,
                    'url': url,
                    'description': summary,
                    'likes': likes,
                    'comments': comments,
                    'source': 'HuggingFace Papers',
                    'category': self._map_category(category),
                    'created_at': created_at,
                    'author': author_str
                }
                
                items.append(item)
                
            except Exception as e:
                print(f"解析HuggingFace论文出错: {e}")
                continue
        
        print(f"HuggingFace Papers 抓取完成，获得 {len(items)} 篇论文")
        return items
    
    def _map_category(self, category: str) -> str:
        """映射arXiv分类到中文分类"""
        category_map = {
            'cs.CV': '计算机视觉',
            'cs.LG': '机器学习',
            'cs.CL': '自然语言处理',
            'cs.AI': '人工智能',
            'cs.NE': '神经网络',
            'cs.IR': '信息检索',
            'stat.ML': '机器学习',
            'eess.SP': '信号处理',
        }
        return category_map.get(category, '论文')
