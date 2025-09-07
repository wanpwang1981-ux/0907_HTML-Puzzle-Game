document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素
    const imageLoader = document.getElementById('image-loader');
    const referenceImageContainer = document.getElementById('reference-image-container');
    const referenceImage = document.getElementById('reference-image');
    const difficultySelector = document.getElementById('difficulty-selector');
    const puzzleBoard = document.getElementById('puzzle-board');
    const piecesContainer = document.getElementById('pieces-container');
    const timerDisplay = document.getElementById('timer');
    const winModal = document.getElementById('win-modal');
    const finalTimeDisplay = document.getElementById('final-time');
    const newGameBtn = document.getElementById('new-game-btn');
    const exitBtn = document.getElementById('exit-btn');

    let sourceImage;
    let timerInterval;
    let startTime;

    // 監聽圖片上傳
    imageLoader.addEventListener('change', handleImageUpload);
    // 監聽彈出視窗按鈕
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
                referenceImage.src = sourceImage.src;
                referenceImageContainer.style.display = 'block';
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
        piecesContainer.innerHTML = '';
        difficultySelector.innerHTML = '';
        timerDisplay.textContent = '00:00';
        clearInterval(timerInterval);
    }

    function startGame(rows, cols) {
        resetGame(); // 確保計時器等被重置
        proposeDifficulties(sourceImage.width, sourceImage.height); // 重新顯示難度按鈕
        // 標示選中的難度
        document.querySelectorAll('#difficulty-selector button').forEach(btn => {
            if (btn.textContent.includes(`${cols}x${rows}`) || btn.textContent.includes(`${rows}x${cols}`)) {
                btn.classList.add('selected');
            }
        });

        puzzleBoard.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        puzzleBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        const boardAspectRatio = sourceImage.width / sourceImage.height;
        puzzleBoard.style.height = `${puzzleBoard.clientWidth / boardAspectRatio}px`;

        for (let i = 0; i < rows * cols; i++) {
            const cell = document.createElement('div');
            cell.classList.add('puzzle-cell');
            cell.dataset.index = i;
            cell.addEventListener('dragover', e => e.preventDefault());
            cell.addEventListener('drop', e => handleDrop(e, rows, cols));
            puzzleBoard.appendChild(cell);
        }

        createPuzzlePieces(rows, cols);

        // 開始計時
        startTime = Date.now();
        timerInterval = setInterval(() => {
            timerDisplay.textContent = formatTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
    }

    function createPuzzlePieces(rows, cols) {
        const pieceWidth = sourceImage.width / cols;
        const pieceHeight = sourceImage.height / rows;
        let pieces = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const canvas = document.createElement('canvas');
                canvas.width = pieceWidth;
                canvas.height = pieceHeight;
                const context = canvas.getContext('2d');
                context.drawImage(sourceImage, c * pieceWidth, r * pieceHeight, pieceWidth, pieceHeight, 0, 0, pieceWidth, pieceHeight);
                const pieceImage = new Image();
                pieceImage.src = canvas.toDataURL();
                pieceImage.dataset.index = r * cols + c;
                pieceImage.classList.add('puzzle-piece');
                pieceImage.draggable = true;
                pieceImage.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', e.target.dataset.index));
                pieces.push(pieceImage);
            }
        }

        pieces.sort(() => Math.random() - 0.5);
        pieces.forEach(piece => piecesContainer.appendChild(piece));
    }

    function handleDrop(e, rows, cols) {
        e.preventDefault();
        const draggedPieceIndex = e.dataTransfer.getData('text/plain');
        const targetCell = e.target.closest('.puzzle-cell');
        if (targetCell && targetCell.dataset.index === draggedPieceIndex) {
            const piece = document.querySelector(`.puzzle-piece[data-index='${draggedPieceIndex}']`);
            if(piece) {
                targetCell.innerHTML = ''; // 清空
                targetCell.appendChild(piece);
                piece.draggable = false;
                piece.style.cursor = 'default';
                checkWinCondition(rows, cols);
            }
        }
    }

    function checkWinCondition(rows, cols) {
        const placedPieces = puzzleBoard.querySelectorAll('.puzzle-piece');
        if (placedPieces.length === rows * cols) {
            clearInterval(timerInterval);
            const finalTimeInSeconds = Math.floor((Date.now() - startTime) / 1000);
            finalTimeDisplay.textContent = formatTime(finalTimeInSeconds);
            winModal.classList.remove('hidden');
            updateLeaderboard(rows, cols, finalTimeInSeconds);
        }
    }

    function updateLeaderboard(rows, cols, time) {
        const key = `puzzle-${rows}x${cols}`;
        const leaderboard = JSON.parse(localStorage.getItem('puzzleLeaderboard')) || {};
        if (!leaderboard[key] || time < leaderboard[key]) {
            leaderboard[key] = time;
            localStorage.setItem('puzzleLeaderboard', JSON.stringify(leaderboard));
            console.log(`新紀錄 - ${key}: ${time}s`);
        }
    }

    function formatTime(seconds) {
        const min = Math.floor(seconds / 60).toString().padStart(2, '0');
        const sec = (seconds % 60).toString().padStart(2, '0');
        return `${min}:${sec}`;
    }

    referenceImageContainer.style.display = 'none';
});
