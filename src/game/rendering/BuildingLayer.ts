import { Container, FederatedPointerEvent, Graphics, Text, TextStyle } from 'pixi.js';
import { hasBuilding } from '../simulation/agriculture';
import { DevelopmentAnchor, GameState } from '../world/worldState';

export class BuildingLayer {
  public container: Container;
  private defenseBackGfx: Graphics;
  private buildingsGfx: Graphics;
  private waterwheelGfx: Graphics;
  private defenseFrontGfx: Graphics;
  private pinsContainer: Container;
  private onSelectAnchor: (anchorId: string) => void;
  private lastSignature: string = '';
  private hasBuiltMill: boolean = false;

  constructor(onSelectAnchor: (anchorId: string) => void) {
    this.onSelectAnchor = onSelectAnchor;
    this.container = new Container();

    this.defenseBackGfx = new Graphics();
    this.buildingsGfx = new Graphics();
    this.waterwheelGfx = new Graphics();
    this.defenseFrontGfx = new Graphics();
    this.pinsContainer = new Container();

    this.container.addChild(this.defenseBackGfx);
    this.container.addChild(this.buildingsGfx);
    this.container.addChild(this.waterwheelGfx);
    this.container.addChild(this.defenseFrontGfx);
    this.container.addChild(this.pinsContainer);
  }

  public tickAnimation(deltaSec: number): void {
    if (this.hasBuiltMill && this.waterwheelGfx.visible) {
      this.waterwheelGfx.rotation += deltaSec * 1.15;
    }
  }

  public update(state: GameState, selectedAnchorId: string | null): void {
    const bSig = state.buildings
      .map((b) => `${b.id}:${b.built ? 'B' : b.underConstruction ? b.progressMonths : '0'}`)
      .join(',');
    const aSig = state.map.anchors
      .map((a) => `${a.id}:${a.visible ? a.level : -1}`)
      .join(',');
    const sig = `${bSig}_${aSig}_${selectedAnchorId ?? 'none'}`;
    if (sig === this.lastSignature) return;
    this.lastSignature = sig;

    this.drawAllBuildings(state);
    this.drawInteractivePins(state, selectedAnchorId);
  }

  private drawAllBuildings(state: GameState): void {
    this.defenseBackGfx.clear();
    this.buildingsGfx.clear();
    this.waterwheelGfx.clear();
    this.defenseFrontGfx.clear();

    const g = this.buildingsGfx;
    const hasPalisade = hasBuilding(state, 'wooden_palisade');
    const hasWall = hasBuilding(state, 'stone_wall');
    const hasKeep = hasBuilding(state, 'stone_keep');
    const hasBridge = hasBuilding(state, 'river_bridge');
    const hasMill = hasBuilding(state, 'watermill');
    const hasMarket = hasBuilding(state, 'marketplace');
    const hasChurch = hasBuilding(state, 'parish_church');
    const hasGranary = hasBuilding(state, 'granary_expansion');
    const hasPatrol = hasBuilding(state, 'patrol_guard');

    // 1. Defensive Ring (Wooden Palisade or Stone City Wall around core settlement & manor)
    if (hasWall) {
      this.drawStoneCityWall();
    } else if (hasPalisade) {
      this.drawWoodenPalisade();
    }

    // 2. River Crossing (Ford at level 0, Arched Timber-Stone Bridge when built)
    this.drawBridgeOrFord(g, hasBridge, hasBuilding(state, 'paved_highroad'));

    // 3. Manor House / Stone Keep at (340, 520)
    const manorLevel =
      state.map.anchors.find((a) => a.id === 'manor_house')?.level ?? 1;
    this.drawManorHouse(g, 340, 520, manorLevel, hasKeep, hasPatrol);

    // 4. Watermill at (525, 785)
    this.hasBuiltMill = hasMill;
    if (hasMill) {
      this.drawWatermill(g, 525, 785);
      this.waterwheelGfx.visible = true;
    } else {
      this.waterwheelGfx.visible = false;
    }

    // 5. Marketplace at (565, 610)
    const marketAnchor = state.map.anchors.find((a) => a.id === 'market');
    if (hasMarket || (marketAnchor && marketAnchor.visible && marketAnchor.level >= 1)) {
      this.drawMarketplace(g, 565, 610, hasMarket ? Math.max(2, marketAnchor?.level ?? 2) : 1);
    }

    // 6. Parish Church at (390, 440)
    const churchAnchor = state.map.anchors.find((a) => a.id === 'church');
    if (hasChurch || (churchAnchor && churchAnchor.visible && churchAnchor.level >= 1)) {
      this.drawChurch(g, 390, 440, hasChurch);
    }

    // 7. Stone-base Granary near Farmland B at (260, 895)
    if (hasGranary) {
      this.drawGranary(g, 260, 895);
    }

    // 8. Draw Construction Scaffolding for any active projects
    for (const b of state.buildings) {
      if (b.underConstruction && !b.built) {
        const anchor = state.map.anchors.find((a) => a.id === b.anchorId);
        if (anchor) {
          this.drawScaffolding(
            g,
            anchor.position.x,
            anchor.position.y,
            b.progressMonths,
            b.totalMonths
          );
        }
      }
    }
  }

