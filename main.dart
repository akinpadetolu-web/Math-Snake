import 'dart:async';
import 'dart:math';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 1. True Full Screen: Completely hide the status and navigation bars.
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  
  // Force portrait orientation.
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  
  runApp(const MathSnakeApp());
}

class MathSnakeApp extends StatelessWidget {
  const MathSnakeApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Math Snake Portable Pro',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF030712), // Deep dark gray/slate
        textTheme: const TextTheme(
          bodyMedium: TextStyle(fontFamily: 'Courier New'),
        ),
      ),
      home: const MathSnakeGamePage(),
    );
  }
}

// Coordinate Point definition
class Point {
  final int x;
  final int y;
  const Point(this.x, this.y);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Point && runtimeType == other.runtimeType && x == other.x && y == other.y;

  @override
  int get hashCode => x.hashCode ^ y.hashCode;
}

// Food Item representing a floating arithmetic option
class FoodItem {
  final Point position;
  final int value;
  final bool isCorrect;
  FoodItem({required this.position, required this.value, required this.isCorrect});
}

// Stage Configuration Model
class StageConfig {
  final int stageId;
  final String name;
  final String description;
  final int targetToWin;
  final int speedMs;
  final int pointsScale;
  final Color primaryColor;
  final Color accentColor;

  const StageConfig({
    required this.stageId,
    required this.name,
    required this.description,
    required this.targetToWin,
    required this.speedMs,
    required this.pointsScale,
    required this.primaryColor,
    required this.accentColor,
  });
}

// Mathematical Equation Model
class Equation {
  final String text;
  final int answer;
  final List<int> options;
  Equation({required this.text, required this.answer, required this.options});
}

class MathSnakeGamePage extends StatefulWidget {
  const MathSnakeGamePage({Key? key}) : super(key: key);

  @override
  State<MathSnakeGamePage> createState() => _MathSnakeGamePageState();
}

enum GameStatus { start, playing, paused, gameOver, victory }

class _MathSnakeGamePageState extends State<MathSnakeGamePage> {
  // Game states
  GameStatus _gameStatus = GameStatus.start;
  int _score = 0;
  int _highScore = 0;
  int _lives = 3;
  int _stageId = 1;
  int _stageCorrectCount = 0;
  
  // Game loop timer
  Timer? _gameTimer;
  
  // Grid coordinates
  int _gridCols = 16;
  int _gridRows = 24; // dynamically filled on safe measuring
  
  // Snake segments
  List<Point> _snake = [];
  Point _direction = const Point(0, -1); // Slither upwards by default
  Point _nextDirection = const Point(0, -1);
  
  // Active equation and floating options
  Equation? _currentEquation;
  List<FoodItem> _foods = [];
  
  // Visual FX flashes
  bool _correctFlash = false;
  bool _penaltyFlash = false;

  // Touch swipe helper
  double _swipeThreshold = 25.0;

  // 5 Stages of Progressive Arithmetic
  static const List<StageConfig> _stages = [
    StageConfig(
      stageId: 1,
      name: 'Single digit sums',
      description: 'Quick addition questions with numbers 1 to 9. Safe, open slithering terrain.',
      targetToWin: 5,
      speedMs: 250,
      pointsScale: 10,
      primaryColor: Color(0xFF10B981), // Emerald
      accentColor: Color(0xFF34D399),
    ),
    StageConfig(
      stageId: 2,
      name: 'Subtraction trials',
      description: 'Test your negative computation skills. Speed is increasing!',
      targetToWin: 5,
      speedMs: 210,
      pointsScale: 20,
      primaryColor: Color(0xFF3B82F6), // Blue
      accentColor: Color(0xFF60A5FA),
    ),
    StageConfig(
      stageId: 3,
      name: 'Multiplication arena',
      description: 'Calculate product tables with double digit combinations.',
      targetToWin: 5,
      speedMs: 180,
      pointsScale: 35,
      primaryColor: Color(0xFFF59E0B), // Orange-amber
      accentColor: Color(0xFFFBBF24),
    ),
    StageConfig(
      stageId: 4,
      name: 'Composite equations',
      description: 'Solve combined calculations e.g. (A * B) - C in real-time.',
      targetToWin: 5,
      speedMs: 150,
      pointsScale: 50,
      primaryColor: Color(0xFF8B5CF6), // Purple
      accentColor: Color(0xFFA78BFA),
    ),
    StageConfig(
      stageId: 5,
      name: 'Grand champion algebra',
      description: 'Fastest pace! Decoys will test your spatial reactions.',
      targetToWin: 5,
      speedMs: 120,
      pointsScale: 75,
      primaryColor: Color(0xFFEF4444), // Crimson-Red
      accentColor: Color(0xFFF87171),
    ),
  ];

