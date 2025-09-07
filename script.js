document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素
    const imageLoader = document.getElementById('image-loader');
    const difficultySelector = document.getElementById('difficulty-selector');
    const puzzleBoard = document.getElementById('puzzle-board');
    const timerDisplay = document.getElementById('timer');
    const winModal = document.getElementById('win-modal');
    const finalTimeDisplay = document.getElementById('final-time');
    const newGameBtn = document.getElementById('new-game-btn');
    const exitBtn = document.getElementById('exit-btn');

    // --- 新的遊戲狀態變數 ---
    let sourceImage;
    let timerInterval;
    let startTime;
    let unplacedPieces = [];
    let heldPieceData = null; // 儲存當前手上拿著的拼圖塊的資訊
    let heldPieceElement = null; // 儲存跟隨滑鼠的 DOM 元素
    // -------------------------

    // 監聽器
    imageLoader.addEventListener('change', handleImageUpload);
    newGameBtn.addEventListener('click', () => location.reload());
    exitBtn.addEventListener('click', () => winModal.classList.add('hidden'));

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file || !file.type.match('image.*')) {
            alert('請選擇一個有效的圖片檔案！');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            sourceImage = new Image();
            sourceImage.onload = () => {
                resetGame();
                proposeDifficulties(sourceImage.width, sourceImage.height);
            };
            sourceImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function proposeDifficulties(width, height) {
        difficultySelector.innerHTML = '';
        const aspectRatio = width / height;
        let difficulties = [];

        if (aspectRatio > 1.2) { // 橫向
            difficulties = [{r: 3, c: 4, n: '簡單 (4x3)'}, {r: 6, c: 8, n: '困難 (8x6)'}];
        } else if (aspectRatio < 0.8) { // 縱向
            difficulties = [{r: 4, c: 3, n: '簡單 (3x4)'}, {r: 8, c: 6, n: '困難 (6x8)'}];
        } else { // 正方形
            difficulties = [{r: 3, c: 3, n: '簡單 (3x3)'}, {r: 5, c: 5, n: '困難 (5x5)'}];
        }

        difficulties.forEach(d => {
            const button = document.createElement('button');
            button.textContent = d.n;
            button.onclick = () => {
                document.querySelectorAll('#difficulty-selector button').forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                startGame(d.r, d.c);
            };
            difficultySelector.appendChild(button);
        });
    }

    function resetGame() {
        puzzleBoard.innerHTML = '';
        puzzleBoard.style.removeProperty('--bg-image'); // 清除舊的底圖
        // difficultySelector.innerHTML = ''; // 不應重設，以便重新開始遊戲
        timerDisplay.textContent = '00:00';
        unplacedPieces = [];
        if (heldPieceElement) {
            heldPieceElement.remove();
            heldPieceElement = null;
        }
        heldPieceData = null;
        if(timerInterval) clearInterval(timerInterval);
    }
    
    function startGame(rows, cols) {
        resetGame();
        console.log(`新遊戲開始，難度: ${rows}x${cols}`);

        // 1. 設置淡化背景
        puzzleBoard.style.setProperty('--bg-image', `url(${sourceImage.src})`);

        // 2. 根據圖片比例調整拼圖板尺寸
        const boardAspectRatio = sourceImage.width / sourceImage.height;
        puzzleBoard.style.height = `${puzzleBoard.clientWidth / boardAspectRatio}px`;

        // 3. 創建網格儲存格
        puzzleBoard.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        puzzleBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        for (let i = 0; i < rows * cols; i++) {
            const cell = document.createElement('div');
            cell.classList.add('puzzle-cell');
            cell.dataset.index = i;
            cell.addEventListener('mouseover', () => handleCellHover(i));
            puzzleBoard.appendChild(cell);
        }
        
        // 4. 創建拼圖塊到 unplacedPieces 陣列
        createPuzzlePieces(rows, cols);
        
        // 5. 添加點擊事件監聽
        puzzleBoard.addEventListener('click', (e) => handleBoardClick(e, rows, cols));
        document.addEventListener('mousemove', moveHeldPiece);
        document.addEventListener('touchmove', moveHeldPiece);

        // 6. 開始計時
        startTime = Date.now();
        timerInterval = setInterval(() => {
            timerDisplay.textContent = formatTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
    }

    function handleBoardClick(e, rows, cols) {
        if (unplacedPieces.length === 0 && !heldPieceData) return; // 遊戲已勝利

        if (heldPieceData) {
            // 如果手上有拼圖，點擊任何地方都是交換
            swapPiece(rows, cols);
        } else {
            // 如果手上沒東西，就拿一塊
            pickupPiece(rows, cols);
        }
    }

    function handleCellHover(index) {
        // 如果正拿著拼圖，且滑鼠移到了正確的格子上
        if (heldPieceData && heldPieceData.index === index) {
            placePiece(index);
        }
    }

    function pickupPiece(rows, cols) {
        if (unplacedPieces.length === 0) return;
        heldPieceData = unplacedPieces.pop();
        
        heldPieceElement = new Image();
        heldPieceElement.src = heldPieceData.imgSrc;
        heldPieceElement.classList.add('held-piece');
        heldPieceElement.style.width = `${puzzleBoard.clientWidth / cols}px`;
        heldPieceElement.style.height = `${puzzleBoard.clientHeight / rows}px`;
        
        document.body.appendChild(heldPieceElement);
    }

    function swapPiece(rows, cols) {
        unplacedPieces.unshift(heldPieceData);
        if(heldPieceElement) heldPieceElement.remove();
        heldPieceElement = null;
        heldPieceData = null;
        pickupPiece(rows, cols);
    }

    function placePiece(index) {
        const targetCell = puzzleBoard.querySelector(`.puzzle-cell[data-index='${index}']`);
        if (targetCell && !targetCell.hasChildNodes()) {
            const piece = new Image();
            piece.src = heldPieceData.imgSrc;
            piece.classList.add('placed-piece');
            targetCell.appendChild(piece);

            if(heldPieceElement) heldPieceElement.remove();
            heldPieceElement = null;
            heldPieceData = null;

            checkWinCondition();
        }
    }

    function moveHeldPiece(e) {
        if (!heldPieceElement) return;
        const touch = e.touches ? e.touches[0] : e;
        heldPieceElement.style.left = `${touch.clientX}px`;
        heldPieceElement.style.top = `${touch.clientY}px`;
    }

    function checkWinCondition() {
        if (unplacedPieces.length === 0 && !heldPieceData) {
            clearInterval(timerInterval);
            const finalTimeInSeconds = Math.floor((Date.now() - startTime) / 1000);
            finalTimeDisplay.textContent = formatTime(finalTimeInSeconds);
            winModal.classList.remove('hidden');

            const selectedButton = document.querySelector('#difficulty-selector button.selected');
            if (selectedButton) {
                updateLeaderboard(selectedButton.textContent, finalTimeInSeconds);
            }
        }
    }

    function updateLeaderboard(difficultyName, time) {
        const key = `puzzle-leaderboard-${difficultyName.replace(/\s/g, '')}`; // 移除空白以確保key的有效性
        const leaderboard = JSON.parse(localStorage.getItem('puzzleLeaderboard')) || {};
        if (!leaderboard[key] || time < leaderboard[key]) {
            leaderboard[key] = time;
            localStorage.setItem('puzzleLeaderboard', JSON.stringify(leaderboard));
            console.log(`新紀錄 - ${difficultyName}: ${time}s`);
        }
    }

    function createPuzzlePieces(rows, cols) {
        unplacedPieces = []; // 重置陣列
        const pieceWidth = sourceImage.width / cols;
        const pieceHeight = sourceImage.height / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const canvas = document.createElement('canvas');
                canvas.width = pieceWidth;
                canvas.height = pieceHeight;
                const context = canvas.getContext('2d');
                context.drawImage(
                    sourceImage,
                    c * pieceWidth, r * pieceHeight, // source x, y
                    pieceWidth, pieceHeight,         // source w, h
                    0, 0, pieceWidth, pieceHeight    // destination x, y, w, h
                );
                
                unplacedPieces.push({
                    index: r * cols + c,
                    imgSrc: canvas.toDataURL(),
                    width: pieceWidth,
                    height: pieceHeight
                });
            }
        }

        // 打亂陣列
        unplacedPieces.sort(() => Math.random() - 0.5);
        console.log(`${unplacedPieces.length} 個拼圖塊已創建並儲存。`);
    }

    function formatTime(seconds) {
        const min = Math.floor(seconds / 60).toString().padStart(2, '0');
        const sec = (seconds % 60).toString().padStart(2, '0');
        return `${min}:${sec}`;
    }
});
