import React from "react";
import { TagBadge } from "../TagBadge";

interface VideoCardTagsProps {
  tags: string[];
  searchQuery?: string;
}

export const VideoCardTags: React.FC<VideoCardTagsProps> = ({
  tags,
  searchQuery,
}) => {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 overflow-hidden">
      {tags.length === 0 ? (
        <span className="text-[10px] text-muted">No Tags</span>
      ) : (
        tags.slice(0, 3).map((t) => (
          <TagBadge
            key={t}
            rawTag={t}
            size="xs"
            searchQuery={searchQuery}
          />
        ))
      )}
      {tags.length > 3 && (
        <span className="text-[9px] font-bold text-muted">
          +{tags.length - 3}
        </span>
      )}
    </div>
  );
};
