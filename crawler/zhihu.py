"""
知乎AI板块热门爬虫
通过热榜筛选AI相关内容
"""

import json
from typing import List, Dict, Any

from .base import BaseCrawler
from .utils import fetch_with_retry

class ZhihuHotCrawler(BaseCrawler):
    """知乎热榜AI相关内容爬虫"""
    
    @property
    def name(self) -> str:
        return 'zhihu_hot'
    
    def fetch(self) -> List[Dict[str, Any]]:
        # 使用知乎热榜API
        url = 'https://www.zhihu.com/api/v3/feed/topstory/hot-list-api?limit=50&action=down&session_token='
        html = fetch_with_retry(url)
        try:
            data = json.loads(html)
        except Exception as e:
            print(f"解析知乎热榜失败: {e}")
            return []
        
        items = []
        ai_keywords = ['ai', '人工智能', '大模型', 'llm', 'gpt', 'chatgpt', '机器学习', 
                      '深度学习', '神经网络', 'openai', '微软', '谷歌', 'stable diffusion']
        
        hot_list = data.get('data', [])
        
        for hot_item in hot_list:
            try:
                target = hot_item.get('target', {})
                title = target.get('title', '').strip()
                if not title:
                    continue
                
                # 判断是否AI相关
                text = (title + (target.get('excerpt', '') or '')).lower()
                if not any(k in text for k in ai_keywords):
                    continue
                
                url = f"https://www.zhihu.com/question/{target.get('id')}"
                excerpt = target.get('excerpt', '').strip()
                metrics = hot_item.get('detail_text', '0')
                hot_score = self._parse_metrics(metrics)
                
                item = {
                    'title': title,
                    'url': url,
                    'description': excerpt,
                    'likes': hot_score,
                    'comments': target.get('comment_count', 0),
                    'source': '知乎热榜',
                    'category': self._classify(text),
                    'created_at': None,
                    'author': ''
                }
                
                items.append(item)
                
            except Exception as e:
                print(f"解析知乎热榜项出错: {e}")
                continue
        
        print(f"知乎热榜抓取完成，获得 {len(items)} 条AI相关内容")
        return items
    
    def _parse_metrics(self, text: str) -> int:
        """解析热度值，例如 '1.2万热度' → 12000"""
        text = text.replace('热度', '').replace(',', '').strip()
        if '万' in text:
            return int(float(text.replace('万', '')) * 10000)
        try:
            return int(text)
        except:
            return 0
    
    def _classify(self, text: str) -> str:
        """简单分类"""
        if any(w in text for w in ['大模型', 'llm', 'gpt', 'chatgpt']):
            return '大语言模型'
        if any(w in text for w in ['谷歌', 'openai', '微软', '字节']):
            return '行业动态'
        if any(w in text for w in ['stable diffusion', '画图', '图像', '生成']):
            return '生成式AI'
        return 'AI讨论'
