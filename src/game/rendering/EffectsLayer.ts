import { Container, Graphics } from 'pixi.js';
import { GameState } from '../world/worldState';
import { ChimneyAnchorPoint } from './SettlementLayer';
import { RIVER_PATH_POINTS } from './TerrainLayer';

interface SmokePuff {
  originIdx: number;
  age: number;
  maxAge: number;
  driftX: number;
}

interface RoadTraveler {
  pathIndex: number;
  t: number; // 0..1 along path
  speed: number;
  direction: 1 | -1;
  isCart: boolean;
  color: number;
}

const TRAVEL_PATHS: Array<Array<{ x: number; y: number }>> = [
  // Path 0: Manor -> Main Settlement -> Bridge -> Market
  [
    { x: 345, y: 535 },
    { x: 410, y: 585 },
    { x: 470, y: 635 },
    { x: 515, y: 685 },
    { x: 565, y: 615 },
  ],
  // Path 1: Main Settlement -> Farmland A -> Farmland B
  [
    { x: 470, y: 635 },
    { x: 450, y: 740 },
    { x: 335, y: 775 },
    { x: 270, y: 940 },
  ],
  // Path 2: South Highroad -> Main Settlement -> East Village
  [
    { x: 480, y: 1150 },
    { x: 465, y: 920 },
    { x: 450, y: 740 },
    { x: 515, y: 685 },
    { x: 565, y: 615 },
    { x: 740, y: 660 },
  ],
];

export class EffectsLayer {
  public container: Container;
  private gfx: Graphics;
  private elapsedTime: number = 0;
  private smokePuffs: SmokePuff[] = [];
  private travelers: RoadTraveler[] = [];
  private activeTravelerCount: number = 4;

  constructor() {
    this.container = new Container();
    this.gfx = new Graphics();
    this.container.addChild(this.gfx);

    // Initialize smoke puffs
    for (let i = 0; i < 14; i++) {
      this.smokePuffs.push({
        originIdx: i,
        age: (i * 0.37) % 2.8,
        maxAge: 2.8,
        driftX: i % 2 === 0 ? 10 : -8,
      });
    }

    // Initialize pool of road travelers (villagers & merchant carts)
    const tunicColors = [0xc95944, 0x457b9d, 0xd4a338, 0x588157, 0x8d5b4c];
    for (let i = 0; i < 14; i++) {
      this.travelers.push({
        pathIndex: i % TRAVEL_PATHS.length,
        t: (i * 0.19) % 1,
        speed: 0.045 + (i % 3) * 0.012,
        direction: i % 2 === 0 ? 1 : -1,
        isCart: i % 4 === 3,
        color: tunicColors[i % tunicColors.length],
      });
    }
  }

  public syncWithState(state: GameState): void {
    const h = state.population.totalHouseholds;
    this.activeTravelerCount = Math.min(14, Math.max(3, 3 + Math.floor(h / 35)));
  }

