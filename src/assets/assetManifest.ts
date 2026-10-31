export interface AssetManifestEntry {
  id: string;
  category:
    | 'terrain'
    | 'farmland'
    | 'road'
    | 'settlement'
    | 'building'
    | 'decoration'
    | 'effect';
  assetPath: string;
  width: number;
  height: number;
  anchorPoint: { x: number; y: number };
  scale: number;
  zIndex: number;
  description: string;
}

/**
 * Unified 2D Cartoon Asset Manifest (Section 9.6)
 * All assets follow a cohesive 2D hand-drawn medieval English valley aesthetic (warm colors, clear dark outlines, 3/4 top-down perspective).
 * Can be seamlessly swapped with AI-generated PNG/WebP sprites at the specified assetPath.
 */
export const ASSET_MANIFEST: Record<string, AssetManifestEntry> = {
  terrain_valley_base: {
    id: 'terrain_valley_base',
    category: 'terrain',
    assetPath: '/assets/sprites/terrain_valley_base.webp',
    width: 1000,
    height: 1600,
    anchorPoint: { x: 0, y: 0 },
    scale: 1.0,
    zIndex: 0,
    description: '河谷基础地形：蜿蜒艾什河、起伏丘陵与柔绿草甸',
  },
  farmland_plot_small: {
    id: 'farmland_plot_small',
    category: 'farmland',
    assetPath: '/assets/sprites/farmland_plot_small.svg',
    width: 180,
    height: 120,
    anchorPoint: { x: 0.5, y: 0.5 },
    scale: 1.0,
    zIndex: 10,
    description: '初垦条田与麦垄',
  },
  farmland_plot_improved: {
    id: 'farmland_plot_improved',
    category: 'farmland',
    assetPath: '/assets/sprites/farmland_plot_improved.svg',
    width: 240,
    height: 160,
    anchorPoint: { x: 0.5, y: 0.5 },
    scale: 1.0,
    zIndex: 11,
    description: '三圃轮作改良农田与灌溉水渠',
  },
  cottage_thatched: {
    id: 'cottage_thatched',
    category: 'settlement',
    assetPath: '/assets/sprites/cottage_thatched.svg',
    width: 48,
    height: 44,
    anchorPoint: { x: 0.5, y: 0.8 },
    scale: 1.0,
    zIndex: 30,
    description: '盎格鲁-撒克逊木骨茅草农舍',
  },
  townhouse_timber: {
    id: 'townhouse_timber',
    category: 'settlement',
    assetPath: '/assets/sprites/townhouse_timber.svg',
    width: 54,
    height: 58,
    anchorPoint: { x: 0.5, y: 0.85 },
    scale: 1.0,
    zIndex: 35,
    description: '双层半木结构市镇住宅与工匠商铺',
  },
  manor_timber_hall: {
    id: 'manor_timber_hall',
    category: 'building',
    assetPath: '/assets/sprites/manor_timber_hall.svg',
    width: 130,
    height: 110,
    anchorPoint: { x: 0.5, y: 0.75 },
    scale: 1.0,
    zIndex: 45,
    description: '早期领主木石长屋庄园宅邸',
  },
  manor_stone_keep: {
    id: 'manor_stone_keep',
    category: 'building',
    assetPath: '/assets/sprites/manor_stone_keep.svg',
    width: 170,
    height: 160,
    anchorPoint: { x: 0.5, y: 0.8 },
    scale: 1.0,
    zIndex: 50,
    description: '诺曼式领主石质主堡与内廷塔楼',
  },
  building_watermill: {
    id: 'building_watermill',
    category: 'building',
    assetPath: '/assets/sprites/building_watermill.svg',
    width: 96,
    height: 86,
    anchorPoint: { x: 0.5, y: 0.75 },
    scale: 1.0,
    zIndex: 42,
    description: '河畔木石水力磨坊（含可旋转水轮）',
  },
  building_bridge: {
    id: 'building_bridge',
    category: 'building',
    assetPath: '/assets/sprites/building_bridge.svg',
    width: 120,
    height: 76,
    anchorPoint: { x: 0.5, y: 0.5 },
    scale: 1.0,
    zIndex: 25,
    description: '跨河木石拱桥',
  },
  building_marketplace: {
    id: 'building_marketplace',
    category: 'building',
    assetPath: '/assets/sprites/building_marketplace.svg',
    width: 140,
    height: 110,
    anchorPoint: { x: 0.5, y: 0.7 },
    scale: 1.0,
    zIndex: 40,
    description: '定期集市广场、彩色布篷摊位与十字集市碑',
  },
  building_church: {
    id: 'building_church',
    category: 'building',
    assetPath: '/assets/sprites/building_church.svg',
    width: 120,
    height: 135,
    anchorPoint: { x: 0.5, y: 0.8 },
    scale: 1.0,
    zIndex: 48,
    description: '教区石木教堂与高耸钟楼',
  },
  building_granary: {
    id: 'building_granary',
    category: 'building',
    assetPath: '/assets/sprites/building_granary.svg',
    width: 84,
    height: 76,
    anchorPoint: { x: 0.5, y: 0.75 },
    scale: 1.0,
    zIndex: 38,
    description: '石基防潮领主大谷仓',
  },
  defense_wooden_palisade: {
    id: 'defense_wooden_palisade',
    category: 'building',
    assetPath: '/assets/sprites/defense_wooden_palisade.svg',
    width: 320,
    height: 260,
    anchorPoint: { x: 0.5, y: 0.5 },
    scale: 1.0,
    zIndex: 32,
    description: '环绕主聚落的木制防御栅栏与哨塔',
  },
  defense_stone_wall: {
    id: 'defense_stone_wall',
    category: 'building',
    assetPath: '/assets/sprites/defense_stone_wall.svg',
    width: 480,
    height: 420,
    anchorPoint: { x: 0.5, y: 0.5 },
    scale: 1.0,
    zIndex: 46,
    description: '环城条石城墙、垛口角楼与南北瓮城大门',
  },
  deco_oak_cluster: {
    id: 'deco_oak_cluster',
    category: 'decoration',
    assetPath: '/assets/sprites/deco_oak_cluster.svg',
    width: 90,
    height: 80,
    anchorPoint: { x: 0.5, y: 0.8 },
    scale: 1.0,
    zIndex: 28,
    description: '手绘圆润树冠橡木林群落',
  },
  deco_livestock_sheep: {
    id: 'deco_livestock_sheep',
    category: 'decoration',
    assetPath: '/assets/sprites/deco_livestock_sheep.svg',
    width: 32,
    height: 24,
    anchorPoint: { x: 0.5, y: 0.5 },
    scale: 1.0,
    zIndex: 29,
    description: '草甸放牧绵羊与牛群',
  },
  effect_chimney_smoke: {
    id: 'effect_chimney_smoke',
    category: 'effect',
    assetPath: '/assets/sprites/effect_chimney_smoke.svg',
    width: 24,
    height: 48,
    anchorPoint: { x: 0.5, y: 1.0 },
    scale: 1.0,
    zIndex: 60,
    description: '农舍与工坊袅袅炊烟动画',
  },
};

export const ASSET_MANIFEST_LIST: AssetManifestEntry[] = Object.values(ASSET_MANIFEST);