  private drawBridgeOrFord(g: Graphics, hasBridge: boolean, isHighroad: boolean): void {
    const bx = 515;
    const by = 685;

    if (!hasBridge) {
      // Stepping stones & wooden rope posts across the shallow ford
      for (let i = -22; i <= 22; i += 11) {
        g.circle(bx + i, by + i * 0.25, 4.5)
          .fill(0xa89f91)
          .stroke({ color: 0x3d2b1f, width: 1.5 });
      }
      return;
    }

    // Shadow on water
    g.ellipse(bx, by + 8, 42, 14).fill({ color: 0x1f4e69, alpha: 0.45 });

    // Stone piers
    g.roundRect(bx - 36, by - 14, 14, 28, 3)
      .fill(0x8c857b)
      .stroke({ color: 0x3d2b1f, width: 2 });
    g.roundRect(bx + 22, by - 14, 14, 28, 3)
      .fill(0x8c857b)
      .stroke({ color: 0x3d2b1f, width: 2 });

    // Bridge deck
    g.roundRect(bx - 42, by - 12, 84, 22, 4)
      .fill(isHighroad ? 0xb5aba0 : 0x9c6b3b)
      .stroke({ color: 0x3d2b1f, width: 2.5 });

    // Parapet railings
    g.rect(bx - 42, by - 15, 84, 5)
      .fill(isHighroad ? 0x8c857b : 0x734a24)
      .stroke({ color: 0x3d2b1f, width: 1.8 });
    g.rect(bx - 42, by + 7, 84, 5)
      .fill(isHighroad ? 0x8c857b : 0x734a24)
      .stroke({ color: 0x3d2b1f, width: 1.8 });
  }

