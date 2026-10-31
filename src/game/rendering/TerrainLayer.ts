import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { hasBuilding } from '../simulation/agriculture';
import { GameState } from '../world/worldState';

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 1600;

/**
 * River centerline control points (from top-left 180,0 through central bend 515,685 to bottom-right 770,1600)
 */
export const RIVER_PATH_POINTS: Array<{ x: number; y: number }> = [
  { x: 175, y: -20 },
  { x: 220, y: 140 },
  { x: 340, y: 290 },
  { x: 460, y: 440 },
  { x: 505, y: 580 },
  { x: 520, y: 700 },
  { x: 535, y: 830 },
  { x: 490, y: 970 },
  { x: 560, y: 1120 },
  { x: 685, y: 1270 },
  { x: 735, y: 1440 },
  { x: 775, y: 1620 },
];

export class TerrainLayer {
  public container: Container;
  private baseTerrainGfx: Graphics;
  private farmlandGfx: Graphics;
  private roadGfx: Graphics;
  private labelsContainer: Container;
  private lastSignature: string = '';

  constructor() {
    this.container = new Container();
    this.baseTerrainGfx = new Graphics();
    this.farmlandGfx = new Graphics();
    this.roadGfx = new Graphics();
    this.labelsContainer = new Container();

    this.container.addChild(this.baseTerrainGfx);
    this.container.addChild(this.farmlandGfx);
    this.container.addChild(this.roadGfx);
    this.container.addChild(this.labelsContainer);

    this.drawStaticValleyBase();
  }

  private drawStaticValleyBase(): void {
    const g = this.baseTerrainGfx;
    g.clear();

    // 1. Base lush valley meadow green
    g.rect(0, 0, MAP_WIDTH, MAP_HEIGHT).fill(0x78b159);

    // 2. Soft terrain patches (lighter sunlit meadows & deeper fertile floodplain)
    g.ellipse(480, 680, 360, 420).fill({ color: 0x84bc64, alpha: 0.75 });
    g.ellipse(310, 820, 220, 260).fill({ color: 0x8cc26c, alpha: 0.6 });
    g.ellipse(660, 340, 250, 200).fill({ color: 0x6ea651, alpha: 0.55 });
    g.ellipse(760, 920, 240, 310).fill({ color: 0x629947, alpha: 0.65 });

    // 3. Low rolling hills (Northwest, Northeast, Southwest, Southeast) in 2D hand-drawn style
    const drawHill = (cx: number, cy: number, rx: number, ry: number, color: number) => {
      g.ellipse(cx, cy, rx, ry)
        .fill(color)
        .stroke({ color: 0x4e7c38, width: 2.5, alpha: 0.55 });
      g.ellipse(cx - rx * 0.12, cy - ry * 0.18, rx * 0.72, ry * 0.65).fill({
        color: 0x95c975,
        alpha: 0.35,
      });
    };

    drawHill(110, 260, 175, 130, 0x689e4c);
    drawHill(880, 180, 190, 140, 0x659b49);
    drawHill(95, 620, 140, 170, 0x6b9f4e);
    drawHill(120, 1340, 190, 160, 0x659b49);
    drawHill(890, 1380, 160, 190, 0x629647);
    // Manor slight elevation knoll
    drawHill(345, 515, 115, 85, 0x82b963);

    // 4. Winding Ash River (Sandy bank + dark outline + outer water + inner light current)
    const drawRiverStroke = (width: number, color: number, alpha: number = 1) => {
      g.moveTo(RIVER_PATH_POINTS[0].x, RIVER_PATH_POINTS[0].y);
      for (let i = 1; i < RIVER_PATH_POINTS.length - 1; i++) {
        const curr = RIVER_PATH_POINTS[i];
        const next = RIVER_PATH_POINTS[i + 1];
        const midX = (curr.x + next.x) / 2;
        const midY = (curr.y + next.y) / 2;
        g.quadraticCurveTo(curr.x, curr.y, midX, midY);
      }
      const last = RIVER_PATH_POINTS[RIVER_PATH_POINTS.length - 1];
      g.lineTo(last.x, last.y);
      g.stroke({ color, width, cap: 'round', join: 'round', alpha });
    };

    // Riverbank outline & sandbar
    drawRiverStroke(68, 0x3d2b1f, 0.45);
    drawRiverStroke(62, 0xd8c396, 1.0);
    // Main river body
    drawRiverStroke(48, 0x3f84ab, 1.0);
    // Inner bright water channel
    drawRiverStroke(30, 0x5aa4cc, 0.9);
  }