  StageConfig get _currentStageConfig => _stages[_stageId - 1];

  @override
  void initState() {
    super.initState();
    _resetGame();
  }

  @override
  void dispose() {
    _gameTimer?.cancel();
    super.dispose();
  }

  void _resetGame() {
    setState(() {
      _score = 0;
      _lives = 3;
      _stageId = 1;
      _stageCorrectCount = 0;
      _gameStatus = GameStatus.start;
      _snake = [
        const Point(8, 12),
        const Point(8, 13),
        const Point(8, 14),
      ];
      _direction = const Point(0, -1);
      _nextDirection = const Point(0, -1);
      _foods = [];
      _currentEquation = null;
    });
  }

  // Start stage gameplay
  void _startStage(int stageNum, bool resetScoreAndLives) {
    _gameTimer?.cancel();
    setState(() {
      _stageId = stageNum;
      _stageCorrectCount = 0;
      _snake = [
        Point(_gridCols ~/ 2, _gridRows ~/ 2),
        Point(_gridCols ~/ 2, (_gridRows ~/ 2) + 1),
        Point(_gridCols ~/ 2, (_gridRows ~/ 2) + 2),
      ];
      _direction = const Point(0, -1);
      _nextDirection = const Point(0, -1);
      if (resetScoreAndLives) {
        _score = 0;
        _lives = 3;
      }
      _generateEquation();
      _gameStatus = GameStatus.playing;
    });

    // Start tick timer
    _gameTimer = Timer.periodic(
      Duration(milliseconds: _currentStageConfig.speedMs),
      (Timer timer) => _gameTick(),
    );
  }

  // Generate arithmetic equations
  void _generateEquation() {
    final rand = Random();
    String text = '';
    int answer = 0;
    List<int> options = [];

    switch (_stageId) {
      case 1: // Sums
        int a = rand.nextInt(9) + 1;
        int b = rand.nextInt(9) + 1;
        text = '$a + $b = ?';
        answer = a + b;
        break;
      case 2: // Subtraction
        int a = rand.nextInt(15) + 5;
        int b = rand.nextInt(a - 1) + 1;
        text = '$a - $b = ?';
        answer = a - b;
        break;
      case 3: // Multiplication
        int a = rand.nextInt(8) + 2;
        int b = rand.nextInt(8) + 2;
        text = '$a × $b = ?';
        answer = a * b;
        break;
      case 4: // Combined sums
        int a = rand.nextInt(5) + 2;
        int b = rand.nextInt(5) + 2;
        int c = rand.nextInt(4) + 1;
        text = '($a × $b) + $c = ?';
        answer = (a * b) + c;
        break;
      case 5: // Speed algebra
        int a = rand.nextInt(12) + 10;
        int b = rand.nextInt(9) + 2;
        text = '$a + $b = ?';
        answer = a + b;
        break;
    }

    // Distractor options
    final Set<int> optSet = {answer};
    while (optSet.length < 3) {
      int variance = rand.nextInt(10) - 5;
      if (variance == 0) variance = 3;
      int distractor = answer + variance;
      if (distractor > 0) {
        optSet.add(distractor);
      }
    }
    options = optSet.toList()..shuffle();

    _currentEquation = Equation(text: text, answer: answer, options: options);
    _spawnFoods();
  }

