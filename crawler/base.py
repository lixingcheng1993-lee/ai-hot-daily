"""
爬虫基类
定义所有数据源爬虫需要实现的接口
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseCrawler(ABC):
    """爬虫基类"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """爬虫名称，用于日志和标识"""
        pass
    
    @abstractmethod
    def fetch(self) -> List[Dict[str, Any]]:
        """
        抓取数据，返回item列表
        每个item必须包含:
        - title: 标题
        - url: 链接
        - source: 来源
        推荐包含:
        - description: 描述摘要
        - likes: 点赞/星标数
        - comments: 评论数
        - created_at: 创建时间 (ISO格式)
        - category: 分类
        - author: 作者
        - hot_score: 热度分数 (留空由统一计算)
        """
        pass
