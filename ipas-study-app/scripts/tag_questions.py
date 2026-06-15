# -*- coding: utf-8 -*-
"""Assign topic tags to every question for the weakness analysis (Phase 2).

Each subject has a small set of topic tags; we score each question by counting
keyword hits per tag over its stem + options, then assign the best-scoring tag
(plus a strong secondary if it also clearly matches). Questions with no hit get
a generic「綜合應用」tag so nothing is left untagged.

Run:  PYTHONUTF8=1 python scripts/tag_questions.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GENERIC = "綜合應用"

# subject -> {tag: [keywords]}
TAGS = {
    "ai-basics": {
        "AI概念與治理": ["治理", "法規", "基本法", "AI Act", "風險等級", "監督", "負責任", "倫理", "偏見", "歧視", "人在迴圈", "Human-over", "透明", "個資", "隱私", "問責", "監理", "金管會", "可解釋", "XAI", "LIME", "反事實"],
        "資料處理與統計": ["ETL", "特徵交叉", "特徵工程", "編碼", "One-hot", "標準化", "正規化", "統計", "平均", "中位數", "眾數", "標準差", "偏態", "離群", "異常值", "分箱", "EDA", "探索性", "視覺化", "直方圖", "散佈圖", "資料型態", "結構化", "冗餘", "缺失"],
        "機器學習": ["監督式", "非監督", "強化", "迴歸", "分類", "分群", "叢集", "KNN", "近鄰", "決策樹", "隨機森林", "貝氏", "Naive", "過擬合", "交叉驗證", "損失函數", "梯度", "正則化", "偏差與變異", "Lasso", "L1", "L2", "聚類", "K-means"],
        "深度學習與神經網路": ["神經網路", "CNN", "卷積", "RNN", "循環", "LSTM", "深度學習", "啟動函數", "ReLU", "剪枝", "災難性遺忘", "微調", "Q-Learning"],
        "生成式與鑑別式AI": ["生成式", "GAN", "對抗", "VAE", "變分", "擴散", "Transformer", "注意力", "語言模型", "RAG", "提示", "幻覺", "鑑別式", "自迴歸", "詞嵌入", "批次推論", "參數量"],
    },
    "genai": {
        "No Code/Low Code": ["No Code", "Low Code", "NoCode", "LowCode", "平台", "模板", "視覺化", "拖放", "拖曳", "Shadow IT", "民主化"],
        "生成式AI技術": ["生成式", "GAN", "對抗", "擴散", "Diffusion", "DALL", "Transformer", "VAE", "多模態", "圖像生成", "推理模型", "語言建模", "續寫", "圖像描述"],
        "提示工程": ["提示", "Prompt", "CoT", "思維鏈", "Chain-of", "Few-Shot", "少樣本", "零樣本", "Zero-Shot", "Graph Prompting", "APE", "上下文工程", "溫度", "Temperature"],
        "導入規劃與流程": ["導入", "規劃", "KPI", "績效指標", "流程", "POC", "概念驗證", "MLOps", "部署", "供應商", "效益", "順序", "排序", "階段", "客服", "報告"],
        "安全隱私與合規": ["隱私", "個資", "個人資料", "合規", "法遵", "安全", "資安", "風險", "治理", "浮水印", "攻擊", "注入", "Injection", "Guardrail", "防護", "聯邦學習", "去識別", "零信任", "偏差", "公平", "權限"],
        "AI代理與工具": ["Agent", "代理", "MCP", "A2A", "工具", "API", "Copilot", "多代理", "知識蒸餾", "Benchmark", "MMLU", "TTQA", "檢索", "Chunk", "向量", "蒸餾"],
    },
    "ai-tech": {
        "自然語言處理": ["NLP", "自然語言", "斷詞", "Tokeniz", "TF-IDF", "N-gram", "Word2Vec", "GloVe", "BERT", "詞嵌入", "詞向量", "情感", "Sentiment", "MLM", "遮罩", "Seq2Seq", "翻譯", "摘要", "RAG", "Attention", "注意力", "多頭", "Word Embedding"],
        "電腦視覺": ["影像", "物件偵測", "Object Detection", "分割", "Segmentation", "IoU", "mAP", "CNN", "卷積", "視覺", "Softmax", "Pooling", "邊界框", "全景"],
        "生成式與多模態": ["生成式", "GAN", "對抗", "模式崩潰", "VAE", "擴散", "Diffusion", "多模態", "CLIP", "Stable Diffusion", "潛在空間", "跨模態", "融合", "模態"],
        "模型部署與MLOps": ["部署", "Kubernetes", "MLOps", "持續整合", "CI", "容器", "水平擴展", "Auto Scaling", "監控", "漂移", "Drift", "Registry", "推論", "RPS", "可用性", "PSI", "不可否認", "雜湊"],
        "模型訓練與調校": ["超參數", "交叉驗證", "正則化", "過擬合", "學習率", "批次", "Batch", "梯度", "網格搜尋", "Grid Search", "資料增強", "標準化", "PCA", "降維", "ARIMA", "資料洩漏", "多重共線性", "LASSO", "F1", "Precision", "Recall"],
        "AI安全與治理": ["攻擊", "對抗", "供應鏈", "著作權", "侵權", "隱私", "防火牆", "漸進式部署", "Phased", "偏誤", "倫理"],
    },
    "big-data": {
        "統計與機率": ["Z 分數", "Z分數", "Z-Score", "Z-score", "常態", "卜瓦松", "Poisson", "二項", "指數分佈", "均勻分佈", "分佈", "假設檢定", "t 檢定", "t檢定", "F 檢定", "F檢定", "卡方", "信賴區間", "顯著", "p 值", "CDF", "PDF", "偏態", "相關係數", "Pearson", "皮爾森", "ROC", "AUC", "Z =", "期望值", "變異數", "吉尼"],
        "資料前處理與特徵工程": ["特徵工程", "特徵衍生", "特徵選擇", "特徵學習", "編碼", "Encoding", "標準化", "正規化", "縮放", "Scaling", "離群", "異常值", "IQR", "分箱", "Binning", "缺失", "不平衡", "過採樣", "SMOTE", "降維", "PCA", "主成分", "Box", "ACID", "正規化吉尼"],
        "Python與視覺化": ["pandas", "df", "describe", "groupby", "seaborn", "sns", "matplotlib", "長條圖", "箱型圖", "熱力圖", "Heatmap", "視覺化", "程式碼", "astype", "DataFrame", "CIFAR", "Tufte", "數據密度", "圖表", "melt"],
        "大數據平台與處理": ["串流", "即時", "Stream", "異常偵測", "Anomaly", "大數據", "分散式", "物聯網", "IoT", "資料湖", "資料倉儲", "MapReduce", "圖論", "圖形資料庫", "知識圖譜", "RDF", "邊緣運算", "近似分位數", "混合精度", "DBSCAN", "關聯規則", "Lift"],
        "資料隱私與治理": ["同態加密", "Homomorphic", "差分隱私", "Differential", "去識別", "匿名", "隱私", "透明", "倫理", "GDPR", "合規"],
    },
    "ml-tech": {
        "機器學習數學基礎": ["機率", "統計", "線性代數", "矩陣", "向量", "內積", "數值優化", "梯度下降", "非凸", "凸函數", "局部最優", "期望值", "變異數", "前向傳播", "蒙地卡羅", "Monte Carlo", "MapReduce"],
        "機器學習演算法": ["迴歸", "分類", "分群", "聚類", "正則化", "Lasso", "Ridge", "L1", "L2", "交叉驗證", "過擬合", "欠擬合", "決策樹", "隨機森林", "XGBoost", "梯度提升", "KNN", "SVM", "DBSCAN", "雜訊點", "集成", "資訊增益", "貝氏", "重抽樣", "不平衡"],
        "深度學習": ["神經網路", "CNN", "卷積", "RNN", "LSTM", "深度學習", "激活", "啟動函數", "ReLU", "Sigmoid", "Softmax", "VGG", "Inception", "ResNet", "注意力", "優化器", "Adam", "Adagrad", "Momentum", "前向傳播", "Dropout", "感受野"],
        "建模流程與評估": ["特徵", "評估", "準確率", "Accuracy", "精確率", "Precision", "召回率", "Recall", "F1", "AUC", "ROC", "R²", "超參數", "調校", "Grid", "PCA", "降維", "損失函數", "早停", "Early Stopping", "標準化", "縮放", "時間序列交叉", "資料漂移"],
        "機器學習治理與安全": ["隱私", "同態加密", "差分隱私", "偏見", "公平", "GDPR", "被遺忘權", "合規", "安全", "對抗", "標籤偏差", "可解釋", "倫理", "標註品質"],
    },
}

LEVEL = {"ai-basics": "beginner", "genai": "beginner",
         "ai-tech": "intermediate", "big-data": "intermediate", "ml-tech": "intermediate"}


def assign_tags(q, tagmap):
    blob = q["stem"] + " " + " ".join(o["text"] for o in q["options"])
    scores = {tag: sum(blob.count(kw) for kw in kws) for tag, kws in tagmap.items()}
    scores = {t: s for t, s in scores.items() if s > 0}
    if not scores:
        return [GENERIC]
    best = max(scores.values())
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    tags = [ranked[0][0]]
    # add a clear secondary topic (>=2 hits and at least half the best score)
    for tag, s in ranked[1:]:
        if s >= 2 and s >= best / 2:
            tags.append(tag)
            break
    return tags


def main():
    print("subject     | tagged | generic | distribution")
    for subject, tagmap in TAGS.items():
        path = ROOT / "src" / "data" / LEVEL[subject] / subject / "questions.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        dist = {}
        generic = 0
        for q in data:
            q["tags"] = assign_tags(q, tagmap)
            if q["tags"] == [GENERIC]:
                generic += 1
            for t in q["tags"]:
                dist[t] = dist.get(t, 0) + 1
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        d = ", ".join(f"{t}:{n}" for t, n in sorted(dist.items(), key=lambda kv: -kv[1]))
        print(f"{subject:11s} | {len(data) - generic:6d} | {generic:7d} | {d}")


if __name__ == "__main__":
    main()