  // Allocate random food coordinates
  void _spawnFoods() {
    if (_currentEquation == null) return;
    _foods.clear();

    final rand = Random();
    for (int optionVal in _currentEquation!.options) {
      Point newPos;
      bool collision;
      int limitAttempts = 0;

      do {
        collision = false;
        newPos = Point(
          rand.nextInt(_gridCols),
          // Offset slightly from the absolute top 15% and absolute bottom
          rand.nextInt(_gridRows - 4) + 3,
        );

        // Check head contact
        if (_snake.contains(newPos)) {
          collision = true;
        }
        // Check duplicate food positions
        for (var food in _foods) {
          if (food.position == newPos) {
            collision = true;
          }
        }
        limitAttempts++;
      } while (collision && limitAttempts < 100);

      _foods.add(FoodItem(
        position: newPos,
        value: optionVal,
        isCorrect: optionVal == _currentEquation!.answer,
      ));
    }
  }

  // Primary Gameplay Logic Loop
  void _gameTick() {
    if (_gameStatus != GameStatus.playing) return;

    _direction = _nextDirection;

    setState(() {
      // Calculate snake head destination wrapping around sides OR hitting walls
      final head = _snake.first;
      final newHead = Point(
        head.x + _direction.x,
        head.y + _direction.y,
      );

      // Boundary crash check
      if (newHead.x < 0 || newHead.x >= _gridCols || newHead.y < 0 || newHead.y >= _gridRows) {
        _triggerGameOver('CRASHED INTO BORDER WALL');
        return;
      }

      // Self intercept check
      if (_snake.contains(newHead)) {
        _triggerGameOver('BIT YOUR RETRO TAIL');
        return;
      }

      // Check food coordinate intersection
      int eatenIndex = -1;
      for (int i = 0; i < _foods.length; i++) {
        if (_foods[i].position == newHead) {
          eatenIndex = i;
          break;
        }
      }

      if (eatenIndex != -1) {
        final food = _foods[eatenIndex];
        _foods.removeAt(eatenIndex);

        if (food.isCorrect) {
          HapticFeedback.mediumImpact();
          _correctFlash = true;
          Future.delayed(const Duration(milliseconds: 250), () {
            if (mounted) setState(() => _correctFlash = false);
          });

          // Math Score scale logic
          int points = _currentStageConfig.pointsScale * _snake.length;
          _score += points;
          _stageCorrectCount++;

          if (_score > _highScore) {
            _highScore = _score;
          }

          // Advance logic
          if (_stageCorrectCount >= _currentStageConfig.targetToWin) {
            _gameTimer?.cancel();
            if (_stageId < 5) {
              _stageId++;
              _startStage(_stageId, false);
            } else {
              _gameStatus = GameStatus.victory;
            }
          } else {
            // Spawn next floating math query
            _snake.insert(0, newHead); // Grow the snake (do not pop the last block)
            _generateEquation();
          }
        } else {
          // Penalty answer eaten
          HapticFeedback.vibrate();
          _penaltyFlash = true;
          Future.delayed(const Duration(milliseconds: 350), () {
            if (mounted) setState(() => _penaltyFlash = false);
          });

          _lives--;
          if (_lives <= 0) {
            _triggerGameOver('WRONG VALUE: GAME OVER');
          } else {
            // Snake penalty shrink and regenerate options
            if (_snake.length > 3) {
              _snake = _snake.sublist(0, 3);
            }
            _generateEquation();
          }
        }
      } else {
        // Move forward regularly (Insert head, pop end)
        _snake.insert(0, newHead);
        _snake.removeLast();
      }
    });
  }

  void _triggerGameOver(String reason) {
    _gameTimer?.cancel();
    HapticFeedback.heavyImpact();
    setState(() {
      _gameStatus = GameStatus.gameOver;
    });
  }

