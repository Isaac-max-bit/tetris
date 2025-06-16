// --- Elementos del DOM ---
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d'); // Contexto 2D para dibujar en el canvas
const nextPieceCanvas = document.getElementById('nextPieceCanvas');
const nextCtx = nextPieceCanvas.getContext('2d'); // Contexto para la siguiente pieza
const scoreSpan = document.getElementById('score');
const levelSpan = document.getElementById('level');
const startButton = document.getElementById('startButton');

// --- Configuración del juego ---
const COLS = 10; // Columnas del tablero de Tetris
const ROWS = 20; // Filas del tablero de Tetris
const BLOCK_SIZE = 24; // Tamaño de cada bloque en píxeles (240px ancho / 10 cols = 24px)
const BORDER_SIZE = 1; // Tamaño del borde entre bloques

// Ajustar tamaño del canvas si no coinciden
gameCanvas.width = COLS * BLOCK_SIZE;
gameCanvas.height = ROWS * BLOCK_SIZE;
nextPieceCanvas.width = 4 * BLOCK_SIZE; // Un espacio para 4x4 bloques
nextPieceCanvas.height = 4 * BLOCK_SIZE;

// Colores de Google para las piezas
const COLORS = [
    '#FFFFFF', // 0: Fondo (no usado para piezas, es solo para el tablero vacío)
    '#4285F4', // 1: Azul (Google Blue)
    '#EA4335', // 2: Rojo (Google Red)
    '#FBBC05', // 3: Amarillo (Google Yellow)
    '#34A853', // 4: Verde (Google Green)
    // Puedes añadir más si decides expandir las piezas o usar más variaciones
];

// --- Variables del juego ---
let board = [];
let currentPiece;
let nextPiece;
let score = 0;
let level = 1;
let dropInterval;
let gameStarted = false;
let gameOver = false; // Variable para controlar el estado de fin de juego

// --- Definición de las piezas (Tetrominós) ---
const TETROMINOS = [
    // I (Verde Google)
    {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: 4 // Verde
    },
    // J (Azul Google)
    {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 1 // Azul
    },
    // L (Azul Google, misma tonalidad para variedad visual mínima)
    {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 1 // Azul
    },
    // O (Amarillo Google)
    {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: 3 // Amarillo
    },
    // S (Rojo Google)
    {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: 2 // Rojo
    },
    // T (Verde Google, misma tonalidad)
    {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 4 // Verde
    },
    // Z (Rojo Google, misma tonalidad)
    {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: 2 // Rojo
    }
];

// --- Funciones del juego ---

// Inicializa el tablero de juego con ceros (vacío)
function initBoard() {
    board = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
}

// Dibuja un solo bloque en el canvas
function drawBlock(x, y, colorIndex, context) {
    if (colorIndex === 0) return; // No dibujar bloques vacíos (colorIndex 0)

    context.fillStyle = COLORS[colorIndex];
    context.strokeStyle = '#999';
    context.lineWidth = BORDER_SIZE;

    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

// Dibuja el tablero completo
function drawBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            drawBlock(c, r, board[r][c], ctx);
        }
    }
}

// Dibuja la pieza actual en su posición
function drawPiece(piece, context) {
    piece.shape.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value === 1) {
                drawBlock(piece.x + c, piece.y + r, piece.color, context);
            }
        });
    });
}

// Genera una nueva pieza aleatoria
function getRandomPiece() {
    const randIndex = Math.floor(Math.random() * TETROMINOS.length);
    const pieceData = TETROMINOS[randIndex];
    return {
        shape: pieceData.shape,
        color: pieceData.color,
        x: Math.floor(COLS / 2) - Math.floor(pieceData.shape[0].length / 2), // Centrar la pieza horizontalmente
        y: 0 // Empezar en la parte superior
    };
}

