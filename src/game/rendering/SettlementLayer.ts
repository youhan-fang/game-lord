import { Container, Graphics } from 'pixi.js';
import { GameState } from '../world/worldState';

export interface ChimneyAnchorPoint {
  x: number;
  y: number;
}

export class SettlementLayer {
  public container: Container;
  private forestGfx: Graphics;
  private settlementGfx: Graphics;
  private lastSignature: string = '';
  public activeChimneys: ChimneyAnchorPoint[] = [];

  constructor() {
    this.container = new Container();
    this.forestGfx = new Graphics();
    this.settlementGfx = new Graphics();

    this.container.addChild(this.forestGfx);
    this.container.addChild(this.settlementGfx);
  }

  public update(state: GameState): void {
    const hBucket =
      state.population.totalHouseholds < 30
        ? state.population.totalHouseholds
        : Math.floor(state.population.totalHouseholds / 8) * 8;
    const nonFarmBucket = Math.floor(state.population.nonFarmHouseholds / 5);
    const forestLevel =
      state.map.anchors.find((a) => a.id === 'forest_edge')?.level ?? 3;
    const anchorSig = state.map.anchors
      .map((a) => `${a.id}:${a.visible ? a.level : -1}`)
      .join(',');

    const sig = `${hBucket}_${nonFarmBucket}_${forestLevel}_${state.economy.workshopsCount}_${anchorSig}`;
    if (sig === this.lastSignature) return;
    this.lastSignature = sig;

    this.drawForests(forestLevel, state);
    this.drawSettlements(state);
  }

  private drawTreeCluster(
    g: Graphics,
    cx: number,
    cy: number,
    scale: number = 1.0,
    variant: number = 0
  ): void {
    const leafMain = variant % 2 === 0 ? 0x4b8338 : 0x3f752e;
    const leafLight = variant % 2 === 0 ? 0x67a14e : 0x599342;

    // Ground shadow
    g.ellipse(cx, cy + 12 * scale, 18 * scale, 7 * scale).fill({
      color: 0x263b1c,
      alpha: 0.32,
    });

    // Trunk
    g.rect(cx - 3.5 * scale, cy - 2 * scale, 7 * scale, 14 * scale)
      .fill(0x6e472b)
      .stroke({ color: 0x3d2b1f, width: 1.8 });

    // Rounded cartoon canopy puffs
    g.circle(cx - 9 * scale, cy - 8 * scale, 12 * scale)
      .fill(leafMain)
      .stroke({ color: 0x2c4721, width: 2 });
    g.circle(cx + 9 * scale, cy - 7 * scale, 11 * scale)
      .fill(leafMain)
      .stroke({ color: 0x2c4721, width: 2 });
    g.circle(cx, cy - 15 * scale, 14 * scale)
      .fill(leafLight)
      .stroke({ color: 0x2c4721, width: 2.2 });
  }