  private drawManorHouse(
    g: Graphics,
    x: number,
    y: number,
    level: number,
    hasKeep: boolean,
    hasPatrol: boolean
  ): void {
    // Courtyard compound base
    g.ellipse(x, y + 12, 66, 38)
      .fill(0xb8a37e)
      .stroke({ color: 0x5c4328, width: 2.5 });

    if (hasPatrol) {
      // Guard barracks & watchtower next to manor gate
      g.rect(x + 34, y - 4, 22, 24)
        .fill(0xd9c5a0)
        .stroke({ color: 0x3d2b1f, width: 2 });
      g.poly([
        { x: x + 31, y: y - 4 },
        { x: x + 45, y: y - 18 },
        { x: x + 59, y: y - 4 },
      ])
        .fill(0x4a6b82)
        .stroke({ color: 0x3d2b1f, width: 2 });
    }

    if (hasKeep || level >= 5) {
      // Grand Norman Stone Keep with Corner Turrets & Royal Banner
      g.ellipse(x, y + 18, 52, 16).fill({ color: 0x2c241b, alpha: 0.35 });

      // Main Stone Keep Body
      g.rect(x - 36, y - 38, 72, 54)
        .fill(0xd2cbc0)
        .stroke({ color: 0x3d2b1f, width: 2.8 });

      // Left & Right Corner Towers
      g.rect(x - 44, y - 52, 22, 68)
        .fill(0xded8ce)
        .stroke({ color: 0x3d2b1f, width: 2.6 });
      g.rect(x + 22, y - 52, 22, 68)
        .fill(0xded8ce)
        .stroke({ color: 0x3d2b1f, width: 2.6 });

      // Crenellations
      for (let cx = -42; cx <= 36; cx += 12) {
        g.rect(x + cx, y - 58, 8, 7)
          .fill(0xded8ce)
          .stroke({ color: 0x3d2b1f, width: 1.8 });
      }

      // Conical Blue-Slate Turret Roofs
      g.poly([
        { x: x - 47, y: y - 52 },
        { x: x - 33, y: y - 76 },
        { x: x - 19, y: y - 52 },
      ])
        .fill(0x3b5978)
        .stroke({ color: 0x3d2b1f, width: 2.2 });
      g.poly([
        { x: x + 19, y: y - 52 },
        { x: x + 33, y: y - 76 },
        { x: x + 47, y: y - 52 },
      ])
        .fill(0x3b5978)
        .stroke({ color: 0x3d2b1f, width: 2.2 });

      // Keep Arched Gate
      g.roundRect(x - 10, y - 6, 20, 22, 8)
        .fill(0x4a321f)
        .stroke({ color: 0x3d2b1f, width: 2 });

      // Golden Lion Pennant Flag
      g.moveTo(x, y - 38)
        .lineTo(x, y - 72)
        .stroke({ color: 0x3d2b1f, width: 2 });
      g.poly([
        { x, y: y - 72 },
        { x: x + 20, y: y - 66 },
        { x, y: y - 60 },
      ])
        .fill(0xd94e3b)
        .stroke({ color: 0x3d2b1f, width: 1.5 });
      return;
    }

    // Level 1-4 Anglo-Saxon / Early Medieval Timber & Stone Manor Hall
    g.ellipse(x, y + 16, 44, 13).fill({ color: 0x2c241b, alpha: 0.3 });

    // Stone Chimney on side
    g.rect(x + 22, y - 32, 10, 36)
      .fill(0x8c8275)
      .stroke({ color: 0x3d2b1f, width: 2.2 });

    // Main Hall Walls
    g.roundRect(x - 32, y - 16, 64, 30, 3)
      .fill(level >= 3 ? 0xdfd7c8 : 0xebd9b5)
      .stroke({ color: 0x3d2b1f, width: 2.6 });

    // Decorative Timber Pillars
    for (let px = -22; px <= 22; px += 11) {
      g.moveTo(x + px, y - 16)
        .lineTo(x + px, y + 14)
        .stroke({ color: 0x5c3d24, width: 2 });
    }

    // Steep Shingle Roof
    g.poly([
      { x: x - 38, y: y - 14 },
      { x, y: y - 42 },
      { x: x + 38, y: y - 14 },
    ])
      .fill(level >= 2 ? 0xa64b3b : 0xc88a3b)
      .stroke({ color: 0x3d2b1f, width: 2.6, join: 'round' });

    // Arched Great Hall Door
    g.roundRect(x - 7, y - 2, 14, 16, 5)
      .fill(0x52341e)
      .stroke({ color: 0x3d2b1f, width: 2 });

    // Manor Lord Banner
    g.moveTo(x, y - 42)
      .lineTo(x, y - 58)
      .stroke({ color: 0x3d2b1f, width: 2 });
    g.poly([
      { x, y: y - 58 },
      { x: x + 15, y: y - 53 },
      { x, y: y - 48 },
    ])
      .fill(0xd9a441)
      .stroke({ color: 0x3d2b1f, width: 1.5 });
  }