// Limpia el canvas
function clearCanvas(context, canvas) {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

// Dibuja el estado completo del juego (tablero y pieza actual)
function draw() {
    clearCanvas(ctx, gameCanvas);
    drawBoard();
    if (currentPiece) {
        drawPiece(currentPiece, ctx);
    }
    drawNextPiece();
}

// Dibuja la siguiente pieza en su canvas
function drawNextPiece() {
    clearCanvas(nextCtx, nextPieceCanvas);
    if (nextPiece) {
        const xOffset = (nextPieceCanvas.width / BLOCK_SIZE - nextPiece.shape[0].length) / 2;
        const yOffset = (nextPieceCanvas.height / BLOCK_SIZE - nextPiece.shape.length) / 2;

        nextPiece.shape.forEach((row, r) => {
            row.forEach((value, c) => {
                if (value === 1) {
                    drawBlock(xOffset + c, yOffset + r, nextPiece.color, nextCtx);
                }
            });
        });
    }
}

// Comprueba si una pieza puede moverse a una posición dada
function isValidMove(piece, offsetX, offsetY) {
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c] === 1) {
                const newX = piece.x + c + offsetX;
                const newY = piece.y + r + offsetY;

                // Comprobar límites del tablero
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return false;
                }
                // Comprobar colisión con bloques existentes en el tablero (si no estamos fuera de la parte superior del tablero)
                if (newY >= 0 && board[newY][newX] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

// Mueve la pieza hacia abajo
function dropPiece() {
    if (!gameStarted || gameOver) return;

    if (isValidMove(currentPiece, 0, 1)) {
        currentPiece.y++; // Mover la pieza una posición hacia abajo
        draw();
    } else {
        // La pieza no puede moverse más hacia abajo, fijarla al tablero
        lockPiece();
        clearLines();
        getNewPiece(); // Obtener la siguiente pieza
        if (!isValidMove(currentPiece, 0, 0)) { // Si la nueva pieza no puede colocarse al inicio
            endGame();
        }
    }
}

// Fija la pieza actual al tablero
function lockPiece() {
    currentPiece.shape.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value === 1) {
                const boardX = currentPiece.x + c;
                const boardY = currentPiece.y + r;
                // Asegurarse de que las coordenadas estén dentro del tablero antes de asignar
                if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        });
    });
}

// Elimina las líneas completas
function clearLines() {
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        // Comprobar si la fila está completa (no contiene ningún 0)
        if (board[r].every(cell => cell !== 0)) {
            // Eliminar la fila
            board.splice(r, 1);
            // Añadir una nueva fila vacía en la parte superior
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            r++; // Volver a comprobar la misma fila, ya que las de arriba bajaron
        }
    }

    if (linesCleared > 0) {
        updateScore(linesCleared);
        updateLevel(linesCleared);
    }
}

// Actualiza la puntuación
function updateScore(linesCleared) {
    const pointsPerLine = [0, 100, 300, 500, 800]; // Puntos por 0, 1, 2, 3, 4 líneas
    score += pointsPerLine[linesCleared] * level;
    scoreSpan.textContent = score;
}

// Actualiza el nivel y la velocidad de caída
function updateLevel(linesCleared) {
    // Un umbral de ejemplo para subir de nivel
    // Podrías basarlo en líneas limpiadas en lugar de puntuación si lo prefieres
    const thresholdPerLevel = 500; // Por ejemplo, sube de nivel cada 500 puntos
    if (score >= level * thresholdPerLevel) {
        level++;
        levelSpan.textContent = level;
        clearInterval(dropInterval); // Limpiar el intervalo anterior
        dropInterval = setInterval(dropPiece, getDropSpeed()); // Iniciar nuevo intervalo con la nueva velocidad
    }
}

// Obtiene la velocidad de caída de la pieza según el nivel
function getDropSpeed() {
    // Disminuye el tiempo entre caídas a medida que sube el nivel
    // Valor inicial: 1000ms (1 segundo) para nivel 1
    // Velocidad máxima (mínimo): 100ms
    return Math.max(100, 1000 - (level - 1) * 90);
}

// Obtiene la siguiente pieza
function getNewPiece() {
    currentPiece = nextPiece;
    nextPiece = getRandomPiece();
    draw(); // Volver a dibujar para que la nueva pieza aparezca en el tablero y la siguiente pieza se actualice
}