  private drawForests(forestLevel: number, state: GameState): void {
    const g = this.forestGfx;
    g.clear();

    // Fixed border woodlands (Northwest & Southeast hills)
    const borderTrees = [
      { x: 65, y: 150, s: 1.1 },
      { x: 115, y: 175, s: 0.95 },
      { x: 80, y: 220, s: 1.05 },
      { x: 840, y: 120, s: 1.15 },
      { x: 900, y: 150, s: 1.0 },
      { x: 870, y: 210, s: 1.05 },
      { x: 75, y: 1260, s: 1.1 },
      { x: 130, y: 1310, s: 1.0 },
      { x: 90, y: 1370, s: 1.15 },
      { x: 875, y: 1350, s: 1.1 },
      { x: 920, y: 1410, s: 1.0 },
    ];

    borderTrees.forEach((t, i) => this.drawTreeCluster(g, t.x, t.y, t.s, i));

    // Dynamic Eastern & Southern Oak Forest Edge (retreats as cultivation grows)
    const dynamicTrees = [
      { x: 840, y: 920, s: 1.15, minLvl: 1 },
      { x: 890, y: 950, s: 1.05, minLvl: 1 },
      { x: 810, y: 980, s: 1.1, minLvl: 1 },
      { x: 865, y: 1030, s: 1.0, minLvl: 1 },
      { x: 760, y: 890, s: 1.05, minLvl: 2 },
      { x: 795, y: 845, s: 0.95, minLvl: 2 },
      { x: 735, y: 955, s: 1.0, minLvl: 2 },
      { x: 690, y: 885, s: 0.95, minLvl: 3 },
      { x: 725, y: 825, s: 1.0, minLvl: 3 },
      { x: 650, y: 935, s: 0.9, minLvl: 3 },
      { x: 635, y: 865, s: 0.95, minLvl: 4 },
      { x: 685, y: 780, s: 0.9, minLvl: 4 },
    ];

    dynamicTrees.forEach((t, idx) => {
      if (forestLevel >= t.minLvl) {
        this.drawTreeCluster(g, t.x, t.y, t.s, idx);
      }
    });

    // If woodland protection policy is active, draw a cozy Forester's Lodge at the forest edge
    if (state.policies.landPolicy === 'protect_woodland') {
      this.drawThatchedCottage(g, 780, 905, 0.95, true);
    }
  }

  private drawThatchedCottage(
    g: Graphics,
    x: number,
    y: number,
    scale: number = 1.0,
    withFence: boolean = false
  ): void {
    // Yard fence if rural cottage
    if (withFence) {
      g.roundRect(x - 24 * scale, y - 4 * scale, 48 * scale, 22 * scale, 4)
        .fill({ color: 0x9ab86c, alpha: 0.5 })
        .stroke({ color: 0x6b4c30, width: 1.5 });
    }

    // Shadow
    g.ellipse(x, y + 11 * scale, 20 * scale, 6 * scale).fill({
      color: 0x2c241b,
      alpha: 0.28,
    });

    // Wattle & Daub Wall
    g.roundRect(x - 15 * scale, y - 7 * scale, 30 * scale, 17 * scale, 2)
      .fill(0xf3e5bc)
      .stroke({ color: 0x3d2b1f, width: 2.2 });

    // Timber beams
    g.moveTo(x - 6 * scale, y - 7 * scale)
      .lineTo(x - 6 * scale, y + 10 * scale)
      .moveTo(x + 6 * scale, y - 7 * scale)
      .lineTo(x + 6 * scale, y + 10 * scale)
      .stroke({ color: 0x5c3e26, width: 1.6 });

    // Wooden door
    g.rect(x - 3 * scale, y + 1 * scale, 6 * scale, 9 * scale)
      .fill(0x6e472b)
      .stroke({ color: 0x3d2b1f, width: 1.4 });

    // Warm Golden Thatched Roof
    g.poly([
      { x: x - 19 * scale, y: y - 5 * scale },
      { x, y: y - 20 * scale },
      { x: x + 19 * scale, y: y - 5 * scale },
    ])
      .fill(0xe2b659)
      .stroke({ color: 0x3d2b1f, width: 2.2, join: 'round' });

    // Roof ridge detail
    g.moveTo(x - 11 * scale, y - 11 * scale)
      .lineTo(x, y - 18 * scale)
      .lineTo(x + 11 * scale, y - 11 * scale)
      .stroke({ color: 0xc29138, width: 1.5 });
  }

