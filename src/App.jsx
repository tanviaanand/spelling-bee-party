import React, { useEffect, useRef } from "react";
import { LOCAL_MODE, BUILD_ID, IS_PROD_BUILD } from "./firebase";
import { announceBuild } from "./db";
import { useHashRoute, useDbValue } from "./hooks";
import Presenter from "./views/Presenter";
import Admin from "./views/Admin";
import Play from "./views/Play";

export default function App() {
  const { view, param } = useHashRoute();

  // Stale-tab detection: prod tabs raise the build high-water mark; any tab
  // older than the mark shows a refresh banner. Dev tabs only listen.
  const latestBuild = useDbValue("meta/buildId");
  const announced = useRef(false);
  useEffect(() => {
    if (!IS_PROD_BUILD || LOCAL_MODE || announced.current || latestBuild === undefined) return;
    announced.current = true;
    announceBuild(latestBuild, BUILD_ID);
  }, [latestBuild]);
  const stale = IS_PROD_BUILD && latestBuild != null && latestBuild > BUILD_ID;

  let page;
  if (view === "admin") page = <Admin />;
  else if (view === "play") page = <Play playerId={param} />;
  else page = <Presenter />;
  return (
    <>
      {stale && <div className="stale-banner">🔄 A newer version is live — refresh this page!</div>}
      {LOCAL_MODE && (
        <div className="local-badge" title="No Firebase config yet — state lives in this browser only (syncs across tabs, not devices). Paste the config into src/firebase-config.js to go live.">
          🧪 local test mode — this browser only
        </div>
      )}
      {page}
    </>
  );
}