// Rota la pieza actual
function rotatePiece() {
    if (!currentPiece) return;

    // Clonar la forma actual para probar la rotación
    const originalShape = currentPiece.shape;
    let newShape = [];
    const rows = originalShape.length;
    const cols = originalShape[0].length;

    // Transponer la matriz (filas a columnas) y luego invertir filas para rotar 90 grados
    for (let c = 0; c < cols; c++) {
        newShape.push([]);
        for (let r = rows - 1; r >= 0; r--) {
            newShape[c].push(originalShape[r][c]);
        }
    }

    // Crear una pieza temporal con la nueva forma y las coordenadas actuales
    const rotatedPiece = {
        shape: newShape,
        color: currentPiece.color,
        x: currentPiece.x,
        y: currentPiece.y
    };

    // Comprobar si la rotación es válida (no colisiona ni sale del tablero)
    if (isValidMove(rotatedPiece, 0, 0)) {
        currentPiece.shape = newShape; // Aplicar la rotación
        draw();
    } else {
        // Si la rotación no es válida, intentar un "kick" (empuje)
        // Esto es una simplificación de la rotación SRS (Super Rotation System)
        // Intentar mover 1 casilla a la izquierda o derecha o arriba
        const kickOffsets = [
            [-1, 0], // Mover izquierda
            [1, 0], // Mover derecha
            [0, -1] // Mover arriba (útil para rotaciones cerca del fondo/paredes)
        ];
        for (const [offsetX, offsetY] of kickOffsets) {
            if (isValidMove(rotatedPiece, offsetX, offsetY)) {
                currentPiece.shape = newShape;
                currentPiece.x += offsetX;
                currentPiece.y += offsetY;
                draw();
                return;
            }
        }
    }
}


// --- Manejo de eventos de teclado ---
document.addEventListener('keydown', e => {
    if (!gameStarted || gameOver) return;

    // Prevenir el desplazamiento de la página con las flechas y la barra espaciadora
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) {
        e.preventDefault();
    }

    switch (e.key) {
        case 'ArrowLeft':
            if (isValidMove(currentPiece, -1, 0)) {
                currentPiece.x--;
            }
            break;
        case 'ArrowRight':
            if (isValidMove(currentPiece, 1, 0)) {
                currentPiece.x++;
            }
            break;
        case 'ArrowDown':
            dropPiece(); // Mover hacia abajo más rápido (caída suave)
            break;
        case 'ArrowUp':
            rotatePiece(); // Rotar la pieza
            break;
        case 'Space':
            // Caída instantánea (hard drop)
            while (isValidMove(currentPiece, 0, 1)) {
                currentPiece.y++;
            }
            dropPiece(); // Fija la pieza una vez que llega al fondo
            break;
    }
    draw(); // Redibujar el juego después de cada movimiento
});

// --- Bucle principal del juego ---
// Esta función no es necesaria para el bucle de caída automática,
// ya que setInterval maneja eso directamente. Se mantiene por si se quiere añadir
// una lógica de juego más compleja que requiera requestAnimationFrame.
function gameLoop() {
    if (!gameStarted || gameOver) return;
    // Lógica adicional para el bucle de juego si es necesaria
    // requestAnimationFrame(gameLoop);
}


// --- Evento de inicio de juego ---
startButton.addEventListener('click', () => {
    if (!gameStarted || gameOver) { // Permite reiniciar el juego si ya terminó
        startGame();
    }
});

function startGame() {
    clearInterval(dropInterval); // Asegurarse de limpiar cualquier intervalo anterior
    initBoard(); // Reinicia el tablero
    score = 0; // Reinicia la puntuación
    level = 1; // Reinicia el nivel
    gameOver = false; // Restablece el estado de fin de juego
    scoreSpan.textContent = score;
    levelSpan.textContent = level;
    gameStarted = true;
    currentPiece = getRandomPiece(); // Genera la primera pieza
    nextPiece = getRandomPiece(); // Genera la primera siguiente pieza
    draw(); // Dibuja el estado inicial del juego
    // Iniciar el intervalo de caída de la pieza
    dropInterval = setInterval(dropPiece, getDropSpeed());
    console.log("¡Juego iniciado!");
}

// --- Función de Fin de Juego ---
function endGame() {
    gameOver = true;
    gameStarted = false;
    clearInterval(dropInterval); // Detener la caída de piezas

    // Mostrar mensaje de GAME OVER en el canvas
    ctx.font = '30px Arial';
    ctx.fillStyle = '#EA4335'; // Rojo de Google
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', gameCanvas.width / 2, gameCanvas.height / 2 - 20);
    
    ctx.font = '20px Arial';
    ctx.fillStyle = '#4285F4'; // Azul de Google
    ctx.fillText('Puntuación: ' + score, gameCanvas.width / 2, gameCanvas.height / 2 + 20);
    
    startButton.textContent = "Volver a jugar"; // Cambiar texto del botón
    console.log("¡Juego terminado!");
}

// --- Inicialización al cargar la página ---
initBoard();
drawBoard(); // Dibuja el tablero vacío inicialmente
drawNextPiece(); // Dibuja un espacio en blanco para la siguiente pieza al inicio
startButton.textContent = "Iniciar Juego"; // Asegura que el texto inicial del botón sea "Iniciar Juego"