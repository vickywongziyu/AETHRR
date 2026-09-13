// Modal dialogs remember whether scene input was available. Indoor input is
// handled by look-around while OrbitControls itself remains disabled.
export function cameraInputEnabled(world){return world.controls.enabled||!!world.atlas?.buildings?.interiorCamera.active;}
export function restoreCameraInput(world,enabled){world.controls.enabled=!!enabled&&!world.atlas?.buildings?.interiorCamera.active;}