  private drawWatermill(g: Graphics, x: number, y: number): void {
    // Shadow
    g.ellipse(x, y + 14, 32, 10).fill({ color: 0x2c241b, alpha: 0.3 });

    // Stone lower foundation next to river
    g.rect(x - 24, y - 4, 38, 18)
      .fill(0x9e9589)
      .stroke({ color: 0x3d2b1f, width: 2.2 });

    // Timber upper mill house
    g.rect(x - 26, y - 20, 42, 18)
      .fill(0xf2e2c6)
      .stroke({ color: 0x3d2b1f, width: 2.2 });

    // Terracotta / Shingle Roof
    g.poly([
      { x: x - 30, y: y - 18 },
      { x: x - 5, y: y - 38 },
      { x: x + 20, y: y - 18 },
    ])
      .fill(0xb85d43)
      .stroke({ color: 0x3d2b1f, width: 2.4, join: 'round' });

    // Animated Waterwheel in waterwheelGfx positioned at (x + 18, y + 4)
    const wg = this.waterwheelGfx;
    wg.position.set(x + 18, y + 4);
    wg.circle(0, 0, 15)
      .fill({ color: 0x8b5a2b, alpha: 0.9 })
      .stroke({ color: 0x3d2b1f, width: 2.5 });
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 4;
      const dx = Math.cos(angle) * 15;
      const dy = Math.sin(angle) * 15;
      wg.moveTo(-dx, -dy)
        .lineTo(dx, dy)
        .stroke({ color: 0x3d2b1f, width: 2 });
    }
    wg.circle(0, 0, 4.5)
      .fill(0xd9a441)
      .stroke({ color: 0x3d2b1f, width: 1.8 });
  }

  private drawMarketplace(g: Graphics, x: number, y: number, level: number): void {
    // Cobblestone Plaza Circle
    const radiusX = 36 + level * 6;
    const radiusY = 24 + level * 4;
    g.ellipse(x, y + 4, radiusX, radiusY)
      .fill(0xcbbfa8)
      .stroke({ color: 0x6e5d49, width: 2.2 });

    // Central Medieval Stone Market Cross Monument
    g.rect(x - 6, y - 4, 12, 6)
      .fill(0x8c857b)
      .stroke({ color: 0x3d2b1f, width: 1.8 });
    g.rect(x - 3, y - 22, 6, 18)
      .fill(0xa8a095)
      .stroke({ color: 0x3d2b1f, width: 1.8 });
    g.circle(x, y - 24, 5)
      .fill(0xd9a441)
      .stroke({ color: 0x3d2b1f, width: 1.8 });

    // Market Stalls with Striped Awnings
    const drawStall = (sx: number, sy: number, awningColor: number) => {
      g.rect(sx - 12, sy - 2, 24, 10)
        .fill(0x9c6b3b)
        .stroke({ color: 0x3d2b1f, width: 1.8 });
      g.poly([
        { x: sx - 14, y: sy - 2 },
        { x: sx - 10, y: sy - 12 },
        { x: sx + 10, y: sy - 12 },
        { x: sx + 14, y: sy - 2 },
      ])
        .fill(awningColor)
        .stroke({ color: 0x3d2b1f, width: 1.8 });
    };

    drawStall(x - 24, y - 8, 0xd9534f);
    drawStall(x + 24, y - 8, 0x428bca);
    if (level >= 2) {
      drawStall(x - 20, y + 15, 0xe2a93b);
      drawStall(x + 22, y + 15, 0x5cb85c);
    }
    if (level >= 3) {
      // Guild Weigh-House at top of market square
      g.rect(x - 18, y - 44, 36, 20)
        .fill(0xf2e2c6)
        .stroke({ color: 0x3d2b1f, width: 2.2 });
      g.poly([
        { x: x - 22, y: y - 42 },
        { x, y: y - 58 },
        { x: x + 22, y: y - 42 },
      ])
        .fill(0x9e4736)
        .stroke({ color: 0x3d2b1f, width: 2.2 });
    }
  }

  private drawChurch(g: Graphics, x: number, y: number, isFullChurch: boolean): void {
    if (!isFullChurch) {
      // Humble wooden wayside chapel / shrine
      g.rect(x - 12, y - 10, 24, 18)
        .fill(0xdfc79d)
        .stroke({ color: 0x3d2b1f, width: 2 });
      g.poly([
        { x: x - 15, y: y - 10 },
        { x, y: y - 26 },
        { x: x + 15, y: y - 10 },
      ])
        .fill(0x8c6239)
        .stroke({ color: 0x3d2b1f, width: 2 });
      return;
    }

    // Shadow
    g.ellipse(x, y + 14, 42, 13).fill({ color: 0x2c241b, alpha: 0.32 });

    // Stone Nave
    g.rect(x - 28, y - 20, 56, 32)
      .fill(0xd8d1c5)
      .stroke({ color: 0x3d2b1f, width: 2.5 });

    // Nave Slate Roof
    g.poly([
      { x: x - 32, y: y - 18 },
      { x, y: y - 40 },
      { x: x + 32, y: y - 18 },
    ])
      .fill(0x4a647d)
      .stroke({ color: 0x3d2b1f, width: 2.5, join: 'round' });

    // Bell Tower on West End
    g.rect(x - 32, y - 52, 22, 64)
      .fill(0xe2dcd0)
      .stroke({ color: 0x3d2b1f, width: 2.5 });

    // Tall Spire
    g.poly([
      { x: x - 35, y: y - 52 },
      { x: x - 21, y: y - 84 },
      { x: x - 7, y: y - 52 },
    ])
      .fill(0x3b5269)
      .stroke({ color: 0x3d2b1f, width: 2.4, join: 'round' });

    // Golden Cross at Spire Peak
    g.moveTo(x - 21, y - 84)
      .lineTo(x - 21, y - 94)
      .moveTo(x - 25, y - 90)
      .lineTo(x - 17, y - 90)
      .stroke({ color: 0xf0c24b, width: 2.4 });

    // Rose Window
    g.circle(x + 8, y - 10, 6)
      .fill(0x5da9e9)
      .stroke({ color: 0x3d2b1f, width: 1.8 });
  }

  private drawGranary(g: Graphics, x: number, y: number): void {
    g.ellipse(x, y + 12, 26, 8).fill({ color: 0x2c241b, alpha: 0.28 });
    // Stone staddle-stone pillars
    g.rect(x - 18, y + 4, 6, 7).fill(0x8c857b).stroke({ color: 0x3d2b1f, width: 1.5 });
    g.rect(x + 12, y + 4, 6, 7).fill(0x8c857b).stroke({ color: 0x3d2b1f, width: 1.5 });
    // Timber granary body
    g.rect(x - 22, y - 16, 44, 21)
      .fill(0xe6cfa3)
      .stroke({ color: 0x3d2b1f, width: 2.2 });
    // Thick thatched/shingle roof
    g.poly([
      { x: x - 26, y: y - 14 },
      { x, y: y - 32 },
      { x: x + 26, y: y - 14 },
    ])
      .fill(0xd49b3b)
      .stroke({ color: 0x3d2b1f, width: 2.2, join: 'round' });
  }

  private drawWoodenPalisade(): void {
    const back = this.defenseBackGfx;
    const front = this.defenseFrontGfx;

    // Back arc of wooden stakes behind manor & northern village
    back.ellipse(455, 610, 175, 130).stroke({
      color: 0x7c532b,
      width: 6,
      alpha: 0.85,
    });

    // Watchtowers on perimeter
    const drawWatchtower = (g: Graphics, tx: number, ty: number) => {
      g.rect(tx - 9, ty - 22, 18, 26)
        .fill(0x8b5a2b)
        .stroke({ color: 0x3d2b1f, width: 2 });
      g.poly([
        { x: tx - 12, y: ty - 22 },
        { x: tx, y: ty - 34 },
        { x: tx + 12, y: ty - 22 },
      ])
        .fill(0xc48b3f)
        .stroke({ color: 0x3d2b1f, width: 2 });
    };

    drawWatchtower(back, 290, 560);
    drawWatchtower(back, 595, 520);
    drawWatchtower(front, 455, 740);
  }

  private drawStoneCityWall(): void {
    const back = this.defenseBackGfx;
    const front = this.defenseFrontGfx;

    // Grand Stone Wall Perimeter around the whole town & manor
    back.ellipse(480, 615, 225, 165).stroke({
      color: 0x3d2b1f,
      width: 13,
      alpha: 0.9,
    });
    back.ellipse(480, 615, 225, 165).stroke({
      color: 0xc8c0b4,
      width: 9,
      alpha: 0.95,
    });

    const drawStoneTower = (g: Graphics, tx: number, ty: number) => {
      g.rect(tx - 12, ty - 28, 24, 34)
        .fill(0xd6cfc4)
        .stroke({ color: 0x3d2b1f, width: 2.4 });
      g.poly([
        { x: tx - 15, y: ty - 28 },
        { x: tx, y: ty - 44 },
        { x: tx + 15, y: ty - 28 },
      ])
        .fill(0x3f5d7a)
        .stroke({ color: 0x3d2b1f, width: 2.2 });
    };

    drawStoneTower(back, 265, 565);
    drawStoneTower(back, 475, 450);
    drawStoneTower(back, 685, 555);
    drawStoneTower(front, 330, 745);
    drawStoneTower(front, 625, 745);

    // Southern Gatehouse straddling the Highroad at (465, 778)
    front
      .rect(443, 755, 44, 28)
      .fill(0xdcd5ca)
      .stroke({ color: 0x3d2b1f, width: 2.5 });
    front
      .roundRect(456, 765, 18, 18, 7)
      .fill(0x3d2b1f);
  }

  private drawScaffolding(
    g: Graphics,
    x: number,
    y: number,
    progress: number,
    total: number
  ): void {
    g.rect(x - 24, y - 26, 48, 32)
      .fill({ color: 0xd9a441, alpha: 0.25 })
      .stroke({ color: 0x8b5a2b, width: 2 });
    // Progress bar above scaffolding
    const pct = Math.max(0, Math.min(1, progress / Math.max(1, total)));
    g.roundRect(x - 24, y - 36, 48, 7, 3)
      .fill(0x2c241b)
      .stroke({ color: 0xf5ecd7, width: 1 });
    g.roundRect(x - 23, y - 35, 46 * pct, 5, 2).fill(0x5cb85c);
  }

  private drawInteractivePins(state: GameState, selectedAnchorId: string | null): void {
    this.pinsContainer.removeChildren();

    const labelStyle = new TextStyle({
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 11,
      fill: 0xfef9ec,
      fontWeight: 'bold',
    });

    // Show interactive badges on key visible anchors so user can tap them to inspect
    const primaryTypes = new Set([
      'manor_house',
      'main_settlement',
      'watermill',
      'bridge',
      'market',
      'church',
      'east_village',
      'west_village',
      'river_hamlet',
      'farmland_a',
      'city_wall',
    ]);

    for (const anchor of state.map.anchors) {
      if (!anchor.visible || !primaryTypes.has(anchor.type)) continue;

      const pin = new Container();
      pin.position.set(anchor.position.x, anchor.position.y - 42);
      pin.eventMode = 'static';
      pin.cursor = 'pointer';

      const isSelected = anchor.id === selectedAnchorId;
      const bg = new Graphics();
      const shortName = anchor.name.split('（')[0];
      const textObj = new Text({
        text: `${shortName} Lv.${anchor.level}`,
        style: labelStyle,
      });
      textObj.anchor.set(0.5);

      const padX = 10;
      const w = textObj.width + padX * 2;
      const h = 22;

      bg.roundRect(-w / 2, -h / 2, w, h, 11)
        .fill({
          color: isSelected ? 0xd99b26 : 0x2c241b,
          alpha: isSelected ? 0.96 : 0.78,
        })
        .stroke({
          color: isSelected ? 0xfff3d1 : 0xd9a441,
          width: isSelected ? 2.2 : 1.4,
        });

      pin.addChild(bg);
      pin.addChild(textObj);

      pin.on('pointertap', (e: FederatedPointerEvent) => {
        e.stopPropagation();
        this.onSelectAnchor(anchor.id);
      });

      this.pinsContainer.addChild(pin);
    }
  }
}

