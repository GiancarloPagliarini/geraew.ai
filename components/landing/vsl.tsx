"use client";

import { createElement, useEffect } from "react";

const PLAYER_SCRIPT =
  "https://scripts.converteai.net/8961d838-aff2-4dce-9b39-e84022d332ce/players/6a58bb3834189080e2cf9f96/v4/player.js";

export function Vsl() {
  useEffect(() => {
    if (document.querySelector(`script[src="${PLAYER_SCRIPT}"]`)) return;
    const s = document.createElement("script");
    s.src = PLAYER_SCRIPT;
    s.async = true;
    document.head.appendChild(s);
  }, []);

  return (
    <div className="mt-8 w-full sm:mt-10">
      {createElement(
        "vturb-smartplayer",
        {
          id: "vid-6a58bb3834189080e2cf9f96",
          style: {
            display: "block",
            margin: "0 auto",
            width: "100%",
            maxWidth: "400px",
          },
        },
        createElement("div", {
          className: "vturb-player-placeholder",
          style: {
            position: "relative",
            width: "100%",
            padding: "177.77777777777777% 0 0",
            zIndex: 0,
            backgroundColor: "black",
          },
        })
      )}
    </div>
  );
}
