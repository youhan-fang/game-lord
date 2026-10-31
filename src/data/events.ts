import { LordTrait, LordTraitId } from '../game/world/worldState';

export const LORD_TRAITS: Record<LordTraitId, LordTrait> = {
  thrifty: {
    id: 'thrifty',
    name: '节俭持家',
    description: '精打细算管理庄园内廷，家族年度生活开支降低 20%，设施维护成本降低 10%。',
  },
  merchant_minded: {
    id: 'merchant_minded',
    name: '善商重贸',
    description: '熟稔行商之道，商业贸易吸引力 +15%，集市与商路税收提高 15%。',
  },
  benevolent: {
    id: 'benevolent',
    name: '仁厚爱民',
    description: '体恤佃农与工匠疾苦，人口自然增长率微幅提升，外来移民吸引力 +18%。',
  },
  stern: {
    id: 'stern',
    name: '严明果决',
    description: '律法严明，地租与税赋征收效率 +12%，领地治安基准 +8，但移民吸引力略降 6%。',
  },
  pioneer: {
    id: 'pioneer',
    name: '垦殖先锋',
    description: '热衷兴修水利与开疆拓土，农民自主开垦速度 +20%，农业产出 +5%。',
  },
  vigilant: {
    id: 'vigilant',
    name: '尚武警觉',
    description: '常年巡视边境，领地治安基准 +12，盗匪袭扰损失减半。',
  },
};

export const LORD_TRAIT_LIST: LordTrait[] = Object.values(LORD_TRAITS);

export const ANGLO_SAXON_NAMES: readonly string[] = [
  '艾德温 (Edwin)',
  '阿尔弗雷德 (Alfred)',
  '埃塞尔斯坦 (Athelstan)',
  '奥斯瓦尔德 (Oswald)',
  '埃德加 (Edgar)',
  '戈德温 (Godwin)',
  '哈罗德 (Harold)',
  '里奥夫里克 (Leofric)',
  '埃德蒙 (Edmund)',
  '奥尔德雷德 (Aldred)',
  '邓斯坦 (Dunstan)',
  '伍尔夫斯坦 (Wulfstan)',
  '塞드里克 (Cedric)',
  '休伯特 (Hubert)',
  '威廉 (William)',
  '亨利 (Henry)',
  '理查德 (Richard)',
  '罗伯特 (Robert)',
];

export const DEFAULT_FAMILY_NAME = '艾什福德家族 (House of Ashford)';