  public update(state: GameState): void {
    const cultHa = Math.round(state.agriculture.cultivatedLandHa);
    const potHa = Math.round(state.agriculture.arablePotentialHa);
    const hasFieldImp = hasBuilding(state, 'field_improvement');
    const hasHighroad = hasBuilding(state, 'paved_highroad');
    const hasBridge = hasBuilding(state, 'river_bridge');
    const unlockedRegions = state.regions
      .filter((r) => r.unlocked)
      .map((r) => r.id)
      .join(',');
    const visibleAnchors = state.map.anchors
      .filter((a) => a.visible)
      .map((a) => `${a.id}:${a.level}`)
      .join('|');

    const sig = `${cultHa}_${potHa}_${hasFieldImp}_${hasHighroad}_${hasBridge}_${unlockedRegions}_${visibleAnchors}`;
    if (sig === this.lastSignature) return;
    this.lastSignature = sig;

    this.drawFarmland(state, hasFieldImp);
    this.drawRoads(state, hasHighroad, hasBridge);
  }

  private drawFarmland(state: GameState, hasFieldImp: boolean): void {
    const g = this.farmlandGfx;
    g.clear();
    this.labelsContainer.removeChildren();

    const cultHa = state.agriculture.cultivatedLandHa;

    // Helper to draw a stylized 2D hand-drawn medieval strip-field parcel
    const drawFieldPlot = (
      x: number,
      y: number,
      w: number,
      h: number,
      angleRad: number,
      type: 'wheat' | 'barley' | 'fallow' | 'uncultivated',
      improved: boolean
    ) => {
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      const hw = w / 2;
      const hh = h / 2;

      const corners = [
        { x: x + (-hw * cos - -hh * sin), y: y + (-hw * sin + -hh * cos) },
        { x: x + (hw * cos - -hh * sin), y: y + (hw * sin + -hh * cos) },
        { x: x + (hw * cos - hh * sin), y: y + (hw * sin + hh * cos) },
        { x: x + (-hw * cos - hh * sin), y: y + (-hw * sin + hh * cos) },
      ];

      if (type === 'uncultivated') {
        // Uncultivated potential land: wildflower scrub with wooden boundary stakes
        g.poly(corners)
          .fill({ color: 0x6ea350, alpha: 0.45 })
          .stroke({ color: 0x5c4033, width: 1.8, alpha: 0.5 });
        return;
      }

      const fillMap = {
        wheat: 0xdcb34b,
        barley: 0xc8a951,
        fallow: 0x8fa85a,
      };
      const stripeMap = {
        wheat: 0xb88b28,
        barley: 0xa48533,
        fallow: 0x6e873d,
      };

      // Outer field ditch / stone or hedge border
      g.poly(corners)
        .fill(fillMap[type])
        .stroke({
          color: improved ? 0x4b779e : 0x4a3520,
          width: improved ? 3.2 : 2.2,
        });

      // Furrow stripes along width
      const stripes = 5;
      for (let s = 1; s < stripes; s++) {
        const t = -hw + (w * s) / stripes;
        const p1x = x + (t * cos - (-hh + 4) * sin);
        const p1y = y + (t * sin + (-hh + 4) * cos);
        const p2x = x + (t * cos - (hh - 4) * sin);
        const p2y = y + (t * sin + (hh - 4) * cos);
        g.moveTo(p1x, p1y)
          .lineTo(p2x, p2y)
          .stroke({ color: stripeMap[type], width: 2, alpha: 0.75 });
      }
    };

    // Preset field parcels across Farmland A (South slope), Farmland B (West bend), East Meadow, West Clearing, and Farmland C (North plain)
    const allPlots: Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      angle: number;
      thresholdHa: number;
      crop: 'wheat' | 'barley' | 'fallow';
    }> = [
      // Initial 45 ha (6 core plots around Farmland A)
      { x: 310, y: 735, w: 76, h: 48, angle: -0.12, thresholdHa: 10, crop: 'wheat' },
      { x: 392, y: 745, w: 72, h: 46, angle: -0.08, thresholdHa: 18, crop: 'barley' },
      { x: 265, y: 792, w: 80, h: 50, angle: -0.15, thresholdHa: 26, crop: 'wheat' },
      { x: 352, y: 802, w: 76, h: 48, angle: -0.1, thresholdHa: 34, crop: 'fallow' },
      { x: 432, y: 805, w: 68, h: 46, angle: -0.05, thresholdHa: 40, crop: 'wheat' },
      { x: 305, y: 855, w: 78, h: 46, angle: -0.12, thresholdHa: 45, crop: 'barley' },

      // Expansion from 46 ha to 90 ha (Initial potential arable land in Farmland A & B)
      { x: 390, y: 862, w: 74, h: 46, angle: -0.08, thresholdHa: 52, crop: 'wheat' },
      { x: 225, y: 920, w: 82, h: 52, angle: 0.08, thresholdHa: 60, crop: 'wheat' },
      { x: 312, y: 930, w: 78, h: 50, angle: 0.05, thresholdHa: 68, crop: 'barley' },
      { x: 215, y: 982, w: 84, h: 52, angle: 0.1, thresholdHa: 76, crop: 'fallow' },
      { x: 308, y: 992, w: 80, h: 50, angle: 0.06, thresholdHa: 84, crop: 'wheat' },
      { x: 255, y: 1050, w: 86, h: 52, angle: 0.08, thresholdHa: 90, crop: 'barley' },

      // East Meadows Expansion (95 ha - 200 ha)
      { x: 675, y: 745, w: 84, h: 52, angle: 0.12, thresholdHa: 105, crop: 'wheat' },
      { x: 765, y: 755, w: 82, h: 50, angle: 0.15, thresholdHa: 125, crop: 'barley' },
      { x: 695, y: 810, w: 86, h: 52, angle: 0.1, thresholdHa: 150, crop: 'wheat' },
      { x: 785, y: 820, w: 80, h: 50, angle: 0.12, thresholdHa: 180, crop: 'fallow' },

      // West Hill Clearings (200 ha - 320 ha)
      { x: 165, y: 710, w: 76, h: 48, angle: -0.18, thresholdHa: 215, crop: 'wheat' },
      { x: 155, y: 775, w: 78, h: 48, angle: -0.14, thresholdHa: 250, crop: 'barley' },
      { x: 180, y: 480, w: 76, h: 48, angle: 0.14, thresholdHa: 290, crop: 'wheat' },

      // North Abbey Fief & Lower Wharf (320 ha - 750+ ha)
      { x: 585, y: 265, w: 92, h: 56, angle: -0.06, thresholdHa: 340, crop: 'wheat' },
      { x: 685, y: 270, w: 92, h: 56, angle: -0.04, thresholdHa: 390, crop: 'barley' },
      { x: 590, y: 335, w: 94, h: 56, angle: -0.05, thresholdHa: 450, crop: 'wheat' },
      { x: 695, y: 342, w: 92, h: 56, angle: -0.03, thresholdHa: 520, crop: 'fallow' },
      { x: 635, y: 405, w: 96, h: 54, angle: -0.04, thresholdHa: 600, crop: 'wheat' },
      { x: 580, y: 1210, w: 90, h: 54, angle: 0.08, thresholdHa: 680, crop: 'barley' },
      { x: 675, y: 1225, w: 90, h: 54, angle: 0.1, thresholdHa: 760, crop: 'wheat' },
    ];

