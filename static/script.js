document.addEventListener('DOMContentLoaded', function() {
    const balloon = document.getElementById('balloon');
    const dangerButton = document.getElementById('dangerButton');
    const gameOver = document.getElementById('gameOver');
    const popSound = document.getElementById('popSound');
    const counter = document.getElementById('counter');
    const countDisplay = document.getElementById('count');
    const bossHP = document.getElementById('bossHP');
    const hpFill = document.querySelector('.hp-fill');
    const congratulation = document.getElementById('congratulation');
    const victoryImages = document.getElementById('victory-images');
    const retryButton = document.getElementById('retryButton');
    const warningText = document.getElementById('warningText');

    // デバッグ用の要素を取得
    const currentAirDisplay = document.getElementById('currentAirDisplay');
    const maxAirDisplay = document.getElementById('maxAirDisplay');
    const warningThresholdDisplay = document.getElementById('warningThresholdDisplay');
    const balloonSizeDisplay = document.getElementById('balloonSizeDisplay');

    let size = 100;
    let airAmount = 0;
    const MAX_AIR = 100;
    const WARNING_THRESHOLD = 80;
    const AIR_INCREMENT = 5;
    const DEFLATION_RATE = 0.5;
    let isGameOver = false;
    let maenoCount = 0;
    let bossActive = false;
    let bossHealth = 100;
    let bossSize = 300;
    const BOSS_REGEN_RATE = 5; // HP回復率（1秒あたり）
    const BOSS_DAMAGE = 10; // クリックあたりのダメージ
    let bossInstance = null;
    const MAX_IMAGES = 6; // 最大表示数を設定

    // 照準とレーザーの制御
    let targetReticle = null;

    let isBalloonPopped = false; // 風船が破裂したかどうかのフラグ

    // ダブルタップによるズームを防止
    document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 100) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });

    // ピンチズームを防止
    document.addEventListener('gesturestart', function(event) {
        event.preventDefault();
    });

    // デバッグ情報の初期表示
    function updateDebugDisplay() {
        currentAirDisplay.textContent = airAmount.toFixed(1);
        maxAirDisplay.textContent = MAX_AIR;
        warningThresholdDisplay.textContent = WARNING_THRESHOLD;
        balloonSizeDisplay.textContent = size;
        
        // 値の色による警告表示
        if (airAmount >= WARNING_THRESHOLD) {
            currentAirDisplay.style.color = '#ff0000';
        } else {
            currentAirDisplay.style.color = '#ffffff';
        }
    }

    // ボタンクリック時の処理を修正
    dangerButton.addEventListener('click', () => {
        if (isGameOver) return;

        // 空気量を増加
        airAmount += AIR_INCREMENT;
        
        // 空気量をチェック
        if (airAmount >= MAX_AIR) {
            hideWarning();
            popBalloon();
            return; // 破裂後の処理を終了
        }

        // 警告表示の制御
        if (airAmount >= WARNING_THRESHOLD) {
            showWarning();
        }

        // 風船のサイズを更新
        updateBalloonSize();

        // ボタンのアニメーション
        dangerButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            dangerButton.style.transform = 'scale(1)';
        }, 50);
    });

    function getRandomVisiblePosition() {
        // ビューポート内のランダムな位置を取得
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const imageWidth = 150; // 画像の幅
        const imageHeight = 150; // 画像の高さ

        // スクロール位置を考慮
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

        return {
            x: scrollLeft + Math.random() * (viewportWidth - imageWidth),
            y: scrollTop + Math.random() * (viewportHeight - imageHeight)
        };
    }

    function updateCounter() {
        maenoCount++;
        countDisplay.textContent = maenoCount;
        
        // カウンター更新時のアニメーション効果
        countDisplay.style.transform = 'scale(1.2)';
        setTimeout(() => {
            countDisplay.style.transform = 'scale(1)';
        }, 100);

        // カウンターが20を超えたらボスを出現
        if (maenoCount >= 20 && !bossActive) {
            bossActive = true;
            bossHealth = 100;
            bossSize = 300;
            
            // 通常の的を全て削除
            const container = document.getElementById('maeno-container');
            while (container.firstChild) {
                container.firstChild.remove();
            }
            
            // ボスを出現
            bossInstance = createBoss();
            container.appendChild(bossInstance);
            
            // HPバーを表示
            bossHP.classList.remove('hidden');
            setTimeout(() => {
                bossHP.classList.add('visible');
            }, 100);
            
            // HPバーを初期化
            hpFill.style.width = '100%';
        }
    }

    function createMaenoImage() {
        const img = document.createElement('img');
        img.src = '/static/images/maeno_up.gif';
        img.className = 'maeno-image';
        
        const position = getRandomVisiblePosition();
        img.style.left = `${position.x}px`;
        img.style.top = `${position.y}px`;
        
        let isTouching = false;
        
        img.addEventListener('touchstart', function(e) {
            e.preventDefault();
            isTouching = true;
            handleImageClick.call(this, e);
        });

        img.addEventListener('touchend', function(e) {
            e.preventDefault();
            isTouching = false;
        });

        img.addEventListener('click', function(e) {
            if (!isTouching) {
                handleImageClick.call(this, e);
            }
        });
        
        return img;
    }

    function initializeTargetSystem() {
        // 照準を作成
        targetReticle = document.createElement('div');
        targetReticle.className = 'target-reticle';
        document.body.appendChild(targetReticle);
    }

    function createLaserBeam(startX, startY, endX, endY) {
        const laserContainer = document.createElement('div');
        laserContainer.className = 'laser-beam';
        
        const laserCore = document.createElement('div');
        laserCore.className = 'laser-core';
        
        const laserGlow = document.createElement('div');
        laserGlow.className = 'laser-glow';

        // レーザーの長さと角度を計算
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        // スマホ表示時のレーザーサイズ調整
        const isMobile = window.innerWidth <= 768;
        const coreHeight = isMobile ? '2px' : '4px';
        const glowHeight = isMobile ? '8px' : '12px';
        
        laserCore.style.width = `${length}px`;
        laserCore.style.height = coreHeight;
        laserCore.style.background = 'rgba(255, 0, 0, 1)';
        
        laserGlow.style.width = `${length}px`;
        laserGlow.style.height = glowHeight;
        laserGlow.style.top = '-4px';
        
        // 位置設定
        laserContainer.style.left = `${startX}px`;
        laserContainer.style.top = `${startY}px`;
        laserContainer.style.transformOrigin = '0 0';
        laserContainer.style.transform = `rotate(${angle}deg)`;

        laserContainer.appendChild(laserGlow);
        laserContainer.appendChild(laserCore);
        document.body.appendChild(laserContainer);

        // ヒットエフェクト
        setTimeout(() => {
            createHitEffect(endX, endY);
        }, 100);

        // 要素の削除
        setTimeout(() => {
            laserContainer.remove();
        }, 300);
    }

    function handleImageClick(e) {
        const x = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const y = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        
        // レーザービームを生成
        createLaserBeam(x, y, x, y);
        
        // ヒットエフェクト
        createHitEffect(x, y);
        
        this.style.transform += ' scale(0)';
        this.style.opacity = '0';
        
        updateCounter();
        
        setTimeout(() => {
            this.remove();
            checkAndSpawnNewImages();
        }, 500);
    }

    function checkAndSpawnNewImages() {
        const container = document.getElementById('maeno-container');
        const currentImages = container.children.length;

        if (currentImages === 0) {
            // ランダムな数（1-6）の画像を生成
            const numberOfImages = Math.floor(Math.random() * MAX_IMAGES) + 1;
            spawnMaenoImages(numberOfImages);
        }
    }

    function spawnMaenoImages(count) {
        const container = document.getElementById('maeno-container');
        const actualCount = Math.min(count, MAX_IMAGES); // 最大数を制限

        for (let i = 0; i < actualCount; i++) {
            setTimeout(() => {
                // 現在の画像数をチェック
                if (container.children.length < MAX_IMAGES) {
                    const img = createMaenoImage();
                    img.style.opacity = '0';
                    img.style.transform = 'scale(0)';
                    container.appendChild(img);

                    requestAnimationFrame(() => {
                        img.style.opacity = '1';
                        img.style.transform = 'scale(1)';
                    });
                }
            }, i * 200); // 少し間隔を空けて出現
        }
    }

    function popBalloon() {
        console.log('Executing popBalloon function'); // デバッグログ
        isGameOver = true;
        isBalloonPopped = true; // 風船が破裂したらフラグを立てる
        
        hideWarning();
        
        if (popSound) {
            popSound.play().catch(err => console.log('Sound play error:', err));
        }

        dangerButton.style.opacity = '0';
        setTimeout(() => {
            dangerButton.style.display = 'none';
            document.body.classList.add('crosshair-cursor');
            
            counter.classList.remove('hidden');
            setTimeout(() => {
                counter.classList.add('visible');
            }, 100);

            if (!bossActive) {
                gameOver.classList.remove('hidden');
                setTimeout(() => {
                    gameOver.classList.add('visible');
                }, 200);
            }
        }, 500);

        const flash = document.createElement('div');
        flash.className = 'flash';
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.style.opacity = '1';
        }, 0);
        
        setTimeout(() => {
            flash.style.opacity = '0';
        }, 100);

        setTimeout(() => {
            flash.remove();
        }, 200);

        balloon.classList.add('exploding');
        
        const initialCount = Math.floor(Math.random() * 6) + 1;
        spawnMaenoImages(initialCount);
        
        setTimeout(() => {
            balloon.style.display = 'none';
            gameOver.classList.remove('visible');
            gameOver.classList.add('hidden');
        }, 500);
    }

    // クリックエフェクトを更新（照準に合わせた効果）
    function createHitEffect(x, y) {
        const effect = document.createElement('div');
        effect.className = 'hit-effect';
        effect.style.left = `${x - 20}px`;
        effect.style.top = `${y - 20}px`;
        
        // ヒットエフェクトの内容
        const innerEffect = document.createElement('div');
        innerEffect.style.width = '100%';
        innerEffect.style.height = '100%';
        innerEffect.style.background = 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,0,0,0.8) 30%, rgba(255,0,0,0) 70%)';
        effect.appendChild(innerEffect);
        
        document.body.appendChild(effect);
        
        setTimeout(() => {
            effect.remove();
        }, 300);
    }

    // スクロールイベントの追加（必要に応じて）
    window.addEventListener('scroll', () => {
        const container = document.getElementById('maeno-container');
        Array.from(container.children).forEach(img => {
            const position = getRandomVisiblePosition();
            img.style.left = `${position.x}px`;
            img.style.top = `${position.y}px`;
        });
    });

    function createBoss() {
        const boss = document.createElement('img');
        boss.src = '/static/images/maeno_up.gif';
        boss.className = 'maeno-boss';
        boss.style.width = `${bossSize}px`;
        
        let isTouching = false;
        
        boss.addEventListener('touchstart', function(e) {
            e.preventDefault();
            isTouching = true;
            handleBossClick.call(this, e);
        });

        boss.addEventListener('touchend', function(e) {
            e.preventDefault();
            isTouching = false;
        });

        boss.addEventListener('click', function(e) {
            if (!isTouching) {
                handleBossClick.call(this, e);
            }
        });
        
        return boss;
    }

    function handleBossClick(e) {
        const x = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const y = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        
        // レーザービームを生成
        createLaserBeam(x, y, x, y);
        
        bossHealth = Math.max(0, bossHealth - BOSS_DAMAGE);
        bossSize = 300 * (bossHealth / 100);
        
        hpFill.style.width = `${bossHealth}%`;
        this.style.width = `${bossSize}px`;
        
        updateBossSpeed(this);
        
        // ダメージエフェクト
        this.style.filter = 'brightness(2) drop-shadow(0 0 10px #ff0000)';
        setTimeout(() => {
            this.style.filter = 'drop-shadow(0 0 10px #ff0000)';
        }, 100);
        
        if (bossHealth <= 0) {
            defeatedBoss();
        }
    }

    function updateBossSpeed(boss) {
        // 速度の調整
        const baseSpeed = 12; // 基本速度を12秒に変更（遅く）
        const minSpeed = 4;   // 最小速度を4秒に変更（速すぎない）
        
        // HPに応じた速度計算を緩やかに
        const speedMultiplier = 1 + ((100 - bossHealth) / 200); // 係数を0.5倍に
        const currentSpeed = baseSpeed / speedMultiplier;
        
        // 移動範囲の調整
        const scale = 1 + ((100 - bossHealth) / 150); // スケール変化も緩やかに
        
        boss.style.transform = `scale(${scale})`;
        boss.style.animation = `bossFloat ${Math.max(currentSpeed, minSpeed)}s infinite ease-in-out`;
    }

    // HP回復時の速度更新も追加
    setInterval(() => {
        if (bossActive && bossHealth < 100) {
            bossHealth = Math.min(100, bossHealth + BOSS_REGEN_RATE);
            bossSize = 300 * (bossHealth / 100);
            
            hpFill.style.width = `${bossHealth}%`;
            if (bossInstance) {
                bossInstance.style.width = `${bossSize}px`;
                updateBossSpeed(bossInstance);
            }
        }
    }, 1000);

    // リセット関数を追加
    function resetGame() {
        // 状態変数のリセット
        maenoCount = 0;
        countDisplay.textContent = maenoCount;
        bossActive = false;
        bossHealth = 100;
        bossSize = 300;
        size = 100;  // 風船の初期サイズ
        airAmount = 0;  // 空気量のリセット
        isGameOver = false;

        // UI要素のリセット
        const elementsToHide = [
            congratulation,
            victoryImages,
            counter,
            bossHP,
            retryButton
        ];

        elementsToHide.forEach(element => {
            element.classList.remove('visible');
            setTimeout(() => {
                element.classList.add('hidden');
            }, 500);
        });

        // メインボタンのリセット
        dangerButton.style.display = 'block';
        dangerButton.style.opacity = '1';
        dangerButton.classList.remove('game-started');
        dangerButton.style.transform = 'scale(1)';
        dangerButton.style.pointerEvents = 'auto';

        // 風船のリセット
        balloon.style.display = 'block';
        balloon.classList.remove('exploding');
        balloon.style.width = '100px';
        balloon.style.height = '100px';
        updateBalloonSize();  // 風船サイズを更新

        // カーソルのリセット
        document.body.classList.remove('crosshair-cursor');

        // 既存の画像をクリア
        const container = document.getElementById('maeno-container');
        while (container.firstChild) {
            container.firstChild.remove();
        }

        // スタイルのリセット
        document.body.style.overflow = 'hidden';
        container.style.pointerEvents = 'none';

        // レイアウトの強制リフロー
        void balloon.offsetHeight;

        // 警告テキストもリセット
        hideWarning();
    }

    // リトライボタンのクリックイベント
    retryButton.addEventListener('click', resetGame);

    // defeatedBoss関数を更新
    function defeatedBoss() {
        bossActive = false;
        bossInstance.remove();
        bossInstance = null;
        bossHP.classList.remove('visible');
        
        // YOU MAENOを非表示に
        if (gameOver) {
            gameOver.classList.remove('visible');
            gameOver.style.opacity = '0';
            setTimeout(() => {
                gameOver.classList.add('hidden');
            }, 500);
        }

        // Congratulationの表示
        congratulation.classList.remove('hidden');
        setTimeout(() => {
            congratulation.classList.add('visible');
        }, 100);

        // 勝利画像の表示
        victoryImages.classList.remove('hidden');
        setTimeout(() => {
            victoryImages.classList.add('visible');
        }, 500);

        // リトライボタンを表示
        retryButton.classList.remove('hidden');
        setTimeout(() => {
            retryButton.classList.add('visible');
        }, 1000);
    }

    // 画像のドラッグ防止
    function preventImageDrag() {
        const images = document.querySelectorAll('.balloon-image, .boss-image');
        images.forEach(img => {
            img.addEventListener('dragstart', (e) => e.preventDefault());
            // タッチデバイス用のドラッグ防止
            img.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        });
    }

    // 初期化時に実行
    window.addEventListener('load', () => {
        preventImageDrag();
        initializeTargetSystem();
    });

    // クリック/タップイベントの処理を修正
    document.addEventListener('click', (event) => {
        if (isBalloonPopped) {
            // イベントの伝播を確実に受け取れるようにする
            const targetX = event.pageX || event.clientX;
            const targetY = event.pageY || event.clientY;
            
            // 画面右下から発射
            const startX = window.innerWidth - 50;
            const startY = window.innerHeight - 50;
            
            createLaserBeam(startX, startY, targetX, targetY);
        }
    });

    // タッチデバイス用のイベント処理を追加
    document.addEventListener('touchend', (event) => {
        if (isBalloonPopped) {
            // タッチイベントから座標を取得
            const touch = event.changedTouches[0];
            const targetX = touch.pageX || touch.clientX;
            const targetY = touch.pageY || touch.clientY;
            
            // 画面右下から発射
            const startX = window.innerWidth - 50;
            const startY = window.innerHeight - 50;
            
            createLaserBeam(startX, startY, targetX, targetY);
            
            // タッチイベントのデフォルト動作を防止
            event.preventDefault();
        }
    }, { passive: false });

    // 警告表示の関数
    function showWarning() {
        warningText.classList.remove('hidden');
        setTimeout(() => {
            warningText.classList.add('visible');
        }, 50);
    }

    // 警告非表示の関数
    function hideWarning() {
        warningText.classList.remove('visible');
        setTimeout(() => {
            warningText.classList.add('hidden');
        }, 500);
    }

    function updateBalloonSize() {
        size = 100 + (airAmount * 2);
        balloon.style.width = `${size}px`;
        balloon.style.height = `${size}px`;
        updateDebugDisplay();
    }

    // 空気が抜ける処理
    setInterval(() => {
        if (!isGameOver && airAmount > 0) {
            airAmount = Math.max(0, airAmount - DEFLATION_RATE);
            updateBalloonSize();
            
            if (airAmount < WARNING_THRESHOLD && warningText.classList.contains('visible')) {
                hideWarning();
            }
        }
    }, 100);

    // 初期表示
    updateDebugDisplay();

    // 画像サイズの動的調整機能を追加
    function adjustImageSize() {
        const balloon = document.querySelector('.balloon-image');
        const boss = document.querySelector('.boss-image');
        
        // 画面サイズに基づいて基準となるサイズを計算
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (balloon) {
            // 風船の初期サイズを設定
            let initialSize = Math.min(viewportWidth * 0.4, 300);
            if (viewportWidth <= 480) {
                initialSize = Math.min(viewportWidth * 0.3, 200);
            }
            balloon.style.width = `${initialSize}px`;
        }
        
        if (boss) {
            // ボスの初期サイズを設定
            let bossSize = Math.min(viewportWidth * 0.35, 250);
            if (viewportWidth <= 480) {
                bossSize = Math.min(viewportWidth * 0.25, 180);
            }
            boss.style.width = `${bossSize}px`;
        }
    }

    // リサイズイベントとロード時に画像サイズを調整
    window.addEventListener('resize', adjustImageSize);
    window.addEventListener('load', adjustImageSize);
}); 