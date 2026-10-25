export type ShowcasePose = 'wave' | 'lookout' | 'hero' | 'relief' | 'dance' | 'clap';
export type AdventureStat = 'coins' | 'dodges' | 'roofs' | 'flights' | 'saves' | 'events' | 'powerups';
export interface ShortGoal {
  id: AdventureStat;
  name: string;
  target: number;
  reward: number;
}
export const SHORT_GOALS: ShortGoal[] = [
  { id: 'coins', name: '零钱也要认真捡', target: 20, reward: 40 },
  { id: 'dodges', name: '漂亮躲过三个障碍', target: 3, reward: 60 },
  { id: 'roofs', name: '走一次车顶路线', target: 1, reward: 60 },
  { id: 'flights', name: '起飞一次，平安落地', target: 1, reward: 60 },
  { id: 'saves', name: '让护盾救你一次', target: 1, reward: 60 },
  { id: 'events', name: '完成一个站台小事件', target: 1, reward: 50 },
];
export const SOUVENIRS: Array<{ id: ShowcasePose; name: string; title: string; desc: string; stat: AdventureStat | 'goals'; target: number }> = [
  { id: 'wave', name: '轻轻蹦一下', title: '站台新朋友', desc: '初始赠送的小跳动作', stat: 'events', target: 0 },
  { id: 'clap', name: '开心弹两下', title: '轨道体操选手', desc: '单局有效躲避三个障碍', stat: 'dodges', target: 3 },
  { id: 'lookout', name: '转圈看世界', title: '这次走上面', desc: '实际走上一次列车车顶', stat: 'roofs', target: 1 },
  { id: 'hero', name: '起飞小旋转', title: '临时飞行员', desc: '喷气起飞后平安落地', stat: 'flights', target: 1 },
  { id: 'relief', name: '轻轻摇摇头', title: '命硬小可爱', desc: '单局被护盾救下一次', stat: 'saves', target: 1 },
  { id: 'dance', name: '下班摇头晃脑', title: '今日也很努力', desc: '累计完成三个每局小目标', stat: 'goals', target: 3 },
];

export function validPose(value: unknown): value is ShowcasePose {
  return SOUVENIRS.some((item) => item.id === value);
}