    for (const plot of allPlots) {
      if (cultHa >= plot.thresholdHa) {
        drawFieldPlot(plot.x, plot.y, plot.w, plot.h, plot.angle, plot.crop, hasFieldImp);
      } else if (state.agriculture.arablePotentialHa >= plot.thresholdHa) {
        // Show uncultivated potential arable plot waiting for peasants to reclaim
        drawFieldPlot(plot.x, plot.y, plot.w, plot.h, plot.angle, 'uncultivated', false);
      }
    }

    // Add a subtle label on uncultivated land in early game so player sees potential land
    if (cultHa < 75) {
      const labelStyle = new TextStyle({
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        fill: 0xf5ecd7,
        stroke: { color: 0x3d2b1f, width: 3 },
        fontWeight: 'bold',
      });
      const uncultText = new Text({
        text: '待开垦荒地 (农民积蓄后自主开荒)',
        style: labelStyle,
      });
      uncultText.anchor.set(0.5);
      uncultText.position.set(275, 965);
      uncultText.alpha = 0.82;
      this.labelsContainer.addChild(uncultText);
    }
  }

  private drawRoads(state: GameState, hasHighroad: boolean, hasBridge: boolean): void {
    const g = this.roadGfx;
    g.clear();

    const mainRoadWidth = hasHighroad ? 16 : 11;
    const mainRoadColor = hasHighroad ? 0xb5aba0 : 0xc6a675;
    const borderColor = 0x5c4328;

    const drawRoadSegment = (
      points: Array<{ x: number; y: number }>,
      width: number,
      fillColor: number
    ) => {
      if (points.length < 2) return;
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        g.lineTo(points[i].x, points[i].y);
      }
      g.stroke({ color: borderColor, width: width + 4, cap: 'round', join: 'round', alpha: 0.7 });

      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        g.lineTo(points[i].x, points[i].y);
      }
      g.stroke({ color: fillColor, width, cap: 'round', join: 'round' });
    };

    // 1. Core Manor -> Main Settlement -> River Ford/Bridge -> Farmland A Road
    drawRoadSegment(
      [
        { x: 340, y: 535 },
        { x: 410, y: 585 },
        { x: 470, y: 635 },
        { x: 515, y: 685 },
      ],
      mainRoadWidth,
      mainRoadColor
    );

    // South Highway through Farmland A & Outer Suburb
    drawRoadSegment(
      [
        { x: 470, y: 635 },
        { x: 450, y: 740 },
        { x: 465, y: 920 },
        { x: 480, y: 1200 },
        { x: 510, y: 1580 },
      ],
      mainRoadWidth,
      mainRoadColor
    );

    // Path into Farmland A & B
    drawRoadSegment(
      [
        { x: 450, y: 740 },
        { x: 335, y: 775 },
        { x: 270, y: 940 },
      ],
      8,
      0xc6a675
    );

    // Path to Church knoll
    if (state.map.anchors.find((a) => a.id === 'church')?.visible) {
      drawRoadSegment(
        [
          { x: 340, y: 535 },
          { x: 390, y: 450 },
        ],
        8,
        mainRoadColor
      );
    }

    // Path across Bridge to Market & East Village
    if (hasBridge || state.population.totalHouseholds >= 25) {
      drawRoadSegment(
        [
          { x: 515, y: 685 },
          { x: 565, y: 615 },
          { x: 740, y: 660 },
          { x: 960, y: 680 },
        ],
        hasHighroad ? 13 : 9,
        mainRoadColor
      );
    }

    // Path to West Village
    if (state.map.anchors.find((a) => a.id === 'west_village')?.visible) {
      drawRoadSegment(
        [
          { x: 340, y: 535 },
          { x: 185, y: 610 },
          { x: 30, y: 630 },
        ],
        8,
        0xc6a675
      );
    }

    // Path to North Fief (Farmland C)
    if (state.map.anchors.find((a) => a.id === 'farmland_c')?.visible) {
      drawRoadSegment(
        [
          { x: 565, y: 615 },
          { x: 610, y: 450 },
          { x: 640, y: 310 },
        ],
        9,
        0xc6a675
      );
    }

    // Path to Lower River Hamlet
    if (state.map.anchors.find((a) => a.id === 'river_hamlet')?.visible) {
      drawRoadSegment(
        [
          { x: 465, y: 920 },
          { x: 580, y: 1030 },
          { x: 690, y: 1120 },
        ],
        9,
        mainRoadColor
      );
    }
  }
}