  private drawTownhouse(
    g: Graphics,
    x: number,
    y: number,
    scale: number = 1.0,
    roofColor: number = 0xb85a43
  ): void {
    // Shadow
    g.ellipse(x, y + 13 * scale, 21 * scale, 7 * scale).fill({
      color: 0x2c241b,
      alpha: 0.32,
    });

    // Stone ground floor
    g.rect(x - 15 * scale, y - 2 * scale, 30 * scale, 14 * scale)
      .fill(0xc4bcb0)
      .stroke({ color: 0x3d2b1f, width: 2 });

    // Jettying upper timber-framed floor
    g.rect(x - 17 * scale, y - 16 * scale, 34 * scale, 15 * scale)
      .fill(0xf5e8d0)
      .stroke({ color: 0x3d2b1f, width: 2.2 });

    // Cross timber framing
    g.moveTo(x - 17 * scale, y - 16 * scale)
      .lineTo(x, y - 1 * scale)
      .lineTo(x + 17 * scale, y - 16 * scale)
      .stroke({ color: 0x593a22, width: 1.6 });

    // Warm lit windows
    g.rect(x - 10 * scale, y - 12 * scale, 5 * scale, 6 * scale)
      .fill(0xf4c44e)
      .stroke({ color: 0x3d2b1f, width: 1.2 });
    g.rect(x + 5 * scale, y - 12 * scale, 5 * scale, 6 * scale)
      .fill(0xf4c44e)
      .stroke({ color: 0x3d2b1f, width: 1.2 });

    // Steep Clay Tile Roof
    g.poly([
      { x: x - 20 * scale, y: y - 15 * scale },
      { x, y: y - 32 * scale },
      { x: x + 20 * scale, y: y - 15 * scale },
    ])
      .fill(roofColor)
      .stroke({ color: 0x3d2b1f, width: 2.2, join: 'round' });
  }

  private drawWorkshop(g: Graphics, x: number, y: number, scale: number = 1.0): void {
    this.drawTownhouse(g, x, y, scale, 0x8f4938);
    // Smithy / Artisan Chimney & Signboard
    g.rect(x + 9 * scale, y - 33 * scale, 6 * scale, 14 * scale)
      .fill(0x7c7267)
      .stroke({ color: 0x3d2b1f, width: 1.8 });
    // Little guild sign hanging out front
    g.circle(x - 21 * scale, y - 6 * scale, 4 * scale)
      .fill(0xd9a441)
      .stroke({ color: 0x3d2b1f, width: 1.5 });
  }

