import { registerSW } from "virtual:pwa-register";
export function refusesOffline(dev: boolean, framed: boolean, off: boolean) {
  return dev || framed || off;
}
export async function setupOffline() {
  if (!("serviceWorker" in navigator)) return;
  const refused=refusesOffline(!import.meta.env.PROD,window.self!==window.top,new URLSearchParams(window.location.search).get("sw")==="off");
  if (refused) {
    const registrations=await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((r)=>[r.active,r.waiting,r.installing].some((w)=>w&&new URL(w.scriptURL).pathname==="/sw.js")).map((r)=>r.unregister()));
    return;
  }
  registerSW({immediate:true});
}
