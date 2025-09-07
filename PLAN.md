# 專案執行計畫：最終 Bug 修復與穩定性優化

### **階段一：分析與規劃**

**1. 任務理解 (My Understanding):**

*   **核心目標:** 進行兩項關鍵的 Bug 修復，以提升遊戲的穩定性和可用性。
    1.  **修復「拼圖放置」Bug:** 解決因頁面滾動導致的座標計算錯誤。當使用者滾動頁面時，跟隨滑鼠的拼圖塊位置會出錯，導致無法放置在拼圖板邊緣。新的解決方案將使用更可靠的頁面座標系統 (`pageX`/`pageY`)。
    2.  **修復「尺寸調整」Bug:** 解決動態調整拼圖板大小時可能出現的尺寸計算不穩定的問題。新的解決方案將直接設定拼圖板元素的寬度，而不是其父容器。

**2. 預計影響範圍 (Anticipated Impact):**

*   `PLAN.md`: 將會**更新**此檔案，以反映本次的執行計畫。
*   `index.html`: **無修改**。
*   `style.css`: 將有**小幅修改**。
    *   移除 `#puzzle-section` 的 `width` 屬性，讓其自適應內容。
*   `script.js`: 將有**中等程度修改**。
    *   `setBoardSize` 函式將被修改，改為直接設定 `#puzzle-board` 的寬度。
    *   `moveHeldPiece` 函式將被修改，使用 `touch.pageX` 和 `touch.pageY` 來設定拼圖塊的位置。
*   `README.md`: **無修改**。

**3. 潛在風險與副作用 (Potential Risks & Side Effects):**

*   **座標系統:** 從 `clientX/Y` 切換到 `pageX/Y` 需要仔細測試，確保所有計算（如在板內的懸停檢測）仍然準確無誤。`position: absolute` 配合 `pageX/Y` 是正確的組合，可以避免滾動問題。
*   **CSS 佈局:** 直接設定子元素 (`#puzzle-board`) 的寬度可能會影響父層 Flexbox 的佈局，需要確保整體結構不會因此混亂。

**4. 規範遵循聲明 (Adherence Statement):**

*   我將繼續遵循通用的開發規範，所有修改都將保持程式碼的清晰和可讀性。

**5. 逐步執行計畫 (Step-by-Step Execution Plan):**

1.  **【第 1 步】修改 CSS 佈局:**
    *   在 `style.css` 中，移除 `#puzzle-section` 的 `width` 樣式，並讓 `#puzzle-board` 來控制寬度。
2.  **【第 2 步】修改尺寸調整邏輯:**
    *   在 `script.js` 的 `setBoardSize` 函式中，將設定寬度的目標從 `#puzzle-section` 改為 `#puzzle-board`。
3.  **【第 3 步】修改拼圖塊跟隨邏輯:**
    *   在 `script.js` 的 `moveHeldPiece` 函式中，將 `touch.clientX` 和 `touch.clientY` 分別改為 `touch.pageX` 和 `touch.pageY`。
4.  **【第 4 步】最終審查與提交:**
    *   完成所有開發後，請求程式碼審查。
    *   審查通過後，提交所有變更。
