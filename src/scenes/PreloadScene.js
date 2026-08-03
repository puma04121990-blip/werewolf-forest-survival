export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        this.createProceduralTextures();
    }

    createProceduralTextures() {
        // ==========================================
        // 1. ИГРОК: ОБОРОТЕНЬ (Человекоподобный Волк)
        // ==========================================
        const gPlayer = this.make.graphics({ x: 0, y: 0, add: false });
        // Тёмно-серый мощный торс с шерстью
        gPlayer.fillStyle(0x2a332e, 1.0);
        gPlayer.fillRect(10, 16, 20, 20); // Плечи/грудь

        // Голова волка с мордой и ушами
        gPlayer.fillStyle(0x1e2621, 1.0);
        gPlayer.beginPath();
        gPlayer.moveTo(20, 2);  // Нос/морда
        gPlayer.lineTo(36, 12); // Правое ухо
        gPlayer.lineTo(30, 22);
        gPlayer.lineTo(10, 22);
        gPlayer.lineTo(4, 12);  // Левое ухо
        gPlayer.closePath();
        gPlayer.fillPath();

        // Острые уши
        gPlayer.fillStyle(0x121a15, 1.0);
        gPlayer.fillTriangle(4, 12, 0, 0, 10, 8);   // Левое ухо
        gPlayer.fillTriangle(36, 12, 40, 0, 30, 8); // Правое ухо

        // Вытянутые когтистые лапы
        gPlayer.fillStyle(0x3a483e, 1.0);
        gPlayer.fillTriangle(6, 20, 0, 36, 10, 32);  // Левая лапа
        gPlayer.fillTriangle(34, 20, 40, 36, 30, 32); // Правая лапа

        // Клыки и горящие жёлтые глаза
        gPlayer.fillStyle(0xffea00, 1.0); // Жёлтые глаза
        gPlayer.fillCircle(14, 10, 3);
        gPlayer.fillCircle(26, 10, 3);

        gPlayer.fillStyle(0xffffff, 1.0); // Белые клыки
        gPlayer.fillTriangle(17, 18, 19, 24, 18, 18);
        gPlayer.fillTriangle(21, 18, 23, 24, 22, 18);

        gPlayer.generateTexture('player', 40, 40);

        // ==========================================
        // 2. ВРАГ 1: КРЕСТЬЯНИН С ВИЛАМИ (Scout)
        // ==========================================
        const gVillager = this.make.graphics({ x: 0, y: 0, add: false });
        // Голова и коричневая рубаха
        gVillager.fillStyle(0x664422, 1.0); // Рубаха
        gVillager.fillRect(8, 14, 16, 18);
        gVillager.fillStyle(0xd2a679, 1.0); // Лицо/кожа
        gVillager.fillCircle(16, 10, 7);

        // Шапка крестьянина
        gVillager.fillStyle(0x442211, 1.0);
        gVillager.fillRect(8, 3, 16, 5);

        // Вилы (деревянный черенок + 3 металлических зубца)
        gVillager.fillStyle(0x885522, 1.0); // Деревянный черенок
        gVillager.fillRect(22, 0, 3, 32);
        gVillager.fillStyle(0xaaaaaa, 1.0); // Металлические зубцы
        gVillager.fillRect(20, 0, 7, 2);
        gVillager.fillRect(20, -4, 2, 5);
        gVillager.fillRect(23, -4, 2, 5);
        gVillager.fillRect(26, -4, 2, 5);

        gVillager.generateTexture('enemy_scout', 32, 32);

        // ==========================================
        // 3. ВРАГ 2: АРБАЛЕТЧИК / ОХОТНИК (Shooter)
        // ==========================================
        const gCrossbow = this.make.graphics({ x: 0, y: 0, add: false });
        // Тёмно-зелёный плащ с капюшоном
        gCrossbow.fillStyle(0x1f381f, 1.0);
        gCrossbow.fillTriangle(16, 2, 32, 30, 0, 30);

        // Маска / затенённое лицо
        gCrossbow.fillStyle(0x112211, 1.0);
        gCrossbow.fillCircle(16, 12, 6);
        gCrossbow.fillStyle(0xff3300, 1.0); // Красный глаз/прицел
        gCrossbow.fillCircle(16, 12, 2);

        // Арбалет в руках
        gCrossbow.fillStyle(0x664411, 1.0);
        gCrossbow.fillRect(10, 18, 12, 4); // Дуга
        gCrossbow.fillRect(14, 14, 4, 12); // Ложе
        gCrossbow.fillStyle(0xcccccc, 1.0); // Стрела
        gCrossbow.fillRect(15, 10, 2, 8);

        gCrossbow.generateTexture('enemy_shooter', 32, 32);

        // ==========================================
        // 4. ВРАГ 3: ВАМПИР С КРЫЛЬЯМИ (Chaser)
        // ==========================================
        const gVampire = this.make.graphics({ x: 0, y: 0, add: false });
        // Чёрно-красные плащ-крылья летучей мыши
        gVampire.fillStyle(0x220011, 1.0);
        gVampire.beginPath();
        gVampire.moveTo(16, 6);
        gVampire.lineTo(32, 2);
        gVampire.lineTo(28, 20);
        gVampire.lineTo(16, 32);
        gVampire.lineTo(4, 20);
        gVampire.lineTo(0, 2);
        gVampire.closePath();
        gVampire.fillPath();

        // Белое бледное лицо и алый воротник
        gVampire.fillStyle(0x880022, 1.0); // Красный воротник
        gVampire.fillTriangle(16, 10, 24, 24, 8, 24);
        gVampire.fillStyle(0xeedddd, 1.0); // Бледное лицо
        gVampire.fillCircle(16, 12, 6);
        gVampire.fillStyle(0xff0033, 1.0); // Горящие красные глаза
        gVampire.fillCircle(14, 11, 2);
        gVampire.fillCircle(18, 11, 2);

        gVampire.generateTexture('enemy_chaser', 32, 32);

        // ==========================================
        // 5. ВРАГ 4: ВРАЖДЕСКИЙ ОБОРОТЕНЬ (Tank)
        // ==========================================
        const gRivalWolf = this.make.graphics({ x: 0, y: 0, add: false });
        // Буро-красный массивный вожак стаи
        gRivalWolf.fillStyle(0x3a1208, 1.0);
        gRivalWolf.fillRect(6, 12, 24, 22);

        // Голова волчары со шрамом
        gRivalWolf.fillStyle(0x260a04, 1.0);
        gRivalWolf.fillTriangle(18, 0, 36, 18, 0, 18);
        gRivalWolf.fillStyle(0xff2200, 1.0); // Алые яростные глаза
        gRivalWolf.fillCircle(12, 10, 3);
        gRivalWolf.fillCircle(24, 10, 3);

        // Острые когти
        gRivalWolf.fillStyle(0x661808, 1.0);
        gRivalWolf.fillTriangle(4, 18, 0, 32, 8, 28);
        gRivalWolf.fillTriangle(32, 18, 36, 32, 28, 28);

        gRivalWolf.generateTexture('enemy_tank', 36, 36);

        // ==========================================
        // 5b. ЭЛИТА: СЕРЕБРЯНЫЙ ОХОТНИК (Elite)
        // ==========================================
        const gElite = this.make.graphics({ x: 0, y: 0, add: false });
        gElite.fillStyle(0x334455, 1.0);
        gElite.fillRect(6, 12, 28, 24);
        gElite.fillStyle(0xc0d0e0, 1.0); // silver armor
        gElite.fillRect(10, 14, 20, 18);
        gElite.fillStyle(0x1a2030, 1.0);
        gElite.fillCircle(20, 10, 8);
        gElite.fillStyle(0x66ffcc, 1.0);
        gElite.fillCircle(17, 9, 2);
        gElite.fillCircle(23, 9, 2);
        gElite.fillStyle(0xaabbcc, 1.0);
        gElite.fillRect(30, 4, 4, 28);
        gElite.generateTexture('enemy_elite', 36, 36);

        // ==========================================
        // 6. БОСС: ВЕЛИКИЙ ИНКВИЗИЦИОННЫЙ ЛОРД (Boss)
        // ==========================================
        const gBoss = this.make.graphics({ x: 0, y: 0, add: false });
        // Огромный рыцарь-инквизитор в золотой броне и алом плаще
        gBoss.fillStyle(0x880000, 1.0); // Алый плащ
        gBoss.fillRect(8, 16, 48, 44);

        gBoss.fillStyle(0xcc9900, 1.0); // Золотой доспех
        gBoss.fillRect(16, 20, 32, 36);

        // Шлем с короной / забралом
        gBoss.fillStyle(0xddaa11, 1.0);
        gBoss.fillCircle(32, 16, 14);
        gBoss.fillStyle(0xff0033, 1.0); // Забрало со свечением
        gBoss.fillRect(22, 14, 20, 4);

        // Огромный двуручный меч
        gBoss.fillStyle(0xeeeeee, 1.0);
        gBoss.fillRect(50, 0, 6, 60);
        gBoss.fillStyle(0xffaa00, 1.0);
        gBoss.fillRect(44, 44, 18, 4);

        gBoss.generateTexture('enemy_boss', 64, 64);

        // ==========================================
        // 6b. БОСС: ЛУННАЯ ВЕДЬМА (boss_witch)
        // ==========================================
        const gWitch = this.make.graphics({ x: 0, y: 0, add: false });
        gWitch.fillStyle(0x2a1040, 1.0);
        gWitch.fillTriangle(32, 4, 56, 56, 8, 56);
        gWitch.fillStyle(0x6a30aa, 1.0);
        gWitch.fillCircle(32, 22, 14);
        gWitch.fillStyle(0xcc88ff, 1.0);
        gWitch.fillCircle(32, 20, 8);
        gWitch.fillStyle(0xff66cc, 1.0);
        gWitch.fillCircle(28, 18, 2);
        gWitch.fillCircle(36, 18, 2);
        gWitch.fillStyle(0xaa66ff, 1.0);
        gWitch.fillCircle(18, 40, 6);
        gWitch.fillCircle(46, 40, 6);
        gWitch.generateTexture('enemy_boss_witch', 64, 64);

        // ==========================================
        // 6c. БОСС: ЗВЕРЬ ЛЕСА (boss_beast)
        // ==========================================
        const gBeast = this.make.graphics({ x: 0, y: 0, add: false });
        gBeast.fillStyle(0x3a2208, 1.0);
        gBeast.fillRect(10, 18, 44, 36);
        gBeast.fillStyle(0x5a3010, 1.0);
        gBeast.fillTriangle(32, 2, 58, 28, 6, 28);
        gBeast.fillStyle(0xff4400, 1.0);
        gBeast.fillCircle(22, 18, 4);
        gBeast.fillCircle(42, 18, 4);
        gBeast.fillStyle(0x221100, 1.0);
        gBeast.fillTriangle(8, 28, 0, 52, 16, 48);
        gBeast.fillTriangle(56, 28, 64, 52, 48, 48);
        gBeast.fillStyle(0xffaa00, 1.0);
        gBeast.fillTriangle(28, 24, 32, 36, 36, 24);
        gBeast.generateTexture('enemy_boss_beast', 64, 64);

        // Элементы оружия и снарядов
        // Кровавый разрез (Клочья)
        const gClaw = this.make.graphics({ x: 0, y: 0, add: false });
        gClaw.fillStyle(0xff0033, 1.0);
        gClaw.fillCircle(6, 6, 6);
        gClaw.generateTexture('bullet', 12, 12);

        // Стрела арбалета
        const gArrow = this.make.graphics({ x: 0, y: 0, add: false });
        gArrow.fillStyle(0xffcc00, 1.0);
        gArrow.fillRect(2, 4, 10, 4);
        gArrow.generateTexture('enemy_bullet', 12, 12);

        // Призрачный волк
        const gSpiritWolf = this.make.graphics({ x: 0, y: 0, add: false });
        gSpiritWolf.fillStyle(0x88ffff, 1.0);
        gSpiritWolf.fillTriangle(0, 9, 20, 0, 20, 18);
        gSpiritWolf.generateTexture('rocket', 20, 18);

        // Кровавая руна
        const gRune = this.make.graphics({ x: 0, y: 0, add: false });
        gRune.lineStyle(2, 0xff0055, 1.0);
        gRune.fillStyle(0x330011, 1.0);
        gRune.fillCircle(10, 10, 8);
        gRune.strokeCircle(10, 10, 8);
        gRune.fillStyle(0xff3300, 1.0);
        gRune.fillCircle(10, 10, 3);
        gRune.generateTexture('mine', 20, 20);

        // Эссенция Луны (ядро + ободок — тинт задаёт цвет тира)
        const gOrb = this.make.graphics({ x: 0, y: 0, add: false });
        gOrb.fillStyle(0xffffff, 1.0);
        gOrb.fillCircle(10, 10, 9);
        gOrb.fillStyle(0xdddddd, 1.0);
        gOrb.fillCircle(10, 10, 5);
        gOrb.lineStyle(2, 0xffffff, 0.9);
        gOrb.strokeCircle(10, 10, 9);
        gOrb.generateTexture('xp_orb', 20, 20);

        // Туша мяса
        const gMeat = this.make.graphics({ x: 0, y: 0, add: false });
        gMeat.fillStyle(0xff0033, 1.0);
        gMeat.fillCircle(7, 7, 7);
        gMeat.fillCircle(13, 7, 7);
        gMeat.fillTriangle(2, 9, 18, 9, 10, 19);
        gMeat.generateTexture('health_pickup', 20, 20);
    }

    create() {
        this.scene.start('MenuScene');
    }
}