  private drawSettlements(state: GameState): void {
    const g = this.settlementGfx;
    g.clear();
    this.activeChimneys = [];

    const totalH = state.population.totalHouseholds;
    const nonFarmH = state.population.nonFarmHouseholds;

    // 1. Core Settlement Slots (Ordered from inner ring around 470,630 to outer town rings)
    const coreHouseSlots: Array<{
      x: number;
      y: number;
      minH: number;
      urbanUpgradeAtH: number;
      hasSmoke?: boolean;
    }> = [
      // Initial 10 peasant households (Visible right from 900 AD!)
      { x: 435, y: 610, minH: 1, urbanUpgradeAtH: 140, hasSmoke: true },
      { x: 482, y: 602, minH: 2, urbanUpgradeAtH: 120, hasSmoke: true },
      { x: 448, y: 652, minH: 3, urbanUpgradeAtH: 130 },
      { x: 495, y: 642, minH: 4, urbanUpgradeAtH: 110, hasSmoke: true },
      { x: 405, y: 625, minH: 5, urbanUpgradeAtH: 170 },
      { x: 418, y: 672, minH: 6, urbanUpgradeAtH: 190, hasSmoke: true },
      { x: 468, y: 688, minH: 7, urbanUpgradeAtH: 160 },
      { x: 378, y: 585, minH: 8, urbanUpgradeAtH: 220 },
      { x: 432, y: 568, minH: 9, urbanUpgradeAtH: 200, hasSmoke: true },
      { x: 365, y: 645, minH: 10, urbanUpgradeAtH: 250 },

      // Village Growth (12 to 90 households)
      { x: 472, y: 562, minH: 14, urbanUpgradeAtH: 150 },
      { x: 515, y: 575, minH: 18, urbanUpgradeAtH: 125, hasSmoke: true },
      { x: 392, y: 698, minH: 22, urbanUpgradeAtH: 260 },
      { x: 438, y: 715, minH: 27, urbanUpgradeAtH: 230 },
      { x: 345, y: 610, minH: 33, urbanUpgradeAtH: 300 },
      { x: 495, y: 725, minH: 40, urbanUpgradeAtH: 210, hasSmoke: true },
      { x: 398, y: 538, minH: 48, urbanUpgradeAtH: 280 },
      { x: 452, y: 530, minH: 58, urbanUpgradeAtH: 240 },
      { x: 538, y: 548, minH: 70, urbanUpgradeAtH: 180 },
      { x: 325, y: 578, minH: 82, urbanUpgradeAtH: 340 },

      // Township & Market Town Growth (95 to 320 households)
      { x: 595, y: 575, minH: 95, urbanUpgradeAtH: 160, hasSmoke: true },
      { x: 615, y: 622, minH: 115, urbanUpgradeAtH: 175 },
      { x: 575, y: 658, minH: 135, urbanUpgradeAtH: 190 },
      { x: 628, y: 585, minH: 160, urbanUpgradeAtH: 210 },
      { x: 498, y: 518, minH: 185, urbanUpgradeAtH: 250, hasSmoke: true },
      { x: 358, y: 502, minH: 215, urbanUpgradeAtH: 320 },
      { x: 548, y: 512, minH: 250, urbanUpgradeAtH: 290 },
      { x: 645, y: 635, minH: 285, urbanUpgradeAtH: 310 },
      { x: 308, y: 628, minH: 320, urbanUpgradeAtH: 420 },

      // Prosperous Town & Fortified City Density (350 to 950+ households)
      { x: 425, y: 498, minH: 360, urbanUpgradeAtH: 360, hasSmoke: true },
      { x: 472, y: 492, minH: 410, urbanUpgradeAtH: 410 },
      { x: 585, y: 535, minH: 460, urbanUpgradeAtH: 460 },
      { x: 625, y: 545, minH: 520, urbanUpgradeAtH: 520 },
      { x: 365, y: 685, minH: 580, urbanUpgradeAtH: 580 },
      { x: 532, y: 745, minH: 650, urbanUpgradeAtH: 650, hasSmoke: true },
      { x: 575, y: 715, minH: 730, urbanUpgradeAtH: 730 },
      { x: 618, y: 685, minH: 820, urbanUpgradeAtH: 820 },
      { x: 658, y: 595, minH: 920, urbanUpgradeAtH: 920 },
    ];

    for (let i = 0; i < coreHouseSlots.length; i++) {
      const slot = coreHouseSlots[i];
      if (totalH < slot.minH) continue;

      const isUrban = totalH >= slot.urbanUpgradeAtH && nonFarmH >= 12;
      const isWorkshop =
        isUrban && i % 4 === 1 && state.economy.workshopsCount >= Math.ceil((i + 1) / 4);

      if (isWorkshop) {
        this.drawWorkshop(g, slot.x, slot.y, 0.92);
        this.activeChimneys.push({ x: slot.x + 11, y: slot.y - 33 });
      } else if (isUrban) {
        const roofPalette = [0xb85a43, 0x9e4736, 0x6d5947, 0xc46d4e];
        this.drawTownhouse(g, slot.x, slot.y, 0.9, roofPalette[i % roofPalette.length]);
        if (slot.hasSmoke) {
          this.activeChimneys.push({ x: slot.x + 6, y: slot.y - 28 });
        }
      } else {
        this.drawThatchedCottage(g, slot.x, slot.y, 0.9, totalH < 120 && i < 8);
        if (slot.hasSmoke) {
          this.activeChimneys.push({ x: slot.x + 4, y: slot.y - 18 });
        }
      }
    }

    // 2. East Village Houses (Anchor: east_village at 740, 660)
    const eastAnchor = state.map.anchors.find((a) => a.id === 'east_village');
    if (eastAnchor?.visible && eastAnchor.level >= 1) {
      const eastOffsets = [
        { dx: -28, dy: -15, lvl: 1 },
        { dx: 22, dy: -10, lvl: 1 },
        { dx: -10, dy: 24, lvl: 1 },
        { dx: 35, dy: 22, lvl: 2 },
        { dx: -45, dy: 18, lvl: 2 },
        { dx: 5, dy: -32, lvl: 3 },
        { dx: 55, dy: -5, lvl: 3 },
        { dx: 25, dy: 48, lvl: 4 },
      ];
      for (const off of eastOffsets) {
        if (eastAnchor.level >= off.lvl) {
          this.drawThatchedCottage(g, 740 + off.dx, 660 + off.dy, 0.85, off.lvl === 1);
        }
      }
      this.activeChimneys.push({ x: 712, y: 630 });
    }

    // 3. West Village Houses (Anchor: west_village at 185, 610)
    const westAnchor = state.map.anchors.find((a) => a.id === 'west_village');
    if (westAnchor?.visible && westAnchor.level >= 1) {
      const westOffsets = [
        { dx: -22, dy: -14, lvl: 1 },
        { dx: 24, dy: -8, lvl: 1 },
        { dx: 0, dy: 22, lvl: 1 },
        { dx: -38, dy: 18, lvl: 2 },
        { dx: 36, dy: 24, lvl: 2 },
        { dx: -12, dy: -36, lvl: 3 },
        { dx: 28, dy: -34, lvl: 4 },
      ];
      for (const off of westOffsets) {
        if (westAnchor.level >= off.lvl) {
          this.drawThatchedCottage(g, 185 + off.dx, 610 + off.dy, 0.85, off.lvl === 1);
        }
      }
      this.activeChimneys.push({ x: 165, y: 580 });
    }

    // 4. Lower River Hamlet & Wharf (Anchor: river_hamlet at 690, 1120)
    const riverHamlet = state.map.anchors.find((a) => a.id === 'river_hamlet');
    if (riverHamlet?.visible && riverHamlet.level >= 1) {
      // Wooden river jetty / dock
      g.rect(615, 1110, 46, 16)
        .fill(0x8b5a2b)
        .stroke({ color: 0x3d2b1f, width: 2 });
      const dockHouses = [
        { dx: -15, dy: -12, lvl: 1, urban: false },
        { dx: 25, dy: -5, lvl: 1, urban: true },
        { dx: 5, dy: 26, lvl: 2, urban: false },
        { dx: 45, dy: 22, lvl: 2, urban: true },
        { dx: -25, dy: 30, lvl: 3, urban: true },
        { dx: 35, dy: -32, lvl: 4, urban: true },
      ];
      for (const dh of dockHouses) {
        if (riverHamlet.level >= dh.lvl) {
          if (dh.urban && riverHamlet.level >= 2) {
            this.drawTownhouse(g, 690 + dh.dx, 1120 + dh.dy, 0.85, 0xa8553f);
          } else {
            this.drawThatchedCottage(g, 690 + dh.dx, 1120 + dh.dy, 0.85, false);
          }
        }
      }
    }

    // 5. Outer Suburb along the Southern Highroad (Anchor: outer_suburb at 470, 920)
    const suburb = state.map.anchors.find((a) => a.id === 'outer_suburb');
    if (suburb?.visible && suburb.level >= 1) {
      const suburbHouses = [
        { x: 432, y: 895, lvl: 1, urban: true },
        { x: 505, y: 902, lvl: 1, urban: false },
        { x: 435, y: 942, lvl: 2, urban: true },
        { x: 508, y: 948, lvl: 2, urban: true },
        { x: 438, y: 988, lvl: 3, urban: false },
        { x: 512, y: 992, lvl: 3, urban: true },
        { x: 440, y: 1035, lvl: 4, urban: true },
        { x: 515, y: 1040, lvl: 4, urban: true },
      ];
      for (const sh of suburbHouses) {
        if (suburb.level >= sh.lvl) {
          if (sh.urban) {
            this.drawTownhouse(g, sh.x, sh.y, 0.88, 0xb25942);
          } else {
            this.drawThatchedCottage(g, sh.x, sh.y, 0.88, false);
          }
        }
      }
    }
  }
}

