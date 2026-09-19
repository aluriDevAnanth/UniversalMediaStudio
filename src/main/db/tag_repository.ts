import { TagMetaItem, DBData } from "./types";

export class TagRepository {
  constructor(
    private data: DBData,
    private onSave: () => void,
  ) {}

  public getTags(): string[] {
    return this.data.tags;
  }

  public getCategoryColors(): Record<string, string> {
    if (!this.data.categoryColors) {
      this.data.categoryColors = {};
    }
    return this.data.categoryColors;
  }

  public setCategoryColor(category: string, color: string): Record<string, string> {
    if (!this.data.categoryColors) {
      this.data.categoryColors = {};
    }
    this.data.categoryColors[category] = color;
    this.onSave();
    return this.data.categoryColors;
  }

  public getTagMetadata(): Record<string, TagMetaItem> {
    if (!this.data.tagMetadata) {
      this.data.tagMetadata = {};
    }
    return this.data.tagMetadata;
  }

  public setTagMetadata(name: string, color: string, category?: string): Record<string, TagMetaItem> {
    if (!this.data.tagMetadata) {
      this.data.tagMetadata = {};
    }
    this.data.tagMetadata[name] = { color, category: category || "" };
    this.onSave();
    return this.data.tagMetadata;
  }

  public addTag(tag: string, color?: string, category?: string): string[] {
    if (!this.data.tags.includes(tag)) {
      this.data.tags.push(tag);
    }
    if (color || category) {
      if (!this.data.tagMetadata) this.data.tagMetadata = {};
      this.data.tagMetadata[tag] = {
        color: color || "#3b82f6",
        category: category || "",
      };
    }
    this.onSave();
    return this.data.tags;
  }

  public deleteTag(tag: string): string[] {
    this.data.tags = this.data.tags.filter((t) => t !== tag);
    if (this.data.tagMetadata && this.data.tagMetadata[tag]) {
      delete this.data.tagMetadata[tag];
    }
    for (const v of Object.values(this.data.videos)) {
      v.tags = v.tags.filter((t) => !tag || t !== tag);
    }
    this.onSave();
    return this.data.tags;
  }

  public renameTag(oldTag: string, newTag: string): string[] {
    const trimmed = newTag.trim();
    if (!trimmed || oldTag === trimmed) return this.data.tags;
    this.data.tags = this.data.tags.map((t) => (t === oldTag ? trimmed : t));
    this.data.tags = Array.from(new Set(this.data.tags));
    if (this.data.tagMetadata && this.data.tagMetadata[oldTag]) {
      this.data.tagMetadata[trimmed] = this.data.tagMetadata[oldTag];
      delete this.data.tagMetadata[oldTag];
    }
    for (const v of Object.values(this.data.videos)) {
      if (v.tags.includes(oldTag)) {
        v.tags = v.tags.map((t) => (t === oldTag ? trimmed : t));
        v.tags = Array.from(new Set(v.tags));
      }
    }
    this.onSave();
    return this.data.tags;
  }
}
