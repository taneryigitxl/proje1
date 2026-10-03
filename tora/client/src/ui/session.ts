export interface ShownItem {
  itemId: string;
  quantity: number;
  equipped: boolean;
}

export const sessionBag: { items: ShownItem[]; quest: string } = { items: [], quest: "" };

export function setSessionBag(items: ShownItem[], quest = ""): void {
  sessionBag.items = items;
  sessionBag.quest = quest;
}
