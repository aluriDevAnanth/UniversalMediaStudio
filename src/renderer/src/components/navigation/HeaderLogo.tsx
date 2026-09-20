import React from "react";
import appIcon from "@/assets/icon.png";

export const HeaderLogo: React.FC = () => {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="border-primary-border/30 bg-primary/20 flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border shadow-md backdrop-blur-xs">
        <img
          src={appIcon}
          alt="App Icon"
          className="h-full w-full object-cover"
        />
      </div>
      <h1 className="text-foreground hidden sm:flex items-end text-xs md:text-sm font-bold tracking-tight">
        UniversalMediaStudio
        <span className="text-primary font-bolder text-[11px] md:text-[12px]">
          .adaumc
        </span>
      </h1>
    </div>
  );
};