  // Swipe Direction state handler
  void _handleSwipe(DragEndDetails details) {
    if (_gameStatus != GameStatus.playing) return;

    final velocity = details.velocity.pixelsPerSecond;
    final dx = velocity.dx;
    final dy = velocity.dy;

    if (dx.abs() > dy.abs()) {
      // Horizontal swipe
      if (dx.abs() > _swipeThreshold) {
        if (dx > 0 && _direction.x == 0) {
          _nextDirection = const Point(1, 0); // Right
        } else if (dx < 0 && _direction.x == 0) {
          _nextDirection = const Point(-1, 0); // Left
        }
      }
    } else {
      // Vertical swipe
      if (dy.abs() > _swipeThreshold) {
        if (dy > 0 && _direction.y == 0) {
          _nextDirection = const Point(0, 1); // Down
        } else if (dy < 0 && _direction.y == 0) {
          _nextDirection = const Point(0, -1); // Up
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final phoneSize = MediaQuery.of(context).size;
    final double paddingHorizontal = 16.0;

    // Responsive Canvas dimensions calculating dynamic cell grid widths
    double displayWidth = phoneSize.width;
    double displayHeight = phoneSize.height;

    // Calculate grid columns and rows based on responsive design metrics
    double cellSize = (displayWidth - (paddingHorizontal * 2)) / _gridCols;
    _gridRows = (displayHeight / cellSize).floor();

    return Scaffold(
      body: GestureDetector(
        onPanEnd: _handleSwipe,
        behavior: HitTestBehavior.translucent,
        child: Stack(
          children: [
            // ==========================================
            // MAIN BACKROUND: THE FULL GAME WORLD CANVAS
            // ==========================================
            Positioned.fill(
              child: Container(
                color: const Color(0xFF070B13),
                child: CustomPaint(
                  painter: GameGridPainter(
                    snake: _snake,
                    foods: _foods,
                    gridCols: _gridCols,
                    gridRows: _gridRows,
                    cellSize: cellSize,
                    marginHorizontal: paddingHorizontal,
                    themeColor: _currentStageConfig.primaryColor,
                  ),
                ),
              ),
            ),

            // Correct Action Flash Overlay (Flashing green tint)
            if (_correctFlash)
              Positioned.fill(
                child: IgnorePointer(
                  child: Container(
                    color: Colors.emerald.withOpacity(0.18),
                  ),
                ),
              ),

            // Negative Penalty Flash Overlay (Flashing crimson tint)
            if (_penaltyFlash)
              Positioned.fill(
                child: IgnorePointer(
                  child: Container(
                    color: Colors.red.withOpacity(0.24),
                  ),
                ),
              ),

            // ==========================================================
            // HUD OVERLAY: GLASSMORPHIC TOP CONTROL BAR (TOP 12% HEIGHT)
            // ==========================================================
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: displayHeight * 0.15,
              child: ClipRRect(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 16.0, sigmaY: 16.0),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.45),
                      border: Border(
                        bottom: BorderSide(
                          color: _currentStageConfig.primaryColor.withOpacity(0.35),
                          width: 1.5,
                        ),
                      ),
                    ),
                    padding: EdgeInsets.only(
                      top: MediaQuery.of(context).padding.top + 8,
                      left: 20,
                      right: 20,
                      bottom: 8,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Left Section: Active Equation
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'SOLVE FORMULA',
                              style: TextStyle(
                                fontSize: 9,
                                letterSpacing: 2,
                                fontWeight: FontWeight.bold,
                                color: _currentStageConfig.accentColor.withOpacity(0.85),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _gameStatus == GameStatus.playing && _currentEquation != null
                                  ? _currentEquation!.text
                                  : 'MATH SNAKE',
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                fontFamily: 'monospace',
                                shadows: [
                                  Shadow(
                                    blurRadius: 10.0,
                                    color: Colors.black45,
                                    offset: Offset(2, 2),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        // Right Section: Scores & Progress Level
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Row(
                              children: List.generate(3, (idx) {
                                return Icon(
                                  Icons.favorite,
                                  size: 14,
                                  color: idx < _lives ? Colors.redAccent : Colors.grey.shade800,
                                );
                              }),
                            ),
                            const SizedBox(height: 4),
                            RichText(
                              text: TextSpan(
                                style: const TextStyle(fontFamily: 'monospace'),
                                children: [
                                  TextSpan(
                                    text: 'SCORE: ',
                                    style: TextStyle(
                                      color: Colors.grey.shade400,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  TextSpan(
                                    text: '$_score',
                                    style: TextStyle(
                                      color: _currentStageConfig.accentColor,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'LVL $_stageId (${_stageCorrectCount}/${_currentStageConfig.targetToWin})',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.black,
                                color: Colors.white.withOpacity(0.7),
                              ),
                            ),
                          ],
                        )
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // ==========================================
            // MODAL MENUS & TRANSITION PAGES OVERLAYS
            // ==========================================
            if (_gameStatus == GameStatus.start)
              _buildMenuOverlay(
                title: 'MATH SNAKE',
                subtitle: 'CLASSIC ARITHMETIC REWRIITTEN',
                buttonText: 'BEGIN SLITHER',
                description: 'Swipe anywhere to glide. Collect correct floating numerical answers, avoid obstacles and decoy wrong values!',
                onPressed: () => _startStage(1, true),
              ),

            if (_gameStatus == GameStatus.gameOver)
              _buildMenuOverlay(
                title: 'GAME OVER',
                subtitle: 'MATH SKILL RE-EVALUATION REQUIRED',
                buttonText: 'TRY AGAIN',
                description: 'Score reached: $_score PTS.\nCompleted stage level: $_stageId/5',
                primaryColor: Colors.redAccent,
                onPressed: _resetGame,
              ),

            if (_gameStatus == GameStatus.victory)
              _buildMenuOverlay(
                title: 'GRAND CHAMPION',
                subtitle: 'SNAKE LEGEND STATUS UNLOCKED',
                buttonText: 'REPLAY CAMPAIGN',
                description: 'Incredible speed and calculation! You finished all 5 arithmetic domains with a score of $_score points.',
                primaryColor: Colors.amberAccent,
                onPressed: _resetGame,
              ),
          ],
        ),
      ),
    );
  }

  // Helper widget to construct overlays
  Widget _buildMenuOverlay({
    required String title,
    required String subtitle,
    required String buttonText,
    required String description,
    required VoidCallback onPressed,
    Color primaryColor = const Color(0xFF10B981),
  }) {
    return Positioned.fill(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8.0, sigmaY: 8.0),
        child: Container(
          color: Colors.black.withOpacity(0.85),
          padding: const EdgeInsets.symmetric(horizontal: 32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 38,
                  fontWeight: FontWeight.black,
                  letterSpacing: 1,
                  color: primaryColor,
                  fontFamily: 'monospace',
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 3,
                  color: Colors.white.withOpacity(0.8),
                ),
              ),
              const SizedBox(height: 32),
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: primaryColor.withOpacity(0.3)),
                  color: Colors.white.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(16),
                ),
                padding: const EdgeInsets.all(20),
                child: Text(
                  description,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.6,
                    color: Colors.grey.shade300,
                  ),
                ),
              ),
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: const Color(0xFF030712),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 5,
                  ),
                  onPressed: onPressed,
                  child: Text(
                    buttonText,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.black,
                      letterSpacing: 2,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ==========================================
// CUSTOM PAINTER TO RENDER SNAKE & GRID MAP
// ==========================================
class GameGridPainter extends CustomPainter {
  final List<Point> snake;
  final List<FoodItem> foods;
  final int gridCols;
  final int gridRows;
  final double cellSize;
  final double marginHorizontal;
  final Color themeColor;

  GameGridPainter({
    required this.snake,
    required this.foods,
    required this.gridCols,
    required this.gridRows,
    required this.cellSize,
    required this.marginHorizontal,
    required this.themeColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = Colors.white.withOpacity(0.02)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.5;

    // Draw background dot grid for premium high-tech depth
    _drawDotGrid(canvas, gridPaint);

    // Draw Foods (numerical questions) with surrounding premium aura rings
    _drawFoodNodes(canvas);

    // Draw Snake Body
    _drawSnakeSlinky(canvas);
  }

  void _drawDotGrid(Canvas canvas, Paint paint) {
    for (int x = 0; x <= gridCols; x++) {
      double startX = marginHorizontal + (x * cellSize);
      canvas.drawLine(
        Offset(startX, 0),
        Offset(startX, gridRows * cellSize),
        paint,
      );
    }
    for (int y = 0; y <= gridRows; y++) {
      canvas.drawLine(
        Offset(marginHorizontal, y * cellSize),
        Offset(marginHorizontal + (gridCols * cellSize), y * cellSize),
        paint,
      );
    }
  }

  void _drawFoodNodes(Canvas canvas) {
    for (var food in foods) {
      double xOffset = marginHorizontal + (food.position.x * cellSize) + (cellSize / 2);
      double yOffset = (food.position.y * cellSize) + (cellSize / 2);

      // Gradient selection color logic
      Color foodColor = food.isCorrect ? themeColor : Colors.grey.shade400;

      // Glow effect circle outline
      final paintGlow = Paint()
        ..color = foodColor.withOpacity(0.12)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset(xOffset, yOffset), cellSize * 1.5, paintGlow);

      final paintOutline = Paint()
        ..color = foodColor.withOpacity(0.6)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0;
      canvas.drawCircle(Offset(xOffset, yOffset), cellSize * 0.75, paintOutline);

      // Solid inner core background bubble
      final paintCore = Paint()
        ..color = food.isCorrect ? themeColor : const Color(0xFF1E293B)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset(xOffset, yOffset), cellSize * 0.45, paintCore);

      // Draw the mathematical query option value (aligned core center)
      _drawCenteredText(
        canvas,
        Offset(xOffset, yOffset),
        food.value.toString(),
        TextStyle(
          fontSize: (cellSize * 0.45),
          fontWeight: FontWeight.black,
          color: food.isCorrect ? const Color(0xFF070B13) : Colors.white,
          fontFamily: 'Courier New',
        ),
      );
    }
  }

  void _drawSnakeSlinky(Canvas canvas) {
    if (snake.isEmpty) return;

    for (int i = 0; i < snake.length; i++) {
      final pos = snake[i];
      double xOffset = marginHorizontal + (pos.x * cellSize) + (cellSize / 2);
      double yOffset = (pos.y * cellSize) + (cellSize / 2);

      if (i == 0) {
        // Snake Head Segment (Distinct filled block)
        final headPaint = Paint()
          ..color = themeColor
          ..style = PaintingStyle.fill;
        
        final rrect = RRect.fromRectAndRadius(
          Rect.fromCircle(center: Offset(xOffset, yOffset), radius: cellSize * 0.46),
          const Radius.circular(5.0),
        );
        canvas.drawRRect(rrect, headPaint);

        // Eyes dots
        final eyePaint = Paint()
          ..color = const Color(0xFF030712)
          ..style = PaintingStyle.fill;
        canvas.drawCircle(Offset(xOffset - (cellSize * 0.16), yOffset - (cellSize * 0.16)), cellSize * 0.08, eyePaint);
        canvas.drawCircle(Offset(xOffset + (cellSize * 0.16), yOffset - (cellSize * 0.16)), cellSize * 0.08, eyePaint);
      } else {
        // Snake Body Segment
        final bodyPaint = Paint()
          ..color = themeColor.withOpacity(1.0 - (i / snake.length) * 0.55)
          ..style = PaintingStyle.fill;

        final rrect = RRect.fromRectAndRadius(
          Rect.fromCircle(center: Offset(xOffset, yOffset), radius: cellSize * 0.38),
          const Radius.circular(3.0),
        );
        canvas.drawRRect(rrect, bodyPaint);
      }
    }
  }

  void _drawCenteredText(Canvas canvas, Offset position, String text, TextStyle style) {
    final textPainter = TextPainter(
      text: TextSpan(text: text, style: style),
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      position - Offset(textPainter.width / 2, textPainter.height / 2),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