  public tick(deltaSec: number, chimneys: ChimneyAnchorPoint[], isPaused: boolean): void {
    const dt = isPaused ? 0 : Math.min(0.1, deltaSec);
    this.elapsedTime += dt;

    const g = this.gfx;
    g.clear();

    // 1. River Water Flow Ripples
    for (let i = 0; i < RIVER_PATH_POINTS.length - 1; i++) {
      const p1 = RIVER_PATH_POINTS[i];
      const p2 = RIVER_PATH_POINTS[i + 1];
      for (let sub = 0; sub < 2; sub++) {
        const phase = (this.elapsedTime * 0.28 + i * 0.33 + sub * 0.5) % 1;
        const rx = p1.x + (p2.x - p1.x) * phase + (sub === 0 ? -6 : 6);
        const ry = p1.y + (p2.y - p1.y) * phase;
        const alpha = Math.sin(phase * Math.PI) * 0.55;
        g.moveTo(rx - 4, ry - 5)
          .lineTo(rx + 4, ry + 5)
          .stroke({ color: 0xbbe6ff, width: 2, cap: 'round', alpha });
      }
    }

    // 2. Grazing Livestock (Sheep & Cattle in the green pastures)
    const sheepLocations = [
      { x: 255, y: 655 },
      { x: 274, y: 665 },
      { x: 242, y: 672 },
      { x: 615, y: 735 },
      { x: 635, y: 745 },
      { x: 605, y: 752 },
    ];
    sheepLocations.forEach((s, idx) => {
      const bobX = Math.sin(this.elapsedTime * 0.9 + idx * 1.7) * 2.5;
      const bobY = Math.cos(this.elapsedTime * 1.2 + idx * 2.1) * 1.2;
      const sx = s.x + bobX;
      const sy = s.y + bobY;
      // Fluffy sheep body
      g.ellipse(sx, sy, 6.5, 4.8)
        .fill(0xf7f4eb)
        .stroke({ color: 0x3d2b1f, width: 1.4 });
      // Dark sheep head
      g.circle(sx + 5.5, sy - 1, 2.8).fill(0x3d2b1f);
    });

    // 3. Moving Villagers & Merchant Carts on Roads
    for (let i = 0; i < this.activeTravelerCount; i++) {
      const tr = this.travelers[i];
      tr.t += tr.speed * tr.direction * dt;
      if (tr.t >= 1) {
        tr.t = 1;
        tr.direction = -1;
      } else if (tr.t <= 0) {
        tr.t = 0;
        tr.direction = 1;
      }

      const path = TRAVEL_PATHS[tr.pathIndex];
      const totalSegments = path.length - 1;
      const scaled = tr.t * totalSegments;
      const segIdx = Math.min(totalSegments - 1, Math.floor(scaled));
      const localT = scaled - segIdx;
      const a = path[segIdx];
      const b = path[segIdx + 1];
      const px = a.x + (b.x - a.x) * localT;
      const py = a.y + (b.y - a.y) * localT;

      if (tr.isCart) {
        // Wooden Merchant Cart with Canvas Cover
        g.ellipse(px, py + 4, 9, 4).fill({ color: 0x2c241b, alpha: 0.3 });
        g.roundRect(px - 7, py - 6, 14, 9, 3)
          .fill(0xe6dcc8)
          .stroke({ color: 0x3d2b1f, width: 1.5 });
        g.circle(px - 4, py + 3, 3).fill(0x6e472b).stroke({ color: 0x3d2b1f, width: 1.2 });
        g.circle(px + 4, py + 3, 3).fill(0x6e472b).stroke({ color: 0x3d2b1f, width: 1.2 });
      } else {
        // Tiny Cartoon Villager
        const walkBob = Math.abs(Math.sin(this.elapsedTime * 5 + i)) * 2;
        g.ellipse(px, py + 2, 4, 2).fill({ color: 0x2c241b, alpha: 0.28 });
        g.roundRect(px - 3, py - 6 - walkBob, 6, 7, 2)
          .fill(tr.color)
          .stroke({ color: 0x3d2b1f, width: 1.2 });
        g.circle(px, py - 9 - walkBob, 2.8)
          .fill(0xf2cfb3)
          .stroke({ color: 0x3d2b1f, width: 1.2 });
      }
    }

    // 4. Rising Chimney Smoke Puffs
    if (chimneys.length > 0) {
      for (const puff of this.smokePuffs) {
        puff.age += dt;
        if (puff.age >= puff.maxAge) {
          puff.age = 0;
        }
        const origin = chimneys[puff.originIdx % chimneys.length];
        if (!origin) continue;

        const progress = puff.age / puff.maxAge;
        const sx = origin.x + Math.sin(progress * Math.PI * 1.5) * puff.driftX * progress;
        const sy = origin.y - progress * 28;
        const radius = 3.5 + progress * 6.5;
        const alpha = (1 - progress) * 0.48;

        g.circle(sx, sy, radius).fill({ color: 0xf4f1ea, alpha });
      }
    }
  }
}

