document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素
    const imageLoader = document.getElementById('image-loader');
    const cameraBtn = document.getElementById('camera-btn');
    const difficultySelector = document.getElementById('difficulty-selector');
    const sizeSelector = document.getElementById('board-size-selector');
    const puzzleSection = document.getElementById('puzzle-section');
    const puzzleBoard = document.getElementById('puzzle-board');
    const timerDisplay = document.getElementById('timer');

    // 彈出視窗元素
    const winModal = document.getElementById('win-modal');
    const finalTimeDisplay = document.getElementById('final-time');
    const newGameBtn = document.getElementById('new-game-btn');
    const exitBtn = document.getElementById('exit-btn');
    const cameraModal = document.getElementById('camera-modal');
    const videoFeed = document.getElementById('video-feed');
    const captureBtn = document.getElementById('capture-btn');
    const cancelCameraBtn = document.getElementById('cancel-camera-btn');

    // --- 遊戲狀態變數 ---
    let sourceImage;
    let timerInterval;
    let startTime;
    let unplacedPieces = [];
    let heldPieceData = null;
    let heldPieceElement = null;
    let videoStream = null;
    let currentRows, currentCols;
    let lastHoveredIndex = -1;

    // 監聽器
    imageLoader.addEventListener('change', handleImageUpload);
    cameraBtn.addEventListener('click', initCamera);
    captureBtn.addEventListener('click', handleCapture);
    cancelCameraBtn.addEventListener('click', closeCamera);
    newGameBtn.addEventListener('click', () => location.reload());
    exitBtn.addEventListener('click', () => winModal.classList.add('hidden'));
    document.addEventListener('mousemove', moveHeldPiece);
    document.addEventListener('touchmove', moveHeldPiece, { passive: false });
    sizeSelector.addEventListener('click', handleSizeChange);

    // --- 尺寸調整 ---
    function handleSizeChange(e) {
        if (e.target.tagName === 'BUTTON') {
            const newSize = e.target.dataset.size;
            sizeSelector.querySelector('.selected').classList.remove('selected');
            e.target.classList.add('selected');
            setBoardSize(newSize);
        }
    }

    function setBoardSize(size) {
        puzzleBoard.style.width = `${size}px`;
        if (sourceImage) {
            const boardAspectRatio = sourceImage.width / sourceImage.height;
            puzzleBoard.style.height = `${puzzleBoard.clientWidth / boardAspectRatio}px`;

            document.querySelectorAll('.placed-piece, .held-piece').forEach(piece => {
                piece.style.width = `${puzzleBoard.clientWidth / currentCols}px`;
                piece.style.height = `${puzzleBoard.clientHeight / currentRows}px`;
            });
        }
    }

    // --- 相機功能 ---
    async function initCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('您的瀏覽器不支援相機功能。'); return;
        }
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            videoFeed.srcObject = videoStream;
            cameraModal.classList.remove('hidden');
        } catch (err) {
            alert(`無法啟動相機，錯誤訊息：${err.name}`);
        }
    }

    function closeCamera() {
        if (videoStream) videoStream.getTracks().forEach(track => track.stop());
        cameraModal.classList.add('hidden');
    }

    function handleCapture() {
        const canvas = document.createElement('canvas');
        canvas.width = videoFeed.videoWidth;
        canvas.height = videoFeed.videoHeight;
        const context = canvas.getContext('2d');
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(videoFeed, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        closeCamera();
        processImage(dataUrl);
    }

    // --- 圖片與遊戲設置 ---
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file || !file.type.match('image.*')) {
            alert('請選擇一個有效的圖片檔案！'); return;
        }
        const reader = new FileReader();
        reader.onload = (event) => processImage(event.target.result);
        reader.readAsDataURL(file);
    }

    function processImage(src) {
        sourceImage = new Image();
        sourceImage.onload = () => {
            resetGame();
            proposeDifficulties();
            const initialSize = sizeSelector.querySelector('.selected').dataset.size;
            setBoardSize(initialSize);
        };
        sourceImage.src = src;
    }

    function proposeDifficulties() {
        const width = sourceImage.width;
        const height = sourceImage.height;
        difficultySelector.innerHTML = '';
        const aspectRatio = width / height;
        let difficulties = [{r: 3, c: 4, n: '簡單 (4x3)'}, {r: 6, c: 8, n: '困難 (8x6)'}];
        if (aspectRatio < 0.8) difficulties = [{r: 4, c: 3, n: '簡單 (3x4)'}, {r: 8, c: 6, n: '困難 (6x8)'}];
        else if (aspectRatio >= 0.8 && aspectRatio <= 1.2) difficulties = [{r: 3, c: 3, n: '簡單 (3x3)'}, {r: 5, c: 5, n: '困難 (5x5)'}];

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

    // --- 遊戲核心邏輯 ---
    function resetGame() {
        puzzleBoard.innerHTML = '';
        puzzleBoard.style.removeProperty('--bg-image');
        timerDisplay.textContent = '00:00';
        unplacedPieces = [];
        if (heldPieceElement) heldPieceElement.remove();
        heldPieceElement = null;
        heldPieceData = null;
        lastHoveredIndex = -1;
        if(timerInterval) clearInterval(timerInterval);
    }

    function startGame(rows, cols) {
        currentRows = rows;
        currentCols = cols;
        resetGame();
        const initialSize = sizeSelector.querySelector('.selected').dataset.size;
        setBoardSize(initialSize);
        puzzleBoard.style.setProperty('--bg-image', `url(${sourceImage.src})`);
        puzzleBoard.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        puzzleBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        for (let i = 0; i < rows * cols; i++) {
            const cell = document.createElement('div');
            cell.classList.add('puzzle-cell');
            cell.dataset.index = i;
            puzzleBoard.appendChild(cell);
        }
        createPuzzlePieces(rows, cols);
        puzzleBoard.addEventListener('click', handleBoardClick);
        startTime = Date.now();
        timerInterval = setInterval(() => {
            timerDisplay.textContent = formatTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
    }

    function createPuzzlePieces(rows, cols) {
        unplacedPieces = [];
        const pieceWidth = sourceImage.width / cols;
        const pieceHeight = sourceImage.height / rows;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const canvas = document.createElement('canvas');
                canvas.width = pieceWidth;
                canvas.height = pieceHeight;
                const context = canvas.getContext('2d');
                context.drawImage(sourceImage, c * pieceWidth, r * pieceHeight, pieceWidth, pieceHeight, 0, 0, pieceWidth, pieceHeight);
                unplacedPieces.push({ index: r * cols + c, imgSrc: canvas.toDataURL() });
            }
        }
        unplacedPieces.sort(() => Math.random() - 0.5);
    }

    // --- 互動處理 ---
    function handleBoardClick() {
        if (unplacedPieces.length === 0 && !heldPieceData) return;
        if (heldPieceData) swapPiece();
        else pickupPiece();
    }

    function pickupPiece() {
        if (unplacedPieces.length === 0) return;
        heldPieceData = unplacedPieces.pop();
        heldPieceElement = new Image();
        heldPieceElement.src = heldPieceData.imgSrc;
        heldPieceElement.classList.add('held-piece');
        heldPieceElement.style.width = `${puzzleBoard.clientWidth / currentCols}px`;
        heldPieceElement.style.height = `${puzzleBoard.clientHeight / currentRows}px`;
        document.body.appendChild(heldPieceElement);
        highlightTargetCell(heldPieceData.index);
    }

    function swapPiece() {
        unplacedPieces.unshift(heldPieceData);
        if(heldPieceElement) heldPieceElement.remove();
        heldPieceElement = null;
        heldPieceData = null;
        removeHighlight();
        pickupPiece();
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
            removeHighlight();
            checkWinCondition();
        }
    }

    function moveHeldPiece(e) {
        if (!heldPieceElement) return;
        if (e.touches) e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;

        // 使用 pageX/pageY 以處理頁面滾動
        // heldPieceElement 的 position 是 absolute，相對於 document
        heldPieceElement.style.left = `${touch.pageX}px`;
        heldPieceElement.style.top = `${touch.pageY}px`;

        // --- 懸停偵測邏輯 ---
        const rect = puzzleBoard.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        let hoveredIndex = -1;
        // 檢查游標是否在滾動後的拼圖板可見區域內
        if (touch.pageX >= rect.left + scrollX && touch.pageX <= rect.right + scrollX && touch.pageY >= rect.top + scrollY && touch.pageY <= rect.bottom + scrollY) {
            const x = touch.pageX - (rect.left + scrollX);
            const y = touch.pageY - (rect.top + scrollY);

            const gridCol = Math.floor(x / rect.width * currentCols);
            const gridRow = Math.floor(y / rect.height * currentRows);
            hoveredIndex = gridRow * currentCols + gridCol;
        }

        if (hoveredIndex !== -1 && hoveredIndex === heldPieceData.index) {
            placePiece(hoveredIndex);
        }
    }

    function highlightTargetCell(index) {
        removeHighlight();
        const targetCell = puzzleBoard.querySelector(`.puzzle-cell[data-index='${index}']`);
        if (targetCell) {
            targetCell.classList.add('target-highlight');
        }
    }

    function removeHighlight() {
        const highlighted = puzzleBoard.querySelector('.target-highlight');
        if (highlighted) {
            highlighted.classList.remove('target-highlight');
        }
    }

    // --- 勝利與計時 ---
    function checkWinCondition() {
        if (unplacedPieces.length === 0 && !heldPieceData) {
            clearInterval(timerInterval);
            const finalTimeInSeconds = Math.floor((Date.now() - startTime) / 1000);
            finalTimeDisplay.textContent = formatTime(finalTimeInSeconds);
            winModal.classList.remove('hidden');
            const selectedButton = document.querySelector('#difficulty-selector button.selected');
            if (selectedButton) updateLeaderboard(selectedButton.textContent, finalTimeInSeconds);
        }
    }

    function updateLeaderboard(difficultyName, time) {
        const key = `puzzle-leaderboard-${difficultyName.replace(/\s/g, '')}`;
        const leaderboard = JSON.parse(localStorage.getItem('puzzleLeaderboard')) || {};
        if (!leaderboard[key] || time < leaderboard[key]) {
            leaderboard[key] = time;
            localStorage.setItem('puzzleLeaderboard', JSON.stringify(leaderboard));
        }
    }

    function formatTime(seconds) {
        const min = Math.floor(seconds / 60).toString().padStart(2, '0');
        const sec = (seconds % 60).toString().padStart(2, '0');
        return `${min}:${sec}`;
    }
});
