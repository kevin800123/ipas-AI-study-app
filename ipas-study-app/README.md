# iPAS AI 應用規劃師 備考 App

一款離線可用的 **iPAS「AI 應用規劃師」備考 PWA**，整合官方歷屆／樣題題庫、逐題詳解、學習指引全文、模擬考與弱點分析，協助初級與中級考生有系統地準備。

🔗 **線上版（GitHub Pages）**：https://kevin800123.github.io/ipas-study-app-design/

> 純前端、資料內建，可加入主畫面離線使用。所有學習內容為備考整理參考，**實際考試規格與範圍以 [iPAS 官方](https://ipd.nat.gov.tw/ipas/certification/AIAP) 最新簡章為準**。

## 功能

- 📚 **題庫（5 科，共 349 題）**：初級 2 科、中級 3 科，收錄官方公告試題與 114.09 樣題。
- 💡 **逐題詳解 100%**：每題說明為何正解、關鍵錯誤選項為何錯；計算題（F1、Z 分數、Gini、PCA 變異量…）附算式。
- 📖 **學習指引全文**：由官方學習指引 PDF 抽取，分章分節閱讀；寬螢幕左側固定目錄欄（兩層、捲動高亮），長章節分節切換不必一直滑。
- 📝 **練習 / 模擬考**：練習模式即時顯示正解與詳解；模擬考可**選題數**並依正式考試節奏**倒數計時、時間到自動交卷**。
- ❌ **錯題本**：自動收錄答錯題、可移除、可匯出／匯入進度（JSON）。
- 🎯 **弱點章節分析**：依主題標籤統計錯題分佈，找出最弱章節並一鍵針對練習。
- 🧭 **備考攻略**：整體讀書策略、高頻考點、答題技巧、初／中級比較。
- 📊 **學習儀表板**：首頁顯示連續學習天數、累計做題、平均正確率、測驗次數。
- 🎨 **體驗**：App 版／網頁版一鍵切換、深色模式、字級可調、PWA 離線。

## 技術

React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router 7 · Vitest · vite-plugin-pwa

## 開發

```bash
npm install
npm run dev        # 本機開發
npm run test       # 單元測試（Vitest）
npm run build      # 型別檢查 + production build
npm run preview    # 預覽 build 結果
```

## 資料與抽取腳本

題庫與學習指引皆由官方 PDF 以 Python 腳本抽取（需 `PYTHONUTF8=1`，依賴 PyMuPDF / pdfplumber）：

- `scripts/extract_intermediate.py`：中級官方試題與樣題 → `src/data/intermediate/*/questions.json`
- `scripts/extract_studyguide.py`：初級／中級學習指引全文 → 各科 `summaries.json`（自動分段、章節標題分階層）
- `scripts/tag_questions.py`：依關鍵字為題目標主題 `tags`（弱點分析用）

詳解放在各科 `explanations.json`（id → 文字），於 `src/data/subjects.ts` 載入時合併，不更動龐大的 `questions.json`。

## 部署

推送到 `main` 會由 GitHub Actions（`.github/workflows/deploy.yml`）自動建置並部署到 GitHub Pages。
