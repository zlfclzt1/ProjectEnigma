export const LEGACY_V1_SAVE_KEY = "mystery-guild-master-save-v1";

export interface LegacyV1SaveNotice {
  readonly found: boolean;
  readonly message?: string;
}

export function inspectLegacyV1Save(storage: Pick<Storage, "getItem">): LegacyV1SaveNotice {
  if (storage.getItem(LEGACY_V1_SAVE_KEY) === null) return { found: false };
  return {
    found: true,
    message: "检测到旧版存档。V2 不迁移该存档，将创建一个全新的游戏。",
  };
}
