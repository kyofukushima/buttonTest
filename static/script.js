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

    let size = 100;
    let airAmount = 0;
    const maxAir = 100;
    const deflationRate = 0.5; // 空気が抜ける速度
    let isGameOver = false;
    let maenoCount = 0;
    let bossActive = false;
    let bossHealth = 100;
    let bossSize = 300;
    const BOSS_REGEN_RATE = 5; // HP回復率（1秒あたり）
    const BOSS_DAMAGE = 10; // クリックあたりのダメージ
    let bossInstance = null;

    const MAX_IMAGES = 6; // 最大表示数を設定

    // 風船の大きさを更新する関数
    function updateBalloonSize() {
        size = 100 + (airAmount * 2);
        balloon.style.width = `${size}px`;
        balloon.style.height = `${size}px`;
    }

    // 空気を抜く処理（定期的に実行）
    setInterval(() => {
        if (!isGameOver && airAmount > 0) {
            airAmount = Math.max(0, airAmount - deflationRate);
            updateBalloonSize();
        }
    }, 100);

    // ボタンクリック時の処理
    dangerButton.addEventListener('click', () => {
        if (isGameOver) return;

        // 空気を追加
        airAmount += 5;
        updateBalloonSize();

        // ボタンを振動させる
        dangerButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            dangerButton.style.transform = 'scale(1)';
        }, 50);

        // 破裂判定
        if (airAmount >= maxAir) {
            popBalloon();
        }
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
        
        img.addEventListener('click', function(e) {
            createHitEffect(e.clientX, e.clientY);
            
            this.style.transform += ' scale(0)';
            this.style.opacity = '0';
            
            // カウンターを更新
            updateCounter();
            
            setTimeout(() => {
                this.remove();
                checkAndSpawnNewImages();
            }, 500);
        });
        
        return img;
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
        isGameOver = true;
        
        popSound.play();

        // ボタンのz-indexを下げてからフェードアウト
        dangerButton.classList.add('game-started');
        dangerButton.style.opacity = '0';
        setTimeout(() => {
            dangerButton.style.display = 'none';
            
            // カーソルを照準に変更
            document.body.classList.add('crosshair-cursor');
            
            // カウンターを表示
            counter.classList.remove('hidden');
            setTimeout(() => {
                counter.classList.add('visible');
            }, 100);
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
        
        // 初期画像をランダムな数（1-6）で生成
        const initialCount = Math.floor(Math.random() * MAX_IMAGES) + 1;
        spawnMaenoImages(initialCount);
        
        setTimeout(() => {
            balloon.style.display = 'none';
            gameOver.classList.remove('hidden');
            gameOver.classList.add('visible');
        }, 500);
    }

    // クリックエフェクトを更新（照準に合わせた効果）
    function createHitEffect(x, y) {
        const effect = document.createElement('div');
        effect.className = 'hit-effect';
        effect.style.left = (x - 25) + 'px';
        effect.style.top = (y - 25) + 'px';
        
        document.body.appendChild(effect);
        
        effect.addEventListener('animationend', () => {
            effect.remove();
        });
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
        
        // アニメーション速度を設定
        updateBossSpeed(boss);
        
        boss.addEventListener('click', handleBossClick);
        
        return boss;
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

    function handleBossClick() {
        bossHealth = Math.max(0, bossHealth - BOSS_DAMAGE);
        bossSize = 300 * (bossHealth / 100);
        
        hpFill.style.width = `${bossHealth}%`;
        this.style.width = `${bossSize}px`;
        
        // 速度を更新
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
        // カウンターをリセット
        maenoCount = 0;
        countDisplay.textContent = maenoCount;
        
        // ボス関連の状態をリセット
        bossActive = false;
        bossHealth = 100;
        bossSize = 300;
        
        // UI要素を非表示
        congratulation.classList.remove('visible');
        victoryImages.classList.remove('visible');
        counter.classList.remove('visible');
        bossHP.classList.remove('visible');
        retryButton.classList.remove('visible');
        
        setTimeout(() => {
            congratulation.classList.add('hidden');
            victoryImages.classList.add('hidden');
            counter.classList.add('hidden');
            bossHP.classList.add('hidden');
            retryButton.classList.add('hidden');
        }, 500);

        // メインボタンを再表示
        dangerButton.classList.remove('game-started');
        dangerButton.style.display = 'block';
        dangerButton.style.opacity = '1';
        
        // 照準カーソルを元に戻す
        document.body.classList.remove('crosshair-cursor');
        
        // 風船を再表示
        balloon.style.display = 'block';
        balloon.classList.remove('exploding');
        
        // 既存の画像をクリア
        const container = document.getElementById('maeno-container');
        while (container.firstChild) {
            container.firstChild.remove();
        }
        
        // ゲームオーバー状態をリセット
        isGameOver = false;
    }

    // リトライボタンのクリックイベント
    retryButton.addEventListener('click', resetGame);

    // defeatedBoss関数を更新
    function defeatedBoss() {
        bossActive = false;
        bossInstance.remove();
        bossInstance = null;
        bossHP.classList.remove('visible');
        
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
}); 